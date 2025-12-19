import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, getDoc } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { Transaction, AppSettings, Account, Entity } from "../types";

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
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Collection References
export const TRANSACTIONS_COLLECTION = "transactions";
export const SETTINGS_COLLECTION = "settings";
export const ACCOUNTS_COLLECTION = "accounts";
export const ENTITIES_COLLECTION = "entities";
const SETTINGS_DOC_ID = "main"; // Single document for settings

// Service functions
export const transactionService = {
  getAll: async (): Promise<Transaction[]> => {
    try {
      const querySnapshot = await getDocs(collection(db, TRANSACTIONS_COLLECTION));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
    } catch (error: any) {
      console.error("Error fetching transactions:", error);
      if (error?.code === 'permission-denied') {
        console.error("❌ PERMISSÃO NEGADA: Verifique as regras de segurança do Firestore no console do Firebase");
        console.error("Acesse: https://console.firebase.google.com/project/lidera-flow/firestore/rules");
      }
      return [];
    }
  },
  add: async (transaction: Omit<Transaction, 'id'>) => {
    try {
      // Validate required fields
      if (!transaction.description || !transaction.dueDate) {
        throw new Error(`Transação inválida: falta descrição ou data de vencimento`);
      }
      
      // Clean data - remove undefined values
      const cleanTransaction = Object.fromEntries(
        Object.entries(transaction).filter(([_, v]) => v !== undefined)
      ) as Omit<Transaction, 'id'>;
      
      console.log('💾 Salvando transação no Firebase:', {
        description: cleanTransaction.description,
        amount: cleanTransaction.expectedAmount,
        date: cleanTransaction.dueDate
      });
      
      const docRef = await addDoc(collection(db, TRANSACTIONS_COLLECTION), cleanTransaction);
      console.log('✅ Transação salva com ID:', docRef.id);
      return docRef;
    } catch (error: any) {
      console.error("❌ Error adding transaction:", error);
      console.error("Transaction data:", transaction);
      if (error?.code === 'permission-denied') {
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
      if (error?.code === 'permission-denied') {
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
      if (error?.code === 'permission-denied') {
        console.error("❌ PERMISSÃO NEGADA: Verifique as regras de segurança do Firestore");
        throw new Error("Permissão negada pelo Firestore. Configure as regras de segurança.");
      }
      throw error;
    }
  }
};

// Settings Service (single document)
export const settingsService = {
  get: async (): Promise<AppSettings | null> => {
    try {
      const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as AppSettings;
      }
      return null;
    } catch (error: any) {
      console.error("Error fetching settings:", error);
      if (error?.code === 'permission-denied') {
        console.error("❌ PERMISSÃO NEGADA: Verifique as regras de segurança do Firestore");
      }
      return null;
    }
  },
  save: async (settings: AppSettings) => {
    try {
      return await setDoc(doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID), settings);
    } catch (error: any) {
      console.error("Error saving settings:", error);
      if (error?.code === 'permission-denied') {
        console.error("❌ PERMISSÃO NEGADA: Verifique as regras de segurança do Firestore");
        throw new Error("Permissão negada pelo Firestore. Configure as regras de segurança.");
      }
      throw error;
    }
  }
};

