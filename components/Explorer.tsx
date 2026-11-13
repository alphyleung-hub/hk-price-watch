'use client';
import { useEffect, useMemo, useState } from 'react';
import { CartesianGrid, Cell, Bar, BarChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Check, Languages, Minus, Moon, Plus, Search, ShoppingBasket, Sun, Type, X } from 'lucide-react';
import type { Data, History, PriceHistory, Product } from '@/lib/types';
import { T, type Lang } from '@/lib/i18n';
import { catInfo } from '@/lib/categories';

const hk = (n: number) => `HK$${n.toFixed(2)}`;
const save = (p: Product) => p.max - p.min;
const pct = (p: Product) => (p.max ? Math.round((save(p) / p.max) * 100) : 0);
const hasOffer = (p: Product) => p.prices.some((x) => x.offer);
const icon = (c: string) => catInfo(c, 'en').icon;

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
const colorOf = (s: string, stores: string[]) => PAL[Math.max(0, stores.indexOf(s)) % PAL.length];
function Tag({ s, stores }: { s: string; stores: string[] }) {
  const c = colorOf(s, stores);
  return <span style={{ color: c, borderColor: c + '55', background: c + '14' }} className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-sm font-medium">● {s}</span>;
}

// Daily price history: points are saved only when a price changes, so fill in every day between them.
const DAY = 864e5;
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
function buildSeries(h: PriceHistory | undefined, today: string, range: number) {
  if (!h || Array.isArray(h) || !today) return null;
  const stores = Object.keys(h);
  let start = today;
  stores.forEach((s) => { if (h[s][0] && h[s][0][0] < start) start = h[s][0][0]; });
  if (range) { const c = iso(Date.parse(today) - range * DAY); if (c > start) start = c; }
  const idx: Record<string, number> = {};
  stores.forEach((s) => (idx[s] = -1));
  const rows: Record<string, string | number | null>[] = [];
  for (let t = Date.parse(start); t <= Date.parse(today); t += DAY) {
    const d = iso(t);
    const row: Record<string, string | number | null> = { d };
    let low: number | null = null;
    stores.forEach((s) => {
      const a = h[s];
      while (idx[s] + 1 < a.length && a[idx[s] + 1][0] <= d) idx[s]++;
      const v = idx[s] >= 0 ? a[idx[s]][1] : null;
      row[s] = v;
      if (v !== null && (low === null || v < low)) low = v;
    });
    row.low = low;
    rows.push(row);
  }
  const changes: { d: string; s: string; from: number; to: number }[] = [];
  stores.forEach((s) => {
    const a = h[s];
    for (let i = 1; i < a.length; i++) {
      const f = a[i - 1][1], to = a[i][1];
      if (f !== null && to !== null && f !== to) changes.push({ d: a[i][0], s, from: f, to });
    }
  });
  changes.sort((x, y) => y.d.localeCompare(x.d));
  return { stores, rows, changes: changes.slice(0, 10) };
}

function Sheet({ onClose, closeLabel, children }: { onClose: () => void; closeLabel: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-30 grid place-items-end bg-slate-950/50 backdrop-blur-sm sm:place-items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-xl overflow-auto rounded-t-3xl bg-white px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-6 shadow-2xl dark:bg-slate-900 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} aria-label={closeLabel} className="float-right ml-3 grid h-11 w-11 place-items-center rounded-xl border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
        {children}
      </div>
    </div>
  );
}

const iconBtn = 'grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800';
const field = 'h-12 rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900';
const card = 'rounded-3xl bg-white shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800';
const chip = (on: boolean) => `h-10 rounded-full border px-4 text-sm font-medium ${on ? 'border-primary bg-primary text-white' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'}`;

