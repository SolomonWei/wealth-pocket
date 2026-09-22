import assert from 'node:assert/strict';
const {chromium}=await import(process.env.POCKET_PLAYWRIGHT_MODULE||'playwright');
import {server} from '../server.mjs';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  window.testSockets=[];window.WebSocket=class {static OPEN=1;constructor(url){this.url=url;this.readyState=0;this.sent=[];window.testSockets.push(this);setTimeout(()=>{this.readyState=1;this.onopen?.();},0);}send(raw){this.sent.push(JSON.parse(raw));}close(){this.readyState=3;this.onclose?.();}receive(m){this.onmessage?.({data:JSON.stringify(m)});}};
 });
 await page.goto('http://127.0.0.1:4173/#settings');
 await page.locator('#content summary').click();await page.locator('[name=fugle]').fill('test-fugle');await page.locator('[name=alpacaKey]').fill('test-alpaca');await page.locator('[name=alpacaSecret]').fill('test-secret');await page.locator('#quotes-form button[type=submit], #quotes-form button.primary').click();
 await page.waitForFunction(()=>testSockets.length===2&&testSockets.every(s=>s.sent.length));
 await page.locator('[name=fugle]').fill('unfinished-input');
 await page.evaluate(()=>{testSockets[0].receive({event:'authenticated'});testSockets[1].receive([{T:'success',msg:'authenticated'}]);});
 assert.match(await page.locator('[data-connection=tw]').innerText(),/驗證成功.*尚未加入台股/);assert.match(await page.locator('[data-connection=us]').innerText(),/驗證成功.*尚未加入美股/);assert.equal(await page.locator('[name=fugle]').inputValue(),'unfinished-input');
 await page.evaluate(()=>testSockets[1].receive([{T:'error',code:402,msg:'auth failed'}]));assert.match(await page.locator('[data-connection=us]').innerText(),/行情錯誤.*auth failed/);
 await page.locator('#mobile-nav [data-tab=overview]').click();await page.locator('#add').click();await page.locator('[name=kind]').selectOption('cash');await page.locator('[name=name]').fill('銀行存款');await page.locator('[name=amount]').fill('1000');await page.locator('#record-form button[type=submit]').click();assert.match(page.url(),/#manual$/);
 const edit=page.getByRole('button',{name:'編輯 銀行存款',exact:true});assert.ok((await edit.boundingBox()).height>=44);await edit.click();await page.locator('[name=amount]').fill('1500');await page.locator('#record-form button[type=submit]').click();await page.reload();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('pocket-assets-v1')).records[0].amount),1500);
 await page.locator('#mobile-nav [data-tab=holdings]').click();await page.locator('#add').click();await page.locator('[name=kind]').selectOption('us');await page.locator('[name=name]').fill('Apple');await page.locator('[name=symbol]').fill('AAPL');await page.locator('[name=quantity]').fill('2');await page.locator('#record-form button[type=submit]').click();
 await page.locator('#mobile-nav [data-tab=settings]').click();await page.locator('#content summary').click();await page.locator('[name=alpacaKey]').fill('test-alpaca');await page.locator('[name=alpacaSecret]').fill('test-secret');await page.locator('#quotes-form button.primary').click();await page.waitForFunction(()=>testSockets.some(s=>s.url.includes('alpaca')&&s.sent.length));
 await page.evaluate(()=>{const s=testSockets.find(s=>s.url.includes('alpaca'));s.receive([{T:'success',msg:'authenticated'}]);s.receive([{T:'subscription',trades:['AAPL']}]);});assert.match(await page.locator('[data-connection=us]').innerText(),/已訂閱.*等待成交/);
 await page.evaluate(()=>testSockets.find(s=>s.url.includes('alpaca')).receive([{T:'t',S:'AAPL',p:200,t:new Date().toISOString()}]));assert.match(await page.locator('[data-connection=us]').innerText(),/行情串流中/);assert.match(await page.locator('[data-connection=us]').innerText(),/上次收到 AAPL/);
 await page.screenshot({path:'artifacts/iphone-connections.png',fullPage:true});assert.deepEqual(errors,[]);console.log('PASS: auth without holdings, errors, subscription/trade status, preserve typed keys, edit cash asset and reload.');
}finally{await browser.close();server.close();}
