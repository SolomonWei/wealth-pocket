import assert from 'node:assert/strict';
const {chromium}=await import(process.env.POCKET_PLAYWRIGHT_MODULE||'playwright');
const live=process.env.POCKET_LIVE;
const server=live?null:(await import('../server.mjs')).server;
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.route('**/market-config.json*',r=>r.fulfill({json:{}}));
 await page.routeWebSocket('wss://data-stream.binance.vision/**',socket=>socket.send(JSON.stringify({data:{s:'CTSIUSDT',c:'0.07654321',E:Date.now(),P:'1'}})));
 await page.addInitScript(()=>{
  if(localStorage.getItem('pocket-assets-v1'))return;
  localStorage.setItem('pocket-assets-v1',JSON.stringify({version:1,records:[],fx:{USD:32,USDT:32},fxMode:'manual',watch:[
   {id:'tw',name:'台股',kind:'tw',symbol:'0050',currency:'TWD',manualPrice:58.05,target:57.15},
   {id:'us',name:'美股',kind:'us',symbol:'AAPL',currency:'USD',manualPrice:1234.56,target:1200.25},
   {id:'ctsi',name:'CTSI',kind:'crypto',symbol:'CTSIUSDT',currency:'USDT',manualPrice:0.07123,target:0.0654321},
   {id:'tiny',name:'微小價格',kind:'crypto',symbol:'SHIBUSDT',currency:'USDT',manualPrice:1.234e-8,target:1.111e-8},
   {id:'missing',name:'缺價',kind:'us',symbol:'MSFT',currency:'USD',manualPrice:null}
  ]}));
 });
 await page.goto(live||'http://127.0.0.1:4173/#watch');
 const row=id=>page.locator('.row').filter({has:page.locator(`[data-edit="${id}"]`)});
 await page.waitForFunction(()=>document.querySelector('[data-edit="ctsi"]')?.closest('.row').querySelector('strong').textContent==='0.07654321');
 for(const [id,price] of [['tw','58.05'],['us','1,234.56'],['ctsi','0.07654321'],['tiny','0.00000001234'],['missing','—']])assert.equal(await row(id).locator('strong').innerText(),price);
 assert.match(await row('ctsi').locator('.watch-target').innerText(),/0\.0654321/);
 assert.match(await row('tiny').locator('.watch-target').innerText(),/0\.00000001111/);
 await page.locator('[data-edit="tiny"]').click();assert.equal(Number(await page.locator('[name=target]').inputValue()),1.111e-8);await page.locator('[name=target]').fill('0.00000001009');await page.locator('#record-form button[type=submit]').click();await page.reload();assert.match(await row('tiny').locator('.watch-target').innerText(),/0\.00000001009/);
 for(const width of [320,390,1280]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
 await page.setViewportSize({width:390,height:844});assert.ok((await row('ctsi').boundingBox()).height<=100);assert.ok((await row('ctsi').locator('[data-edit]').boundingBox()).height>=44);if(process.env.POCKET_SCREENSHOT)await page.screenshot({path:process.env.POCKET_SCREENSHOT});
 assert.match(await page.locator('[data-footer-version]').innerText(),/0\.3\.3/);
 console.log('PASS: stock decimals, Binance streamed decimals, tiny crypto prices/targets, missing quote, edit and persistence, responsive layout'+(live?' LIVE':''));
}finally{await browser.close();server?.close();}
