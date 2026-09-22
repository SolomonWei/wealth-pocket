import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.POCKET_PLAYWRIGHT_MODULE||'playwright');
import {server} from '../server.mjs';
const browser=await chromium.launch({...(process.env.POCKET_CHROME?{executablePath:process.env.POCKET_CHROME}:{channel:'chrome'}),headless:true});
try {
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4173');
 await page.locator('[data-action="demo"]').click();
 assert.match(await page.locator('.net-number').innerText(),/10,642,750/);
 await mkdir('artifacts',{recursive:true});await page.screenshot({path:'artifacts/iphone-overview.png',fullPage:false});
 for(const width of [320,390,768,1280]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`overflow ${width}`);}
 await page.setViewportSize({width:390,height:844});await page.locator('#exit-demo').click();
 assert.match(await page.locator('.net-number').innerText(),/0/);
 await page.locator('#add').click();await page.locator('[name=name]').fill('台積電');await page.locator('[name=symbol]').fill('2330');await page.locator('[name=quantity]').fill('1000');await page.locator('[name=manualPrice]').fill('1000');await page.locator('summary').click();await page.locator('[name=principal]').fill('500000');await page.locator('[name=accrued]').fill('1250');await page.locator('#record-form button[type=submit]').click();
 assert.match(await page.locator('.net-number').innerText(),/498,750/);
 await page.reload();assert.match(await page.locator('.net-number').innerText(),/498,750/);
 await page.locator('#mobile-nav [data-tab=watch]').click();await page.locator('#add').click();await page.locator('[name=kind]').selectOption('us');await page.locator('[name=name]').fill('Apple');await page.locator('[name=symbol]').fill('AAPL');await page.locator('[name=manualPrice]').fill('200');await page.locator('[name=target]').fill('190');await page.locator('#record-form button[type=submit]').click();
 await page.locator('#mobile-nav [data-tab=overview]').click();assert.match(await page.locator('.net-number').innerText(),/498,750/);
 await page.locator('[data-edit]').click();await page.locator('[name=manualPrice]').fill('');await page.locator('#record-form button[type=submit]').click();assert.match(await page.locator('.hero-top').innerText(),/已知淨資產小計/);assert.match(await page.locator('.notice').innerText(),/1 筆持倉尚無報價/);
 await page.locator('#mobile-nav [data-tab=settings]').click();await page.locator('#fx-form [name=fxMode]').selectOption('manual');await page.locator('#fx-form [name=USD]').fill('30');await page.locator('#fx-form button').click();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('pocket-assets-v1')).fx.USD),30);
 await page.locator('[data-action=demo]').click();await page.locator('#mobile-nav [data-tab=overview]').click();await page.locator('[data-edit=d1]').click();await page.locator('[name=quantity]').fill('2000');await page.locator('#record-form button[type=submit]').click();await page.locator('#exit-demo').click();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('pocket-assets-v1')).records[0].quantity),1000);
 await page.locator('#mobile-nav [data-tab=manual]').click();await page.locator('#add').click();await page.locator('[name=name]').fill('<script>alert(1)</script>');await page.locator('[name=amount]').fill('100');await page.locator('#record-form button[type=submit]').click();assert.equal(await page.locator('.asset-title').textContent(),'<script>alert(1)</script>');
 assert.deepEqual(errors,[]);console.log('PASS: mobile/desktop layout, CRUD, margin, missing quotes, persistence, FX, demo isolation, watch exclusion, HTML escaping.');
 const cryptoPage=await context.newPage();await cryptoPage.goto('http://127.0.0.1:4173');await cryptoPage.locator('#add').click();await cryptoPage.locator('[name=kind]').selectOption('crypto');await cryptoPage.locator('[name=name]').fill('Bitcoin');await cryptoPage.locator('[name=symbol]').fill('BTCUSDT');await cryptoPage.locator('[name=quantity]').fill('0.1');await cryptoPage.locator('#record-form button[type=submit]').click();
 try{await cryptoPage.getByText('Binance 現貨',{exact:false}).first().waitFor({timeout:18000});console.log('PASS: real Binance WebSocket quote received.');}catch{console.log('Binance live feed unavailable from this test network:',await cryptoPage.locator('.status-strip').innerText());}
}finally{await browser.close();server.close();}
