import React, { useState, useMemo } from 'react';
import { Transaction, Account, CategoryItem, SubcategoryItem } from '../types';
import { ChevronDown, ChevronRight, Download } from 'lucide-react';

interface CashFlowReportProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: CategoryItem[];
  subcategories: SubcategoryItem[];
  darkMode: boolean;
}

const CashFlowReport: React.FC<CashFlowReportProps> = ({
  transactions,
  accounts,
  categories,
  subcategories,
  darkMode
}) => {
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set([new Date().getFullYear()]));
  const [expandedQuarters, setExpandedQuarters] = useState<Set<string>>(new Set());
  const [groupBy, setGroupBy] = useState<'category' | 'subcategory'>('category');

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const accountMatch = selectedAccount === 'all' || t.accountId === selectedAccount;
      const categoryMatch = selectedCategory === 'all' || t.categoryId === selectedCategory;
      return accountMatch && categoryMatch;
    });
  }, [transactions, selectedAccount, selectedCategory]);

  // Group data by category/subcategory and time period
  const reportData = useMemo(() => {
    const dataMap: Record<string, Record<string, { income: number; expense: number; balance: number }>> = {};

    filteredTransactions.forEach(t => {
      const key = groupBy === 'category' 
        ? (t.categoryId ? categories.find(c => c.id === t.categoryId)?.name || t.category || 'Outros' : t.category || 'Outros')
        : (t.subcategoryId 
            ? subcategories.find(s => s.id === t.subcategoryId)?.name || 'Sem subcategoria'
            : 'Sem subcategoria');
      
      const date = new Date(t.accrualDate);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const yearMonth = `${year}-${month.toString().padStart(2, '0')}`;

      if (!dataMap[key]) {
        dataMap[key] = {};
      }

      // Monthly data
      if (!dataMap[key][yearMonth]) {
        dataMap[key][yearMonth] = { income: 0, expense: 0, balance: 0 };
      }

      if (t.type === 'Entrada') {
        dataMap[key][yearMonth].income += t.status === 'Recebido' || t.status === 'Pago' ? t.actualAmount : 0;
      } else {
        dataMap[key][yearMonth].expense += t.status === 'Pago' ? t.actualAmount : 0;
      }
      dataMap[key][yearMonth].balance = dataMap[key][yearMonth].income - dataMap[key][yearMonth].expense;
    });

    return dataMap;
  }, [filteredTransactions, categories, subcategories, groupBy]);

  // Get all time periods
  const timePeriods = useMemo(() => {
    const periods = new Set<string>();
    Object.values(reportData).forEach(categoryData => {
      Object.keys(categoryData).forEach(period => {
        periods.add(period);
      });
    });
    return Array.from(periods).sort();
  }, [reportData]);

  // Group periods by year and quarter
  const groupedPeriods = useMemo(() => {
    const grouped: Record<number, Record<number, string[]>> = {};
    
    timePeriods.forEach(period => {
      const [year, month] = period.split('-').map(Number);
      const quarter = Math.ceil(month / 3);
      
      if (!grouped[year]) {
        grouped[year] = {};
      }
      if (!grouped[year][quarter]) {
        grouped[year][quarter] = [];
      }
      grouped[year][quarter].push(period);
    });

    return grouped;
  }, [timePeriods]);

  // Calculate totals for a row
  const calculateRowTotals = (categoryKey: string) => {
    let totalIncome = 0;
    let totalExpense = 0;
    let totalBalance = 0;

    timePeriods.forEach(period => {
      const data = reportData[categoryKey]?.[period];
      if (data) {
        totalIncome += data.income;
        totalExpense += data.expense;
        totalBalance += data.balance;
      }
    });

    return { totalIncome, totalExpense, totalBalance };
  };

  // Calculate column totals
  const calculateColumnTotals = (period: string) => {
    let totalIncome = 0;
    let totalExpense = 0;
    let totalBalance = 0;

    Object.keys(reportData).forEach(categoryKey => {
      const data = reportData[categoryKey]?.[period];
      if (data) {
        totalIncome += data.income;
        totalExpense += data.expense;
        totalBalance += data.balance;
      }
    });

    return { totalIncome, totalExpense, totalBalance };
  };

  const toggleYear = (year: number) => {
    const newExpanded = new Set(expandedYears);
    if (newExpanded.has(year)) {
      newExpanded.delete(year);
      // Also collapse all quarters of this year
      const newExpandedQuarters = new Set(expandedQuarters);
      [1, 2, 3, 4].forEach(q => {
        newExpandedQuarters.delete(`${year}-Q${q}`);
      });
      setExpandedQuarters(newExpandedQuarters);
    } else {
      newExpanded.add(year);
    }
    setExpandedYears(newExpanded);
  };

  const toggleQuarter = (year: number, quarter: number) => {
    const key = `${year}-Q${quarter}`;
    const newExpanded = new Set(expandedQuarters);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedQuarters(newExpanded);
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);

  const cardBg = darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200';
  const textColor = darkMode ? 'text-zinc-100' : 'text-slate-800';
  const subText = darkMode ? 'text-zinc-400' : 'text-slate-500';
  const inputBg = darkMode ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-900';
  const tableHeadBg = darkMode ? 'bg-zinc-800/50' : 'bg-slate-50';

  const exportToCSV = () => {
    const headers = ['Categoria', ...timePeriods, 'Total Entradas', 'Total Saídas', 'Saldo'];
    const rows: string[][] = [headers];

    Object.keys(reportData).forEach(categoryKey => {
      const totals = calculateRowTotals(categoryKey);
      const row = [
        categoryKey,
        ...timePeriods.map(period => {
          const data = reportData[categoryKey]?.[period];
          return data ? formatCurrency(data.balance) : '0';
        }),
        formatCurrency(totals.totalIncome),
        formatCurrency(totals.totalExpense),
        formatCurrency(totals.totalBalance)
      ];
      rows.push(row);
    });

    // Add totals row
    const grandTotals = timePeriods.reduce((acc, period) => {
      const totals = calculateColumnTotals(period);
      return {
        income: acc.income + totals.totalIncome,
        expense: acc.expense + totals.totalExpense,
        balance: acc.balance + totals.totalBalance
      };
    }, { income: 0, expense: 0, balance: 0 });

    rows.push([
      'TOTAL',
      ...timePeriods.map(period => {
        const totals = calculateColumnTotals(period);
        return formatCurrency(totals.totalBalance);
      }),
      formatCurrency(grandTotals.income),
      formatCurrency(grandTotals.expense),
      formatCurrency(grandTotals.balance)
    ]);

    const csvContent = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `fluxo-caixa-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className={`text-2xl font-bold ${textColor}`}>Relatório de Fluxo de Caixa</h2>
          <p className={subText}>Visão horizontal mensal do fluxo de caixa por categoria</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportToCSV}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 font-medium ${darkMode ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'}`}
          >
            <Download size={18} />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className={`p-4 rounded-xl border ${cardBg} flex flex-wrap gap-4`}>
        <div className="flex items-center gap-2">
          <label className={`text-sm font-medium ${textColor}`}>Conta:</label>
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className={`px-3 py-1.5 rounded border text-sm ${inputBg}`}
          >
            <option value="all">Todas</option>
            {accounts.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className={`text-sm font-medium ${textColor}`}>Categoria:</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={`px-3 py-1.5 rounded border text-sm ${inputBg}`}
          >
            <option value="all">Todas</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className={`text-sm font-medium ${textColor}`}>Agrupar por:</label>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as 'category' | 'subcategory')}
            className={`px-3 py-1.5 rounded border text-sm ${inputBg}`}
          >
            <option value="category">Categoria</option>
            <option value="subcategory">Subcategoria</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className={`rounded-xl border overflow-x-auto ${cardBg}`}>
        <table className="w-full border-collapse">
          <thead>
            <tr className={`${tableHeadBg} border-b ${darkMode ? 'border-zinc-800' : 'border-slate-200'}`}>
              <th className={`px-4 py-3 text-left text-sm font-semibold ${textColor} sticky left-0 ${tableHeadBg} z-10 border-r ${darkMode ? 'border-zinc-800' : 'border-slate-200'}`}>
                Categoria
              </th>
              {Object.keys(groupedPeriods).sort((a, b) => parseInt(a) - parseInt(b)).map(yearStr => {
                const year = parseInt(yearStr);
                return (
                  <React.Fragment key={year}>
                    <th
                      colSpan={expandedYears.has(year) ? Object.keys(groupedPeriods[year]).length * 3 : 3}
                      className={`px-4 py-3 text-center text-sm font-semibold ${textColor} border-r ${darkMode ? 'border-zinc-800' : 'border-slate-200'}`}
                    >
                      <button
                        onClick={() => toggleYear(year)}
                        className="flex items-center justify-center gap-1 hover:opacity-70"
                      >
                        {expandedYears.has(year) ? (
                          <ChevronDown size={16} />
                        ) : (
                          <ChevronRight size={16} />
                        )}
                        {year}
                      </button>
                    </th>
                    {expandedYears.has(year) && Object.keys(groupedPeriods[year]).sort((a, b) => parseInt(a) - parseInt(b)).map((quarterStr) => {
                      const q = parseInt(quarterStr);
                      const isExpanded = expandedQuarters.has(`${year}-Q${q}`);
                      return (
                        <React.Fragment key={`${year}-Q${q}`}>
                          <th
                            colSpan={isExpanded ? (groupedPeriods[year][q]?.length || 0) * 3 : 3}
                          className={`px-4 py-3 text-center text-xs font-semibold ${textColor} border-r ${darkMode ? 'border-zinc-800' : 'border-slate-200'}`}
                        >
                          <button
                            onClick={() => toggleQuarter(year, q)}
                            className="flex items-center justify-center gap-1 hover:opacity-70"
                          >
                            {isExpanded ? (
                              <ChevronDown size={14} />
                            ) : (
                              <ChevronRight size={14} />
                            )}
                            Q{q}
                          </button>
                        </th>
                        {isExpanded && groupedPeriods[year][q]?.sort().map((period: string) => (
                          <React.Fragment key={period}>
                            <th className={`px-2 py-2 text-center text-xs font-medium ${subText} border-r ${darkMode ? 'border-zinc-800' : 'border-slate-200'}`}>
                              Entradas
                            </th>
                            <th className={`px-2 py-2 text-center text-xs font-medium ${subText} border-r ${darkMode ? 'border-zinc-800' : 'border-slate-200'}`}>
                              Saídas
                            </th>
                            <th className={`px-2 py-2 text-center text-xs font-medium ${subText} border-r ${darkMode ? 'border-zinc-800' : 'border-slate-200'}`}>
                              Saldo
                            </th>
                          </React.Fragment>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
                );
              })}
              <th className={`px-4 py-3 text-center text-sm font-semibold ${textColor} border-r ${darkMode ? 'border-zinc-800' : 'border-slate-200'}`}>
                Total Entradas
              </th>
              <th className={`px-4 py-3 text-center text-sm font-semibold ${textColor} border-r ${darkMode ? 'border-zinc-800' : 'border-slate-200'}`}>
                Total Saídas
              </th>
              <th className={`px-4 py-3 text-center text-sm font-semibold ${textColor}`}>
                Saldo Total
              </th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(reportData).sort().map((categoryKey) => {
              const totals = calculateRowTotals(categoryKey);
              return (
                <tr
                  key={categoryKey}
                  className={`border-b ${darkMode ? 'border-zinc-800 hover:bg-zinc-800/30' : 'border-slate-200 hover:bg-slate-50'}`}
                >
                  <td className={`px-4 py-3 text-sm font-medium ${textColor} sticky left-0 ${darkMode ? 'bg-zinc-900' : 'bg-white'} z-10 border-r ${darkMode ? 'border-zinc-800' : 'border-slate-200'}`}>
                    {categoryKey}
                  </td>
                  {Object.keys(groupedPeriods).sort((a, b) => parseInt(a) - parseInt(b)).map(yearStr => {
                    const year = parseInt(yearStr);
                    const yearColSpan = Object.keys(groupedPeriods[year] || {}).length * 3;
                    return (
                      <React.Fragment key={year}>
                        {expandedYears.has(year) && Object.keys(groupedPeriods[year]).sort((a, b) => parseInt(a) - parseInt(b)).map((quarterStr) => {
                          const q = parseInt(quarterStr);
                          const isExpanded = expandedQuarters.has(`${year}-Q${q}`);
                          return (
                            <React.Fragment key={`${year}-Q${q}`}>
                              {isExpanded ? (
                                groupedPeriods[year][q]?.sort().map((period: string) => {
                                const data = reportData[categoryKey]?.[period] || { income: 0, expense: 0, balance: 0 };
                                return (
                                  <React.Fragment key={period}>
                                    <td className={`px-2 py-2 text-right text-xs ${data.income > 0 ? 'text-emerald-500' : subText} border-r ${darkMode ? 'border-zinc-800' : 'border-slate-200'}`}>
                                      {data.income !== 0 ? formatCurrency(data.income) : '-'}
                                    </td>
                                    <td className={`px-2 py-2 text-right text-xs ${data.expense > 0 ? 'text-red-500' : subText} border-r ${darkMode ? 'border-zinc-800' : 'border-slate-200'}`}>
                                      {data.expense !== 0 ? formatCurrency(data.expense) : '-'}
                                    </td>
                                    <td className={`px-2 py-2 text-right text-xs font-medium ${data.balance >= 0 ? 'text-emerald-500' : 'text-red-500'} border-r ${darkMode ? 'border-zinc-800' : 'border-slate-200'}`}>
                                      {data.balance !== 0 ? formatCurrency(data.balance) : '-'}
                                    </td>
                                  </React.Fragment>
                                );
                              })
                            ) : (
                              <>
                                <td colSpan={3} className={`px-2 py-2 text-center text-xs ${subText} border-r ${darkMode ? 'border-zinc-800' : 'border-slate-200'}`}>
                                  -
                                </td>
                              </>
                            )}
                          </React.Fragment>
                        );
                      })}
                      {!expandedYears.has(year) && (
                        <td colSpan={yearColSpan} className={`px-2 py-2 text-center text-xs ${subText} border-r ${darkMode ? 'border-zinc-800' : 'border-slate-200'}`}>
                          -
                        </td>
                      )}
                    </React.Fragment>
                  );
                  })}
                  <td className={`px-4 py-3 text-right text-sm font-medium ${totals.totalIncome > 0 ? 'text-emerald-500' : subText} border-r ${darkMode ? 'border-zinc-800' : 'border-slate-200'}`}>
                    {formatCurrency(totals.totalIncome)}
                  </td>
                  <td className={`px-4 py-3 text-right text-sm font-medium ${totals.totalExpense > 0 ? 'text-red-500' : subText} border-r ${darkMode ? 'border-zinc-800' : 'border-slate-200'}`}>
                    {formatCurrency(totals.totalExpense)}
                  </td>
                  <td className={`px-4 py-3 text-right text-sm font-bold ${totals.totalBalance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {formatCurrency(totals.totalBalance)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className={`${tableHeadBg} border-t-2 ${darkMode ? 'border-zinc-700' : 'border-slate-300'}`}>
              <td className={`px-4 py-3 text-sm font-bold ${textColor} sticky left-0 ${tableHeadBg} z-10 border-r ${darkMode ? 'border-zinc-800' : 'border-slate-200'}`}>
                TOTAL
              </td>
              {Object.keys(groupedPeriods).sort((a, b) => parseInt(a) - parseInt(b)).map(yearStr => {
                const year = parseInt(yearStr);
                const yearColSpan = Object.keys(groupedPeriods[year] || {}).length * 3;
                return (
                  <React.Fragment key={year}>
                    {expandedYears.has(year) && Object.keys(groupedPeriods[year]).sort((a, b) => parseInt(a) - parseInt(b)).map((quarterStr) => {
                      const q = parseInt(quarterStr);
                      const isExpanded = expandedQuarters.has(`${year}-Q${q}`);
                      return (
                        <React.Fragment key={`${year}-Q${q}`}>
                          {isExpanded ? (
                            groupedPeriods[year][q]?.sort().map((period: string) => {
                            const totals = calculateColumnTotals(period);
                            return (
                              <React.Fragment key={period}>
                                <td className={`px-2 py-2 text-right text-xs font-medium ${totals.totalIncome > 0 ? 'text-emerald-500' : subText} border-r ${darkMode ? 'border-zinc-800' : 'border-slate-200'}`}>
                                  {totals.totalIncome !== 0 ? formatCurrency(totals.totalIncome) : '-'}
                                </td>
                                <td className={`px-2 py-2 text-right text-xs font-medium ${totals.totalExpense > 0 ? 'text-red-500' : subText} border-r ${darkMode ? 'border-zinc-800' : 'border-slate-200'}`}>
                                  {totals.totalExpense !== 0 ? formatCurrency(totals.totalExpense) : '-'}
                                </td>
                                <td className={`px-2 py-2 text-right text-xs font-bold ${totals.totalBalance >= 0 ? 'text-emerald-500' : 'text-red-500'} border-r ${darkMode ? 'border-zinc-800' : 'border-slate-200'}`}>
                                  {totals.totalBalance !== 0 ? formatCurrency(totals.totalBalance) : '-'}
                                </td>
                              </React.Fragment>
                            );
                          })
                        ) : (
                          <>
                            <td colSpan={3} className={`px-2 py-2 text-center text-xs ${subText} border-r ${darkMode ? 'border-zinc-800' : 'border-slate-200'}`}>
                              -
                            </td>
                          </>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {!expandedYears.has(year) && (
                    <td colSpan={yearColSpan} className={`px-2 py-2 text-center text-xs ${subText} border-r ${darkMode ? 'border-zinc-800' : 'border-slate-200'}`}>
                      -
                    </td>
                  )}
                </React.Fragment>
              );
              })}
              <td className={`px-4 py-3 text-right text-sm font-bold ${textColor} border-r ${darkMode ? 'border-zinc-800' : 'border-slate-200'}`}>
                {formatCurrency(timePeriods.reduce((acc: number, period: string) => acc + calculateColumnTotals(period).totalIncome, 0))}
              </td>
              <td className={`px-4 py-3 text-right text-sm font-bold ${textColor} border-r ${darkMode ? 'border-zinc-800' : 'border-slate-200'}`}>
                {formatCurrency(timePeriods.reduce((acc: number, period: string) => acc + calculateColumnTotals(period).totalExpense, 0))}
              </td>
              <td className={`px-4 py-3 text-right text-sm font-bold ${textColor}`}>
                {formatCurrency(timePeriods.reduce((acc: number, period: string) => acc + calculateColumnTotals(period).totalBalance, 0))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default CashFlowReport;
