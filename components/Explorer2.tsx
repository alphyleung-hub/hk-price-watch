'use client';
import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Languages, Minus, Moon, Plus, Search, ShoppingBasket, Sun, Type, X } from 'lucide-react';
import type { Data, History, Product } from '@/lib/types';
import { T, type Lang } from '@/lib/i18n';

const hk = (n: number) => `HK$${n.toFixed(2)}`;
const save = (p: Product) => p.max - p.min;
const pct = (p: Product) => (p.max ? Math.round((save(p) / p.max) * 100) : 0);
const hasOffer = (p: Product) => p.prices.some((x) => x.offer);
const icon = (c: string) =>
  /beer|wine|酒/i.test(c) ? '🍺' : /drink|beverage|飲|水/i.test(c) ? '🥤' : /rice|noodle|oil|米|麵|油/i.test(c) ? '🍚' :
  /milk|dairy|egg|奶|蛋/i.test(c) ? '🥛' : /snack|biscuit|零食|餅/i.test(c) ? '🍪' :
  /household|clean|paper|家|紙|洗/i.test(c) ? '🧻' : /care|hair|skin|護|髮/i.test(c) ? '🧴' : '🛒';

function lev(a: string, b: string) {
  const m = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return m[a.length][b.length];
}

// One fixed colour per supermarket (no red/green, which mean price levels).
const PAL = ['#2563EB', '#DB2777', '#EA580C', '#0D9488', '#7C3AED', '#B45309', '#475569', '#0891B2', '#4F46E5'];
function Tag({ s, stores }: { s: string; stores: string[] }) {
  const c = PAL[Math.max(0, stores.indexOf(s)) % PAL.length];
  return <span style={{ color: c, borderColor: c + '66', background: c + '1A' }} className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-sm font-medium">● {s}</span>;
}

function Sheet({ onClose, closeLabel, children }: { onClose: () => void; closeLabel: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-black/50 p-3" onClick={onClose}>
      <div className="max-h-[88vh] w-full max-w-xl overflow-auto rounded-3xl bg-white p-6 shadow-xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} aria-label={closeLabel} className="float-right grid h-11 w-11 place-items-center rounded-xl border border-slate-200 dark:border-slate-700"><X className="h-5 w-5" /></button>
        {children}
      </div>
    </div>
  );
}

const iconBtn = 'grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900';
const field = 'h-12 rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900';

