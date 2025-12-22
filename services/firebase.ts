import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { Transaction } from "../types";

const firebaseConfig = {
  apiKey: "AIzaSyADEtHK6sKc306bJkCcEinKENcnPO2T3wo",
  authDomain: "lidera-flow.firebaseapp.com",
  projectId: "lidera-flow",
  storageBucket: "lidera-flow.firebasestorage.app",
  messagingSenderId: "1056347988400",
  appId: "1:1056347988400:web:a778fca5744be21b85b675"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Collection References
export const TRANSACTIONS_COLLECTION = "transactions";
export const SETTINGS_COLLECTION = "settings";

// Service functions
export const transactionService = {
  getAll: async (): Promise<Transaction[]> => {
    try {
      const querySnapshot = await getDocs(collection(db, TRANSACTIONS_COLLECTION));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
    } catch (error) {
      console.error("Error fetching transactions:", error);
      return [];
    }
  },
  add: async (transaction: Omit<Transaction, 'id'>) => {
    return await addDoc(collection(db, TRANSACTIONS_COLLECTION), transaction);
  },
  update: async (id: string, data: Partial<Transaction>) => {
    return await updateDoc(doc(db, TRANSACTIONS_COLLECTION, id), data);
  },
  delete: async (id: string) => {
    return await deleteDoc(doc(db, TRANSACTIONS_COLLECTION, id));
  }
};