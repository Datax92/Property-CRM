import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  Timestamp,
  QuerySnapshot,
  DocumentData,
} from 'firebase/firestore';
import { getFirebaseFirestore } from './firebase';
import * as M from './re-data';

const COLLECTIONS = [
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

let activeUnsubscribers: (() => void)[] = [];

// New record IDs are numbered from what is already loaded, so nothing may be
// saved until every ledger has answered once — otherwise a new record could
// reuse (and overwrite) an existing ID.
const loaded = new Set<string>();
export function ledgersReady(): boolean {
  return activeUnsubscribers.length === 0 || loaded.size >= COLLECTIONS.length;
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
  };
}
