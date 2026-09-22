import assert from 'node:assert/strict';
const {chromium}=await import(process.env.POCKET_PLAYWRIGHT_MODULE||'playwright');
import {server} from '../server.mjs';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));let failed=false;
 await page.route('**/market-config.json',r=>r.fulfill({json:{yahooProxyUrl:'http://127.0.0.1:4173/'}}));
 await page.route('**/quotes?*',r=>{requests.push(r.request().url());return r.fulfill({json:failed?{quotes:[],errors:[{key:'tw:2330',message:'temporarily unavailable'}]}:{quotes:[{key:'tw:2330',price:1000,time:Date.now()-20*60000,source:'Yahoo Finance · 延遲報價',feed:'tw',currency:'TWD',delayed:true}],errors:[]}});});
 await page.goto('http://127.0.0.1:4173');await page.locator('#add').click();await page.locator('[name=name]').fill('台積電');await page.locator('[name=symbol]').fill('2330');await page.locator('[name=quantity]').fill('2');await page.locator('#record-form button[type=submit]').click();await page.waitForFunction(()=>document.querySelector('.net-number').textContent.includes('2,000'));
 await page.locator('#mobile-nav [data-tab=settings]').click();assert.equal(await page.locator('input[type=password]').count(),0);assert.equal(await page.locator('#quotes-form').count(),0);assert.match(await page.locator('[data-connection=tw]').innerText(),/Yahoo 已更新/);assert.ok(requests.every(u=>new URL(u).searchParams.get('symbols')==='tw:2330'));
 failed=true;await page.locator('[data-action=refresh-quotes]').click();await page.waitForFunction(()=>document.querySelector('[data-connection=tw]').textContent.includes('更新失敗'));await page.locator('#mobile-nav [data-tab=overview]').click();assert.match(await page.locator('.net-number').innerText(),/2,000/);assert.match(await page.locator('.source-status').innerText(),/Yahoo Finance.*延遲報價/);
 await page.getByRole('button',{name:'編輯 台積電',exact:true}).click();await page.locator('[name=quantity]').fill('3');await page.locator('#record-form button[type=submit]').click();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('pocket-assets-v1')).records[0].quantity),3);
 await page.locator('#mobile-nav [data-tab=settings]').click();await page.screenshot({path:'artifacts/iphone-yahoo-settings.png',fullPage:true});assert.deepEqual(errors,[]);console.log('PASS: no credentials UI, Yahoo automatic valuation, symbols-only requests, visible failures, retain old prices, edit holdings.');
}finally{await browser.close();server.close();}