// Accounts Service
export const accountsService = {
  getAll: async (): Promise<Account[]> => {
    try {
      const querySnapshot = await getDocs(collection(db, ACCOUNTS_COLLECTION));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account));
    } catch (error: any) {
      console.error("Error fetching accounts:", error);
      if (error?.code === 'permission-denied') {
        console.error("❌ PERMISSÃO NEGADA: Verifique as regras de segurança do Firestore");
      }
      return [];
    }
  },
  add: async (account: Omit<Account, 'id'>) => {
    try {
      return await addDoc(collection(db, ACCOUNTS_COLLECTION), account);
    } catch (error: any) {
      console.error("Error adding account:", error);
      if (error?.code === 'permission-denied') {
        console.error("❌ PERMISSÃO NEGADA: Verifique as regras de segurança do Firestore");
        throw new Error("Permissão negada pelo Firestore. Configure as regras de segurança.");
      }
      throw error;
    }
  },
  update: async (id: string, data: Partial<Account>) => {
    try {
      return await updateDoc(doc(db, ACCOUNTS_COLLECTION, id), data);
    } catch (error: any) {
      console.error("Error updating account:", error);
      if (error?.code === 'permission-denied') {
        console.error("❌ PERMISSÃO NEGADA: Verifique as regras de segurança do Firestore");
        throw new Error("Permissão negada pelo Firestore. Configure as regras de segurança.");
      }
      throw error;
    }
  },
  delete: async (id: string) => {
    try {
      return await deleteDoc(doc(db, ACCOUNTS_COLLECTION, id));
    } catch (error: any) {
      console.error("Error deleting account:", error);
      if (error?.code === 'permission-denied') {
        console.error("❌ PERMISSÃO NEGADA: Verifique as regras de segurança do Firestore");
        throw new Error("Permissão negada pelo Firestore. Configure as regras de segurança.");
      }
      throw error;
    }
  }
};

// Entities Service
export const entityService = {
  getAll: async (): Promise<Entity[]> => {
    try {
      const querySnapshot = await getDocs(collection(db, ENTITIES_COLLECTION));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Entity));
    } catch (error: any) {
      console.error("Error fetching entities:", error);
      if (error?.code === 'permission-denied') {
        console.error("❌ PERMISSÃO NEGADA: Verifique as regras de segurança do Firestore");
      }
      return [];
    }
  },
  getByType: async (type: 'Cliente' | 'Fornecedor' | 'Ambos'): Promise<Entity[]> => {
    try {
      const all = await entityService.getAll();
      return all.filter(e => e.type === type || e.type === 'Ambos');
    } catch (error: any) {
      console.error("Error fetching entities by type:", error);
      return [];
    }
  },
  getById: async (id: string): Promise<Entity | null> => {
    try {
      const docRef = doc(db, ENTITIES_COLLECTION, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Entity;
      }
      return null;
    } catch (error: any) {
      console.error("Error fetching entity:", error);
      return null;
    }
  },
  add: async (entity: Omit<Entity, 'id'>) => {
    try {
      return await addDoc(collection(db, ENTITIES_COLLECTION), entity);
    } catch (error: any) {
      console.error("Error adding entity:", error);
      if (error?.code === 'permission-denied') {
        console.error("❌ PERMISSÃO NEGADA: Verifique as regras de segurança do Firestore");
        throw new Error("Permissão negada pelo Firestore. Configure as regras de segurança.");
      }
      throw error;
    }
  },
  update: async (id: string, data: Partial<Entity>) => {
    try {
      return await updateDoc(doc(db, ENTITIES_COLLECTION, id), data);
    } catch (error: any) {
      console.error("Error updating entity:", error);
      if (error?.code === 'permission-denied') {
        console.error("❌ PERMISSÃO NEGADA: Verifique as regras de segurança do Firestore");
        throw new Error("Permissão negada pelo Firestore. Configure as regras de segurança.");
      }
      throw error;
    }
  },
  delete: async (id: string) => {
    try {
      return await deleteDoc(doc(db, ENTITIES_COLLECTION, id));
    } catch (error: any) {
      console.error("Error deleting entity:", error);
      if (error?.code === 'permission-denied') {
        console.error("❌ PERMISSÃO NEGADA: Verifique as regras de segurança do Firestore");
        throw new Error("Permissão negada pelo Firestore. Configure as regras de segurança.");
      }
      throw error;
    }
  }
};

// Auth Service
export const authService = {
  signInWithGoogle: async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (error: any) {
      console.error("Error signing in with Google:", error);
      throw error;
    }
  },
  signOut: async () => {
    try {
      await signOut(auth);
    } catch (error: any) {
      console.error("Error signing out:", error);
      throw error;
    }
  },
  onAuthStateChanged: (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, callback);
  },
  getCurrentUser: () => {
    return auth.currentUser;
  }
};