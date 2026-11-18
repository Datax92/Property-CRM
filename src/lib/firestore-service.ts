import {
  runTransaction,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  Timestamp,
  QuerySnapshot,
  DocumentData,
} from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseFirestore } from './firebase';
import * as M from './re-data';
import { assetMoveValues, assetSaleValues, type AssetMove } from './asset-sale';

const COLLECTIONS = [
  'projects',
  'agents',
  'properties',
  'sales',
  'costSheets',
  'invoices',
  'expenses',
  'payments',
  'commissions',
  'taxes',
  'salaries',
  'bills',
  'zakat',
  'audit',
  'tasks',
  'taskProjects',
  'projectPlans',
  'income',
  'categories',
] as const;

export type CollectionName = typeof COLLECTIONS[number] | 'users';

function serializeForFirestore(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'number') return Number.isFinite(obj) ? obj : 0;
  if (obj instanceof Date) {
    // An invalid Date cannot be stored as a Timestamp.
    return isNaN(obj.getTime()) ? null : Timestamp.fromDate(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(serializeForFirestore);
  }
  if (typeof obj === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      // Firestore rejects the whole write if any field is undefined.
      if (v === undefined) continue;
      out[k] = serializeForFirestore(v);
    }
    return out;
  }
  return obj;
}

function deserializeFromFirestore(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Timestamp) {
    return obj.toDate();
  }
  if (typeof obj === 'object' && obj.seconds !== undefined && obj.nanoseconds !== undefined) {
    return new Date(obj.seconds * 1000 + obj.nanoseconds / 1000000);
  }
  if (typeof obj === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(obj)) {
    const d = new Date(obj);
    if (!isNaN(d.getTime())) return d;
  }
  if (Array.isArray(obj)) {
    return obj.map(deserializeFromFirestore);
  }
  if (typeof obj === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = deserializeFromFirestore(v);
    }
    return out;
  }
  return obj;
}

// A failed write must not pass silently: the record exists on screen but would
// be gone after a reload. The shell subscribes here and tells the user.
let saveErrorHandler: ((message: string) => void) | null = null;
export function onFirestoreSaveError(handler: ((message: string) => void) | null) {
  saveErrorHandler = handler;
}

function reportSaveError(collName: string, err: any) {
  const code = err && err.code ? String(err.code) : '';
  const message =
    code === 'permission-denied'
      ? 'Not saved — this account is not allowed to write to the database (check Firestore rules).'
      : code === 'unavailable'
      ? 'Not saved yet — you appear to be offline.'
      : `Could not save to ${collName} — please try again.`;
  if (saveErrorHandler) saveErrorHandler(message);
}

export async function saveRecordToFirestore(collName: CollectionName, id: string, data: any) {
  const db = getFirebaseFirestore();
  if (!db) {
    console.warn(`Firestore not available, skipped saving to ${collName}/${id}`);
    return;
  }

  try {
    const cleanData = serializeForFirestore({ ...data, id });
    const docRef = doc(db, collName, id);
    await setDoc(docRef, cleanData, { merge: true });
  } catch (err) {
    console.error(`Error saving to Firestore collection ${collName}:`, err);
    reportSaveError(collName, err);
  }
}

export async function deleteRecordFromFirestore(collName: CollectionName, id: string) {
  const db = getFirebaseFirestore();
  if (!db) return;

  try {
    const docRef = doc(db, collName, id);
    await deleteDoc(docRef);
  } catch (err) {
    console.error(`Error deleting from Firestore collection ${collName}:`, err);
  }
}

// A refused read leaves every ledger empty, which looks exactly like a new, unused
// portal — and anything entered on top of it is never stored. The shell subscribes
// here and keeps the reason on screen until the ledgers load.
let readError: string | null = null;
let readErrorHandler: ((message: string | null) => void) | null = null;
export function onFirestoreReadError(handler: ((message: string | null) => void) | null) {
  readErrorHandler = handler;
  if (handler) handler(readError);
}
export function ledgerError(): string | null {
  return readError;
}

