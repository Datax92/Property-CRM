/** Pure validation shared by the asset sale transaction and tests. */
export function assetSaleValues(asset: { group?: string; soldAt?: unknown; amount?: unknown; currentValue?: unknown }, account: string, expectedValue: number) {
  if (asset.group !== 'Assets') throw new Error('This record is not an asset.');
  if (asset.soldAt) throw new Error('This asset has already been sold.');
  if (!account.trim()) throw new Error('Choose the bank account receiving the sale.');
  const raw = asset.currentValue == null || asset.currentValue === '' ? asset.amount : asset.currentValue;
  const amount = Math.round(Number(raw));
  const cost = Math.round(Number(asset.amount));
  if (!Number.isSafeInteger(amount) || amount <= 0 || !Number.isSafeInteger(cost) || cost < 0) throw new Error('Enter a valid positive worth today before selling.');
  if (amount !== expectedValue) throw new Error('Worth today has changed. Reopen the sale to review the new amount.');
  return { amount, gain: amount - cost };
}
