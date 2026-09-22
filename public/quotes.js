import {keyFor} from './model.js?v=0.2.0';
export function parseFugle(m) {
  const d=m.data;if(!['data','snapshot'].includes(m.event)||!d||d.isTrial||!(d.price>0)||!Number.isFinite(d.time))return null;
  return {key:`tw:${d.symbol}`,price:d.price,time:Math.floor(d.time/1000),source:'Fugle 即時成交',feed:'tw'};
}
export function parseAlpaca(m,feed) {
  if(m.T!=='t'||!(m.p>0)||!Number.isFinite(Date.parse(m.t)))return null;
  return {key:`us:${m.S}`,price:m.p,time:Date.parse(m.t),source:feed==='sip'?'美股 SIP 綜合成交':'美股 IEX 單一交易所',feed:'us'};
}
export function parseBinance(m) {
  const d=m.data||m;if(!(Number(d.c)>0)||!Number.isFinite(d.E))return null;
  return {key:`crypto:${d.s}`,price:Number(d.c),time:d.E,source:'Binance 現貨',feed:'crypto',change:Number(d.P)};
}
export class QuoteStreams {
  constructor(onQuote,onStatus){this.onQuote=onQuote;this.onStatus=onStatus;this.generation=0;this.sockets=[];this.timers=[];}
  stop(){this.generation++;this.timers.forEach(clearTimeout);this.timers=[];this.sockets.forEach(s=>s.close());this.sockets=[];}
  start(rows,credentials={}) {
    this.stop();const gen=this.generation;
    for(const kind of ['tw','us','crypto']){
      const symbols=[...new Set(rows.filter(r=>r.kind===kind).map(r=>r.symbol))];
      if(!symbols.length){this.onStatus(kind,'尚未加入標的');continue;}
      if((kind==='tw'&&!credentials.fugle)||(kind==='us'&&(!credentials.alpacaKey||!credentials.alpacaSecret))){this.onStatus(kind,'待連接行情');continue;}
      let retries=0;
      const connect=()=>{
        if(gen!==this.generation)return;
        this.onStatus(kind,retries?'正在重新連線':'連線中');
        const url=kind==='crypto'?`wss://data-stream.binance.vision/stream?streams=${symbols.map(s=>s.toLowerCase()+'@ticker').join('/')}`:kind==='tw'?'wss://api.fugle.tw/marketdata/v1.0/stock/streaming':`wss://stream.data.alpaca.markets/v2/${credentials.usFeed==='sip'?'sip':'iex'}`;
        let terminal=false;const socket=new WebSocket(url);this.sockets.push(socket);
        const timeout=setTimeout(()=>{if(gen===this.generation&&socket.readyState!==WebSocket.OPEN)socket.close();},15000);this.timers.push(timeout);
        socket.onopen=()=>{clearTimeout(timeout);if(gen!==this.generation){socket.close();return;}retries=0;
          if(kind==='tw')socket.send(JSON.stringify({event:'auth',data:{apikey:credentials.fugle}}));
          else if(kind==='us')socket.send(JSON.stringify({action:'auth',key:credentials.alpacaKey,secret:credentials.alpacaSecret}));
          else this.onStatus(kind,'已連線，等待行情');
        };
        socket.onmessage=e=>{if(gen!==this.generation)return;let payload;try{payload=JSON.parse(e.data);}catch{return;}
          for(const m of Array.isArray(payload)?payload:[payload]){
            if(m.event==='error'||m.T==='error'){terminal=true;this.onStatus(kind,`行情錯誤：${String(m.data?.message||m.msg||'請檢查權限').slice(0,150)}`);socket.close();return;}
            if(kind==='tw'&&m.event==='authenticated'){socket.send(JSON.stringify({event:'subscribe',data:{channel:'trades',symbols}}));this.onStatus(kind,'已連線，等待成交');}
            if(kind==='us'&&m.T==='success'&&m.msg==='authenticated'){socket.send(JSON.stringify({action:'subscribe',trades:symbols}));this.onStatus(kind,'已連線，等待成交');}
            const q=kind==='tw'?parseFugle(m):kind==='us'?parseAlpaca(m,credentials.usFeed):parseBinance(m);
            if(q&&symbols.some(s=>keyFor({kind,symbol:s})===q.key)){this.onStatus(kind,'行情串流中');this.onQuote(q);}
          }
        };
        socket.onerror=()=>{if(gen===this.generation&&!terminal)this.onStatus(kind,'連線異常');};
        socket.onclose=()=>{clearTimeout(timeout);this.sockets=this.sockets.filter(s=>s!==socket);if(gen!==this.generation||terminal)return;this.onStatus(kind,'已斷線，將重連');this.timers.push(setTimeout(connect,Math.min(30000,1000*2**retries++)));};
      };connect();
    }
  }
}
