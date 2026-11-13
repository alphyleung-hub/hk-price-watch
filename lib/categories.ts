import type { Lang } from './i18n';

// Short, friendly names + icons for the Consumer Council's long category names.
// First matching rule wins. Anything unmatched falls back to the first two items of the original name.
const RULES: { re: RegExp; icon: string; en: string; zh: string }[] = [
  { re: /beer|wine|spirit|alcohol|liquor|酒/i, icon: '🍺', en: 'Beer & Wine', zh: '啤酒及酒類' },
  { re: /baby|infant|diaper|嬰/i, icon: '🍼', en: 'Baby', zh: '嬰兒用品' },
  { re: /\bpet\b|寵物/i, icon: '🐶', en: 'Pets', zh: '寵物用品' },
  { re: /noodle|cooking|processed|sauce|seasoning|麵|調味/i, icon: '🍜', en: 'Noodles & Cooking', zh: '麵食及調味' },
  { re: /rice|\boil\b|canned|fruit|vegetable|meat|米|油|罐頭/i, icon: '🍚', en: 'Rice, Oil & Fresh', zh: '米油罐頭及生鮮' },
  { re: /beverage|drink|juice|water|coffee|tea\b|milk|dairy|飲|奶/i, icon: '🥤', en: 'Drinks & Dairy', zh: '飲品及乳製品' },
  { re: /snack|biscuit|confection|candy|chocolate|cereal|breakfast|bread|零食|餅|早餐/i, icon: '🍪', en: 'Snacks & Breakfast', zh: '零食及早餐' },
  { re: /paper|household|clean|laundry|detergent|家居|清潔|紙/i, icon: '🧻', en: 'Household', zh: '家居清潔' },
  { re: /personal|hair|skin|oral|body|beauty|toiletr|護理|個人/i, icon: '🧴', en: 'Personal Care', zh: '個人護理' },
];

export function catInfo(c: string, lang: Lang) {
  const r = RULES.find((x) => x.re.test(c));
  if (r) return { icon: r.icon, label: lang === 'zh' ? r.zh : r.en };
  return { icon: '🛒', label: c.split(/\s*[\/,&]\s*/).slice(0, 2).join(' / ') };
}
