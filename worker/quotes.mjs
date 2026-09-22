// Public quote gateway. Receives stock symbols only, never portfolio balances or credentials.
export const SYMBOL=/^(tw:\d{4,6}[A-Z]?|us:[A-Z][A-Z0-9.\-]{0,14})$/;
export function yahooSymbols(key){if(!SYMBOL.test(key))throw Error('Invalid symbol');const [kind,symbol]=key.split(':');return kind==='tw'?[symbol+'.TW',symbol+'.TWO']:[symbol.replaceAll('.','-')];}
export function parseYahoo(payload,key,yahooSymbol,now=Date.now()){
 const meta=payload?.chart?.result?.[0]?.meta,kind=key.split(':')[0];
 if(payload?.chart?.error||!meta||meta.symbol!==yahooSymbol||meta.currency!==(kind==='tw'?'TWD':'USD')||!Number.isFinite(meta.regularMarketPrice)||meta.regularMarketPrice<=0||!Number.isFinite(meta.regularMarketTime)||meta.regularMarketTime<=0||meta.regularMarketTime*1000>now+300000)throw Error('Invalid Yahoo quote');
 return {key,price:meta.regularMarketPrice,time:meta.regularMarketTime*1000,source:'Yahoo Finance · 延遲報價',feed:kind,delayed:true,currency:meta.currency,yahooSymbol,checkedAt:now};
}
export async function fetchQuote(key,{fetcher=fetch,cache=null,now=Date.now()}={}){
 const cacheKey=new Request('https://pocket-cache.invalid/quote/'+encodeURIComponent(key));
 if(cache){const cached=await cache.match(cacheKey);if(cached)return cached.json();}
 for(const symbol of yahooSymbols(key)){
  const response=await fetcher('https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(symbol)+'?range=1d&interval=1d',{headers:{Accept:'application/json','User-Agent':'Pocket-Wealth/0.3'},signal:AbortSignal.timeout(8000)});
  if(response.status===404)continue;
  if(!response.ok)throw Error(response.status===429?'Yahoo 暫時限制請求，請稍後再試':'Yahoo 來源暫時無法使用');
  let quote;try{quote=parseYahoo(await response.json(),key,symbol,now);}catch{throw Error('Yahoo 未提供有效報價');}
  if(cache)await cache.put(cacheKey,new Response(JSON.stringify(quote),{headers:{'Content-Type':'application/json','Cache-Control':'public, max-age=60'}}));
  return quote;
 }
 throw Error('Yahoo 找不到此股票代碼');
}
export async function handleRequest(request,env={},dependencies={}){
 const allowed=env.ALLOWED_ORIGIN||'https://solomonwei.github.io',origin=request.headers.get('Origin');
 const headers={'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':allowed,'Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin','Cache-Control':'no-store'};
 const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(origin&&origin!==allowed)return reply({error:'Origin not allowed'},403);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(request.method!=='GET')return reply({error:'Method not allowed'},405);
 const url=new URL(request.url);
 if(url.pathname==='/health')return reply({service:'pocket-yahoo-quotes',version:'0.3.0'});
 if(url.pathname!=='/quotes')return reply({error:'Not found'},404);
 const keys=[...new Set((url.searchParams.get('symbols')||'').split(','))];
 if(keys.length>20||keys.some(key=>!SYMBOL.test(key)))return reply({error:'Provide 1–20 valid stock symbols'},400);
 const quotes=[],errors=[];let index=0;
 await Promise.all(Array.from({length:Math.min(4,keys.length)},async()=>{while(index<keys.length){const key=keys[index++];try{quotes.push(await fetchQuote(key,dependencies));}catch(error){errors.push({key,message:error.name==='TimeoutError'?'Yahoo 讀取逾時':/^(Yahoo )/.test(error.message)?error.message:'Yahoo 來源暫時無法使用'});}}}));
 return reply({quotes,errors,checkedAt:Date.now()});
}
export default {fetch(request,env){return handleRequest(request,env,{cache:globalThis.caches?.default});}};
