import React, { useMemo, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area, ReferenceLine, ComposedChart
} from 'recharts';
import { ArrowUpCircle, ArrowDownCircle, DollarSign, Wallet, Calendar, Filter, TrendingUp, TrendingDown, AlertTriangle, Activity } from 'lucide-react';
import { Transaction, Account } from '../types';

interface DashboardProps {
  transactions: Transaction[];
  accounts: Account[];
  darkMode: boolean;
}

type DateRangeOption = 'thisMonth' | 'lastMonth' | 'thisYear' | 'last30' | 'last90' | 'custom';

type DashboardTab = 'overview' | 'cashflow' | 'expenses' | 'revenue' | 'budget';

const Dashboard: React.FC<DashboardProps> = ({ transactions, accounts, darkMode }) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
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
      const tDate = new Date(t.accrualDate);
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
        if (t.type === 'Entrada') total += t.actualAmount;
        else total -= t.actualAmount;
      }
    });
    return total;
  }, [accounts, transactions, selectedAccount]);
  
  const metrics = useMemo(() => {
    const totalIncome = filteredTransactions
      .filter(t => t.type === 'Entrada' && (t.status === 'Recebido' || t.status === 'Pago'))
      .reduce((acc, curr) => acc + curr.actualAmount, 0);

    const totalExpense = filteredTransactions
      .filter(t => t.type === 'Saída' && t.status === 'Pago')
      .reduce((acc, curr) => acc + curr.actualAmount, 0);

    const pendingIncome = filteredTransactions
      .filter(t => t.type === 'Entrada' && t.status === 'A receber')
      .reduce((acc, curr) => acc + curr.expectedAmount, 0);

    const pendingExpense = filteredTransactions
      .filter(t => t.type === 'Saída' && t.status === 'A pagar')
      .reduce((acc, curr) => acc + curr.expectedAmount, 0);

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
      if (t.type === 'Saída') {
        data[t.category] = (data[t.category] || 0) + (t.status === 'Pago' ? t.actualAmount : t.expectedAmount);
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
        const tDate = new Date(t.accrualDate);
        return tDate.getMonth() === d.getMonth() && 
               tDate.getFullYear() === d.getFullYear() && 
               t.type === 'Entrada' && 
               (selectedAccount === 'all' || t.accountId === selectedAccount) &&
               (t.status === 'Recebido' || t.status === 'Pago');
      }).reduce((acc, t) => acc + t.actualAmount, 0);

      const expense = transactions.filter(t => {
        const tDate = new Date(t.accrualDate);
        return tDate.getMonth() === d.getMonth() && 
               tDate.getFullYear() === d.getFullYear() && 
               t.type === 'Saída' && 
               (selectedAccount === 'all' || t.accountId === selectedAccount) &&
               t.status === 'Pago';
      }).reduce((acc, t) => acc + t.actualAmount, 0);

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
        const [y, m, d] = t.dueDate.split('-').map(Number);
        const tDate = new Date(y, m-1, d);
        return tDate >= today && 
               (selectedAccount === 'all' || t.accountId === selectedAccount) &&
               (t.status === 'A pagar' || t.status === 'A receber');
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    data.push({ date: 'Hoje', saldo: runningBalance });
    
    let tempBalance = runningBalance;
    futureTransactions.slice(0, 15).forEach(t => {
       if (t.type === 'Entrada') tempBalance += t.expectedAmount;
       else tempBalance -= t.expectedAmount;
       
       const [, m, d] = t.dueDate.split('-');
       const dateLabel = `${d}/${m}`;
       data.push({ date: dateLabel, saldo: tempBalance });
    });
    
    return data;
  }, [transactions, currentTotalBalance, selectedAccount]);

  // Health Scorecard Metrics
  const healthMetrics = useMemo(() => {
    const totalAssets = currentTotalBalance;
    const totalLiabilities = filteredTransactions
      .filter(t => t.type === 'Saída' && (t.status === 'A pagar' || t.status === 'Pago'))
      .reduce((acc, t) => acc + (t.status === 'Pago' ? t.actualAmount : t.expectedAmount), 0);
    
    const monthlyExpenses = filteredTransactions
      .filter(t => t.type === 'Saída' && t.status === 'Pago')
      .reduce((acc, t) => acc + t.actualAmount, 0);
    
    const monthlyIncome = filteredTransactions
      .filter(t => t.type === 'Entrada' && (t.status === 'Recebido' || t.status === 'Pago'))
      .reduce((acc, t) => acc + t.actualAmount, 0);
    
    // Liquidity Ratio (Current Assets / Monthly Expenses)
    const liquidityRatio = monthlyExpenses > 0 ? totalAssets / monthlyExpenses : 0;
    const liquidityScore = liquidityRatio >= 6 ? 'healthy' : liquidityRatio >= 3 ? 'warning' : 'critical';
    
    // Solvency (Assets - Liabilities)
    const netWorth = totalAssets - totalLiabilities;
    const solvencyScore = netWorth >= 0 ? 'healthy' : netWorth >= -monthlyExpenses ? 'warning' : 'critical';
    
    // Profitability (Net Income / Revenue)
    const netIncome = monthlyIncome - monthlyExpenses;
    const profitabilityRatio = monthlyIncome > 0 ? (netIncome / monthlyIncome) * 100 : 0;
    const profitabilityScore = profitabilityRatio >= 20 ? 'healthy' : profitabilityRatio >= 10 ? 'warning' : 'critical';
    
    return {
      liquidity: { ratio: liquidityRatio, score: liquidityScore, days: Math.round(liquidityRatio * 30) },
      solvency: { netWorth, score: solvencyScore },
      profitability: { ratio: profitabilityRatio, score: profitabilityScore, netIncome }
    };
  }, [currentTotalBalance, filteredTransactions]);

  // Aging Analysis
  const agingData = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const payables = transactions
      .filter(t => t.type === 'Saída' && t.status === 'A pagar' && (selectedAccount === 'all' || t.accountId === selectedAccount))
      .map(t => {
        const [y, m, d] = t.dueDate.split('-').map(Number);
        const dueDate = new Date(y, m-1, d);
        const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        return { ...t, daysOverdue };
      });
    
    const receivables = transactions
      .filter(t => t.type === 'Entrada' && t.status === 'A receber' && (selectedAccount === 'all' || t.accountId === selectedAccount))
      .map(t => {
        const [y, m, d] = t.dueDate.split('-').map(Number);
        const dueDate = new Date(y, m-1, d);
        const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        return { ...t, daysOverdue };
      });
    
    const agingBands = [
      { label: '0-30', min: 0, max: 30 },
      { label: '31-60', min: 31, max: 60 },
      { label: '61-90', min: 61, max: 90 },
      { label: '90+', min: 91, max: Infinity }
    ];
    
    const payablesAging = agingBands.map(band => ({
      band: band.label,
      value: payables
        .filter(p => p.daysOverdue >= band.min && p.daysOverdue <= band.max)
        .reduce((acc, p) => acc + p.expectedAmount, 0)
    }));
    
    const receivablesAging = agingBands.map(band => ({
      band: band.label,
      value: receivables
        .filter(r => r.daysOverdue >= band.min && r.daysOverdue <= band.max)
        .reduce((acc, r) => acc + r.expectedAmount, 0)
    }));
    
    return { payables: payablesAging, receivables: receivablesAging };
  }, [transactions, selectedAccount]);

  // Trends Analysis (MoM and YoY)
  const trendsData = useMemo(() => {
    const today = new Date();
    const data = [];
    
    // Last 12 months
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthName = d.toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
      
      const income = transactions.filter(t => {
        const tDate = new Date(t.accrualDate);
        return tDate.getMonth() === d.getMonth() && 
               tDate.getFullYear() === d.getFullYear() && 
               t.type === 'Entrada' && 
               (selectedAccount === 'all' || t.accountId === selectedAccount) &&
               (t.status === 'Recebido' || t.status === 'Pago');
      }).reduce((acc, t) => acc + t.actualAmount, 0);
      
      const expense = transactions.filter(t => {
        const tDate = new Date(t.accrualDate);
        return tDate.getMonth() === d.getMonth() && 
               tDate.getFullYear() === d.getFullYear() && 
               t.type === 'Saída' && 
               (selectedAccount === 'all' || t.accountId === selectedAccount) &&
               t.status === 'Pago';
      }).reduce((acc, t) => acc + t.actualAmount, 0);
      
      data.push({ month: monthName, Receitas: income, Despesas: expense, Resultado: income - expense });
    }
    
    // Calculate MoM and YoY changes
    const currentMonth = data[data.length - 1];
    const previousMonth = data[data.length - 2];
    const sameMonthLastYear = data[data.length - 13] || data[0];
    
    const momIncome = previousMonth ? ((currentMonth.Receitas - previousMonth.Receitas) / previousMonth.Receitas) * 100 : 0;
    const yoyIncome = sameMonthLastYear ? ((currentMonth.Receitas - sameMonthLastYear.Receitas) / sameMonthLastYear.Receitas) * 100 : 0;
    
    return { data, momIncome, yoyIncome };
  }, [transactions, selectedAccount]);

  // Pareto Chart Data
  const paretoData = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    filteredTransactions.forEach(t => {
      if (t.type === 'Saída') {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + (t.status === 'Pago' ? t.actualAmount : t.expectedAmount);
      }
    });
    
    const sorted = Object.entries(categoryTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    
    const total = sorted.reduce((acc, curr) => acc + curr.value, 0);
    let cumulative = 0;
    
    return sorted.map(item => {
      cumulative += item.value;
      return {
        ...item,
        cumulative,
        percentage: (item.value / total) * 100,
        cumulativePercentage: (cumulative / total) * 100
      };
    }).slice(0, 10);
  }, [filteredTransactions]);

  // Scenario Projection
  const scenarioData = useMemo(() => {
    const data = [];
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const futureTransactions = transactions
      .filter(t => {
        const [y, m, d] = t.dueDate.split('-').map(Number);
        const tDate = new Date(y, m-1, d);
        return tDate >= today && 
               (selectedAccount === 'all' || t.accountId === selectedAccount) &&
               (t.status === 'A pagar' || t.status === 'A receber');
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    
    let baseBalance = currentTotalBalance;
    let optimisticBalance = currentTotalBalance;
    let pessimisticBalance = currentTotalBalance;
    
    data.push({ 
      date: 'Hoje', 
      base: baseBalance, 
      optimistic: optimisticBalance, 
      pessimistic: pessimisticBalance 
    });
    
    futureTransactions.slice(0, 15).forEach(t => {
      const [, m, d] = t.dueDate.split('-');
      const dateLabel = `${d}/${m}`;
      
      // Base scenario: current expectations
      if (t.type === 'Entrada') baseBalance += t.expectedAmount;
      else baseBalance -= t.expectedAmount;
      
      // Optimistic: all income received early, expenses delayed
      if (t.type === 'Entrada') {
        optimisticBalance += t.expectedAmount * 1.1; // 10% bonus for early payment
      } else {
        optimisticBalance -= t.expectedAmount * 0.7; // 30% delayed
      }
      
      // Pessimistic: income delayed, all expenses paid on time
      if (t.type === 'Entrada') {
        pessimisticBalance += t.expectedAmount * 0.6; // 40% delayed
      } else {
        pessimisticBalance -= t.expectedAmount * 1.1; // 10% penalty for early payment
      }
      
      data.push({ 
        date: dateLabel, 
        base: baseBalance, 
        optimistic: optimisticBalance, 
        pessimistic: pessimisticBalance 
      });
    });
    
    return data;
  }, [transactions, currentTotalBalance, selectedAccount]);

  // Calendar Heatmap Data
  const heatmapData = useMemo(() => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    const dailyData: Record<number, { income: number; expense: number }> = {};
    
    filteredTransactions.forEach(t => {
      const tDate = new Date(t.accrualDate);
      if (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) {
        const day = tDate.getDate();
        if (!dailyData[day]) dailyData[day] = { income: 0, expense: 0 };
        
        if (t.type === 'Entrada' && (t.status === 'Recebido' || t.status === 'Pago')) {
          dailyData[day].income += t.actualAmount;
        } else if (t.type === 'Saída' && t.status === 'Pago') {
          dailyData[day].expense += t.actualAmount;
        }
      }
    });
    
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const data = dailyData[day] || { income: 0, expense: 0 };
      const net = data.income - data.expense;
      return {
        day,
        income: data.income,
        expense: data.expense,
        net,
        intensity: Math.min(Math.abs(net) / 1000, 1) // Normalize intensity
      };
    });
  }, [filteredTransactions]);

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

      {/* Tabs Navigation */}
      <div className={`border-b ${darkMode ? 'border-zinc-800' : 'border-slate-200'}`}>
        <nav className="flex space-x-1" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-3 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === 'overview'
                ? darkMode ? 'bg-zinc-900 text-yellow-500 border-b-2 border-yellow-500' : 'bg-white text-blue-600 border-b-2 border-blue-600'
                : darkMode ? 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-900/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            Visão Geral
          </button>
          <button
            onClick={() => setActiveTab('cashflow')}
            className={`px-4 py-3 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === 'cashflow'
                ? darkMode ? 'bg-zinc-900 text-yellow-500 border-b-2 border-yellow-500' : 'bg-white text-blue-600 border-b-2 border-blue-600'
                : darkMode ? 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-900/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            Fluxo de Caixa
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`px-4 py-3 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === 'expenses'
                ? darkMode ? 'bg-zinc-900 text-yellow-500 border-b-2 border-yellow-500' : 'bg-white text-blue-600 border-b-2 border-blue-600'
                : darkMode ? 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-900/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            Despesas
          </button>
          <button
            onClick={() => setActiveTab('revenue')}
            className={`px-4 py-3 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === 'revenue'
                ? darkMode ? 'bg-zinc-900 text-yellow-500 border-b-2 border-yellow-500' : 'bg-white text-blue-600 border-b-2 border-blue-600'
                : darkMode ? 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-900/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            Receitas
          </button>
          <button
            onClick={() => setActiveTab('budget')}
            className={`px-4 py-3 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === 'budget'
                ? darkMode ? 'bg-zinc-900 text-yellow-500 border-b-2 border-yellow-500' : 'bg-white text-blue-600 border-b-2 border-blue-600'
                : darkMode ? 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-900/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            Orçado vs Realizado
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
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
               <LineChart data={projectionData} margin={{ top: 5, right: 10, left: 50, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#3f3f46' : '#e2e8f0'} vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: darkMode ? '#a1a1aa' : '#64748b', fontSize: 12 }} />
                  <YAxis 
                    tick={{ fill: darkMode ? '#a1a1aa' : '#64748b', fontSize: 11 }}
                    tickFormatter={(value) => {
                      const abs = Math.abs(value);
                      if (abs >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
                      if (abs >= 1000) return `R$ ${(value / 1000).toFixed(0)}k`;
                      return `R$ ${value.toFixed(0)}`;
                    }}
                    width={50}
                  />
                  <ReferenceLine y={0} stroke={darkMode ? '#52525b' : '#cbd5e1'} strokeDasharray="3 3" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: darkMode ? '#18181b' : '#fff', borderColor: darkMode ? '#27272a' : '#e2e8f0', color: darkMode ? '#fff' : '#000' }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="saldo" 
                    stroke={projectionData.some(d => d.saldo < 0) 
                      ? (darkMode ? '#fbbf24' : '#3b82f6')
                      : (darkMode ? '#fbbf24' : '#3b82f6')
                    } 
                    strokeWidth={3} 
                    dot={{r: 4, fill: darkMode ? '#fbbf24' : '#3b82f6'}}
                    strokeDasharray={projectionData.some(d => d.saldo < 0) ? undefined : undefined}
                  />
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

      {/* Row 3: Health Scorecard & Aging */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Health Scorecard */}
        <div className={`p-6 rounded-xl border ${cardBg}`}>
          <h3 className={`font-semibold mb-6 ${textColor}`}>Scorecard de Saúde Financeira</h3>
          <div className="space-y-4">
            <div className={`p-4 rounded-lg border ${healthMetrics.liquidity.score === 'healthy' ? 'bg-emerald-500/10 border-emerald-500/20' : healthMetrics.liquidity.score === 'warning' ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-medium ${textColor}`}>Liquidez</span>
                {healthMetrics.liquidity.score === 'healthy' ? (
                  <Activity className="text-emerald-500" size={18} />
                ) : healthMetrics.liquidity.score === 'warning' ? (
                  <AlertTriangle className="text-yellow-500" size={18} />
                ) : (
                  <AlertTriangle className="text-red-500" size={18} />
                )}
              </div>
              <div className={`text-lg font-bold ${healthMetrics.liquidity.score === 'healthy' ? 'text-emerald-500' : healthMetrics.liquidity.score === 'warning' ? 'text-yellow-500' : 'text-red-500'}`}>
                {healthMetrics.liquidity.days} dias de caixa
              </div>
              <div className={`text-xs mt-1 ${subText}`}>
                {healthMetrics.liquidity.ratio.toFixed(1)} meses de despesas cobertos
              </div>
            </div>

            <div className={`p-4 rounded-lg border ${healthMetrics.solvency.score === 'healthy' ? 'bg-emerald-500/10 border-emerald-500/20' : healthMetrics.solvency.score === 'warning' ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-medium ${textColor}`}>Solvência</span>
                {healthMetrics.solvency.score === 'healthy' ? (
                  <Activity className="text-emerald-500" size={18} />
                ) : healthMetrics.solvency.score === 'warning' ? (
                  <AlertTriangle className="text-yellow-500" size={18} />
                ) : (
                  <AlertTriangle className="text-red-500" size={18} />
                )}
              </div>
              <div className={`text-lg font-bold ${healthMetrics.solvency.score === 'healthy' ? 'text-emerald-500' : healthMetrics.solvency.score === 'warning' ? 'text-yellow-500' : 'text-red-500'}`}>
                {formatCurrency(healthMetrics.solvency.netWorth)}
              </div>
              <div className={`text-xs mt-1 ${subText}`}>
                Patrimônio líquido
              </div>
            </div>

            <div className={`p-4 rounded-lg border ${healthMetrics.profitability.score === 'healthy' ? 'bg-emerald-500/10 border-emerald-500/20' : healthMetrics.profitability.score === 'warning' ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-medium ${textColor}`}>Rentabilidade</span>
                {healthMetrics.profitability.score === 'healthy' ? (
                  <TrendingUp className="text-emerald-500" size={18} />
                ) : healthMetrics.profitability.score === 'warning' ? (
                  <TrendingDown className="text-yellow-500" size={18} />
                ) : (
                  <TrendingDown className="text-red-500" size={18} />
                )}
              </div>
              <div className={`text-lg font-bold ${healthMetrics.profitability.score === 'healthy' ? 'text-emerald-500' : healthMetrics.profitability.score === 'warning' ? 'text-yellow-500' : 'text-red-500'}`}>
                {healthMetrics.profitability.ratio.toFixed(1)}%
              </div>
              <div className={`text-xs mt-1 ${subText}`}>
                Margem líquida ({formatCurrency(healthMetrics.profitability.netIncome)})
              </div>
            </div>
          </div>
        </div>

        {/* Aging Chart */}
        <div className={`p-6 rounded-xl border ${cardBg}`}>
          <h3 className={`font-semibold mb-6 ${textColor}`}>Envelhecimento de Contas</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agingData.payables} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#3f3f46' : '#e2e8f0'} />
                <XAxis dataKey="band" tick={{ fill: darkMode ? '#a1a1aa' : '#64748b', fontSize: 12 }} />
                <YAxis 
                  tick={{ fill: darkMode ? '#a1a1aa' : '#64748b', fontSize: 11 }}
                  tickFormatter={(value) => {
                    const abs = Math.abs(value);
                    if (abs >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
                    if (abs >= 1000) return `R$ ${(value / 1000).toFixed(0)}k`;
                    return `R$ ${value.toFixed(0)}`;
                  }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: darkMode ? '#18181b' : '#fff', borderColor: darkMode ? '#27272a' : '#e2e8f0', color: darkMode ? '#fff' : '#000' }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
                <Bar dataKey="value" name="A Pagar" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 pt-4 border-t border-zinc-700">
            <div className="text-sm font-medium mb-2 text-emerald-500">A Receber</div>
            <div className="grid grid-cols-4 gap-2">
              {agingData.receivables.map((item, idx) => (
                <div key={idx} className="text-center">
                  <div className={`text-xs ${subText}`}>{item.band} dias</div>
                  <div className={`text-sm font-semibold ${textColor}`}>{formatCurrency(item.value)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Calendar Heatmap */}
      <div className={`p-6 rounded-xl border ${cardBg}`}>
        <h3 className={`font-semibold mb-6 ${textColor}`}>Heatmap de Fluxo de Caixa - {new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</h3>
        <div className="grid grid-cols-7 gap-2">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
            <div key={day} className={`text-center text-xs font-medium ${subText}`}>{day}</div>
          ))}
          {heatmapData.map((item, idx) => {
            const date = new Date(new Date().getFullYear(), new Date().getMonth(), item.day);
            const dayOfWeek = date.getDay();
            const isToday = item.day === new Date().getDate();
            
            let bgColor = darkMode ? '#27272a' : '#f1f5f9';
            if (item.net > 0) {
              const intensity = Math.min(item.intensity, 1);
              bgColor = darkMode 
                ? `rgba(16, 185, 129, ${0.3 + intensity * 0.5})`
                : `rgba(16, 185, 129, ${0.2 + intensity * 0.4})`;
            } else if (item.net < 0) {
              const intensity = Math.min(item.intensity, 1);
              bgColor = darkMode
                ? `rgba(239, 68, 68, ${0.3 + intensity * 0.5})`
                : `rgba(239, 68, 68, ${0.2 + intensity * 0.4})`;
            }
            
            return (
              <div
                key={idx}
                className={`p-2 rounded text-center text-xs ${isToday ? 'ring-2 ring-blue-500' : ''}`}
                style={{ backgroundColor: bgColor, gridColumnStart: dayOfWeek === 0 ? 7 : dayOfWeek }}
                title={`${item.day}/${new Date().getMonth() + 1}: ${formatCurrency(item.net)}`}
              >
                <div className={`font-medium ${item.net !== 0 ? textColor : subText}`}>{item.day}</div>
                {item.net !== 0 && (
                  <div className={`text-[10px] mt-1 ${item.net > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {item.net > 0 ? '+' : ''}{formatCurrency(item.net)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-emerald-500/30"></div>
            <span className={subText}>Entradas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500/30"></div>
            <span className={subText}>Saídas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-zinc-500/30"></div>
            <span className={subText}>Neutro</span>
          </div>
        </div>
      </div>

      {/* Row 5: Trends & Pareto */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trends Analysis */}
        <div className={`p-6 rounded-xl border ${cardBg}`}>
          <h3 className={`font-semibold mb-6 ${textColor}`}>Análise de Tendências</h3>
          <div className="mb-4 flex gap-4">
            <div className="flex-1">
              <div className={`text-xs ${subText} mb-1`}>Mês a Mês (Receitas)</div>
              <div className={`text-lg font-bold ${trendsData.momIncome >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {trendsData.momIncome >= 0 ? '+' : ''}{trendsData.momIncome.toFixed(1)}%
              </div>
            </div>
            <div className="flex-1">
              <div className={`text-xs ${subText} mb-1`}>Ano a Ano (Receitas)</div>
              <div className={`text-lg font-bold ${trendsData.yoyIncome >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {trendsData.yoyIncome >= 0 ? '+' : ''}{trendsData.yoyIncome.toFixed(1)}%
              </div>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendsData.data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#3f3f46' : '#e2e8f0'} vertical={false} />
                <XAxis dataKey="month" tick={{ fill: darkMode ? '#a1a1aa' : '#64748b', fontSize: 11 }} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: darkMode ? '#18181b' : '#fff', borderColor: darkMode ? '#27272a' : '#e2e8f0', color: darkMode ? '#fff' : '#000' }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
                <Line type="monotone" dataKey="Receitas" stroke="#10b981" strokeWidth={2} dot={{r: 3}} />
                <Line type="monotone" dataKey="Despesas" stroke="#ef4444" strokeWidth={2} dot={{r: 3}} />
                <Line type="monotone" dataKey="Resultado" stroke={darkMode ? '#fbbf24' : '#3b82f6'} strokeWidth={2} dot={{r: 3}} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pareto Chart */}
        <div className={`p-6 rounded-xl border ${cardBg}`}>
          <h3 className={`font-semibold mb-6 ${textColor}`}>Análise de Pareto (80/20)</h3>
          {paretoData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={paretoData} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#3f3f46' : '#e2e8f0'} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: darkMode ? '#a1a1aa' : '#64748b', fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    yAxisId="left"
                    tick={{ fill: darkMode ? '#a1a1aa' : '#64748b', fontSize: 11 }}
                    tickFormatter={(value) => {
                      const abs = Math.abs(value);
                      if (abs >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
                      if (abs >= 1000) return `R$ ${(value / 1000).toFixed(0)}k`;
                      return `R$ ${value.toFixed(0)}`;
                    }}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    tick={{ fill: darkMode ? '#a1a1aa' : '#64748b', fontSize: 11 }}
                    tickFormatter={(value) => `${value.toFixed(0)}%`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: darkMode ? '#18181b' : '#fff', borderColor: darkMode ? '#27272a' : '#e2e8f0', color: darkMode ? '#fff' : '#000' }}
                    formatter={(value: number, name: string) => {
                      if (name === 'cumulativePercentage') return `${value.toFixed(1)}%`;
                      return formatCurrency(value);
                    }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="value" fill={darkMode ? '#fbbf24' : '#3b82f6'} radius={[4, 4, 0, 0]} />
                  <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="cumulativePercentage" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={false}
                  />
                  <ReferenceLine yAxisId="right" y={80} stroke="#ef4444" strokeDasharray="3 3" label={{ value: "80%", position: "right" }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center opacity-50">Sem dados.</div>
          )}
        </div>
      </div>

      {/* Row 6: Scenario Projection */}
      <div className={`p-6 rounded-xl border ${cardBg}`}>
        <h3 className={`font-semibold mb-6 ${textColor}`}>Projeção com Cenários</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={scenarioData} margin={{ top: 5, right: 10, left: 50, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#3f3f46' : '#e2e8f0'} vertical={false} />
              <XAxis dataKey="date" tick={{ fill: darkMode ? '#a1a1aa' : '#64748b', fontSize: 12 }} />
              <YAxis 
                tick={{ fill: darkMode ? '#a1a1aa' : '#64748b', fontSize: 11 }}
                tickFormatter={(value) => {
                  const abs = Math.abs(value);
                  if (abs >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
                  if (abs >= 1000) return `R$ ${(value / 1000).toFixed(0)}k`;
                  return `R$ ${value.toFixed(0)}`;
                }}
                width={50}
              />
              <ReferenceLine y={0} stroke={darkMode ? '#52525b' : '#cbd5e1'} strokeDasharray="3 3" />
              <Tooltip 
                contentStyle={{ backgroundColor: darkMode ? '#18181b' : '#fff', borderColor: darkMode ? '#27272a' : '#e2e8f0', color: darkMode ? '#fff' : '#000' }}
                formatter={(value: number, name: string) => {
                  const labels: Record<string, string> = {
                    base: 'Cenário Base',
                    optimistic: 'Cenário Otimista',
                    pessimistic: 'Cenário Pessimista'
                  };
                  return [formatCurrency(value), labels[name] || name];
                }}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="pessimistic" 
                stroke="#ef4444" 
                fill="#ef4444" 
                fillOpacity={0.2}
                name="Pessimista"
              />
              <Area 
                type="monotone" 
                dataKey="base" 
                stroke={darkMode ? '#fbbf24' : '#3b82f6'} 
                fill={darkMode ? '#fbbf24' : '#3b82f6'} 
                fillOpacity={0.3}
                name="Base"
              />
              <Area 
                type="monotone" 
                dataKey="optimistic" 
                stroke="#10b981" 
                fill="#10b981" 
                fillOpacity={0.2}
                name="Otimista"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 text-xs text-center text-zinc-500">
          Cenário Otimista: receitas recebidas, despesas parcialmente atrasadas | 
          Cenário Base: projeção atual | 
          Cenário Pessimista: receitas atrasadas, todas despesas pagas
        </div>
      </div>
        </div>
      )}

      {activeTab === 'cashflow' && (
        <div className="space-y-6">
          {/* TODO: Move cash flow related visualizations here */}
          <div className={`p-6 rounded-xl border ${cardBg}`}>
            <h3 className={`font-semibold mb-4 ${textColor}`}>Fluxo de Caixa</h3>
            <p className={subText}>Visualizações de fluxo de caixa serão organizadas aqui.</p>
          </div>
        </div>
      )}

      {activeTab === 'expenses' && (
        <div className="space-y-6">
          {/* TODO: Move expense related visualizations here */}
          <div className={`p-6 rounded-xl border ${cardBg}`}>
            <h3 className={`font-semibold mb-4 ${textColor}`}>Despesas</h3>
            <p className={subText}>Visualizações de despesas serão organizadas aqui.</p>
          </div>
        </div>
      )}

      {activeTab === 'revenue' && (
        <div className="space-y-6">
          {/* TODO: Move revenue related visualizations here */}
          <div className={`p-6 rounded-xl border ${cardBg}`}>
            <h3 className={`font-semibold mb-4 ${textColor}`}>Receitas</h3>
            <p className={subText}>Visualizações de receitas serão organizadas aqui.</p>
          </div>
        </div>
      )}

      {activeTab === 'budget' && (
        <div className="space-y-6">
          {/* TODO: Add budget vs actual report here */}
          <div className={`p-6 rounded-xl border ${cardBg}`}>
            <h3 className={`font-semibold mb-4 ${textColor}`}>Orçado vs Realizado</h3>
            <p className={subText}>Relatório de orçado vs realizado será implementado aqui.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;