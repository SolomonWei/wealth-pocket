import test from 'node:test';import assert from 'node:assert/strict';
import {emptyState,investmentSummary} from '../public/model.js';
test('investment P&L aggregates markets in TWD using quotes, excludes non-investments and financing principal',()=>{
 const s=emptyState();s.fx={USD:30,USDT:99};s.records=[
 {kind:'tw',symbol:'2330',currency:'TWD',quantity:100,cost:100,manualPrice:120,principal:8000,accrued:50},
 {kind:'us',symbol:'AAPL',currency:'USD',quantity:10,cost:100,manualPrice:90},
 {kind:'crypto',symbol:'CTSIUSDT',currency:'USDT',quantity:1000,cost:0.1,manualPrice:0.12},
 {kind:'property',currency:'TWD',amount:60000000,principal:48000000},
 {kind:'cash',currency:'TWD',amount:50000}];s.watch=[{kind:'us',symbol:'NVDA',currency:'USD',quantity:100,cost:1,manualPrice:999}];
 const p=investmentSummary(s,{'us:AAPL':{price:110}});assert.equal(p.tw.pnl,2000);assert.equal(p.us.pnl,3000);assert.ok(Math.abs(p.crypto.pnl-600)<1e-9);assert.equal(p.all.pnl,5600);assert.equal(p.all.count,3);assert.equal(p.all.included,3);assert.equal(p.all.manual,2);
});
test('P&L preserves losses and distinguishes missing inputs, zero cost, break-even and empty markets',()=>{
 const s=emptyState();s.records=[{kind:'tw',symbol:'2330',currency:'TWD',quantity:10,cost:100,manualPrice:90},{kind:'tw',symbol:'0050',currency:'TWD',quantity:10,cost:null,manualPrice:50},{kind:'us',symbol:'AAPL',currency:'USD',quantity:1,cost:0,manualPrice:5},{kind:'us',symbol:'MSFT',currency:'USD',quantity:1,cost:10},{kind:'us',symbol:'NVDA',currency:'USD',quantity:1},{kind:'tw',symbol:'2317',currency:'TWD',quantity:1,cost:10,manualPrice:10}];
 const p=investmentSummary(s);assert.equal(p.tw.pnl,-100);assert.equal(p.tw.included,2);assert.equal(p.us.pnl,160);assert.equal(p.all.pnl,60);assert.equal(p.all.count,6);assert.equal(p.all.included,3);assert.equal(p.all.missingCost,2);assert.equal(p.all.missingPrice,2);assert.equal(p.crypto.count,0);
});
