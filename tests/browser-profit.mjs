import assert from 'node:assert/strict';
const {chromium}=await import(process.env.POCKET_PLAYWRIGHT_MODULE||'playwright');
const live=process.env.POCKET_LIVE,server=live?null:(await import('../server.mjs')).server;
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/market-config.json*',r=>r.fulfill({json:{}}));await page.routeWebSocket('wss://data-stream.binance.vision/**',()=>{});
 await page.addInitScript(()=>{if(localStorage.getItem('pocket-assets-v1'))return;localStorage.setItem('pocket-assets-v1',JSON.stringify({version:1,fx:{USD:30,USDT:30},fxMode:'manual',watch:[],records:[
 {id:'tw',kind:'tw',name:'台股',symbol:'2330',currency:'TWD',quantity:100,cost:100,manualPrice:120,principal:5000,accrued:50},
 {id:'us',kind:'us',name:'美股',symbol:'AAPL',currency:'USD',quantity:10,cost:100,manualPrice:90},
 {id:'coin',kind:'crypto',name:'CTSI',symbol:'CTSIUSDT',currency:'USDT',quantity:1000,cost:0.1,manualPrice:0.12},
 {id:'missing',kind:'us',name:'缺成本',symbol:'NVDA',currency:'USD',quantity:2,manualPrice:50}
 ]}));});
 await page.goto(live||'http://127.0.0.1:4173/#holdings');
 assert.equal(await page.locator('.investment-row .watch-edit svg').count(),4);assert.match(await page.locator('.holding-debt').innerText(),/5,050/);assert.ok((await page.locator('[data-edit=tw]').boundingBox()).height>=44);
 const pnl=k=>page.locator(`[data-profit=${k}] strong`);
 for(const [k,v]of [['all','-400.00'],['tw','+2,000.00'],['us','-3,000.00'],['crypto','+600.00']])assert.equal(await pnl(k).innerText(),v);
 assert.match(await page.locator('[data-profit=all]').innerText(),/3\/4/);assert.match(await page.locator('.profit-incomplete').innerText(),/1 筆缺買入成本/);
 await page.locator('[data-filter=tw]').click();assert.equal(await pnl('all').innerText(),'-400.00');
 for(const width of [320,390,1280]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
 await page.setViewportSize({width:390,height:844});await page.locator('[data-filter=all]').click();await page.locator('[data-edit=missing]').click();await page.locator('[name=cost]').fill('40');await page.locator('#record-form button[type=submit]').click();assert.equal(await pnl('all').innerText(),'+200.00');assert.equal(await page.locator('.profit-incomplete').count(),0);await page.reload();assert.equal(await pnl('all').innerText(),'+200.00');
 await page.locator('#mobile-nav [data-tab=overview]').click();assert.equal(await pnl('all').innerText(),'+200.00');await page.locator('.overview-investments [data-tab=holdings]').click();assert.equal(await pnl('us').innerText(),'-2,400.00');
 if(process.env.POCKET_SCREENSHOT){await page.locator('.holdings-profit').screenshot({path:process.env.POCKET_SCREENSHOT});await page.locator('.investment-row').first().screenshot({path:process.env.POCKET_SCREENSHOT.replace('.png','-row.png')});}
 await page.locator('#mobile-nav [data-tab=settings]').click();const downloadPromise=page.waitForEvent('download');await page.locator('[data-action=export]').click();const download=await downloadPromise;const stream=await download.createReadStream();let data='';for await(const chunk of stream)data+=chunk;assert.equal(JSON.parse(data).records.find(r=>r.id==='missing').cost,40);
 await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('pocket-assets-v1'));s.records=[];localStorage.setItem('pocket-assets-v1',JSON.stringify(s));});await page.goto((live||'http://127.0.0.1:4173/#holdings').replace(/#.*$/,'#holdings'));await page.reload();assert.equal(await pnl('all').innerText(),'—');assert.match(await page.locator('[data-profit=all]').innerText(),/尚無持倉/);assert.deepEqual(errors,[]);
 console.log('PASS: four market P&L summaries, partial costs, edit/reload, filtering, overview navigation, backup, empty state, responsive layout'+(live?' LIVE':''));
}finally{await browser.close();server?.close();}
