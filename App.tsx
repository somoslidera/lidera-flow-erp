import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import Settings from './components/Settings';
import Reports from './components/Reports';
import Accounts from './components/Accounts';
import Help from './components/Help';
import { Transaction, AppSettings, Account } from './types';
import { MOCK_TRANSACTIONS, MOCK_SETTINGS, MOCK_ACCOUNTS } from './constants';
import { transactionService } from './services/firebase';

const App: React.FC = () => {
  // Theme State
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  // Data State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>(MOCK_ACCOUNTS);
  const [settings, setSettings] = useState<AppSettings>(MOCK_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Apply theme class to html body
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    const fetchTransactions = async () => {
      // Try to fetch from Firebase
      const firebaseData = await transactionService.getAll();
      
      if (firebaseData.length > 0) {
        setTransactions(firebaseData);
      } else {
        // Fallback to Mock Data if Firebase is empty/fails
        console.log("Using Mock Data (Firebase empty or error)");
        setTransactions(MOCK_TRANSACTIONS);
      }
      setLoading(false);
    };

    fetchTransactions();
  }, []);

  const toggleTheme = () => setDarkMode(!darkMode);

  // Handlers
  const handleAddTransaction = async (t: Omit<Transaction, 'id'>) => {
    try {
      // Save to Firebase
      const docRef = await transactionService.add(t);
      // Update local state with the new transaction (Firebase generates the ID)
      const newTransaction = { ...t, id: docRef.id };
      setTransactions([newTransaction, ...transactions]);
    } catch (error: any) {
      console.error("Error adding transaction to Firebase:", error);
      // Fallback: add to local state with generated ID
      const newId = Math.random().toString(36).substr(2, 9);
      const newTransaction = { ...t, id: newId };
      setTransactions([newTransaction, ...transactions]);
      
      if (error?.message?.includes('Permissão negada') || error?.code === 'permission-denied') {
        alert("⚠️ ERRO: Permissão negada pelo Firestore.\n\nConfigure as regras de segurança no console do Firebase:\nhttps://console.firebase.google.com/project/lidera-flow/firestore/rules\n\nVeja o arquivo FIREBASE_SETUP.md para instruções.");
      } else {
        alert("Erro ao salvar no Firebase. A transação foi adicionada localmente.");
      }
    }
  };

  const handleBulkAddTransactions = async (newTs: Omit<Transaction, 'id'>[]) => {
    try {
      // Save all transactions to Firebase
      const addedTransactions: Transaction[] = [];
      for (const t of newTs) {
        const docRef = await transactionService.add(t);
        addedTransactions.push({ ...t, id: docRef.id });
      }
      // Update local state
      setTransactions([...addedTransactions, ...transactions]);
    } catch (error: any) {
      console.error("Error bulk adding transactions to Firebase:", error);
      // Fallback: add to local state with generated IDs
      const processed = newTs.map(t => ({
        ...t,
        id: Math.random().toString(36).substr(2, 9)
      }));
      setTransactions([...processed, ...transactions]);
      
      if (error?.message?.includes('Permissão negada') || error?.code === 'permission-denied') {
        alert("⚠️ ERRO: Permissão negada pelo Firestore.\n\nConfigure as regras de segurança no console do Firebase:\nhttps://console.firebase.google.com/project/lidera-flow/firestore/rules\n\nVeja o arquivo FIREBASE_SETUP.md para instruções.");
      } else {
        alert("Erro ao salvar algumas transações no Firebase. Elas foram adicionadas localmente.");
      }
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      // Delete from Firebase
      await transactionService.delete(id);
      // Update local state
      setTransactions(transactions.filter(t => t.id !== id));
    } catch (error: any) {
      console.error("Error deleting transaction from Firebase:", error);
      // Still remove from local state for better UX
      setTransactions(transactions.filter(t => t.id !== id));
      
      if (error?.message?.includes('Permissão negada') || error?.code === 'permission-denied') {
        console.warn("⚠️ Permissão negada - Configure as regras do Firestore");
      } else {
        alert("Erro ao deletar no Firebase. A transação foi removida localmente.");
      }
    }
  };

  const handleUpdateTransaction = async (id: string, updated: Partial<Transaction>) => {
    try {
      // Update in Firebase
      await transactionService.update(id, updated);
      // Update local state
      setTransactions(transactions.map(t => t.id === id ? { ...t, ...updated } : t));
    } catch (error: any) {
      console.error("Error updating transaction in Firebase:", error);
      // Still update local state for better UX
      setTransactions(transactions.map(t => t.id === id ? { ...t, ...updated } : t));
      
      if (error?.message?.includes('Permissão negada') || error?.code === 'permission-denied') {
        console.warn("⚠️ Permissão negada - Configure as regras do Firestore");
      } else {
        alert("Erro ao atualizar no Firebase. A transação foi atualizada localmente.");
      }
    }
  };

  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
  };

  const handleAddAccount = (acc: Account) => {
    setAccounts([...accounts, acc]);
  };

  const handleDeleteAccount = (id: string) => {
     setAccounts(accounts.filter(a => a.id !== id));
  };

  if (loading) {
    return (
      <div className={`h-screen w-full flex items-center justify-center ${darkMode ? 'bg-zinc-950 text-yellow-500' : 'bg-slate-50 text-blue-600'}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-current"></div>
      </div>
    );
  }

  return (
    <Router>
      <Layout darkMode={darkMode} toggleTheme={toggleTheme}>
        <Routes>
          <Route 
            path="/" 
            element={
              <Dashboard 
                transactions={transactions} 
                accounts={accounts} 
                darkMode={darkMode} 
              />
            } 
          />
          <Route 
            path="/transactions" 
            element={
              <Transactions 
                transactions={transactions} 
                accounts={accounts}
                settings={settings}
                darkMode={darkMode}
                onAdd={handleAddTransaction}
                onDelete={handleDeleteTransaction}
                onUpdate={handleUpdateTransaction}
                onBulkAdd={handleBulkAddTransactions}
              />
            } 
          />
          <Route 
            path="/accounts" 
            element={
              <Accounts 
                 accounts={accounts} 
                 transactions={transactions}
                 darkMode={darkMode}
                 onAddAccount={handleAddAccount}
                 onDeleteAccount={handleDeleteAccount}
              />
            }
          />
          <Route 
            path="/reports"
            element={<Reports transactions={transactions} darkMode={darkMode} />}
          />
          <Route 
            path="/settings" 
            element={
              <Settings 
                settings={settings} 
                darkMode={darkMode}
                onUpdateSettings={handleUpdateSettings}
              />
            } 
          />
          <Route 
            path="/help" 
            element={<Help darkMode={darkMode} />} 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;