function setReadError(message: string | null) {
  if (readError === message) return;
  readError = message;
  if (readErrorHandler) readErrorHandler(message);
}

function readErrorMessage(err: any): string {
  const code = err && err.code ? String(err.code) : '';
  if (code === 'permission-denied') {
    const uid = getFirebaseAuth()?.currentUser?.uid;
    return (
      'The database refused this account, so records cannot be loaded and new entries will NOT be saved. ' +
      'The published Firestore rules must allow ' + (uid ? 'user ID ' + uid : 'this user') + '.'
    );
  }
  if (code === 'not-found' || code === 'failed-precondition') {
    return 'The Firestore database for this project has not been created yet, so records cannot be loaded and new entries will NOT be saved.';
  }
  return 'Records could not be loaded from the database' + (code ? ' (' + code + ')' : '') + '. New entries will NOT be saved until this is fixed.';
}

let activeUnsubscribers: (() => void)[] = [];

// New record IDs are numbered from what is already loaded, so nothing may be
// saved until every ledger has answered once — otherwise a new record could
// reuse (and overwrite) an existing ID.
const loaded = new Set<string>();
export function ledgersReady(): boolean {
  return activeUnsubscribers.length === 0 || loaded.size >= COLLECTIONS.length;
}

/** True only once every ledger has actually arrived from the database without an error —
    safe for work that creates records from what is (or is not) already there. */
export function ledgersLoaded(): boolean {
  return activeUnsubscribers.length > 0 && loaded.size >= COLLECTIONS.length && !readError;
}

export function syncFirestoreData(onUpdate: () => void): () => void {
  const db = getFirebaseFirestore();
  if (!db) {
    return () => {};
  }

  // Cleanup old listeners
  activeUnsubscribers.forEach((unsub) => unsub());
  activeUnsubscribers = [];
  loaded.clear();
  setReadError(null);

  COLLECTIONS.forEach((colName) => {
    try {
      const q = collection(db, colName);
      const unsub = onSnapshot(
        q,
        (snapshot: QuerySnapshot<DocumentData>) => {
          const docs: any[] = [];
          snapshot.forEach((d) => {
            const raw = d.data();
            const deserialized = deserializeFromFirestore(raw);
            docs.push({ ...deserialized, id: d.id });
          });

          // Update DATA in-memory
          const first = !loaded.has(colName);
          loaded.add(colName);
          if (first || docs.length > 0 || (M.DATA as any)[colName]?.length > 0) {
            (M.DATA as any)[colName] = M.normalizeLedger(colName, docs);
            onUpdate();
          }
        },
        (error) => {
          console.warn(`Firestore listener warning for ${colName}:`, error.message);
          setReadError(readErrorMessage(error));
          loaded.add(colName);
          onUpdate();
        }
      );
      activeUnsubscribers.push(unsub);
    } catch (err) {
      console.warn(`Failed to bind listener for ${colName}:`, err);
    }
  });

  return () => {
    activeUnsubscribers.forEach((u) => u());
    activeUnsubscribers = [];
    loaded.clear();
    setReadError(null);
  };
}


