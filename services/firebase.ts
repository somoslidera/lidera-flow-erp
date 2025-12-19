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
    } catch (error: any) {
      console.error("Error fetching transactions:", error);
      if (error.code === 'permission-denied') {
        console.error("❌ PERMISSÃO NEGADA: Verifique as regras de segurança do Firestore no console do Firebase");
        console.error("Acesse: https://console.firebase.google.com/project/lidera-flow/firestore/rules");
      }
      return [];
    }
  },
  add: async (transaction: Omit<Transaction, 'id'>) => {
    try {
      return await addDoc(collection(db, TRANSACTIONS_COLLECTION), transaction);
    } catch (error: any) {
      console.error("Error adding transaction:", error);
      if (error.code === 'permission-denied') {
        console.error("❌ PERMISSÃO NEGADA: Verifique as regras de segurança do Firestore");
        throw new Error("Permissão negada pelo Firestore. Configure as regras de segurança.");
      }
      throw error;
    }
  },
  update: async (id: string, data: Partial<Transaction>) => {
    try {
      return await updateDoc(doc(db, TRANSACTIONS_COLLECTION, id), data);
    } catch (error: any) {
      console.error("Error updating transaction:", error);
      if (error.code === 'permission-denied') {
        console.error("❌ PERMISSÃO NEGADA: Verifique as regras de segurança do Firestore");
        throw new Error("Permissão negada pelo Firestore. Configure as regras de segurança.");
      }
      throw error;
    }
  },
  delete: async (id: string) => {
    try {
      return await deleteDoc(doc(db, TRANSACTIONS_COLLECTION, id));
    } catch (error: any) {
      console.error("Error deleting transaction:", error);
      if (error.code === 'permission-denied') {
        console.error("❌ PERMISSÃO NEGADA: Verifique as regras de segurança do Firestore");
        throw new Error("Permissão negada pelo Firestore. Configure as regras de segurança.");
      }
      throw error;
    }
  }
};