import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import Settings from './components/Settings';
import Reports from './components/Reports';
import Accounts from './components/Accounts';
import Help from './components/Help';
import ErrorModal from './components/ErrorModal';
import { ErrorBoundary } from './components/ErrorBoundary';
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
  
  // Error State
  const [error, setError] = useState<string | null>(null);
  const [errorPage, setErrorPage] = useState<string>('/');

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
    // Global error handler for unhandled errors
    const handleUnhandledError = (event: ErrorEvent) => {
      const errorMessage = event.message || 'Erro desconhecido no sistema';
      setError(`Erro não tratado: ${errorMessage}`);
      setErrorPage(window.location.hash.replace('#', '') || '/');
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const errorMessage = event.reason?.message || event.reason || 'Erro desconhecido na promessa';
      setError(`Erro de carregamento: ${errorMessage}`);
      setErrorPage(window.location.hash.replace('#', '') || '/');
    };

    window.addEventListener('error', handleUnhandledError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    const fetchTransactions = async () => {
      try {
        setLoading(true);
        // Try to fetch from Firebase
        const firebaseData = await transactionService.getAll();
        
        if (firebaseData.length > 0) {
          setTransactions(firebaseData);
        } else {
          // Fallback to Mock Data if Firebase is empty/fails
          console.log("Using Mock Data (Firebase empty or error)");
          setTransactions(MOCK_TRANSACTIONS);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao carregar transações';
        console.error('Error fetching transactions:', err);
        setError(`Falha ao carregar dados: ${errorMessage}`);
        setErrorPage(window.location.hash.replace('#', '') || '/');
        // Use mock data as fallback
        setTransactions(MOCK_TRANSACTIONS);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();

    return () => {
      window.removeEventListener('error', handleUnhandledError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const toggleTheme = () => setDarkMode(!darkMode);

  // Handlers
  const handleAddTransaction = async (t: Omit<Transaction, 'id'>) => {
    try {
      const newId = Math.random().toString(36).substr(2, 9);
      const newTransaction = { ...t, id: newId };
      setTransactions([newTransaction, ...transactions]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao adicionar transação';
      setError(`Falha ao adicionar transação: ${errorMessage}`);
      setErrorPage('/transactions');
    }
  };

  const handleBulkAddTransactions = async (newTs: Omit<Transaction, 'id'>[]) => {
    try {
      const processed = newTs.map(t => ({
        ...t,
        id: Math.random().toString(36).substr(2, 9)
      }));
      setTransactions([...processed, ...transactions]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao importar transações';
      setError(`Falha ao importar transações: ${errorMessage}`);
      setErrorPage('/transactions');
    }
  };

  const handleDeleteTransaction = (id: string) => {
    try {
      setTransactions(transactions.filter(t => t.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao excluir transação';
      setError(`Falha ao excluir transação: ${errorMessage}`);
      setErrorPage('/transactions');
    }
  };

  const handleUpdateTransaction = (id: string, updated: Partial<Transaction>) => {
    try {
      setTransactions(transactions.map(t => t.id === id ? { ...t, ...updated } : t));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao atualizar transação';
      setError(`Falha ao atualizar transação: ${errorMessage}`);
      setErrorPage('/transactions');
    }
  };

  const handleUpdateSettings = (newSettings: AppSettings) => {
    try {
      setSettings(newSettings);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao atualizar configurações';
      setError(`Falha ao atualizar configurações: ${errorMessage}`);
      setErrorPage('/settings');
    }
  };

  const handleAddAccount = (acc: Account) => {
    try {
      setAccounts([...accounts, acc]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao adicionar conta';
      setError(`Falha ao adicionar conta: ${errorMessage}`);
      setErrorPage('/accounts');
    }
  };

  const handleDeleteAccount = (id: string) => {
    try {
      setAccounts(accounts.filter(a => a.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao excluir conta';
      setError(`Falha ao excluir conta: ${errorMessage}`);
      setErrorPage('/accounts');
    }
  };

  const handleError = (errorMessage: string) => {
    // Store current page before showing error
    const currentPath = window.location.hash.replace('#', '') || '/';
    setErrorPage(currentPath);
    setError(errorMessage);
  };

  const handleCloseError = () => {
    setError(null);
    // Optionally navigate to a safe page, but we'll keep user on current page
    // If you want to navigate to a specific page, uncomment:
    // window.location.hash = errorPage;
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
      <ErrorBoundary onError={handleError}>
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
        <ErrorModal 
          isOpen={error !== null} 
          error={error} 
          onClose={handleCloseError}
          darkMode={darkMode}
        />
      </ErrorBoundary>
    </Router>
  );
};

export default App;