export function validateBankQuote(data,now=Date.now()) {
  if(data?.schemaVersion!==1||data.source!=='臺灣銀行'||data.rateType!=='USD 即期買入'||!['ok','stale'].includes(data.status)||!Number.isFinite(data.rate)||data.rate<=1||data.rate>=1000)throw Error('臺銀報價尚未取得');
  const quoted=Date.parse(data.quotedAt),checked=Date.parse(data.checkedAt);
  if(!Number.isFinite(quoted)||!Number.isFinite(checked)||quoted>now+300000||checked>now+300000)throw Error('臺銀報價時間不正確');
  return {...data,stale:data.status==='stale'||now-checked>2*3600000};
}
export async function fetchBankQuote() {
  const response=await fetch('./data/usd-twd.json',{cache:'no-store',signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw Error('臺銀匯率暫時無法更新');
  return validateBankQuote(await response.json());
}
