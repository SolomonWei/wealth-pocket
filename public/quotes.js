export function parseBinance(m) {
  const d=m.data||m;if(!(Number(d.c)>0)||!Number.isFinite(d.E))return null;
  return {key:`crypto:${d.s}`,price:Number(d.c),time:d.E,source:'Binance 現貨',feed:'crypto',change:Number(d.P)};
}
export function validateYahooQuote(q,requested){
 if(!q||!requested.has(q.key)||q.feed!==q.key.split(':')[0]||q.currency!==(q.feed==='tw'?'TWD':'USD')||q.source!=='Yahoo Finance · 延遲報價'||!Number.isFinite(q.price)||q.price<=0||!Number.isFinite(q.time)||q.time<=0||q.time>Date.now()+300000)throw Error('Yahoo 報價格式不正確');
 return {...q,delayed:true};
}
export class QuoteStreams {
 constructor(onQuote,onStatus){this.onQuote=onQuote;this.onStatus=onStatus;this.generation=0;this.sockets=[];this.timers=[];this.controllers=[];}
 stop(){this.generation++;this.timers.forEach(clearTimeout);this.timers=[];this.controllers.forEach(c=>c.abort());this.controllers=[];this.sockets.forEach(s=>s.close());this.sockets=[];}
 start(rows){
  this.stop();const gen=this.generation;
  const stockKeys=[...new Set(rows.filter(r=>['tw','us'].includes(r.kind)).map(r=>`${r.kind}:${r.symbol}`))];
  for(const kind of ['tw','us'])this.onStatus(kind,stockKeys.some(k=>k.startsWith(kind+':'))?'正在讀取 Yahoo 報價':'尚未加入標的');
  if(stockKeys.length)this.pollYahoo(stockKeys,gen);
  const symbols=[...new Set(rows.filter(r=>r.kind==='crypto').map(r=>r.symbol))];
  if(!symbols.length){this.onStatus('crypto','尚未加入標的');return;}
  let retries=0;
  const connect=()=>{
   if(gen!==this.generation)return;
   this.onStatus('crypto',retries?'正在重新連線':'連線中');
   const socket=new WebSocket(`wss://data-stream.binance.vision/stream?streams=${symbols.map(s=>s.toLowerCase()+'@ticker').join('/')}`);this.sockets.push(socket);
   const timeout=setTimeout(()=>{if(gen===this.generation&&socket.readyState!==WebSocket.OPEN)socket.close();},15000);this.timers.push(timeout);
   socket.onopen=()=>{clearTimeout(timeout);if(gen!==this.generation){socket.close();return;}retries=0;this.onStatus('crypto','已連線，等待行情');};
   socket.onmessage=e=>{if(gen!==this.generation)return;let q;try{q=parseBinance(JSON.parse(e.data));}catch{return;}if(q&&symbols.includes(q.key.split(':')[1])){this.onStatus('crypto','行情串流中');this.onQuote(q);}};
   socket.onerror=()=>{if(gen===this.generation)this.onStatus('crypto','連線異常');};
   socket.onclose=()=>{clearTimeout(timeout);this.sockets=this.sockets.filter(s=>s!==socket);if(gen!==this.generation)return;this.onStatus('crypto','已斷線，將重連');this.timers.push(setTimeout(connect,Math.min(30000,1000*2**retries++)));};
  };connect();
 }
 async pollYahoo(keys,gen){
  const active=()=>gen===this.generation,counts={tw:0,us:0},issues={tw:[],us:[]};
  const fetchJSON=async url=>{const c=new AbortController();this.controllers.push(c);const timer=setTimeout(()=>c.abort(),25000);try{const r=await fetch(url,{cache:'no-store',signal:c.signal,credentials:'omit'});if(!r.ok)throw Error('Yahoo 報價服務暫時無法使用');return await r.json();}finally{clearTimeout(timer);this.controllers=this.controllers.filter(x=>x!==c);}};
  try{
   const config=await fetchJSON('./market-config.json');
   if(!active())return;
   if(!config.yahooProxyUrl)throw Error('Yahoo 報價服務尚未啟用');
   const endpoint=new URL(config.yahooProxyUrl);if(endpoint.protocol!=='https:'&&endpoint.hostname!=='127.0.0.1')throw Error('Yahoo 報價服務設定不正確');
   for(let i=0;i<keys.length;i+=20){
    if(!active())return;const batch=keys.slice(i,i+20),requested=new Set(batch);const url=new URL('quotes',endpoint.href.replace(/\/?$/,'/'));url.searchParams.set('symbols',batch.join(','));
    try{
     const data=await fetchJSON(url);if(!active())return;const found=new Set();
     if(!Array.isArray(data.quotes))throw Error('Yahoo 報價格式不正確');
     for(const raw of data.quotes){try{const q=validateYahooQuote(raw,requested);if(found.has(q.key))continue;found.add(q.key);counts[q.feed]++;this.onQuote(q);}catch{}}
     for(const key of batch)if(!found.has(key))issues[key.split(':')[0]].push(key.split(':')[1]);
    }catch(error){if(!active())return;for(const key of batch)issues[key.split(':')[0]].push(key.split(':')[1]);}
   }
   for(const kind of ['tw','us'])if(keys.some(k=>k.startsWith(kind+':')))this.onStatus(kind,issues[kind].length?`${counts[kind]?'部分更新':'更新失敗'} · ${issues[kind].slice(0,3).join('、')} 未取得報價，保留舊價／手動估價`:`Yahoo 已更新 · ${counts[kind]} 檔延遲報價`);
  }catch(error){if(active())for(const kind of ['tw','us'])if(keys.some(k=>k.startsWith(kind+':')))this.onStatus(kind,`更新失敗 · ${error.name==='AbortError'?'讀取逾時':error.message}`);}
  finally{if(active())this.timers.push(setTimeout(()=>this.pollYahoo(keys,gen),60000));}
 }
}
