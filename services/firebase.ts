import { initializeApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, getDoc } from "firebase/firestore";
import { getAuth, Auth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { Transaction, AppSettings, Account, Entity, SubcategoryItem, Budget } from "../types";

const firebaseConfig = {
  apiKey: "AIzaSyADEtHK6sKc306bJkCcEinKENcnPO2T3wo",
  authDomain: "lidera-flow.firebaseapp.com",
  projectId: "lidera-flow",
  storageBucket: "lidera-flow.firebasestorage.app",
  messagingSenderId: "1056347988400",
  appId: "1:1056347988400:web:a778fca5744be21b85b675"
};

// Initialize Firebase
let app: FirebaseApp;
let db: Firestore;
let auth: Auth;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  console.log('✅ Firebase inicializado com sucesso');
} catch (error: any) {
  console.error('❌ Erro ao inicializar Firebase:', error);
  throw new Error(`Falha ao inicializar Firebase: ${error?.message || 'Erro desconhecido'}`);
}

export { db, auth };
const googleProvider = new GoogleAuthProvider();
// Solicitar escopos necessários para obter foto de perfil
googleProvider.addScope('profile');
googleProvider.addScope('email');
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Collection References
export const TRANSACTIONS_COLLECTION = "transactions";
export const SETTINGS_COLLECTION = "settings";
export const ACCOUNTS_COLLECTION = "accounts";
export const ENTITIES_COLLECTION = "entities";
export const SUBCATEGORIES_COLLECTION = "subcategories";
export const BUDGETS_COLLECTION = "budgets";
const USERS_COLLECTION = "users";
const SETTINGS_DOC_ID = "main"; // Single document for settings

// Helper function to handle Firebase errors
const handleFirebaseError = (error: any, context: string): void => {
  if (error?.code === 'permission-denied') {
    console.error(`❌ PERMISSÃO NEGADA (${context}): Verifique as regras de segurança do Firestore`);
    console.error("Acesse: https://console.firebase.google.com/project/lidera-flow/firestore/rules");
  } else if (error?.code === 'unavailable' || error?.message?.includes('network') || error?.message?.includes('fetch')) {
    console.error(`❌ ERRO DE CONEXÃO (${context}): Verifique sua conexão com a internet`);
  } else {
    console.error(`❌ Erro em ${context}:`, error);
  }
};

// Service functions
export const transactionService = {
  getAll: async (): Promise<Transaction[]> => {
    try {
      const querySnapshot = await getDocs(collection(db, TRANSACTIONS_COLLECTION));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
    } catch (error: any) {
      handleFirebaseError(error, 'transactionService.getAll');
      if (error?.code === 'unavailable' || error?.message?.includes('network') || error?.message?.includes('fetch')) {
        throw new Error("Erro de conexão com o Firebase. Verifique sua conexão com a internet.");
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

// Subcategories Service
export const subcategoryService = {
  getAll: async (): Promise<SubcategoryItem[]> => {
    try {
      const querySnapshot = await getDocs(collection(db, SUBCATEGORIES_COLLECTION));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SubcategoryItem));
    } catch (error: any) {
      console.error("Error fetching subcategories:", error);
      if (error?.code === 'permission-denied') {
        console.error("❌ PERMISSÃO NEGADA: Verifique as regras de segurança do Firestore");
      }
      return [];
    }
  },
  getByCategoryId: async (categoryId: string): Promise<SubcategoryItem[]> => {
    try {
      const all = await subcategoryService.getAll();
      return all.filter(s => s.categoryId === categoryId);
    } catch (error: any) {
      console.error("Error fetching subcategories by category:", error);
      return [];
    }
  },
  getById: async (id: string): Promise<SubcategoryItem | null> => {
    try {
      const docRef = doc(db, SUBCATEGORIES_COLLECTION, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as SubcategoryItem;
      }
      return null;
    } catch (error: any) {
      console.error("Error fetching subcategory:", error);
      return null;
    }
  },
  add: async (subcategory: Omit<SubcategoryItem, 'id'>) => {
    try {
      const cleanSubcategory = Object.fromEntries(
        Object.entries(subcategory).filter(([_, v]) => v !== undefined)
      ) as Omit<SubcategoryItem, 'id'>;
      return await addDoc(collection(db, SUBCATEGORIES_COLLECTION), cleanSubcategory);
    } catch (error: any) {
      console.error("Error adding subcategory:", error);
      if (error?.code === 'permission-denied') {
        console.error("❌ PERMISSÃO NEGADA: Verifique as regras de segurança do Firestore");
        throw new Error("Permissão negada pelo Firestore. Configure as regras de segurança.");
      }
      throw error;
    }
  },
  update: async (id: string, data: Partial<SubcategoryItem>) => {
    try {
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== undefined)
      ) as Partial<SubcategoryItem>;
      return await updateDoc(doc(db, SUBCATEGORIES_COLLECTION, id), cleanData);
    } catch (error: any) {
      console.error("Error updating subcategory:", error);
      if (error?.code === 'permission-denied') {
        console.error("❌ PERMISSÃO NEGADA: Verifique as regras de segurança do Firestore");
        throw new Error("Permissão negada pelo Firestore. Configure as regras de segurança.");
      }
      throw error;
    }
  },
  delete: async (id: string) => {
    try {
      return await deleteDoc(doc(db, SUBCATEGORIES_COLLECTION, id));
    } catch (error: any) {
      console.error("Error deleting subcategory:", error);
      if (error?.code === 'permission-denied') {
        console.error("❌ PERMISSÃO NEGADA: Verifique as regras de segurança do Firestore");
        throw new Error("Permissão negada pelo Firestore. Configure as regras de segurança.");
      }
      throw error;
    }
  }
};

