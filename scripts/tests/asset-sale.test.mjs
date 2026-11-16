import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assetSaleValues } from '../../src/lib/asset-sale.ts';
const asset = { group: 'Assets', amount: 100, currentValue: 140 };
test('sale credits current valuation and realizes only the gain', () => assert.deepEqual(assetSaleValues(asset, 'Bank', 140), { amount: 140, gain: 40 }));
test('loss and no valuation fallback', () => {
 assert.equal(assetSaleValues({...asset, currentValue:70}, 'Bank',70).gain,-30);
 assert.deepEqual(assetSaleValues({...asset,currentValue:null},'Bank',100),{amount:100,gain:0});
});
test('duplicate, stale, missing account and invalid values are rejected', () => {
 assert.throws(()=>assetSaleValues({...asset,soldAt:new Date()},'Bank',140),/already/);
 assert.throws(()=>assetSaleValues(asset,'Bank',150),/changed/);
 assert.throws(()=>assetSaleValues(asset,'',140),/account/);
 for(const currentValue of [0,-10,NaN,Infinity]) assert.throws(()=>assetSaleValues({...asset,currentValue},'Bank',currentValue),/positive/);
 assert.throws(()=>assetSaleValues({...asset,group:'Expenses'},'Bank',140),/not an asset/);
});