export default function Explorer() {
  const [data, setData] = useState<Data | null>(null);
  const [hist, setHist] = useState<History>({});
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [store, setStore] = useState('');
  const [offersOnly, setOffersOnly] = useState(false);
  const [sort, setSort] = useState<'save' | 'cheap' | 'name'>('save');
  const [open, setOpen] = useState<Product | null>(null);
  const [showList, setShowList] = useState(false);
  const [limit, setLimit] = useState(48);
  const [recent, setRecent] = useState<string[]>([]);
  const [lang, setLang] = useState<Lang>('en');
  const [big, setBig] = useState(false);
  const [basket, setBasket] = useState<Record<string, number>>({});
  const [ready, setReady] = useState(false);
  const t = T[lang];

  useEffect(() => {
    fetch('/data/products.json').then((r) => r.json()).then(setData);
    fetch('/data/history.json').then((r) => (r.ok ? r.json() : {})).then(setHist).catch(() => {});
    try {
      setRecent(JSON.parse(localStorage.recent || '[]'));
      setBasket(JSON.parse(localStorage.basket || '{}'));
      setBig(localStorage.big === '1');
      setLang(localStorage.lang === 'zh' || (!localStorage.lang && navigator.language.startsWith('zh')) ? 'zh' : 'en');
      const th = localStorage.theme;
      if (th === 'dark' || (!th && matchMedia('(prefers-color-scheme: dark)').matches)) document.documentElement.classList.add('dark');
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => { if (ready) try { localStorage.basket = JSON.stringify(basket); } catch {} }, [basket, ready]);
  useEffect(() => { document.documentElement.lang = lang === 'zh' ? 'zh-Hant' : 'en'; if (ready) try { localStorage.lang = lang; } catch {} }, [lang, ready]);
  useEffect(() => { document.documentElement.style.fontSize = big ? '20px' : ''; if (ready) try { localStorage.big = big ? '1' : '0'; } catch {} }, [big, ready]);

  const stores = data?.stores ?? [];
  const byCode = useMemo(() => new Map((data?.products ?? []).map((p) => [p.code, p])), [data]);
  const hay = useMemo(() => new Map((data?.products ?? []).map((p) => [p.code, `${p.en} ${p.zh} ${p.brand} ${p.cat}`.toLowerCase()])), [data]);
  const cats = useMemo(() => {
    const n: Record<string, number> = {};
    data?.products.forEach((p) => (n[p.cat] = (n[p.cat] || 0) + 1));
    return Object.entries(n).sort((a, b) => b[1] - a[1]).slice(0, 12).map((x) => x[0]);
  }, [data]);

  const nm = (p: Product) => (lang === 'zh' ? p.zh || p.en : p.en || p.zh);
  const alt = (p: Product) => (lang === 'zh' ? p.en : p.zh);

  const list = useMemo(() => {
    if (!data) return [];
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    // A search always covers ALL products; the category chip only applies when not searching.
    const base = data.products.filter((p) => (terms.length || !cat || p.cat === cat) && (!store || p.prices.some((x) => x.store === store)) && (!offersOnly || hasOffer(p)));
    let out = base;
    if (terms.length) {
      out = base.filter((p) => terms.every((x) => hay.get(p.code)!.includes(x)));
      if (!out.length) out = base.filter((p) => terms.every((x) => x.length >= 4 && hay.get(p.code)!.split(/[\s&/]+/).some((w) => lev(w.slice(0, x.length), x) <= 1)));
    }
    return [...out].sort((a, b) => (sort === 'cheap' ? a.min - b.min : sort === 'name' ? a.en.localeCompare(b.en) : save(b) - save(a)));
  }, [data, q, cat, store, offersOnly, sort, hay]);

  // Shopping list maths
  const lines = useMemo(() => Object.entries(basket).map(([c, n]) => ({ p: byCode.get(c)!, n })).filter((l) => l.p), [basket, byCode]);
  const totals = useMemo(() => stores.map((s) => {
    let total = 0, missing = 0;
    lines.forEach(({ p, n }) => { const x = p.prices.find((y) => y.store === s); if (x) total += x.price * n; else missing++; });
    return { store: s, total, missing };
  }).filter((x) => lines.length && x.missing < lines.length).sort((a, b) => a.missing - b.missing || a.total - b.total), [stores, lines]);
  const complete = totals.filter((x) => x.missing === 0);
  const bestStore = complete[0];
  const worstTotal = complete.length ? complete[complete.length - 1].total : 0;
  const split = lines.reduce((s, { p, n }) => s + p.min * n, 0);
  const count = Object.values(basket).reduce((a, b) => a + b, 0);
  const add = (c: string) => setBasket((b) => ({ ...b, [c]: (b[c] || 0) + 1 }));
  const setQty = (c: string, n: number) => setBasket((b) => { const x = { ...b }; if (n <= 0) delete x[c]; else x[c] = Math.min(n, 99); return x; });

  const remember = () => {
    const s = q.trim();
    if (s.length < 2) return;
    const r = [s, ...recent.filter((x) => x !== s)].slice(0, 5);
    setRecent(r);
    try { localStorage.recent = JSON.stringify(r); } catch {}
  };
  const toggleDark = () => {
    const d = document.documentElement.classList.toggle('dark');
    try { localStorage.theme = d ? 'dark' : 'light'; } catch {}
  };

  const best = data?.products.reduce((a, b) => (save(b) > save(a) ? b : a), data.products[0]);
  const card = 'rounded-3xl bg-white shadow-sm dark:bg-slate-900';

  return (
    <div className="pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50/95 pt-[env(safe-area-inset-top)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto max-w-5xl px-4 py-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h1 className="text-xl font-bold">🛒 HK <span className="text-primary">Price Watch</span></h1>
            <div className="flex gap-2">
              <button onClick={() => setLang(lang === 'en' ? 'zh' : 'en')} aria-label={t.language} className={`${iconBtn} w-auto gap-1 px-3 text-sm font-semibold`}><Languages className="h-5 w-5" />{lang === 'en' ? '繁' : 'EN'}</button>
              <button onClick={() => setBig(!big)} aria-label={t.bigText} aria-pressed={big} className={`${iconBtn} ${big ? 'border-primary bg-primary text-white' : ''}`}><Type className="h-5 w-5" /></button>
              <button onClick={toggleDark} aria-label={t.dark} className={iconBtn}><Sun className="hidden h-5 w-5 dark:block" /><Moon className="h-5 w-5 dark:hidden" /></button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
            <input value={q} onChange={(e) => { setQ(e.target.value); setLimit(48); }} onBlur={remember} onKeyDown={(e) => e.key === 'Enter' && remember()} placeholder={t.searchPh} type="search"
              className="h-14 w-full rounded-2xl border-2 border-slate-200 bg-white pl-12 pr-4 text-lg outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-900" />
          </div>
          {!q && recent.length > 0 && (
            <div className="mt-2 flex gap-2 overflow-x-auto">
              {recent.map((r) => <button key={r} onClick={() => setQ(r)} className="shrink-0 rounded-full bg-slate-200 px-3 py-1 text-sm dark:bg-slate-800">🕘 {r}</button>)}
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4">
        <section className="py-10">
          <h2 className="text-3xl font-bold tracking-tight">{t.heroTitle}</h2>
          <p className="mt-1 text-lg text-slate-500">{t.heroSub}</p>
        </section>

        {!data ? <p className="py-20 text-center text-slate-500">{t.loading}</p> : (<>
          <section className="grid grid-cols-3 gap-4">
            {[[t.products, data.products.length.toLocaleString()], [t.stores, String(stores.length)], [t.topSaving, best ? hk(save(best)) : '-']].map(([k, v]) => (
              <div key={k} className={`${card} px-4 py-5 text-center`}><b className="block text-2xl">{v}</b><small className="text-slate-500">{k}</small></div>
            ))}
          </section>
          <p className="mt-2 text-center text-sm text-slate-400">{t.updated} {data.updated.slice(0, 10)}</p>

          <div className="mt-8 flex gap-2 overflow-x-auto py-1">
            {['', ...cats].map((c) => (
              <button key={c} onClick={() => setCat(c)} className={`shrink-0 rounded-full border px-5 py-3 ${!q && c === cat ? 'border-primary bg-primary text-white' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'}`}>{c || t.all}</button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className={field}>
              <option value="save">{t.sortSave}</option><option value="cheap">{t.sortCheap}</option><option value="name">{t.sortName}</option>
            </select>
            <select value={store} onChange={(e) => setStore(e.target.value)} className={field}>
              <option value="">{t.allStores}</option>{stores.map((s) => <option key={s}>{s}</option>)}
            </select>
            <button onClick={() => setOffersOnly(!offersOnly)} aria-pressed={offersOnly} className={`${field} ${offersOnly ? 'border-primary bg-primary text-white' : ''}`}>{t.offersOnly}</button>
          </div>

          <h3 className="mb-4 mt-10 text-xl font-semibold">{q ? t.results(list.length) : t.bestToday}</h3>
          {!list.length && <p className="py-16 text-center text-slate-500">{t.noResults}</p>}
          <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {list.slice(0, limit).map((p) => (
              <article key={p.code} className={`${card} flex flex-col p-6`}>
                <button onClick={() => setOpen(p)} className="flex-1 text-left">
                  <div className="mb-4 grid h-24 place-items-center rounded-2xl bg-slate-100 text-5xl dark:bg-slate-800">{icon(p.cat)}</div>
                  <div className="text-sm text-slate-500">{p.brand}</div>
                  <div className="mt-0.5 text-lg font-semibold leading-snug">{nm(p)}</div>
                  <div className="mt-4 text-4xl font-bold tracking-tight text-success">{hk(p.min)}</div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Tag s={p.lowStore} stores={stores} />
                    {hasOffer(p) && <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-sm font-medium text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">🏷️ {t.offer}</span>}
                  </div>
                  {save(p) > 0 && <div className="mt-3 font-semibold text-success">💰 {t.save} {hk(save(p))} ({pct(p)}%)</div>}
                </button>
                <button onClick={() => add(p.code)} className={`mt-5 h-12 rounded-2xl border font-semibold ${basket[p.code] ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 dark:border-slate-700'}`}>
                  {basket[p.code] ? `✓ ${t.inList} (${basket[p.code]})` : `+ ${t.addList}`}
                </button>
              </article>
            ))}
          </section>
          {list.length > limit && <button onClick={() => setLimit(limit + 48)} className="mx-auto mt-10 block rounded-full bg-primary px-8 py-3 font-semibold text-white">{t.showMore}</button>}
        </>)}
      </main>
      <footer className="mt-12 px-4 text-center text-sm text-slate-500">{t.footer}</footer>

      <button onClick={() => setShowList(true)} aria-label={t.myList}
        className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-5 z-20 flex h-16 items-center gap-2 rounded-full bg-primary px-6 text-lg font-semibold text-white shadow-lg">
        <ShoppingBasket className="h-6 w-6" />{count > 0 && count}
      </button>

      {open && (
        <Sheet onClose={() => setOpen(null)} closeLabel={t.close}>
          <div className="text-sm text-slate-500">{open.brand} · {open.cat}</div>
          <h2 className="text-xl font-bold">{nm(open)}</h2>
          <div className="text-slate-500">{alt(open)}</div>
          <div className="my-5 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl bg-slate-100 p-3 dark:bg-slate-800"><small>🟢 {t.lowest}</small><b className="block text-success">{hk(open.min)}</b></div>
            <div className="rounded-2xl bg-slate-100 p-3 dark:bg-slate-800"><small>🟡 {t.average}</small><b className="block text-warning">{hk(open.avg)}</b></div>
            <div className="rounded-2xl bg-slate-100 p-3 dark:bg-slate-800"><small>🔴 {t.highest}</small><b className="block text-danger">{hk(open.max)}</b></div>
          </div>
          {save(open) > 0 && <p className="mb-3 font-semibold text-success">💰 {t.youSave} {hk(save(open))} ({pct(open)}%) {t.at} {open.lowStore}</p>}
          <button onClick={() => add(open.code)} className="mb-5 h-12 w-full rounded-2xl bg-primary font-semibold text-white">{basket[open.code] ? `✓ ${t.inList} (${basket[open.code]})  +` : `+ ${t.addList}`}</button>
          {hasOffer(open) && (
            <div className="mb-5 space-y-2">
              <h3 className="font-semibold">🏷️ {t.offersHere}</h3>
              {open.prices.filter((x) => x.offer).map((x) => <div key={x.store} className="flex flex-wrap items-center gap-2 text-sm"><Tag s={x.store} stores={stores} /><span>{x.offer}</span></div>)}
            </div>
          )}
          <h3 className="mb-1 font-semibold">{t.compare}</h3>
          <div style={{ height: 48 + open.prices.length * 34 }}>
            <ResponsiveContainer>
              <BarChart data={open.prices} layout="vertical" margin={{ left: 8, right: 36 }}>
                <XAxis type="number" hide domain={[0, open.max * 1.1]} />
                <YAxis type="category" dataKey="store" width={92} tick={{ fontSize: 13 }} />
                <Tooltip formatter={(v) => hk(Number(v))} />
                <Bar dataKey="price" radius={6} label={{ position: 'right', fontSize: 12, formatter: (v: number) => hk(v) }}>
                  {open.prices.map((p) => <Cell key={p.store} fill={p.price === open.min ? '#22C55E' : p.price === open.max ? '#EF4444' : '#EAB308'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {(hist[open.code]?.length ?? 0) > 1 && (<>
            <h3 className="mb-1 mt-5 font-semibold">📈 {t.trend}</h3>
            <div className="h-40">
              <ResponsiveContainer>
                <LineChart data={hist[open.code].map(([d, v]) => ({ d: d.slice(5), v }))} margin={{ left: 0, right: 12 }}>
                  <XAxis dataKey="d" tick={{ fontSize: 12 }} /><YAxis domain={['auto', 'auto']} width={40} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => hk(Number(v))} /><Line type="stepAfter" dataKey="v" stroke="#2563EB" strokeWidth={3} dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>)}
        </Sheet>
      )}

      {showList && (
        <Sheet onClose={() => setShowList(false)} closeLabel={t.close}>
          <h2 className="mb-5 text-xl font-bold">🛒 {t.myList}</h2>
          {!lines.length ? <p className="py-8 text-slate-500">{t.listEmpty}</p> : (<>
            <ul className="space-y-5">
              {lines.map(({ p, n }) => (
                <li key={p.code} className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{nm(p)}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">{hk(p.min)} <Tag s={p.lowStore} stores={stores} /></div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setQty(p.code, n - 1)} aria-label="-" className={iconBtn}><Minus className="h-4 w-4" /></button>
                    <span className="w-7 text-center text-lg font-semibold">{n}</span>
                    <button onClick={() => setQty(p.code, n + 1)} aria-label="+" className={iconBtn}><Plus className="h-4 w-4" /></button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-7 rounded-2xl bg-success/10 p-5">
              <div className="text-sm text-slate-600 dark:text-slate-300">{t.cheapestStore}</div>
              {bestStore ? (<>
                <div className="mt-1 flex flex-wrap items-center gap-3"><span className="text-4xl font-bold text-success">{hk(bestStore.total)}</span><Tag s={bestStore.store} stores={stores} /></div>
                {worstTotal > bestStore.total && <div className="mt-2 font-semibold text-success">💰 {t.youSave} {hk(worstTotal - bestStore.total)}</div>}
              </>) : <p className="mt-1">{t.noSingle}</p>}
            </div>

            {totals.length > (bestStore ? 1 : 0) && (
              <div className="mt-5">
                <h3 className="mb-2 text-sm font-semibold text-slate-500">{t.otherStores}</h3>
                <ul className="space-y-2">
                  {totals.slice(bestStore ? 1 : 0).map((x) => (
                    <li key={x.store} className={`flex items-center justify-between gap-2 ${x.missing ? 'opacity-60' : ''}`}>
                      <Tag s={x.store} stores={stores} />
                      <span className="text-sm">{x.missing > 0 && <span className="mr-2 text-slate-500">{t.missing(x.missing)}</span>}<b>{hk(x.total)}</b></span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-5 rounded-2xl border border-slate-200 p-5 dark:border-slate-700">
              <div className="font-semibold">{t.splitBuy}</div>
              <div className="text-sm text-slate-500">{t.splitNote}</div>
              <div className="mt-1 text-2xl font-bold">{hk(split)}</div>
            </div>
            <button onClick={() => setBasket({})} className="mt-5 h-12 w-full rounded-2xl border border-slate-200 font-semibold dark:border-slate-700">{t.clear}</button>
          </>)}
        </Sheet>
      )}
    </div>
  );
}
