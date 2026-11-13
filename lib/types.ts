export type Price = { store: string; price: number; offer?: string };
export type Product = {
  code: string; en: string; zh: string; brand: string; cat: string; unit?: string;
  prices: Price[]; min: number; max: number; avg: number; lowStore: string;
};
export type Data = { updated: string; day?: string; stores: string[]; products: Product[] };
// Per product, per store: a point is saved only when that store's price changes (null = no longer sold).
export type PriceHistory = Record<string, [string, number | null][]>;
export type History = Record<string, PriceHistory>;
