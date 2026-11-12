'use client';
import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Moon, Search, Sun, X } from 'lucide-react';
import type { Data, History, Product } from '@/lib/types';

const hk = (n: number) => `HK$${n.toFixed(2)}`;
const save = (p: Product) => p.max - p.min;
const pct = (p: Product) => (p.max ? Math.round((save(p) / p.max) * 100) : 0);
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

export default function Explorer() {
  const [data, setData] = useState<Data | null>(null);
  const [hist, setHist] = useState<History>({});
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [store, setStore] = useState('');
  const [sort, setSort] = useState<'save' | 'cheap' | 'name'>('save');
  const [open, setOpen] = useState<Product | null>(null);
  const [limit, setLimit] = useState(48);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    fetch('/data/products.json').then((r) => r.json()).then(setData);
    fetch('/data/history.json').then((r) => (r.ok ? r.json() : {})).then(setHist).catch(() => {});
    try {
      setRecent(JSON.parse(localStorage.recent || '[]'));
      const t = localStorage.theme;
      if (t === 'dark' || (!t && matchMedia('(prefers-color-scheme: dark)').matches)) document.documentElement.classList.add('dark');
    } catch {}
  }, []);

  const hay = useMemo(() => new Map((data?.products ?? []).map((p) => [p.code, `${p.en} ${p.zh} ${p.brand} ${p.cat}`.toLowerCase()])), [data]);
  const cats = useMemo(() => {
    const n: Record<string, number> = {};
    data?.products.forEach((p) => (n[p.cat] = (n[p.cat] || 0) + 1));
    return Object.entries(n).sort((a, b) => b[1] - a[1]).slice(0, 12).map((x) => x[0]);
  }, [data]);

  const list = useMemo(() => {
    if (!data) return [];
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    // A search always covers ALL products; the category chip only applies when not searching.
    const base = data.products.filter((p) => (terms.length || !cat || p.cat === cat) && (!store || p.prices.some((x) => x.store === store)));
    let out = base;
    if (terms.length) {
      out = base.filter((p) => terms.every((t) => hay.get(p.code)!.includes(t)));
      if (!out.length) // typo tolerance, only when nothing matches exactly
        out = base.filter((p) => terms.every((t) => t.length >= 4 && hay.get(p.code)!.split(/[\s&/]+/).some((w) => lev(w.slice(0, t.length), t) <= 1)));
    }
    return [...out].sort((a, b) => (sort === 'cheap' ? a.min - b.min : sort === 'name' ? a.en.localeCompare(b.en) : save(b) - save(a)));
  }, [data, q, cat, store, sort, hay]);

  const remember = () => {
    const t = q.trim();
    if (t.length < 2) return;
    const r = [t, ...recent.filter((x) => x !== t)].slice(0, 5);
    setRecent(r);
    try { localStorage.recent = JSON.stringify(r); } catch {}
  };
  const toggle = () => {
    const d = document.documentElement.classList.toggle('dark');
    try { localStorage.theme = d ? 'dark' : 'light'; } catch {}
  };

  const best = data?.products.reduce((a, b) => (save(b) > save(a) ? b : a), data.products[0]);
  const lowest = data?.products.reduce((a, b) => (b.min < a.min ? b : a), data.products[0]);
  const card = 'rounded-3xl bg-white shadow-sm dark:bg-slate-900';

  return (
    <div className="pb-[env(safe-area-inset-bottom)]">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50/95 pt-[env(safe-area-inset-top)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto max-w-5xl px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <h1 className="text-xl font-bold">🛒 HK <span className="text-primary">Price Watch</span></h1>
            <button onClick={toggle} aria-label="Toggle dark mode" className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 dark:border-slate-700">
              <Sun className="hidden h-5 w-5 dark:block" /><Moon className="h-5 w-5 dark:hidden" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
            <input value={q} onChange={(e) => { setQ(e.target.value); setLimit(48); }} onBlur={remember} onKeyDown={(e) => e.key === 'Enter' && remember()}
              placeholder="Search 搜尋: beer, 豆奶, Vitasoy…" type="search"
              className="h-13 w-full rounded-2xl border-2 border-slate-200 bg-white py-3.5 pl-11 pr-4 text-lg shadow-sm outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-900" />
          </div>
          {!q && recent.length > 0 && (
            <div className="mt-2 flex gap-2 overflow-x-auto">
              {recent.map((r) => <button key={r} onClick={() => setQ(r)} className="shrink-0 rounded-full bg-slate-200 px-3 py-1 text-sm dark:bg-slate-800">🕘 {r}</button>)}
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4">
        <section className="py-5"><h2 className="text-2xl font-bold">Find the cheapest price</h2><p className="text-slate-500">一鍵比較各大超市價錢</p></section>
        {!data ? <p className="py-20 text-center text-slate-500">Loading…</p> : (<>
          <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {[['Products', data.products.length.toLocaleString()], ['Lowest price', lowest ? hk(lowest.min) : '-'], ['Top saving', best ? hk(save(best)) : '-'], ['Stores', data.stores.length], ['Updated', data.updated.slice(0, 10)]]
              .map(([k, v]) => <div key={k} className={`${card} p-4`}><b className="block text-xl">{v}</b><small className="text-slate-500">{k}</small></div>)}
          </section>

          <div className="mt-4 flex gap-2 overflow-x-auto py-1">
            {['', ...cats].map((c) => <button key={c} onClick={() => setCat(c)}
              className={`shrink-0 rounded-full border px-4 py-2.5 ${!q && c === cat ? 'border-primary bg-primary text-white' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'}`}>{c || 'All'}</button>)}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900">
              <option value="save">Biggest savings</option><option value="cheap">Cheapest first</option><option value="name">Name A–Z</option>
            </select>
            <select value={store} onChange={(e) => setStore(e.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900">
              <option value="">All stores</option>{data.stores.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>

          <h3 className="mb-2 mt-6 text-lg font-semibold">{q ? `${list.length} results from all products` : 'Best savings today'}</h3>
          {!list.length && <p className="py-16 text-center text-slate-500">No results. 找不到，試試其他關鍵字。</p>}
          <section className="grid gap-4 pb-10 sm:grid-cols-2 lg:grid-cols-3">
            {list.slice(0, limit).map((p) => (
              <button key={p.code} onClick={() => setOpen(p)} className={`${card} p-4 text-left transition hover:-translate-y-0.5`}>
                <div className="mb-3 grid h-24 place-items-center rounded-2xl bg-slate-100 text-5xl dark:bg-slate-800">{icon(p.cat)}</div>
                <div className="text-sm text-slate-500">{p.brand} · {p.cat}</div>
                <div className="mb-2 font-semibold">{p.en || p.zh}{p.en && p.zh && <span className="ml-1 text-sm font-normal text-slate-500">{p.zh}</span>}</div>
                <div className="text-2xl font-bold text-success">🟢 {hk(p.min)}</div>
                <div className="text-sm text-slate-500">🏪 {p.lowStore}</div>
                {save(p) > 0 && <span className="mt-2 inline-block rounded-full bg-success/15 px-3 py-1 text-sm font-semibold text-success">💰 Save {hk(save(p))} ({pct(p)}%)</span>}
              </button>
            ))}
          </section>
          {list.length > limit && <button onClick={() => setLimit(limit + 48)} className="mx-auto mb-10 block rounded-full bg-primary px-6 py-3 font-semibold text-white">Show more</button>}
        </>)}
      </main>
      <footer className="px-4 pb-10 text-center text-sm text-slate-500">Data: Hong Kong Consumer Council Open Data. 資料來源：香港消費者委員會</footer>

      {open && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-black/50 p-3" onClick={() => setOpen(null)}>
          <div className={`${card} max-h-[88vh] w-full max-w-xl overflow-auto p-5`} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setOpen(null)} aria-label="Close" className="float-right grid h-11 w-11 place-items-center rounded-xl border border-slate-200 dark:border-slate-700"><X className="h-5 w-5" /></button>
            <div className="text-sm text-slate-500">{open.brand} · {open.cat}</div>
            <h2 className="text-xl font-bold">{open.en || open.zh}</h2>
            <div className="text-slate-500">{open.zh}</div>
            <div className="my-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-slate-100 p-3 dark:bg-slate-800"><small>🟢 Lowest</small><b className="block text-success">{hk(open.min)}</b></div>
              <div className="rounded-2xl bg-slate-100 p-3 dark:bg-slate-800"><small>🟡 Average</small><b className="block text-warning">{hk(open.avg)}</b></div>
              <div className="rounded-2xl bg-slate-100 p-3 dark:bg-slate-800"><small>🔴 Highest</small><b className="block text-danger">{hk(open.max)}</b></div>
            </div>
            {save(open) > 0 && <p className="mb-3 font-semibold text-success">💰 You save {hk(save(open))} ({pct(open)}%) at {open.lowStore}</p>}
            <h3 className="mb-1 font-semibold">Store comparison</h3>
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
              <h3 className="mb-1 mt-4 font-semibold">📈 Lowest price trend</h3>
              <div className="h-40">
                <ResponsiveContainer>
                  <LineChart data={hist[open.code].map(([d, v]) => ({ d: d.slice(5), v }))} margin={{ left: 0, right: 12 }}>
                    <XAxis dataKey="d" tick={{ fontSize: 12 }} /><YAxis domain={['auto', 'auto']} width={40} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v) => hk(Number(v))} /><Line type="stepAfter" dataKey="v" stroke="#2563EB" strokeWidth={3} dot />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>)}
          </div>
        </div>
      )}
    </div>
  );
}
