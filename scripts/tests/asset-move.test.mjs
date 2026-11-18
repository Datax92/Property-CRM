import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assetCost, assetMoveValues, assetSaleValues } from '../../src/lib/asset-sale.ts';
const fund = { group: 'Assets', amount: 7500000, currentValue: 7500000 };
test('partial withdrawal takes out cost in proportion and realizes only that share of gain', () => {
  assert.deepEqual(assetMoveValues(fund, 'withdraw', 2500000, 'Bank', 7500000), { amount: 2500000, cost: 2500000, gain: 0, newWorth: 5000000, newCost: 5000000 });
  const grown = { ...fund, currentValue: 8000000 };
  const v = assetMoveValues(grown, 'withdraw', 2000000, 'Bank', 8000000);
  assert.equal(v.cost, 1875000); assert.equal(v.gain, 125000); assert.equal(v.newWorth, 6000000);
});
test('deposit adds to cost and worth', () => {
  assert.deepEqual(assetMoveValues(fund, 'deposit', 1000000, 'Bank', 7500000), { amount: 1000000, cost: 0, gain: 0, newWorth: 8500000, newCost: 8500000 });
});
test('cost follows the move history, and a later sale realizes against it', () => {
  const moved = { ...fund, currentValue: 5200000, moves: [{ kind: 'withdraw', amount: 2500000, cost: 2500000 }, { kind: 'deposit', amount: 200000, cost: 0 }] };
  assert.equal(assetCost(moved), 5200000);
  assert.equal(assetSaleValues(moved, 'Bank', 5200000).gain, 0);
});
test('invalid withdrawals and deposits are rejected', () => {
  assert.throws(() => assetMoveValues(fund, 'withdraw', 7500000, 'Bank', 7500000), /Sell asset/);
  assert.throws(() => assetMoveValues(fund, 'withdraw', 0, 'Bank', 7500000), /positive/);
  assert.throws(() => assetMoveValues(fund, 'deposit', 100, '', 7500000), /account/);
  assert.throws(() => assetMoveValues(fund, 'deposit', 100, 'Bank', 1), /changed/);
  assert.throws(() => assetMoveValues({ ...fund, soldAt: new Date() }, 'deposit', 100, 'Bank', 7500000), /sold/);
});
