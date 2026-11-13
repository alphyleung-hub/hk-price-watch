export type Lang = 'en' | 'zh';

const en = {
  searchPh: 'Search: beer, soy milk, Vitasoy…', heroTitle: 'Find the cheapest price', heroSub: 'Compare supermarkets in one tap',
  products: 'Products', stores: 'Stores', topSaving: 'Biggest saving', updated: 'Updated',
  all: 'All', sortSave: 'Biggest savings', sortCheap: 'Cheapest first', sortName: 'Name A–Z', allStores: 'All stores',
  bestToday: 'Best savings today', results: (n: number) => `${n} results from all products`, noResults: 'No results. Try another word.',
  showMore: 'Show more', loading: 'Loading…', recent: 'Recent',
  lowest: 'Lowest', average: 'Average', highest: 'Highest', youSave: 'You save', save: 'Save', at: 'at',
  compare: 'Store comparison', trend: 'Lowest price trend', offer: 'Offer', offersHere: 'Offers',
  addList: 'Add to list', inList: 'In list', myList: 'My shopping list', listEmpty: 'Your list is empty. Tap “Add to list” on a product.',
  cheapestStore: 'Cheapest single store', noSingle: 'No single store has every item. Use the split option below.',
  otherStores: 'Other stores', missing: (n: number) => `${n} missing`, splitBuy: 'Split across stores', splitNote: 'Buy each item at its cheapest store',
  clear: 'Clear list', close: 'Close', bigText: 'Bigger text', language: 'Language', dark: 'Dark mode',
  tabPrices: 'Prices', tabHistory: 'Price history', r30: '30 days', r90: '90 days', rAll: 'All',
  historyStart: (d: string) => `Tracking started ${d}. Prices are saved every day, so the chart fills in as days pass.`,
  changesTitle: 'Recent price changes', noChanges: 'No price changes yet.',
  footer: 'Data: Hong Kong Consumer Council Open Data',
};
export type Dict = typeof en;

const zh: Dict = {
  searchPh: '搜尋：啤酒、豆奶、維他奶…', heroTitle: '一眼找到最平價錢', heroSub: '一鍵比較各大超市',
  products: '產品', stores: '超市', topSaving: '最高節省', updated: '更新',
  all: '全部', sortSave: '最大節省', sortCheap: '最平優先', sortName: '名稱排序', allStores: '所有超市',
  bestToday: '今日最抵', results: (n: number) => `在全部產品中找到 ${n} 項`, noResults: '找不到，試試其他關鍵字。',
  showMore: '顯示更多', loading: '載入中…', recent: '最近搜尋',
  lowest: '最低', average: '平均', highest: '最高', youSave: '你可慳', save: '慳', at: '於',
  compare: '超市價錢比較', trend: '最低價走勢', offer: '優惠', offersHere: '優惠',
  addList: '加入清單', inList: '已在清單', myList: '我的購物清單', listEmpty: '清單是空的。在產品上按「加入清單」。',
  cheapestStore: '最平單一超市', noSingle: '沒有一間超市有齊所有商品，請看下面的分開購買。',
  otherStores: '其他超市', missing: (n: number) => `缺 ${n} 項`, splitBuy: '分開購買', splitNote: '每項都在最平的超市買',
  clear: '清空清單', close: '關閉', bigText: '大字', language: '語言', dark: '深色模式',
  tabPrices: '價錢', tabHistory: '價格紀錄', r30: '30日', r90: '90日', rAll: '全部',
  historyStart: (d: string) => `由 ${d} 開始記錄。價錢每日儲存，過幾日就會見到走勢圖。`,
  changesTitle: '近期價格變動', noChanges: '暫時未有價格變動。',
  footer: '資料來源：香港消費者委員會開放數據',
};

export const T: Record<Lang, Dict> = { en, zh };
