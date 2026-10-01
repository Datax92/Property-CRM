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
  if (obj instanceof Date) {
    return Timestamp.fromDate(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(serializeForFirestore);
  }
  if (typeof obj === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
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

export function syncFirestoreData(onUpdate: () => void): () => void {
  const db = getFirebaseFirestore();
  if (!db) {
    return () => {};
  }

  // Cleanup old listeners
  activeUnsubscribers.forEach((unsub) => unsub());
  activeUnsubscribers = [];

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
          if (docs.length > 0 || (M.DATA as any)[colName]?.length > 0) {
            (M.DATA as any)[colName] = docs;
            onUpdate();
          }
        },
        (error) => {
          console.warn(`Firestore listener warning for ${colName}:`, error.message);
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
  };
}
