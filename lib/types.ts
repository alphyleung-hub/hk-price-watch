export type Price = { store: string; price: number; offer?: string };
export type Product = {
  code: string; en: string; zh: string; brand: string; cat: string; unit?: string;
  prices: Price[]; min: number; max: number; avg: number; lowStore: string;
};
export type Data = { updated: string; stores: string[]; products: Product[] };
export type History = Record<string, [string, number][]>;
