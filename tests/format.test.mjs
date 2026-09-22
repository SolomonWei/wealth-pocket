import test from 'node:test';
import assert from 'node:assert/strict';
import {formatPrice} from '../public/format.js';
test('quote prices preserve stock cents and low-price crypto decimals',()=>{
 for(const [input,expected] of [[1234.56,'1,234.56'],[58.05,'58.05'],[0.07123,'0.07123'],[0.00001234,'0.00001234'],[1.234e-8,'0.00000001234'],[1e-21,'0.000000000000000000001'],[100,'100.00'],[0,'0.00'],[123.456789012345,'123.456789012345'],[null,'—'],[NaN,'—']])assert.equal(formatPrice(input),expected);
});