export default function Explorer() {
  const [data, setData] = useState<Data | null>(null);
  const [hist, setHist] = useState<History | null>(null);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [store, setStore] = useState('');
  const [sort, setSort] = useState<'save' | 'cheap' | 'name'>('save');
  const [open, setOpen] = useState<Product | null>(null);
  const [tab, setTab] = useState<'price' | 'hist'>('price');
  const [range, setRange] = useState(90);
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
  // The history file is only downloaded the first time a product is opened.
  useEffect(() => {
    if (!open || hist) return;
    fetch('/data/history.json').then((r) => (r.ok ? r.json() : {})).then(setHist).catch(() => setHist({}));
  }, [open, hist]);
  useEffect(() => { if (ready) try { localStorage.basket = JSON.stringify(basket); } catch {} }, [basket, ready]);
  useEffect(() => { document.documentElement.lang = lang === 'zh' ? 'zh-Hant' : 'en'; if (ready) try { localStorage.lang = lang; } catch {} }, [lang, ready]);
  useEffect(() => { document.documentElement.style.fontSize = big ? '20px' : ''; if (ready) try { localStorage.big = big ? '1' : '0'; } catch {} }, [big, ready]);

  const stores = data?.stores ?? [];
  const today = data?.day ?? data?.updated.slice(0, 10) ?? '';
  const byCode = useMemo(() => new Map((data?.products ?? []).map((p) => [p.code, p])), [data]);
  const hay = useMemo(() => new Map((data?.products ?? []).map((p) => [p.code, `${p.en} ${p.zh} ${p.brand} ${p.cat}`.toLowerCase()])), [data]);
  const cats = useMemo(() => {
    const n: Record<string, number> = {};
    data?.products.forEach((p) => (n[p.cat] = (n[p.cat] || 0) + 1));
    return Object.entries(n).sort((a, b) => b[1] - a[1]).slice(0, 12).map((x) => x[0]);
  }, [data]);

  const nm = (p: Product) => (lang === 'zh' ? p.zh || p.en : p.en || p.zh);
  const alt = (p: Product) => (lang === 'zh' ? p.en : p.zh);
  const openProduct = (p: Product) => { setTab('price'); setOpen(p); };

  const list = useMemo(() => {
    if (!data) return [];
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    // A search always covers ALL products; the category button only applies when not searching.
    const base = data.products.filter((p) => (terms.length || !cat || p.cat === cat) && (!store || p.prices.some((x) => x.store === store)));
    let out = base;
    if (terms.length) {
      out = base.filter((p) => terms.every((x) => hay.get(p.code)!.includes(x)));
      if (!out.length) out = base.filter((p) => terms.every((x) => x.length >= 4 && hay.get(p.code)!.split(/[\s&/]+/).some((w) => lev(w.slice(0, x.length), x) <= 1)));
    }
    return [...out].sort((a, b) => (sort === 'cheap' ? a.min - b.min : sort === 'name' ? a.en.localeCompare(b.en) : save(b) - save(a)));
  }, [data, q, cat, store, sort, hay]);

  const series = useMemo(() => (open && hist ? buildSeries(hist[open.code], today, range) : null), [open, hist, today, range]);

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

  return (
    <div className="pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-slate-50/90 pt-[env(safe-area-inset-top)] backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto max-w-5xl px-4 py-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h1 className="flex items-center gap-2 text-lg font-bold">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-lg text-white">🛒</span>
              <span>HK <span className="text-primary">Price Watch</span></span>
            </h1>
            <div className="flex gap-2">
              <button onClick={() => setLang(lang === 'en' ? 'zh' : 'en')} aria-label={t.language} className={`${iconBtn} w-auto gap-1 px-3 text-sm font-semibold`}><Languages className="h-5 w-5" />{lang === 'en' ? '繁' : 'EN'}</button>
              <button onClick={() => setBig(!big)} aria-label={t.bigText} aria-pressed={big} className={`${iconBtn} ${big ? '!border-primary !bg-primary text-white' : ''}`}><Type className="h-5 w-5" /></button>
              <button onClick={toggleDark} aria-label={t.dark} className={iconBtn}><Sun className="hidden h-5 w-5 dark:block" /><Moon className="h-5 w-5 dark:hidden" /></button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
            <input value={q} onChange={(e) => { setQ(e.target.value); setLimit(48); }} onBlur={remember} onKeyDown={(e) => e.key === 'Enter' && remember()} placeholder={t.searchPh} type="search"
              className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-lg shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15 dark:border-slate-700 dark:bg-slate-900" />
          </div>
          {!q && recent.length > 0 && (
            <div className="mt-2 flex gap-2 overflow-x-auto">
              {recent.map((r) => <button key={r} onClick={() => setQ(r)} className="shrink-0 rounded-full bg-slate-200/70 px-3 py-1 text-sm dark:bg-slate-800">🕘 {r}</button>)}
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
              <div key={k} className={`${card} px-3 py-5 text-center`}><b className="block text-2xl tracking-tight">{v}</b><small className="text-slate-500">{k}</small></div>
            ))}
          </section>
          <p className="mt-3 text-center text-sm text-slate-400">{t.updated} {today}</p>

          <div className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {['', ...cats].map((c) => {
              const on = !q && c === cat;
              const info = c ? catInfo(c, lang) : { icon: '🛍️', label: t.all };
              return (
                <button key={c} onClick={() => setCat(c)} title={c}
                  className={`flex h-20 flex-col items-center justify-center gap-1 rounded-2xl border px-2 text-center text-sm font-medium leading-tight transition ${on ? 'border-primary bg-primary text-white shadow-md' : 'border-slate-200 bg-white hover:border-primary/40 dark:border-slate-700 dark:bg-slate-900'}`}>
                  <span className="text-2xl">{info.icon}</span><span>{info.label}</span>
                </button>
              );
            })}
          </div>
          {!q && cat && <p className="mt-2 text-sm text-slate-400">{cat}</p>}
          <div className="mt-4 flex flex-wrap gap-3">
            <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className={field}>
              <option value="save">{t.sortSave}</option><option value="cheap">{t.sortCheap}</option><option value="name">{t.sortName}</option>
            </select>
            <select value={store} onChange={(e) => setStore(e.target.value)} className={field}>
              <option value="">{t.allStores}</option>{stores.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>

          <h3 className="mb-5 mt-10 text-xl font-semibold">{q ? t.results(list.length) : t.bestToday}</h3>
          {!list.length && <p className="py-16 text-center text-slate-500">{t.noResults}</p>}
          <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {list.slice(0, limit).map((p) => (
              <article key={p.code} className={`${card} flex flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-md`}>
                <button onClick={() => openProduct(p)} className="flex-1 text-left">
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-slate-100 text-3xl dark:bg-slate-800">{icon(p.cat)}</div>
                    {save(p) > 0 && <span className="rounded-full bg-success/15 px-2.5 py-1 text-sm font-semibold text-success">-{pct(p)}%</span>}
                  </div>
                  <div className="mt-4 text-sm text-slate-500">{p.brand}</div>
                  <div className="line-clamp-2 text-lg font-semibold leading-snug">{nm(p)}</div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-4xl font-bold tracking-tight text-success">{hk(p.min)}</span>
                    {p.max > p.min && <span className="text-sm text-slate-400 line-through">{hk(p.max)}</span>}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Tag s={p.lowStore} stores={stores} />
                    {hasOffer(p) && <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-sm font-medium text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">🏷️ {t.offer}</span>}
                  </div>
                  {save(p) > 0 && <div className="mt-2 text-sm text-slate-500">💰 {t.save} {hk(save(p))}</div>}
                </button>
                <button onClick={() => add(p.code)} className={`mt-4 flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition ${basket[p.code] ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'}`}>
                  {basket[p.code] ? <><Check className="h-4 w-4" />{t.inList} ({basket[p.code]})</> : <><Plus className="h-4 w-4" />{t.addList}</>}
                </button>
              </article>
            ))}
          </section>
          {list.length > limit && <button onClick={() => setLimit(limit + 48)} className="mx-auto mt-10 block rounded-full bg-primary px-8 py-3 font-semibold text-white">{t.showMore}</button>}
        </>)}
      </main>
      <footer className="mt-14 px-4 text-center text-sm text-slate-400">{t.footer}</footer>

      <button onClick={() => setShowList(true)} aria-label={t.myList}
        className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-5 z-20 flex h-14 min-w-14 items-center justify-center gap-2 rounded-full bg-primary px-4 text-white shadow-lg transition hover:scale-105">
        <ShoppingBasket className="h-6 w-6" />{count > 0 && <span className="rounded-full bg-white px-2 text-sm font-bold text-primary">{count}</span>}
      </button>

      {open && (
        <Sheet onClose={() => setOpen(null)} closeLabel={t.close}>
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-slate-100 text-4xl dark:bg-slate-800">{icon(open.cat)}</div>
            <div className="min-w-0">
              <div className="text-sm text-slate-500">{open.brand} · {catInfo(open.cat, lang).label}</div>
              <h2 className="text-xl font-bold leading-snug">{nm(open)}</h2>
              <div className="text-sm text-slate-500">{alt(open)}</div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
            {(['price', 'hist'] as const).map((k) => (
              <button key={k} onClick={() => setTab(k)} className={`h-11 rounded-xl font-semibold transition ${tab === k ? 'bg-white shadow-sm dark:bg-slate-900' : 'text-slate-500'}`}>{k === 'price' ? t.tabPrices : t.tabHistory}</button>
            ))}
          </div>

          {tab === 'price' && (<div className="mt-6">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl bg-success/10 p-3"><small>🟢 {t.lowest}</small><b className="block text-lg text-success">{hk(open.min)}</b></div>
              <div className="rounded-2xl bg-warning/10 p-3"><small>🟡 {t.average}</small><b className="block text-lg text-warning">{hk(open.avg)}</b></div>
              <div className="rounded-2xl bg-danger/10 p-3"><small>🔴 {t.highest}</small><b className="block text-lg text-danger">{hk(open.max)}</b></div>
            </div>
            {save(open) > 0 && <p className="mt-4 font-semibold text-success">💰 {t.youSave} {hk(save(open))} ({pct(open)}%) {t.at} {open.lowStore}</p>}
            <button onClick={() => add(open.code)} className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary font-semibold text-white">
              {basket[open.code] ? <><Check className="h-5 w-5" />{t.inList} ({basket[open.code]}) +1</> : <><Plus className="h-5 w-5" />{t.addList}</>}
            </button>
            {hasOffer(open) && (
              <div className="mt-6 space-y-2">
                <h3 className="font-semibold">🏷️ {t.offersHere}</h3>
                {open.prices.filter((x) => x.offer).map((x) => <div key={x.store} className="flex flex-wrap items-center gap-2 text-sm"><Tag s={x.store} stores={stores} /><span>{x.offer}</span></div>)}
              </div>
            )}
            <h3 className="mb-1 mt-6 font-semibold">{t.compare}</h3>
            <div style={{ height: 48 + open.prices.length * 34 }}>
              <ResponsiveContainer>
                <BarChart data={open.prices} layout="vertical" margin={{ left: 8, right: 44 }}>
                  <XAxis type="number" hide domain={[0, open.max * 1.1]} />
                  <YAxis type="category" dataKey="store" width={92} tick={{ fontSize: 13 }} />
                  <Tooltip formatter={(v) => hk(Number(v))} />
                  <Bar dataKey="price" radius={6} label={{ position: 'right', fontSize: 12, formatter: (v: number) => hk(v) }}>
                    {open.prices.map((p) => <Cell key={p.store} fill={p.price === open.min ? '#22C55E' : p.price === open.max ? '#EF4444' : '#EAB308'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>)}

          {tab === 'hist' && (<div className="mt-6">
            <div className="mb-4 flex gap-2">
              {[30, 90, 0].map((r) => <button key={r} onClick={() => setRange(r)} className={chip(range === r)}>{r === 30 ? t.r30 : r === 90 ? t.r90 : t.rAll}</button>)}
            </div>
            {hist === null ? <p className="py-10 text-center text-slate-500">{t.loading}</p>
              : !series || series.rows.length < 2 ? <p className="rounded-2xl bg-slate-100 p-4 text-slate-600 dark:bg-slate-800 dark:text-slate-300">📈 {t.historyStart((series?.rows[0]?.d as string | undefined) ?? today)}</p>
              : (<>
                <div className="h-64">
                  <ResponsiveContainer>
                    <LineChart data={series.rows} margin={{ left: 0, right: 12, top: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
                      <XAxis dataKey="d" tickFormatter={(d: string) => d.slice(5)} minTickGap={36} tick={{ fontSize: 12 }} />
                      <YAxis domain={['auto', 'auto']} width={44} tick={{ fontSize: 12 }} tickFormatter={(v: number) => `$${v}`} />
                      <Tooltip formatter={(v) => (v == null || isNaN(Number(v)) ? '–' : hk(Number(v)))} />
                      {series.stores.map((s) => <Line key={s} name={s} dataKey={s} type="stepAfter" stroke={colorOf(s, stores)} strokeWidth={2} dot={false} connectNulls={false} />)}
                      <Line name={t.lowest} dataKey="low" type="stepAfter" stroke="#22C55E" strokeWidth={4} strokeOpacity={0.55} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full border border-success/40 bg-success/10 px-2.5 py-0.5 text-sm font-medium text-success">● {t.lowest}</span>
                  {series.stores.map((s) => <Tag key={s} s={s} stores={stores} />)}
                </div>
                <h3 className="mb-2 mt-6 font-semibold">{t.changesTitle}</h3>
                {!series.changes.length ? <p className="text-sm text-slate-500">{t.noChanges}</p> : (
                  <ul className="space-y-2">
                    {series.changes.map((c, i) => (
                      <li key={i} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <span className="text-slate-500">{c.d}</span><Tag s={c.s} stores={stores} />
                        <span>{hk(c.from)} → <b className={c.to < c.from ? 'text-success' : 'text-danger'}>{hk(c.to)} {c.to < c.from ? '▼' : '▲'}</b></span>
                      </li>
                    ))}
                  </ul>
                )}
              </>)}
          </div>)}
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