// Budgets Service
export const budgetService = {
  getAll: async (): Promise<Budget[]> => {
    try {
      const querySnapshot = await getDocs(collection(db, BUDGETS_COLLECTION));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Budget));
    } catch (error: any) {
      console.error("Error fetching budgets:", error);
      if (error?.code === 'permission-denied') {
        console.error("❌ PERMISSÃO NEGADA: Verifique as regras de segurança do Firestore");
      }
      return [];
    }
  },
  getByYear: async (year: number): Promise<Budget | null> => {
    try {
      const all = await budgetService.getAll();
      return all.find(b => b.year === year && b.isActive) || null;
    } catch (error: any) {
      console.error("Error fetching budget by year:", error);
      return null;
    }
  },
  getActive: async (): Promise<Budget | null> => {
    try {
      const all = await budgetService.getAll();
      return all.find(b => b.isActive) || null;
    } catch (error: any) {
      console.error("Error fetching active budget:", error);
      return null;
    }
  },
  getById: async (id: string): Promise<Budget | null> => {
    try {
      const docRef = doc(db, BUDGETS_COLLECTION, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Budget;
      }
      return null;
    } catch (error: any) {
      console.error("Error fetching budget:", error);
      return null;
    }
  },
  add: async (budget: Omit<Budget, 'id'>) => {
    try {
      const cleanBudget = Object.fromEntries(
        Object.entries(budget).filter(([_, v]) => v !== undefined)
      ) as Omit<Budget, 'id'>;
      return await addDoc(collection(db, BUDGETS_COLLECTION), cleanBudget);
    } catch (error: any) {
      console.error("Error adding budget:", error);
      if (error?.code === 'permission-denied') {
        console.error("❌ PERMISSÃO NEGADA: Verifique as regras de segurança do Firestore");
        throw new Error("Permissão negada pelo Firestore. Configure as regras de segurança.");
      }
      throw error;
    }
  },
  update: async (id: string, data: Partial<Budget>) => {
    try {
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== undefined)
      ) as Partial<Budget>;
      return await updateDoc(doc(db, BUDGETS_COLLECTION, id), cleanData);
    } catch (error: any) {
      console.error("Error updating budget:", error);
      if (error?.code === 'permission-denied') {
        console.error("❌ PERMISSÃO NEGADA: Verifique as regras de segurança do Firestore");
        throw new Error("Permissão negada pelo Firestore. Configure as regras de segurança.");
      }
      throw error;
    }
  },
  delete: async (id: string) => {
    try {
      return await deleteDoc(doc(db, BUDGETS_COLLECTION, id));
    } catch (error: any) {
      console.error("Error deleting budget:", error);
      if (error?.code === 'permission-denied') {
        console.error("❌ PERMISSÃO NEGADA: Verifique as regras de segurança do Firestore");
        throw new Error("Permissão negada pelo Firestore. Configure as regras de segurança.");
      }
      throw error;
    }
  }
};

// Users Service
export const userService = {
  saveOrUpdateUser: async (user: User) => {
    try {
      const userDoc = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        lastLogin: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Usar setDoc com merge para criar ou atualizar
      await setDoc(doc(db, USERS_COLLECTION, user.uid), userDoc, { merge: true });
      console.log('✅ Perfil do usuário salvo/atualizado no Firestore');
    } catch (error: any) {
      console.error("Error saving user profile:", error);
      if (error?.code === 'permission-denied') {
        console.error("❌ PERMISSÃO NEGADA: Verifique as regras de segurança do Firestore para a coleção 'users'");
      }
      // Não lançar erro para não interromper o fluxo de login
    }
  },
  getUser: async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(db, USERS_COLLECTION, uid));
      if (userDoc.exists()) {
        return userDoc.data();
      }
      return null;
    } catch (error: any) {
      console.error("Error fetching user:", error);
      return null;
    }
  }
};

// Auth Service
export const authService = {
  signInWithGoogle: async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      // Log para debug da foto de perfil
      console.log('🔍 User data after login:', {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
        providerData: result.user.providerData
      });
      
      // Salvar foto de perfil automaticamente após login
      if (result.user) {
        await userService.saveOrUpdateUser(result.user);
      }
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