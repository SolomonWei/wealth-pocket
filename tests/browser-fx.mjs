import assert from 'node:assert/strict';
const {chromium}=await import(process.env.POCKET_PLAYWRIGHT_MODULE||'playwright');
import {server} from '../server.mjs';
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  let available=true;
  await context.route('**/data/usd-twd.json',route=>route.fulfill({json:available?{schemaVersion:1,source:'臺灣銀行',rateType:'USD 即期買入',rate:31.645,quotedAt:new Date().toISOString(),checkedAt:new Date().toISOString(),status:'ok'}:{status:'unavailable'}}));
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('pocket-assets-v1')));
  await page.goto('http://127.0.0.1:4173');
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('pocket-assets-v1'))?.fx.USD===31.645);
  assert.equal((await saved()).fx.USDT,31.645);
  await page.locator('#mobile-nav [data-tab=settings]').click();
  assert.equal(await page.locator('[name=USD]').isDisabled(),true);
  await page.locator('[name=fxMode]').selectOption('manual');await page.locator('[name=USD]').fill('30');await page.locator('#fx-form button').click();
  await page.reload();assert.equal((await saved()).fx.USD,30);assert.equal((await saved()).fx.USDT,30);assert.equal(await page.locator('[name=USDT]').count(),0);assert.equal(await page.locator('[data-app-version]').textContent(),'v0.3.1');await page.locator('[data-action=reload-app]').click();await page.waitForURL('**?_update=*#settings');assert.equal((await saved()).fx.USD,30);
  await page.locator('[name=fxMode]').selectOption('bot');await page.locator('#fx-form button').click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('pocket-assets-v1')).fx.USD===31.645);
  available=false;await page.reload();await page.waitForFunction(()=>document.querySelector('[data-bank-status]')?.textContent.includes('更新延遲'));
  assert.equal((await saved()).fx.USD,31.645);assert.equal((await saved()).fx.USDT,31.645);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.deepEqual(errors,[]);
  await page.screenshot({path:'artifacts/iphone-fx-settings.png'});
  console.log('PASS: automatic bank rate, USDT follows USD, manual override/reload, source failure preserves verified rate, mobile layout.');
} finally {await browser.close();server.close();}
