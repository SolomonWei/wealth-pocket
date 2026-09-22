// Preserve every decimal digit in the stored quote, including very small prices.
export function formatPrice(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  const sign=value<0?'-':'';
  const [coefficient,exponent='0']=String(Math.abs(value)).split('e');
  const [whole,fraction='']=coefficient.split('.');
  const digits=whole+fraction,point=whole.length+Number(exponent);
  let integer,decimal;
  if(point<=0){integer='0';decimal='0'.repeat(-point)+digits;}
  else if(point>=digits.length){integer=digits+'0'.repeat(point-digits.length);decimal='';}
  else{integer=digits.slice(0,point);decimal=digits.slice(point);}
  return sign+integer.replace(/\B(?=(\d{3})+(?!\d))/g,',')+'.'+decimal.padEnd(2,'0');
}
