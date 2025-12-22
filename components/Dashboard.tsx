import React, { useMemo, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import { ArrowUpCircle, ArrowDownCircle, DollarSign, Wallet, Calendar, Filter } from 'lucide-react';
import { Transaction, Account } from '../types';

interface DashboardProps {
  transactions: Transaction[];
  accounts: Account[];
  darkMode: boolean;
}

type DateRangeOption = 'thisMonth' | 'lastMonth' | 'thisYear' | 'last30' | 'last90' | 'custom';

const Dashboard: React.FC<DashboardProps> = ({ transactions, accounts, darkMode }) => {
  const [dateRange, setDateRange] = useState<DateRangeOption>('thisMonth');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');

  // Helper to determine start/end dates based on selection
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (dateRange) {
      case 'thisMonth':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'lastMonth':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'thisYear':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        break;
      case 'last30':
        start = new Date();
        start.setDate(now.getDate() - 30);
        break;
      case 'last90':
        start = new Date();
        start.setDate(now.getDate() - 90);
        break;
      case 'custom':
        if (customStart) start = new Date(customStart);
        if (customEnd) end = new Date(customEnd);
        // Adjust for end of day
        end.setHours(23, 59, 59, 999);
        break;
    }
    // Normalize start to beginning of day
    start.setHours(0,0,0,0);
    return { startDate: start, endDate: end };
  }, [dateRange, customStart, customEnd]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const tDate = new Date(t.dataCompetencia);
      const dateMatch = tDate >= startDate && tDate <= endDate;
      const accountMatch = selectedAccount === 'all' || t.accountId === selectedAccount;
      return dateMatch && accountMatch;
    });
  }, [transactions, startDate, endDate, selectedAccount]);

  // Overall Balance (Global)
  const currentTotalBalance = useMemo(() => {
    let total = accounts
      .filter(a => selectedAccount === 'all' || a.id === selectedAccount)
      .reduce((acc, curr) => acc + curr.initialBalance, 0);

    transactions.forEach(t => {
      if (selectedAccount !== 'all' && t.accountId !== selectedAccount) return;
      if (t.status === 'Pago' || t.status === 'Recebido') {
        if (t.tipo === 'Entrada') total += t.valorRealizado;
        else total -= t.valorRealizado;
      }
    });
    return total;
  }, [accounts, transactions, selectedAccount]);
  
  const metrics = useMemo(() => {
    const totalIncome = filteredTransactions
      .filter(t => t.tipo === 'Entrada' && (t.status === 'Recebido' || t.status === 'Pago'))
      .reduce((acc, curr) => acc + curr.valorRealizado, 0);

    const totalExpense = filteredTransactions
      .filter(t => t.tipo === 'Saída' && t.status === 'Pago')
      .reduce((acc, curr) => acc + curr.valorRealizado, 0);

    const pendingIncome = filteredTransactions
      .filter(t => t.tipo === 'Entrada' && t.status === 'A receber')
      .reduce((acc, curr) => acc + curr.valorPrevisto, 0);

    const pendingExpense = filteredTransactions
      .filter(t => t.tipo === 'Saída' && t.status === 'A pagar')
      .reduce((acc, curr) => acc + curr.valorPrevisto, 0);

    return {
      totalIncome,
      totalExpense,
      balance: currentTotalBalance, 
      periodBalance: totalIncome - totalExpense,
      pendingIncome,
      pendingExpense
    };
  }, [filteredTransactions, currentTotalBalance]);

  const categoryData = useMemo(() => {
    const data: Record<string, number> = {};
    filteredTransactions.forEach(t => {
      if (t.tipo === 'Saída') {
        data[t.categoria] = (data[t.categoria] || 0) + (t.status === 'Pago' ? t.valorRealizado : t.valorPrevisto);
      }
    });
    return Object.keys(data).map(name => ({ name, value: data[name] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filteredTransactions]);

  const historyData = useMemo(() => {
    const data = [];
    const today = new Date();
    
    // Last 6 months regardless of filter
    for(let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthName = d.toLocaleString('pt-BR', { month: 'short' });
      
      const income = transactions.filter(t => {
        const tDate = new Date(t.dataCompetencia);
        return tDate.getMonth() === d.getMonth() && 
               tDate.getFullYear() === d.getFullYear() && 
               t.tipo === 'Entrada' && 
               (selectedAccount === 'all' || t.accountId === selectedAccount) &&
               (t.status === 'Recebido' || t.status === 'Pago');
      }).reduce((acc, t) => acc + t.valorRealizado, 0);

      const expense = transactions.filter(t => {
        const tDate = new Date(t.dataCompetencia);
        return tDate.getMonth() === d.getMonth() && 
               tDate.getFullYear() === d.getFullYear() && 
               t.tipo === 'Saída' && 
               (selectedAccount === 'all' || t.accountId === selectedAccount) &&
               t.status === 'Pago';
      }).reduce((acc, t) => acc + t.valorRealizado, 0);

      data.push({ name: monthName, Receitas: income, Despesas: expense });
    }
    return data;
  }, [transactions, selectedAccount]);

  const projectionData = useMemo(() => {
    const data = [];
    let runningBalance = currentTotalBalance;
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const futureTransactions = transactions
      .filter(t => {
        const [y, m, d] = t.dataVencimento.split('-').map(Number);
        const tDate = new Date(y, m-1, d);
        return tDate >= today && 
               (selectedAccount === 'all' || t.accountId === selectedAccount) &&
               (t.status === 'A pagar' || t.status === 'A receber');
      })
      .sort((a, b) => new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime());

    data.push({ date: 'Hoje', saldo: runningBalance });
    
    let tempBalance = runningBalance;
    futureTransactions.slice(0, 15).forEach(t => {
       if (t.tipo === 'Entrada') tempBalance += t.valorPrevisto;
       else tempBalance -= t.valorPrevisto;
       
       const [, m, d] = t.dataVencimento.split('-');
       const dateLabel = `${d}/${m}`;
       data.push({ date: dateLabel, saldo: tempBalance });
    });
    
    return data;
  }, [transactions, currentTotalBalance, selectedAccount]);

  // Theme constants
  const COLORS = darkMode 
    ? ['#fbbf24', '#f59e0b', '#d97706', '#b45309', '#78350f']
    : ['#3b82f6', '#06b6d4', '#6366f1', '#8b5cf6', '#ec4899'];

  const cardBg = darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-sm';
  const textColor = darkMode ? 'text-zinc-100' : 'text-slate-800';
  const subText = darkMode ? 'text-zinc-400' : 'text-slate-500';
  const inputBg = darkMode ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-900';

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6">
      {/* Filters Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-4 mb-4">
        <div>
          <h2 className={`text-2xl font-bold ${textColor}`}>Dashboard</h2>
          <p className={subText}>Visão geral da saúde financeira</p>
        </div>
        
        <div className="flex flex-wrap gap-2 items-center">
           <div className={`flex items-center gap-2 p-1.5 rounded-lg border ${inputBg}`}>
              <Calendar size={18} className={`ml-2 ${subText}`} />
              <select 
                value={dateRange} 
                onChange={(e) => setDateRange(e.target.value as DateRangeOption)}
                className="bg-transparent outline-none cursor-pointer text-sm p-1"
              >
                <option value="thisMonth" className={darkMode ? 'bg-zinc-900' : 'bg-white'}>Este Mês</option>
                <option value="lastMonth" className={darkMode ? 'bg-zinc-900' : 'bg-white'}>Mês Passado</option>
                <option value="thisYear" className={darkMode ? 'bg-zinc-900' : 'bg-white'}>Este Ano</option>
                <option value="last30" className={darkMode ? 'bg-zinc-900' : 'bg-white'}>Últimos 30 dias</option>
                <option value="last90" className={darkMode ? 'bg-zinc-900' : 'bg-white'}>Últimos 90 dias</option>
                <option value="custom" className={darkMode ? 'bg-zinc-900' : 'bg-white'}>Personalizado</option>
              </select>
           </div>

           {dateRange === 'custom' && (
             <div className="flex items-center gap-2">
                <input 
                  type="date" 
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className={`p-2 rounded-lg border text-sm ${inputBg}`}
                />
                <span className={subText}>até</span>
                <input 
                  type="date" 
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className={`p-2 rounded-lg border text-sm ${inputBg}`}
                />
             </div>
           )}

           <div className={`flex items-center gap-2 p-1.5 rounded-lg border ${inputBg}`}>
              <Filter size={18} className={`ml-2 ${subText}`} />
              <select 
                 value={selectedAccount} 
                 onChange={(e) => setSelectedAccount(e.target.value)}
                 className="bg-transparent outline-none cursor-pointer max-w-[150px] text-sm p-1"
              >
                 <option value="all" className={darkMode ? 'bg-zinc-900' : 'bg-white'}>Todas as Contas</option>
                 {accounts.map(a => (
                   <option key={a.id} value={a.id} className={darkMode ? 'bg-zinc-900' : 'bg-white'}>{a.name}</option>
                 ))}
              </select>
           </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-6 rounded-xl border ${cardBg}`}>
          <div className="flex items-center justify-between mb-4">
            <span className={subText}>Saldo Atual (Global)</span>
            <Wallet className={darkMode ? 'text-yellow-500' : 'text-blue-500'} size={20} />
          </div>
          <div className={`text-2xl font-bold ${metrics.balance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {formatCurrency(metrics.balance)}
          </div>
          <div className={`text-xs mt-1 ${subText}`}>Todas contas acumuladas</div>
        </div>

        <div className={`p-6 rounded-xl border ${cardBg}`}>
          <div className="flex items-center justify-between mb-4">
            <span className={subText}>Receitas (Período)</span>
            <ArrowUpCircle className="text-emerald-500" size={20} />
          </div>
          <div className={`text-2xl font-bold ${textColor}`}>
            {formatCurrency(metrics.totalIncome)}
          </div>
          <div className="text-xs text-emerald-500 mt-1">
            + {formatCurrency(metrics.pendingIncome)} a receber
          </div>
        </div>

        <div className={`p-6 rounded-xl border ${cardBg}`}>
          <div className="flex items-center justify-between mb-4">
            <span className={subText}>Despesas (Período)</span>
            <ArrowDownCircle className="text-red-500" size={20} />
          </div>
          <div className={`text-2xl font-bold ${textColor}`}>
            {formatCurrency(metrics.totalExpense)}
          </div>
           <div className="text-xs text-red-500 mt-1">
            + {formatCurrency(metrics.pendingExpense)} a pagar
          </div>
        </div>

        <div className={`p-6 rounded-xl border ${cardBg}`}>
          <div className="flex items-center justify-between mb-4">
            <span className={subText}>Resultado (Período)</span>
            <DollarSign className={darkMode ? 'text-yellow-500' : 'text-blue-500'} size={20} />
          </div>
          <div className={`text-2xl font-bold ${metrics.periodBalance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {formatCurrency(metrics.periodBalance)}
          </div>
          <div className={`text-xs mt-1 ${subText}`}>
             Receitas - Despesas (Realizado)
          </div>
        </div>
      </div>

      {/* Charts Row 1: History & Projection */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`p-6 rounded-xl border ${cardBg}`}>
           <h3 className={`font-semibold mb-6 ${textColor}`}>Histórico Semestral (Realizado)</h3>
           <div className="h-64">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={historyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#3f3f46' : '#e2e8f0'} vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: darkMode ? '#a1a1aa' : '#64748b', fontSize: 12 }} />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ backgroundColor: darkMode ? '#18181b' : '#fff', borderColor: darkMode ? '#27272a' : '#e2e8f0', color: darkMode ? '#fff' : '#000' }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend />
                  <Bar dataKey="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>

        <div className={`p-6 rounded-xl border ${cardBg}`}>
           <h3 className={`font-semibold mb-6 ${textColor}`}>Projeção de Fluxo de Caixa</h3>
           <div className="h-64">
             <ResponsiveContainer width="100%" height="100%">
               <LineChart data={projectionData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#3f3f46' : '#e2e8f0'} vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: darkMode ? '#a1a1aa' : '#64748b', fontSize: 12 }} />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ backgroundColor: darkMode ? '#18181b' : '#fff', borderColor: darkMode ? '#27272a' : '#e2e8f0', color: darkMode ? '#fff' : '#000' }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Line type="monotone" dataKey="saldo" stroke={darkMode ? '#fbbf24' : '#3b82f6'} strokeWidth={3} dot={{r: 4}} />
               </LineChart>
             </ResponsiveContainer>
           </div>
        </div>
      </div>

      {/* Charts Row 2: Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`lg:col-span-2 p-6 rounded-xl border ${cardBg}`}>
           <h3 className={`font-semibold mb-6 ${textColor}`}>Top Categorias de Despesa (Período Selecionado)</h3>
           {categoryData.length > 0 ? (
           <div className="h-64">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={categoryData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#3f3f46' : '#e2e8f0'} horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={120} 
                    tick={{ fill: darkMode ? '#a1a1aa' : '#64748b', fontSize: 12 }} 
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: darkMode ? '#18181b' : '#fff', borderColor: darkMode ? '#27272a' : '#e2e8f0', color: darkMode ? '#fff' : '#000' }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Bar dataKey="value" fill={darkMode ? '#fbbf24' : '#3b82f6'} radius={[0, 4, 4, 0]} barSize={20} />
               </BarChart>
             </ResponsiveContainer>
           </div>
           ) : (
            <div className="h-64 flex items-center justify-center opacity-50">Sem dados neste período.</div>
           )}
        </div>

        <div className={`p-6 rounded-xl border ${cardBg}`}>
          <h3 className={`font-semibold mb-6 ${textColor}`}>Distribuição</h3>
          <div className="h-64">
             {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: darkMode ? '#18181b' : '#fff', borderColor: darkMode ? '#27272a' : '#e2e8f0' }} />
                <Legend iconType="circle" wrapperStyle={{fontSize: '11px'}}/>
              </PieChart>
            </ResponsiveContainer>
            ) : (
                <div className="h-full flex items-center justify-center opacity-50">Sem dados.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;