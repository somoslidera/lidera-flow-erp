import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import Settings from './components/Settings';
import Reports from './components/Reports';
import Accounts from './components/Accounts';
import Help from './components/Help';
import Login from './components/Login';
import { Transaction, AppSettings, Account, Entity } from './types';
import { MOCK_TRANSACTIONS, MOCK_SETTINGS, MOCK_ACCOUNTS } from './constants';
import { transactionService, settingsService, accountsService, entityService, authService } from './services/firebase';
import Entities from './components/Entities';
import { User } from 'firebase/auth';

const App: React.FC = () => {
  // Theme State
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Data State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
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

  // Auth State Listener
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((user) => {
      setUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        // Fetch all data from Firebase in parallel
        const [firebaseTransactions, firebaseSettings, firebaseAccounts, firebaseEntities] = await Promise.all([
          transactionService.getAll(),
          settingsService.get(),
          accountsService.getAll(),
          entityService.getAll()
        ]);

        // Set transactions
        setTransactions(firebaseTransactions);
        if (firebaseTransactions.length === 0) {
          console.log("No transactions found in Firebase. Start adding transactions to see them here.");
        }

        // Set settings
        if (firebaseSettings) {
          setSettings(firebaseSettings);
        } else {
          // If no settings in Firebase, use mock and save to Firebase
          console.log("No settings in Firebase - initializing with mock data");
          setSettings(MOCK_SETTINGS);
          try {
            await settingsService.save(MOCK_SETTINGS);
            console.log("Settings initialized in Firebase");
          } catch (error) {
            console.error("Failed to initialize settings in Firebase:", error);
          }
        }

        // Set accounts
        if (firebaseAccounts.length > 0) {
          setAccounts(firebaseAccounts);
        } else {
          // If no accounts in Firebase, use mock and save to Firebase
          console.log("No accounts in Firebase - initializing with mock data");
          setAccounts(MOCK_ACCOUNTS);
          try {
            for (const account of MOCK_ACCOUNTS) {
              const { id, ...accountData } = account;
              await accountsService.add(accountData);
            }
            // Reload accounts to get Firebase IDs
            const savedAccounts = await accountsService.getAll();
            if (savedAccounts.length > 0) {
              setAccounts(savedAccounts);
            }
            console.log("Accounts initialized in Firebase");
          } catch (error) {
            console.error("Failed to initialize accounts in Firebase:", error);
          }
        }

        // Set entities and migrate from settings if needed
        if (firebaseEntities.length > 0) {
          setEntities(firebaseEntities);
        } else {
          // Migrate entities from settings to new collection
          console.log("No entities in Firebase - checking for migration from settings");
          if (firebaseSettings?.entities && firebaseSettings.entities.length > 0) {
            try {
              const currentUser = authService.getCurrentUser();
              const userId = currentUser?.uid || 'system';
              const now = new Date().toISOString();
              
              for (const entityItem of firebaseSettings.entities) {
                const entityData: Omit<Entity, 'id'> = {
                  name: entityItem.name,
                  type: entityItem.type,
                  createdAt: now,
                  updatedAt: now,
                  createdBy: userId,
                  isActive: true,
                  tags: ['migrated-from-settings']
                };
                await entityService.add(entityData);
              }
              
              const migratedEntities = await entityService.getAll();
              setEntities(migratedEntities);
              console.log(`Migrated ${migratedEntities.length} entities from settings to new collection`);
            } catch (error) {
              console.error("Failed to migrate entities from settings:", error);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching data from Firebase:", error);
        // Fallback to mock data on error
        setTransactions(MOCK_TRANSACTIONS);
        setSettings(MOCK_SETTINGS);
        setAccounts(MOCK_ACCOUNTS);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
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
    console.log(`🚀 Iniciando salvamento de ${newTs.length} transações no Firebase...`);
    
    try {
      // Save all transactions to Firebase in batches to avoid timeouts
      const addedTransactions: Transaction[] = [];
      const failedTransactions: Array<{ transaction: Omit<Transaction, 'id'>; error: any }> = [];
      const batchSize = 50; // Process 50 at a time
      
      for (let i = 0; i < newTs.length; i += batchSize) {
        const batch = newTs.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;
        console.log(`📦 Processando batch ${batchNumber} (${batch.length} transações)...`);
        
        const batchPromises = batch.map((t, idx) => 
          transactionService.add(t)
            .then(docRef => {
              console.log(`✅ Transação ${i + idx + 1} salva com ID: ${docRef.id}`);
              return { ...t, id: docRef.id };
            })
            .catch(error => {
              console.error(`❌ Erro ao salvar transação ${i + idx + 1}:`, error);
              console.error('Dados da transação:', t);
              failedTransactions.push({ transaction: t, error });
              throw error; // Re-throw to be caught by Promise.allSettled
            })
        );
        
        try {
          // Use allSettled to get all results, even if some fail
          const batchResults = await Promise.allSettled(batchPromises);
          
          batchResults.forEach((result, idx) => {
            if (result.status === 'fulfilled') {
              addedTransactions.push(result.value);
            } else {
              console.error(`❌ Falha na transação ${i + idx + 1} do batch ${batchNumber}:`, result.reason);
              failedTransactions.push({ 
                transaction: batch[idx], 
                error: result.reason 
              });
            }
          });
          
          console.log(`✅ Batch ${batchNumber}: ${batchResults.filter(r => r.status === 'fulfilled').length}/${batch.length} transações salvas`);
        } catch (batchError: any) {
          console.error(`❌ Erro crítico no batch ${batchNumber}:`, batchError);
          console.error('Detalhes do erro:', {
            code: batchError?.code,
            message: batchError?.message,
            stack: batchError?.stack
          });
          
          // Try to save individually to identify which ones fail
          for (const t of batch) {
            try {
              const docRef = await transactionService.add(t);
              addedTransactions.push({ ...t, id: docRef.id });
              console.log(`✅ Transação salva individualmente`);
            } catch (individualError: any) {
              console.error(`❌ Falha ao salvar transação individual:`, individualError);
              failedTransactions.push({ transaction: t, error: individualError });
            }
          }
        }
      }
      
      // Update local state only with successfully saved transactions
      if (addedTransactions.length > 0) {
        setTransactions([...addedTransactions, ...transactions]);
        console.log(`✅ Total de ${addedTransactions.length} transações salvas no Firebase e estado local atualizado`);
      }
      
      // Report failures
      if (failedTransactions.length > 0) {
        console.error(`❌ ${failedTransactions.length} transações falharam ao salvar:`);
        failedTransactions.forEach(({ transaction, error }, idx) => {
          console.error(`  ${idx + 1}. Erro:`, error?.code || error?.message || error);
          console.error(`     Transação:`, transaction.description, transaction.expectedAmount);
        });
        
        // Check for permission errors
        const permissionErrors = failedTransactions.filter(f => 
          f.error?.code === 'permission-denied' || 
          f.error?.message?.includes('Permissão negada')
        );
        
        if (permissionErrors.length > 0) {
          alert(`⚠️ ERRO: ${permissionErrors.length} transações falharam por permissão negada.\n\nConfigure as regras de segurança no console do Firebase:\nhttps://console.firebase.google.com/project/lidera-flow/firestore/rules\n\n${addedTransactions.length} transações foram salvas com sucesso.`);
        } else {
          alert(`⚠️ ATENÇÃO: ${failedTransactions.length} transações falharam ao salvar.\n\n${addedTransactions.length} transações foram salvas com sucesso.\n\nVerifique o console para mais detalhes.`);
        }
      } else {
        console.log(`🎉 Todas as ${addedTransactions.length} transações foram salvas com sucesso!`);
      }
      
    } catch (error: any) {
      console.error("❌ Erro crítico ao adicionar transações em lote:", error);
      console.error('Detalhes:', {
        code: error?.code,
        message: error?.message,
        stack: error?.stack
      });
      
      // Fallback: try to save at least some
      console.log('Tentando salvar individualmente...');
      const saved: Transaction[] = [];
      for (const t of newTs.slice(0, 10)) { // Try first 10
        try {
          const docRef = await transactionService.add(t);
          saved.push({ ...t, id: docRef.id });
        } catch (e) {
          console.error('Falha individual:', e);
        }
      }
      
      if (saved.length > 0) {
        setTransactions([...saved, ...transactions]);
        alert(`⚠️ Erro ao salvar em lote. ${saved.length} transações foram salvas individualmente.\n\nVerifique o console para mais detalhes.`);
      } else {
        alert(`❌ ERRO: Não foi possível salvar nenhuma transação no Firebase.\n\nVerifique:\n1. Regras de segurança do Firestore\n2. Conexão com internet\n3. Console do navegador para detalhes`);
      }
      
      if (error?.message?.includes('Permissão negada') || error?.code === 'permission-denied') {
        alert("⚠️ ERRO: Permissão negada pelo Firestore.\n\nConfigure as regras de segurança no console do Firebase:\nhttps://console.firebase.google.com/project/lidera-flow/firestore/rules");
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

  const handleUpdateSettings = async (newSettings: AppSettings) => {
    try {
      // Save to Firebase
      await settingsService.save(newSettings);
      // Update local state
      setSettings(newSettings);
    } catch (error: any) {
      console.error("Error saving settings to Firebase:", error);
      // Still update local state for better UX
      setSettings(newSettings);
      
      if (error?.message?.includes('Permissão negada') || error?.code === 'permission-denied') {
        console.warn("⚠️ Permissão negada - Configure as regras do Firestore");
      } else {
        alert("Erro ao salvar configurações no Firebase. As alterações foram salvas localmente.");
      }
    }
  };

  const handleAddAccount = async (acc: Account) => {
    try {
      // Save to Firebase
      const { id, ...accountData } = acc;
      const docRef = await accountsService.add(accountData);
      // Update local state with Firebase ID
      const newAccount = { ...acc, id: docRef.id };
      setAccounts([...accounts, newAccount]);
    } catch (error: any) {
      console.error("Error adding account to Firebase:", error);
      // Fallback: add to local state
      setAccounts([...accounts, acc]);
      
      if (error?.message?.includes('Permissão negada') || error?.code === 'permission-denied') {
        alert("⚠️ ERRO: Permissão negada pelo Firestore.\n\nConfigure as regras de segurança no console do Firebase:\nhttps://console.firebase.google.com/project/lidera-flow/firestore/rules");
      } else {
        alert("Erro ao salvar conta no Firebase. A conta foi adicionada localmente.");
      }
    }
  };

  const handleUpdateAccount = async (id: string, updated: Partial<Account>) => {
    try {
      // Update in Firebase
      await accountsService.update(id, updated);
      // Update local state
      setAccounts(accounts.map(a => a.id === id ? { ...a, ...updated } : a));
    } catch (error: any) {
      console.error("Error updating account in Firebase:", error);
      // Still update local state for better UX
      setAccounts(accounts.map(a => a.id === id ? { ...a, ...updated } : a));
      
      if (error?.message?.includes('Permissão negada') || error?.code === 'permission-denied') {
        console.warn("⚠️ Permissão negada - Configure as regras do Firestore");
      } else {
        alert("Erro ao atualizar conta no Firebase. A conta foi atualizada localmente.");
      }
    }
  };

  const handleDeleteAccount = async (id: string) => {
    try {
      // Delete from Firebase
      await accountsService.delete(id);
      // Update local state
      setAccounts(accounts.filter(a => a.id !== id));
    } catch (error: any) {
      console.error("Error deleting account from Firebase:", error);
      // Still remove from local state for better UX
      setAccounts(accounts.filter(a => a.id !== id));
      
      if (error?.message?.includes('Permissão negada') || error?.code === 'permission-denied') {
        console.warn("⚠️ Permissão negada - Configure as regras do Firestore");
      } else {
        alert("Erro ao deletar conta no Firebase. A conta foi removida localmente.");
      }
    }
  };

  const handleAddEntity = async (entity: Omit<Entity, 'id'>) => {
    try {
      const currentUser = authService.getCurrentUser();
      const entityWithUser = {
        ...entity,
        createdBy: currentUser?.uid || 'system',
        createdAt: entity.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: entity.isActive !== false
      };
      const docRef = await entityService.add(entityWithUser);
      const newEntity = { ...entityWithUser, id: docRef.id };
      setEntities([...entities, newEntity]);
    } catch (error: any) {
      console.error("Error adding entity to Firebase:", error);
      if (error?.message?.includes('Permissão negada') || error?.code === 'permission-denied') {
        alert("⚠️ ERRO: Permissão negada pelo Firestore.\n\nConfigure as regras de segurança no console do Firebase:\nhttps://console.firebase.google.com/project/lidera-flow/firestore/rules");
      } else {
        alert("Erro ao salvar entidade no Firebase.");
      }
    }
  };

  const handleUpdateEntity = async (id: string, updated: Partial<Entity>) => {
    try {
      const updatedWithTimestamp = {
        ...updated,
        updatedAt: new Date().toISOString()
      };
      await entityService.update(id, updatedWithTimestamp);
      setEntities(entities.map(e => e.id === id ? { ...e, ...updatedWithTimestamp } : e));
    } catch (error: any) {
      console.error("Error updating entity in Firebase:", error);
      setEntities(entities.map(e => e.id === id ? { ...e, ...updated } : e));
      if (error?.message?.includes('Permissão negada') || error?.code === 'permission-denied') {
        console.warn("⚠️ Permissão negada - Configure as regras do Firestore");
      } else {
        alert("Erro ao atualizar entidade no Firebase.");
      }
    }
  };

  const handleDeleteEntity = async (id: string) => {
    try {
      await entityService.delete(id);
      setEntities(entities.filter(e => e.id !== id));
    } catch (error: any) {
      console.error("Error deleting entity from Firebase:", error);
      setEntities(entities.filter(e => e.id !== id));
      if (error?.message?.includes('Permissão negada') || error?.code === 'permission-denied') {
        console.warn("⚠️ Permissão negada - Configure as regras do Firestore");
      } else {
        alert("Erro ao deletar entidade no Firebase.");
      }
    }
  };

  const handleImportEntities = async (entitiesToImport: Array<{ name: string; type: 'Cliente' | 'Fornecedor' | 'Ambos'; tags?: string[] }>) => {
    try {
      const currentUser = authService.getCurrentUser();
      const userId = currentUser?.uid || 'system';
      const now = new Date().toISOString();
      
      const addedEntities: Entity[] = [];
      
      for (const entityData of entitiesToImport) {
        // Check if entity already exists
        const existing = entities.find(e => 
          e.name.toLowerCase() === entityData.name.toLowerCase()
        );
        
        if (existing) {
          // Update existing entity with new tags
          const updatedTags = [...new Set([...(existing.tags || []), ...(entityData.tags || [])])];
          await entityService.update(existing.id, {
            tags: updatedTags,
            updatedAt: now
          });
          addedEntities.push({ ...existing, tags: updatedTags, updatedAt: now });
        } else {
          // Add new entity
          const newEntity: Omit<Entity, 'id'> = {
            name: entityData.name,
            type: entityData.type,
            tags: entityData.tags || [],
            createdAt: now,
            updatedAt: now,
            createdBy: userId,
            isActive: true
          };
          const docRef = await entityService.add(newEntity);
          addedEntities.push({ ...newEntity, id: docRef.id });
        }
      }
      
      // Reload entities to get all updates
      const allEntities = await entityService.getAll();
      setEntities(allEntities);
      
      console.log(`Imported ${addedEntities.length} entities`);
    } catch (error: any) {
      console.error("Error importing entities:", error);
      if (error?.message?.includes('Permissão negada') || error?.code === 'permission-denied') {
        alert("⚠️ ERRO: Permissão negada pelo Firestore ao importar entidades.");
      } else {
        alert("Erro ao importar entidades do CSV.");
      }
    }
  };

  // Show loading while checking auth
  if (authLoading || loading) {
    return (
      <div className={`h-screen w-full flex items-center justify-center ${darkMode ? 'bg-zinc-950 text-yellow-500' : 'bg-slate-50 text-blue-600'}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-current"></div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!user) {
    return <Login darkMode={darkMode} />;
  }

  return (
    <Router>
      <Layout darkMode={darkMode} toggleTheme={toggleTheme} user={user} onSignOut={() => authService.signOut()}>
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
            path="/dashboard" 
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
                entities={entities}
                settings={settings}
                darkMode={darkMode}
                onAdd={handleAddTransaction}
                onDelete={handleDeleteTransaction}
                onUpdate={handleUpdateTransaction}
                onBulkAdd={handleBulkAddTransactions}
                onImportEntities={handleImportEntities}
              />
            } 
          />
          <Route 
            path="/lancamentos" 
            element={
              <Transactions 
                transactions={transactions} 
                accounts={accounts}
                entities={entities}
                settings={settings}
                darkMode={darkMode}
                onAdd={handleAddTransaction}
                onDelete={handleDeleteTransaction}
                onUpdate={handleUpdateTransaction}
                onBulkAdd={handleBulkAddTransactions}
                onImportEntities={handleImportEntities}
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
                 onUpdateAccount={handleUpdateAccount}
                 onDeleteAccount={handleDeleteAccount}
              />
            }
          />
          <Route 
            path="/contas" 
            element={
              <Accounts 
                 accounts={accounts} 
                 transactions={transactions}
                 darkMode={darkMode}
                 onAddAccount={handleAddAccount}
                 onUpdateAccount={handleUpdateAccount}
                 onDeleteAccount={handleDeleteAccount}
              />
            }
          />
          <Route 
            path="/entities" 
            element={
              <Entities 
                entities={entities}
                darkMode={darkMode}
                onAddEntity={handleAddEntity}
                onUpdateEntity={handleUpdateEntity}
                onDeleteEntity={handleDeleteEntity}
              />
            }
          />
          <Route 
            path="/fornecedores-clientes" 
            element={
              <Entities 
                entities={entities}
                darkMode={darkMode}
                onAddEntity={handleAddEntity}
                onUpdateEntity={handleUpdateEntity}
                onDeleteEntity={handleDeleteEntity}
              />
            }
          />
          <Route 
            path="/reports"
            element={<Reports transactions={transactions} darkMode={darkMode} />}
          />
          <Route 
            path="/relatorios"
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
            path="/configuracoes" 
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
          <Route 
            path="/ajuda" 
            element={<Help darkMode={darkMode} />} 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;