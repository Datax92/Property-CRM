/** Pure validation shared by the asset sale transaction and tests. */
export function assetSaleValues(asset: { group?: string; soldAt?: unknown; amount?: unknown; currentValue?: unknown; moves?: AssetMove[] }, account: string, expectedValue: number) {
  if (asset.group !== 'Assets') throw new Error('This record is not an asset.');
  if (asset.soldAt) throw new Error('This asset has already been sold.');
  if (!account.trim()) throw new Error('Choose the bank account receiving the sale.');
  const raw = asset.currentValue == null || asset.currentValue === '' ? assetCost(asset) : asset.currentValue;
  const amount = Math.round(Number(raw));
  const cost = Math.round(assetCost(asset));
  if (!Number.isSafeInteger(amount) || amount <= 0 || !Number.isSafeInteger(cost) || cost < 0) throw new Error('Enter a valid positive worth today before selling.');
  if (amount !== expectedValue) throw new Error('Worth today has changed. Reopen the sale to review the new amount.');
  return { amount, gain: amount - cost };
}

export type AssetMove = { id: string; date: unknown; kind: 'withdraw' | 'deposit'; amount: number; cost: number; gain: number; account: string; paymentId: string; by?: string };

/** What is still invested in an asset: its purchase cost, plus top-ups, less the cost taken out by partial withdrawals. */
export function assetCost(asset: { amount?: unknown; moves?: AssetMove[] }) {
  return (asset.moves ?? []).reduce((c, m) => c + (m.kind === 'deposit' ? m.amount : -m.cost), Number(asset.amount) || 0);
}

/**
 * A partial withdrawal or a top-up of a held asset (e.g. 25 lakh out of a 75 lakh mutual fund).
 * A withdrawal takes out the same share of cost as of worth, so the gain or loss realized is in proportion;
 * a deposit adds to both cost and worth.
 */
export function assetMoveValues(
  asset: { group?: string; soldAt?: unknown; amount?: unknown; currentValue?: unknown; moves?: AssetMove[] },
  kind: 'withdraw' | 'deposit', rawAmount: number, account: string, expectedWorth: number,
) {
  if (asset.group !== 'Assets') throw new Error('This record is not an asset.');
  if (asset.soldAt) throw new Error('This asset has already been sold.');
  if (kind !== 'withdraw' && kind !== 'deposit') throw new Error('Choose withdraw or deposit.');
  if (!account.trim()) throw new Error('Choose the bank account.');
  const amount = Math.round(Number(rawAmount));
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('Enter a valid positive amount.');
  const cost = Math.round(assetCost(asset));
  const raw = asset.currentValue == null || asset.currentValue === '' ? cost : asset.currentValue;
  const worth = Math.round(Number(raw));
  if (!Number.isSafeInteger(worth) || worth < 0) throw new Error('Enter a valid worth today first.');
  if (worth !== expectedWorth) throw new Error('Worth today has changed. Reopen to review the new amount.');
  if (kind === 'deposit') return { amount, cost: 0, gain: 0, newWorth: worth + amount, newCost: cost + amount };
  if (worth <= 0) throw new Error('This asset has no worth left to withdraw.');
  if (amount >= worth) throw new Error('To take out the whole amount, use Sell asset instead.');
  const costOut = Math.round((cost * amount) / worth);
  return { amount, cost: costOut, gain: amount - costOut, newWorth: worth - amount, newCost: cost - costOut };
}
