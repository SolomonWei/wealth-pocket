export const kinds = {tw:'台股',us:'美股',crypto:'虛擬貨幣',cash:'銀行／現金',property:'房產',loan:'貸款'};
export const marketKinds = ['tw','us','crypto'];
export const currencyFor = k => ({tw:'TWD',us:'USD',crypto:'USDT'}[k] || 'TWD');
export function normalizeCryptoSymbol(value) {
  const symbol=String(value??'').normalize('NFKC').trim().toUpperCase().replace(/\s+/g,'').replace(/\/USDT$/,'USDT');
  if(!symbol)return '';
  return symbol.endsWith('USDT')?symbol:symbol+'USDT';
}
export const cryptoAsset = symbol => String(symbol??'').replace(/USDT$/,'');
export const today = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const keyFor = r => `${r.kind}:${r.symbol}`;
export const emptyState = () => ({version:1,records:[],watch:[],fx:{USD:32,USDT:32},fxMode:'bot',fxDate:today()});
export function validateRecord(r,watch=false) {
  if(!r || typeof r!=='object' || !Object.hasOwn(kinds,r.kind)) throw Error('資產類型不正確');
  if(typeof r.id!=='string'||!r.id||r.id.length>100) throw Error('紀錄編號不正確');
  if(typeof r.name!=='string'||!r.name.trim()||r.name.length>100) throw Error('請填寫名稱（最多 100 字）');
  if(!['TWD','USD','USDT'].includes(r.currency)) throw Error('幣別不正確');
  if(marketKinds.includes(r.kind)) {
    const patterns={tw:/^\d{4,6}[A-Z]?$/,us:/^[A-Z][A-Z0-9.\-]{0,14}$/,crypto:/^[A-Z0-9]{2,20}USDT$/};
    if(!patterns[r.kind].test(r.symbol||'')) throw Error('代碼格式不正確；台股例 2330、美股 NVDA、加密貨幣 BTCUSDT');
    if(r.currency!==currencyFor(r.kind)) throw Error('市場與幣別不一致');
  } else if(watch) throw Error('觀察清單僅支援台股、美股、虛擬貨幣');
  const fields=watch?['manualPrice','target']:['quantity','cost','manualPrice','amount','principal','accrued','rate'];
  for(const f of fields) if(r[f]!==null&&r[f]!==undefined&&(!Number.isFinite(r[f])||r[f]<0||r[f]>1e14)) throw Error('金額與數量必須是有效的非負數字');
  if(!watch&&marketKinds.includes(r.kind)&&!(r.quantity>0)) throw Error('持倉數量必須大於 0');
  if(!watch&&!marketKinds.includes(r.kind)&&!Number.isFinite(r.amount)) throw Error('請填寫金額');
  if(r.rate>100) throw Error('年利率不得超過 100%');
  if(r.since && (!/^\d{4}-\d{2}-\d{2}$/.test(r.since)||!Number.isFinite(Date.parse(r.since))||new Date(r.since).toISOString().slice(0,10)!==r.since||r.since>today())) throw Error('起息日必須為有效日期，且不可晚於今天');
  if(r.rate>0&&(r.principal>0||r.kind==='loan')&&!r.since) throw Error('請填寫起息日');
  return r;
}
export function validateState(s) {
  if(!s||s.version!==1||!Array.isArray(s.records)||!Array.isArray(s.watch)||s.records.length+s.watch.length>1000) throw Error('備份格式不正確或超過 1,000 筆');
  const ids=new Set();
  for(const [rows,watch] of [[s.records,false],[s.watch,true]]) for(const r of rows){validateRecord(r,watch);if(ids.has(r.id))throw Error('備份有重複編號');ids.add(r.id);}
  for(const c of ['USD','USDT']) if(!Number.isFinite(s.fx?.[c])||s.fx[c]<=0||s.fx[c]>1e6)throw Error('請填寫有效的換算匯率');
  if(s.fxMode!==undefined&&!['bot','manual'].includes(s.fxMode))throw Error('匯率來源不正確');
  s.fx={...s.fx,USDT:s.fx.USD};
  return s;
}
export function interest(r,asOf=today()) {
  const principal=r.kind==='loan'?r.amount:(r.principal||0);
  const days=r.since?Math.max(0,Math.floor((Date.parse(asOf)-Date.parse(r.since))/86400000)):0;
  return (r.accrued||0)+principal*(r.rate||0)/100*days/365;
}
export function valuation(r,quotes,fx,asOf=today()) {
  const market=marketKinds.includes(r.kind), q=quotes[keyFor(r)];
  const price=market?(q?.price??r.manualPrice??null):null;
  const rate=r.currency==='TWD'?1:fx[r.currency==='USDT'?'USD':r.currency];
  const asset=r.kind==='loan'?0:market?(price===null?null:r.quantity*price):r.amount;
  const debt=(r.kind==='loan'?r.amount:(r.principal||0))+interest(r,asOf);
  return {asset:asset===null?null:asset*rate,debt:debt*rate,net:asset===null?null:(asset-debt)*rate,price,q,interest:interest(r,asOf),pnl:market&&price!==null&&r.cost!==null&&r.cost!==undefined?(price-r.cost)*r.quantity*rate:null};
}
export function totals(state,quotes={},asOf=today()) {
  let assets=0,debts=0,liquidAssets=0,marginDebt=0,missing=0,manual=0;
  const groups=Object.fromEntries(Object.keys(kinds).filter(k=>k!=='loan').map(k=>[k,0]));
  for(const r of state.records){const v=valuation(r,quotes,state.fx,asOf);if(v.asset===null)missing++;else{assets+=v.asset;if(r.kind!=='loan')groups[r.kind]+=v.asset;if(r.kind!=='property')liquidAssets+=v.asset;}debts+=v.debt;if(marketKinds.includes(r.kind))marginDebt+=v.debt;if(marketKinds.includes(r.kind)&&v.price!==null&&!v.q)manual++;}
  return {assets,debts,net:assets-debts,liquidAssets,marginDebt,financialEquity:liquidAssets-marginDebt,missing,manual,groups};
}
export function demoState(){const s=emptyState();s.records=[
  {id:'d1',kind:'tw',name:'台積電',symbol:'2330',currency:'TWD',quantity:1000,cost:900,manualPrice:1000,principal:500000,accrued:1250,rate:6,since:today()},
  {id:'d2',kind:'us',name:'NVIDIA',symbol:'NVDA',currency:'USD',quantity:100,cost:100,manualPrice:120,principal:0},
  {id:'d3',kind:'crypto',name:'Bitcoin',symbol:'BTCUSDT',currency:'USDT',quantity:0.5,cost:50000,manualPrice:60000,principal:0},
  {id:'d4',kind:'cash',name:'台幣存款',currency:'TWD',amount:800000},
  {id:'d5',kind:'property',name:'自住房產',currency:'TWD',amount:18000000},
  {id:'d6',kind:'loan',name:'房屋貸款',currency:'TWD',amount:10000000,accrued:0,rate:0}
];s.watch=[{id:'w1',kind:'us',name:'Apple',symbol:'AAPL',currency:'USD',manualPrice:200,target:180},{id:'w2',kind:'crypto',name:'Ethereum',symbol:'ETHUSDT',currency:'USDT',manualPrice:3000,target:2800}];return s;}