/** A deterministic receipt and a transaction prevent double credit on retries or concurrent sales. */
export async function sellAssetToAccount(id: string, account: string, expectedValue: number, actor: string) {
  const db = getFirebaseFirestore();
  if (!db) throw new Error('Connect to the database before selling an asset.');
  if (M.accountKind(account) !== 'Bank' || !M.accountNames().includes(account)) throw new Error('Choose an existing bank account.');
  const assetRef = doc(db, 'expenses', id);
  const paymentRef = doc(db, 'payments', `ASSET-SALE-${id}`);
  return runTransaction(db, async tx => {
    const assetDoc = await tx.get(assetRef);
    const receipt = await tx.get(paymentRef);
    if (!assetDoc.exists()) throw new Error('Asset no longer exists.');
    if (receipt.exists()) throw new Error('This asset sale has already been recorded.');
    const asset = assetDoc.data();
    const { amount, gain } = assetSaleValues(asset, account, expectedValue);
    const date = new Date();
    const sale = { soldAt: date, saleAmount: amount, saleGain: gain, saleAccount: account, salePaymentId: paymentRef.id };
    const payment = { id: paymentRef.id, date, dir: 'in', category: 'Asset Sale', amount, method: 'Bank Transfer', account,
      party: asset.vendor || 'Asset sale', propertyId: null, office: asset.office || M.OFFICES[0], ref: id,
      note: `Asset sale — ${asset.note || asset.category || id}`, assetId: id, settleKey: null,
      status: 'Posted', manual: false, attachments: [], createdBy: actor, approvedBy: actor };
    tx.update(assetRef, serializeForFirestore(sale));
    tx.set(paymentRef, serializeForFirestore(payment));
    tx.set(doc(db, 'audit', paymentRef.id), serializeForFirestore({ id: paymentRef.id, date, txnId: paymentRef.id,
      action: 'Asset sold', user: actor, entity: 'Asset', prevAmount: Number(asset.amount), newAmount: amount,
      note: `${id} sold into ${account}; gain/loss ${gain}`, manual: false }));
    return { ...sale, payment };
  });
}

/** Take part of a held asset out into a bank account, or put more money into it, in one transaction. */
export async function moveAssetMoney(id: string, kind: 'withdraw' | 'deposit', amountIn: number, account: string, expectedWorth: number, actor: string) {
  const db = getFirebaseFirestore();
  if (!db) throw new Error('Connect to the database before changing an asset.');
  if (M.accountKind(account) !== 'Bank' || !M.accountNames().includes(account)) throw new Error('Choose an existing bank account.');
  const assetRef = doc(db, 'expenses', id);
  return runTransaction(db, async tx => {
    const assetDoc = await tx.get(assetRef);
    if (!assetDoc.exists()) throw new Error('Asset no longer exists.');
    const asset = deserializeFromFirestore(assetDoc.data());
    const moves: AssetMove[] = Array.isArray(asset.moves) ? asset.moves : [];
    const v = assetMoveValues(asset, kind, amountIn, account, expectedWorth);
    const paymentRef = doc(db, 'payments', `ASSET-${kind === 'withdraw' ? 'WD' : 'DEP'}-${id}-${moves.length + 1}`);
    if ((await tx.get(paymentRef)).exists()) throw new Error('This entry has already been recorded. Reopen and try again.');
    const date = new Date();
    const move: AssetMove = { id: paymentRef.id, date, kind, amount: v.amount, cost: v.cost, gain: v.gain, account, paymentId: paymentRef.id, by: actor };
    const patch = { moves: [...moves, move], currentValue: v.newWorth, valueDate: date };
    const label = asset.note || asset.category || id;
    const payment = { id: paymentRef.id, date, dir: kind === 'withdraw' ? 'in' : 'out', category: kind === 'withdraw' ? 'Asset Withdrawal' : 'Assets',
      amount: v.amount, method: 'Bank Transfer', account, party: asset.vendor || label, propertyId: null, office: asset.office || M.OFFICES[0], ref: id,
      note: `${kind === 'withdraw' ? 'Withdrawal from' : 'Deposit into'} asset — ${label}`, assetId: id, settleKey: null,
      status: 'Posted', manual: false, attachments: [], createdBy: actor, approvedBy: actor };
    tx.update(assetRef, serializeForFirestore(patch));
    tx.set(paymentRef, serializeForFirestore(payment));
    tx.set(doc(db, 'audit', paymentRef.id), serializeForFirestore({ id: paymentRef.id, date, txnId: paymentRef.id,
      action: kind === 'withdraw' ? 'Asset withdrawal' : 'Asset deposit', user: actor, entity: 'Asset', prevAmount: expectedWorth, newAmount: v.newWorth,
      note: `${id}: ${kind} ${v.amount} ${kind === 'withdraw' ? 'into' : 'from'} ${account}${kind === 'withdraw' ? `; gain/loss ${v.gain}` : ''}`, manual: false }));
    return { patch, payment };
  });
}
