import test from 'node:test';import assert from 'node:assert/strict';
import {emptyState,demoState,totals,valuation,interest,validateState,validateRecord,normalizeCryptoSymbol,cryptoAsset} from '../public/model.js';
import {parseBinance} from '../public/quotes.js';
test('financing is deducted once, property and mortgage use gross values',()=>{const s=demoState(),t=totals(s,{},s.records[0].since);assert.equal(t.assets,21144000);assert.equal(t.debts,10501250);assert.equal(t.net,10642750);assert.equal(t.financialEquity,2642750);});
test('missing market price never silently becomes zero in a complete total',()=>{const s=emptyState();s.records=[{kind:'us',symbol:'NVDA',currency:'USD',quantity:10,principal:100}];const t=totals(s);assert.equal(t.missing,1);assert.equal(t.debts,3200);assert.equal(t.net,-3200);});
test('USDT uses USD rate even in legacy backups; observation list excluded',()=>{const s=emptyState();s.fx={USD:30,USDT:31};s.records=[{kind:'us',symbol:'AAPL',currency:'USD',quantity:2,manualPrice:100},{kind:'crypto',symbol:'BTCUSDT',currency:'USDT',quantity:1,manualPrice:100}];s.watch=[{kind:'us',symbol:'NVDA',quantity:1e8}];assert.equal(totals(s).assets,9000);});
test('simple interest uses actual days, preserves accrued interest',()=>{const r={kind:'tw',principal:365000,rate:10,accrued:50,since:'2025-01-01'};assert.equal(interest(r,'2025-01-11'),1050);assert.equal(interest(r,'2024-12-31'),50);});
test('live quote overrides manual estimate without changing average cost',()=>{const r={kind:'tw',symbol:'2330',currency:'TWD',quantity:100,cost:80,manualPrice:90,principal:5000};const v=valuation(r,{'tw:2330':{price:100}},{USD:32,USDT:32});assert.equal(v.asset,10000);assert.equal(v.net,5000);assert.equal(v.pnl,2000);});
test('validation rejects malformed backup, negative balances and wrong currency',()=>{const s=demoState();assert.equal(validateState(s),s);assert.throws(()=>validateState({...s,fx:{USD:0,USDT:1}}));assert.throws(()=>validateRecord({...s.records[0],quantity:-1}));assert.throws(()=>validateRecord({...s.records[0],currency:'USD'}));assert.throws(()=>validateRecord({...s.records[0],since:'2025-02-31'}));assert.throws(()=>validateState({...s,watch:[s.records[0]]}));});
test('Binance parser preserves source price',()=>{assert.equal(parseBinance({data:{s:'BTCUSDT',c:'60000',E:1700000000000,P:'2.5'}}).price,60000);});

test('crypto input accepts base tickers, full-width text and existing pairs without changing storage keys',()=>{for(const input of ['CTSI','ctsi',' ＣＴＳＩ ','CTSIUSDT','CTSI/USDT'])assert.equal(normalizeCryptoSymbol(input),'CTSIUSDT');assert.equal(cryptoAsset('CTSIUSDT'),'CTSI');assert.equal(normalizeCryptoSymbol(''),'');const r={id:'ctsi',kind:'crypto',name:'CTSI',currency:'USDT',symbol:normalizeCryptoSymbol('ＣＴＳＩ'),quantity:100};assert.equal(validateRecord(r),r);assert.throws(()=>validateRecord({...r,symbol:normalizeCryptoSymbol('CTSI/USDC')}));});

test('legacy stored USDT rate migrates to USD without changing holdings',()=>{const s=demoState();s.fx={USD:30,USDT:35};const before=JSON.stringify(s.records);validateState(s);assert.equal(s.fx.USDT,30);assert.equal(JSON.stringify(s.records),before);});

test('property mortgage counts as debt once, supports negative equity and preserves standalone loans',()=>{const s=emptyState();s.records=[{id:'home',name:'Home',kind:'property',currency:'USD',amount:100000,principal:120000},{id:'other',name:'Other loan',kind:'loan',currency:'TWD',amount:5000}];validateState(s);const t=totals(s);assert.equal(t.assets,3200000);assert.equal(t.debts,3845000);assert.equal(t.net,-645000);assert.equal(t.marginDebt,0);assert.equal(valuation(s.records[0],{},s.fx).net,-640000);assert.equal(s.records.length,2);});

test('category equity deducts related debt and interest in TWD and reconciles with total net worth',()=>{
 const s=emptyState();s.fx={USD:30,USDT:30};s.records=[
  {kind:'property',currency:'TWD',amount:60000000,principal:48000000},
  {kind:'us',symbol:'AAPL',currency:'USD',quantity:10,manualPrice:100,principal:400,accrued:10,rate:10,since:'2025-01-01'},
  {kind:'cash',currency:'TWD',amount:100000},
  {kind:'loan',currency:'TWD',amount:50000}
 ];
 const t=totals(s,{},'2026-01-01');assert.equal(t.groups.property,60000000);assert.equal(t.groupNet.property,12000000);assert.equal(t.groupDebts.us,13500);assert.equal(t.groupNet.us,16500);assert.equal(t.groupNet.loan,-50000);assert.equal(Object.values(t.groupNet).reduce((a,b)=>a+b,0),t.net);
});
test('category equity retains underwater and missing-price debt without hiding incomplete totals',()=>{
 const s=emptyState();s.records=[{kind:'property',currency:'TWD',amount:100,principal:150},{kind:'us',symbol:'AAPL',currency:'USD',quantity:1,principal:20}];
 const t=totals(s);assert.equal(t.groupNet.property,-50);assert.equal(t.groupNet.us,-640);assert.equal(t.groupMissing.us,1);assert.equal(t.groupMissing.property,0);assert.equal(Object.values(t.groupNet).reduce((a,b)=>a+b,0),t.net);
});
