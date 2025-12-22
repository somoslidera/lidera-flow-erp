import React, { useState } from 'react';
import { Account, Transaction } from '../types';
import { Plus, Wallet, Landmark, TrendingUp, TrendingDown, Trash2 } from 'lucide-react';

interface AccountsProps {
  accounts: Account[];
  transactions: Transaction[];
  darkMode: boolean;
  onAddAccount: (acc: Account) => void;
  onDeleteAccount: (id: string) => void;
}

const Accounts: React.FC<AccountsProps> = ({ accounts, transactions, darkMode, onAddAccount, onDeleteAccount }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountType, setNewAccountType] = useState<Account['type']>('Corrente');
  const [newAccountBalance, setNewAccountBalance] = useState(0);

  // Styles
  const cardBg = darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200';
  const textColor = darkMode ? 'text-zinc-100' : 'text-slate-800';
  const subText = darkMode ? 'text-zinc-400' : 'text-slate-500';
  const inputBg = darkMode ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-900';

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const calculateCurrentBalance = (account: Account) => {
    let balance = account.initialBalance;
    transactions.forEach(t => {
      if (t.accountId === account.id && (t.status === 'Pago' || t.status === 'Recebido')) {
        if (t.tipo === 'Entrada') balance += t.valorRealizado;
        else balance -= t.valorRealizado;
      }
    });
    return balance;
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const newAccount: Account = {
      id: Math.random().toString(36).substr(2, 9),
      name: newAccountName,
      type: newAccountType,
      initialBalance: newAccountBalance,
      color: '#3b82f6'
    };
    onAddAccount(newAccount);
    setIsModalOpen(false);
    setNewAccountName('');
    setNewAccountBalance(0);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className={`text-2xl font-bold ${textColor}`}>Contas & Caixas</h2>
          <p className={subText}>Gerencie suas contas bancárias e carteiras</p>
        </div>
        <button 
            onClick={() => setIsModalOpen(true)}
            className={`p-2 px-4 rounded-lg flex items-center gap-2 font-medium ${darkMode ? 'bg-yellow-500 text-zinc-900 hover:bg-yellow-400' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
          >
            <Plus size={18} />
            <span>Nova Conta</span>
          </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map(account => {
          const currentBalance = calculateCurrentBalance(account);
          return (
            <div key={account.id} className={`p-6 rounded-xl border relative group ${cardBg}`}>
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-zinc-800' : 'bg-slate-100'}`}>
                  {account.type === 'Caixa' ? <Wallet className={subText} /> : <Landmark className={subText} />}
                </div>
                {accounts.length > 1 && (
                  <button 
                    onClick={() => onDeleteAccount(account.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-red-500 hover:bg-red-500/10 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              
              <h3 className={`font-semibold text-lg ${textColor}`}>{account.name}</h3>
              <p className={`text-sm mb-4 ${subText}`}>{account.type}</p>
              
              <div className="space-y-1">
                <p className={`text-xs uppercase font-medium ${subText}`}>Saldo Atual</p>
                <p className={`text-2xl font-bold ${currentBalance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {formatCurrency(currentBalance)}
                </p>
              </div>

              <div className={`mt-4 pt-4 border-t flex gap-4 ${darkMode ? 'border-zinc-800' : 'border-slate-100'}`}>
                 <div className="flex items-center gap-1 text-xs text-emerald-500">
                    <TrendingUp size={14} /> Entradas
                 </div>
                 <div className="flex items-center gap-1 text-xs text-red-500">
                    <TrendingDown size={14} /> Saídas
                 </div>
              </div>
            </div>
          );
        })}
      </div>

       {/* Modal */}
       {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md rounded-xl shadow-2xl p-6 ${cardBg}`}>
            <h3 className={`text-xl font-bold mb-4 ${textColor}`}>Nova Conta</h3>
            <form onSubmit={handleAdd} className="space-y-4">
               <div>
                  <label className={`block text-sm font-medium mb-1 ${subText}`}>Nome da Conta</label>
                  <input required className={`w-full p-2 rounded border ${inputBg}`} value={newAccountName} onChange={e => setNewAccountName(e.target.value)} placeholder="Ex: Nubank, Caixa Loja..." />
               </div>
               <div>
                  <label className={`block text-sm font-medium mb-1 ${subText}`}>Tipo</label>
                  <select className={`w-full p-2 rounded border ${inputBg}`} value={newAccountType} onChange={e => setNewAccountType(e.target.value as any)}>
                    <option value="Corrente">Conta Corrente</option>
                    <option value="Poupança">Poupança</option>
                    <option value="Caixa">Caixa Físico</option>
                    <option value="Investimento">Investimento</option>
                  </select>
               </div>
               <div>
                  <label className={`block text-sm font-medium mb-1 ${subText}`}>Saldo Inicial</label>
                  <input type="number" step="0.01" className={`w-full p-2 rounded border ${inputBg}`} value={newAccountBalance} onChange={e => setNewAccountBalance(parseFloat(e.target.value))} />
               </div>
               
               <div className="flex justify-end gap-2 mt-6">
                 <button type="button" onClick={() => setIsModalOpen(false)} className={`px-4 py-2 rounded font-medium ${darkMode ? 'text-zinc-300 hover:bg-zinc-800' : 'text-slate-600 hover:bg-slate-100'}`}>Cancelar</button>
                 <button type="submit" className={`px-4 py-2 rounded font-medium ${darkMode ? 'bg-yellow-500 text-zinc-900' : 'bg-blue-600 text-white'}`}>Criar Conta</button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Accounts;