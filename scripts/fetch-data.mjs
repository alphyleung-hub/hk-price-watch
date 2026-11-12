// Downloads the Consumer Council feed, normalises it, and keeps a small price history.
// ADJUST the field names in normalise() once you have looked at the real JSON.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';

const URL_ = 'https://online-price-watch.consumer.org.hk/opw/opendata/pricewatch.json';
const OUT = 'public/data/products.json';
const HIST = 'public/data/history.json';
const STORE_NAMES = { PARKNSHOP: 'ParknShop', WELLCOME: 'Wellcome', MARKETPLACE: 'Market Place', AEON: 'AEON', DCHFOOD: 'DCH Food Mart', WATSONS: 'Watsons', USELECT: 'U-Select' };

const text = (o) => typeof o === 'string' ? { en: o, zh: o } :
  { en: o?.en ?? o?.['zh-Hant'] ?? '', zh: o?.['zh-Hant'] ?? o?.zh ?? o?.en ?? '' };
const pick = (o, keys) => { for (const k of keys) if (o?.[k] != null && o[k] !== '') return o[k]; return undefined; };

function normalise(raw) {
  const arr = Array.isArray(raw) ? raw : (raw.products ?? raw.data ?? []);
  const products = [];
  for (const r of arr) {
    const prices = (r.prices ?? [])
      .map((p) => {
        const code = String(p.supermarketCode ?? p.store ?? '').toUpperCase();
        const offer = Array.isArray(p.offers) && p.offers[0] ? text(p.offers[0]).en : undefined;
        return { store: STORE_NAMES[code] ?? code, price: Number(p.price), offer };
      })
      .filter((p) => p.store && Number.isFinite(p.price) && p.price > 0);
    if (!prices.length) continue;
    const name = text(pick(r, ['name', 'productName']));
    const brand = text(pick(r, ['brand', 'brandName']));
    const cat = text(pick(r, ['cat1Name', 'category', 'cat1']));
    const vals = prices.map((p) => p.price);
    const min = Math.min(...vals), max = Math.max(...vals);
    products.push({
      code: String(r.code ?? r.id ?? products.length), en: name.en, zh: name.zh,
      brand: brand.en || brand.zh, cat: cat.en || cat.zh || 'Other', unit: r.unit,
      prices: prices.sort((a, b) => a.price - b.price), min, max,
      avg: vals.reduce((a, b) => a + b, 0) / vals.length, lowStore: prices.find((p) => p.price === min).store,
    });
  }
  return products;
}

let products;
try {
  const res = await fetch(URL_);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  products = normalise(await res.json());
  if (!products.length) throw new Error('No products parsed: check field names in normalise()');
} catch (e) {
  console.warn('Data fetch failed:', e.message);
  if (existsSync(OUT)) { console.warn('Keeping existing', OUT); process.exit(0); }
  products = [{ code: 'sample1', en: 'Sample Milk 1L', zh: '樣本牛奶 1L', brand: 'Sample', cat: 'Drinks', prices: [{ store: 'ParknShop', price: 10.9 }, { store: 'Wellcome', price: 12.9 }], min: 10.9, max: 12.9, avg: 11.9, lowStore: 'ParknShop' }];
}

mkdirSync('public/data', { recursive: true });
const stores = [...new Set(products.flatMap((p) => p.prices.map((x) => x.store)))].sort();
writeFileSync(OUT, JSON.stringify({ updated: new Date().toISOString(), stores, products }));

// History: store a point only when a product's lowest price changes (keeps the file small).
const hist = existsSync(HIST) ? JSON.parse(readFileSync(HIST, 'utf8')) : {};
const day = new Date().toISOString().slice(0, 10);
for (const p of products) {
  const h = (hist[p.code] ??= []);
  if (!h.length || h[h.length - 1][1] !== p.min) { h.push([day, p.min]); if (h.length > 30) h.shift(); }
}
writeFileSync(HIST, JSON.stringify(hist));
console.log(`Saved ${products.length} products, ${stores.length} stores`);
