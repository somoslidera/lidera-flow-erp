import React, { useMemo, useState } from 'react';
import { Budget, Transaction, CategoryItem, SubcategoryItem } from '../types';
import { 
  Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend, ComposedChart, Line
} from 'recharts';
import { TrendingUp, TrendingDown, AlertTriangle, DollarSign, Calendar } from 'lucide-react';

interface BudgetVsActualProps {
  budgets: Budget[];
  transactions: Transaction[];
  categories: CategoryItem[];
  subcategories: SubcategoryItem[];
  darkMode: boolean;
}

const BudgetVsActual: React.FC<BudgetVsActualProps> = ({
  budgets,
  transactions,
  categories,
  subcategories,
  darkMode,
}) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedBudgetId, setSelectedBudgetId] = useState<string>('');

  const cardBg = darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200';
  const textColor = darkMode ? 'text-zinc-100' : 'text-slate-800';
  const subText = darkMode ? 'text-zinc-400' : 'text-slate-500';
  const inputBg = darkMode ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-900';

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Get active budget for selected year or use selectedBudgetId
  const activeBudget = useMemo(() => {
    if (selectedBudgetId) {
      return budgets.find(b => b.id === selectedBudgetId) || null;
    }
    return budgets.find(b => b.year === selectedYear && b.isActive) || 
           budgets.find(b => b.year === selectedYear) || 
           null;
  }, [budgets, selectedYear, selectedBudgetId]);

  // Calculate actual expenses by category/subcategory and month
  const actualExpenses = useMemo(() => {
    if (!activeBudget) return {};

    const expenses: {
      [key: string]: { // key: categoryId or categoryId_subcategoryId
        [month: number]: number;
        total: number;
      };
    } = {};

    const startDate = new Date(selectedYear, 0, 1);
    const endDate = new Date(selectedYear, 11, 31, 23, 59, 59);

    transactions
      .filter(t => {
        const tDate = new Date(t.accrualDate);
        return (
          t.type === 'Saída' &&
          t.status === 'Pago' &&
          t.categoryId &&
          tDate >= startDate &&
          tDate <= endDate
        );
      })
      .forEach(t => {
        const key = t.subcategoryId 
          ? `${t.categoryId}_${t.subcategoryId}`
          : `${t.categoryId}`;
        
        if (!expenses[key]) {
          expenses[key] = { total: 0 };
        }

        const month = new Date(t.accrualDate).getMonth() + 1;
        expenses[key][month] = (expenses[key][month] || 0) + t.actualAmount;
        expenses[key].total += t.actualAmount;
      });

    return expenses;
  }, [transactions, activeBudget, selectedYear]);

  // Build comparison data
  const comparisonData = useMemo(() => {
    if (!activeBudget) return [];

    const data: Array<{
      categoryId: string;
      subcategoryId?: string;
      categoryName: string;
      subcategoryName?: string;
      budgeted: number;
      actual: number;
      variance: number;
      variancePercent: number;
      monthlyData: Array<{ month: string; budgeted: number; actual: number }>;
    }> = [];

    activeBudget.items.forEach(item => {
      const key = item.subcategoryId 
        ? `${item.categoryId}_${item.subcategoryId}`
        : `${item.categoryId}`;
      
      const actual = actualExpenses[key]?.total || 0;
      const budgeted = item.totalAmount;
      const variance = actual - budgeted;
      const variancePercent = budgeted > 0 ? (variance / budgeted) * 100 : 0;

      const category = categories.find(c => c.id === item.categoryId);
      const subcategory = item.subcategoryId 
        ? subcategories.find(s => s.id === item.subcategoryId)
        : undefined;

      // Build monthly data
      const monthlyData = monthNames.map((monthName, index) => {
        const month = index + 1;
        return {
          month: monthName.substring(0, 3),
          budgeted: item.monthlyAmounts[month] || 0,
          actual: actualExpenses[key]?.[month] || 0,
        };
      });

      data.push({
        categoryId: item.categoryId,
        subcategoryId: item.subcategoryId,
        categoryName: category?.name || item.categoryId,
        subcategoryName: subcategory?.name,
        budgeted,
        actual,
        variance,
        variancePercent,
        monthlyData,
      });
    });

    return data.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));
  }, [activeBudget, actualExpenses, categories, subcategories, monthNames]);

  // Monthly comparison chart data
  const monthlyChartData = useMemo(() => {
    if (!activeBudget) return [];

    const monthlyTotals: { [month: number]: { budgeted: number; actual: number } } = {};

    // Initialize
    for (let i = 1; i <= 12; i++) {
      monthlyTotals[i] = { budgeted: 0, actual: 0 };
    }

    // Sum budgeted amounts
    activeBudget.items.forEach(item => {
      Object.entries(item.monthlyAmounts).forEach(([month, amount]) => {
        monthlyTotals[parseInt(month)].budgeted += amount;
      });
    });

    // Sum actual amounts
    Object.entries(actualExpenses).forEach(([key, values]) => {
      Object.entries(values).forEach(([month, amount]) => {
        if (month !== 'total') {
          monthlyTotals[parseInt(month)].actual += amount;
        }
      });
    });

    return monthNames.map((name, index) => ({
      month: name.substring(0, 3),
      budgeted: monthlyTotals[index + 1].budgeted,
      actual: monthlyTotals[index + 1].actual,
      variance: monthlyTotals[index + 1].actual - monthlyTotals[index + 1].budgeted,
    }));
  }, [activeBudget, actualExpenses, monthNames]);

  // Summary metrics
  const summaryMetrics = useMemo(() => {
    if (!activeBudget) {
      return {
        totalBudgeted: 0,
        totalActual: 0,
        totalVariance: 0,
        totalVariancePercent: 0,
        itemsOverBudget: 0,
        itemsUnderBudget: 0,
      };
    }

    const totalBudgeted = activeBudget.items.reduce((sum, item) => sum + item.totalAmount, 0);
    const totalActual = Object.values(actualExpenses).reduce((sum, exp) => sum + exp.total, 0);
    const totalVariance = totalActual - totalBudgeted;
    const totalVariancePercent = totalBudgeted > 0 ? (totalVariance / totalBudgeted) * 100 : 0;

    const itemsOverBudget = comparisonData.filter(item => item.variance > 0).length;
    const itemsUnderBudget = comparisonData.filter(item => item.variance < 0).length;

    return {
      totalBudgeted,
      totalActual,
      totalVariance,
      totalVariancePercent,
      itemsOverBudget,
      itemsUnderBudget,
    };
  }, [activeBudget, actualExpenses, comparisonData]);

  if (budgets.length === 0) {
    return (
      <div className={`${cardBg} border rounded-lg p-12 text-center`}>
        <Calendar size={48} className={`mx-auto mb-4 ${subText}`} />
        <h3 className={`text-xl font-semibold ${textColor} mb-2`}>Nenhum orçamento encontrado</h3>
        <p className={subText}>Configure um orçamento primeiro para visualizar a comparação</p>
      </div>
    );
  }

  const availableYears = [...new Set(budgets.map(b => b.year))].sort((a, b) => b - a);

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className={`text-3xl font-bold ${textColor} mb-2`}>Orçado vs Realizado</h1>
            <p className={subText}>Compare valores orçados com despesas realizadas</p>
          </div>
          
          <div className="flex gap-3">
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(parseInt(e.target.value));
                setSelectedBudgetId(''); // Reset budget selection
              }}
              className={`px-4 py-2 rounded border ${inputBg} focus:outline-none focus:ring-2 ${darkMode ? 'focus:ring-yellow-500' : 'focus:ring-blue-500'}`}
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            
            {budgets.filter(b => b.year === selectedYear).length > 1 && (
              <select
                value={selectedBudgetId}
                onChange={(e) => setSelectedBudgetId(e.target.value)}
                className={`px-4 py-2 rounded border ${inputBg} focus:outline-none focus:ring-2 ${darkMode ? 'focus:ring-yellow-500' : 'focus:ring-blue-500'}`}
              >
                <option value="">Todos</option>
                {budgets.filter(b => b.year === selectedYear).map(budget => (
                  <option key={budget.id} value={budget.id}>{budget.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {!activeBudget ? (
          <div className={`${cardBg} border rounded-lg p-12 text-center`}>
            <AlertTriangle size={48} className={`mx-auto mb-4 text-yellow-500`} />
            <h3 className={`text-xl font-semibold ${textColor} mb-2`}>Nenhum orçamento ativo para {selectedYear}</h3>
            <p className={subText}>Selecione um ano com orçamento ou crie um novo orçamento</p>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className={`${cardBg} border rounded-lg p-4`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm ${subText}`}>Total Orçado</span>
                  <DollarSign size={20} className={subText} />
                </div>
                <p className={`text-2xl font-bold ${textColor}`}>
                  R$ {summaryMetrics.totalBudgeted.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>

              <div className={`${cardBg} border rounded-lg p-4`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm ${subText}`}>Total Realizado</span>
                  <DollarSign size={20} className={subText} />
                </div>
                <p className={`text-2xl font-bold ${textColor}`}>
                  R$ {summaryMetrics.totalActual.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>

              <div className={`${cardBg} border rounded-lg p-4`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm ${subText}`}>Variação</span>
                  {summaryMetrics.totalVariance >= 0 ? (
                    <TrendingUp size={20} className="text-red-500" />
                  ) : (
                    <TrendingDown size={20} className="text-green-500" />
                  )}
                </div>
                <p className={`text-2xl font-bold ${summaryMetrics.totalVariance >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {summaryMetrics.totalVariance >= 0 ? '+' : ''}
                  R$ {summaryMetrics.totalVariance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className={`text-xs ${subText} mt-1`}>
                  {summaryMetrics.totalVariancePercent >= 0 ? '+' : ''}
                  {summaryMetrics.totalVariancePercent.toFixed(1)}%
                </p>
              </div>

              <div className={`${cardBg} border rounded-lg p-4`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm ${subText}`}>Status</span>
                  <AlertTriangle size={20} className={summaryMetrics.itemsOverBudget > 0 ? 'text-red-500' : 'text-green-500'} />
                </div>
                <p className={`text-lg font-semibold ${textColor}`}>
                  {summaryMetrics.itemsOverBudget} {summaryMetrics.itemsOverBudget === 1 ? 'item' : 'itens'} acima
                </p>
                <p className={`text-xs ${subText} mt-1`}>
                  {summaryMetrics.itemsUnderBudget} {summaryMetrics.itemsUnderBudget === 1 ? 'item' : 'itens'} abaixo
                </p>
              </div>
            </div>

            {/* Monthly Comparison Chart */}
            <div className={`${cardBg} border rounded-lg p-6`}>
              <h2 className={`text-xl font-semibold ${textColor} mb-4`}>Comparação Mensal - Orçado vs Realizado</h2>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#52525b' : '#e2e8f0'} />
                  <XAxis 
                    dataKey="month" 
                    stroke={darkMode ? '#a1a1aa' : '#64748b'}
                    tick={{ fill: darkMode ? '#a1a1aa' : '#64748b' }}
                  />
                  <YAxis 
                    stroke={darkMode ? '#a1a1aa' : '#64748b'}
                    tick={{ fill: darkMode ? '#a1a1aa' : '#64748b' }}
                    tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: darkMode ? '#27272a' : '#ffffff',
                      border: darkMode ? '1px solid #3f3f46' : '1px solid #e2e8f0',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [
                      `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                      ''
                    ]}
                  />
                  <Legend />
                  <Bar 
                    dataKey="budgeted" 
                    name="Orçado" 
                    fill={darkMode ? '#52525b' : '#94a3b8'}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    dataKey="actual" 
                    name="Realizado" 
                    fill={darkMode ? '#eab308' : '#3b82f6'}
                    radius={[4, 4, 0, 0]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="variance" 
                    name="Variação" 
                    stroke={darkMode ? '#ef4444' : '#dc2626'}
                    strokeWidth={2}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Detailed Comparison Table */}
            <div className={`${cardBg} border rounded-lg p-6`}>
              <h2 className={`text-xl font-semibold ${textColor} mb-4`}>Detalhamento por Categoria/Subcategoria</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={`border-b ${darkMode ? 'border-zinc-700' : 'border-slate-200'}`}>
                      <th className={`text-left py-3 px-4 ${subText} text-sm font-medium`}>Categoria</th>
                      <th className={`text-left py-3 px-4 ${subText} text-sm font-medium`}>Subcategoria</th>
                      <th className={`text-right py-3 px-4 ${subText} text-sm font-medium`}>Orçado</th>
                      <th className={`text-right py-3 px-4 ${subText} text-sm font-medium`}>Realizado</th>
                      <th className={`text-right py-3 px-4 ${subText} text-sm font-medium`}>Variação</th>
                      <th className={`text-right py-3 px-4 ${subText} text-sm font-medium`}>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonData.map((item) => (
                      <tr 
                        key={`${item.categoryId}_${item.subcategoryId || 'none'}`}
                        className={`border-b ${darkMode ? 'border-zinc-800' : 'border-slate-100'} ${item.variance > 0 ? (darkMode ? 'bg-red-900/20' : 'bg-red-50') : ''}`}
                      >
                        <td className={`py-3 px-4 ${textColor} font-medium`}>{item.categoryName}</td>
                        <td className={`py-3 px-4 ${subText}`}>{item.subcategoryName || '-'}</td>
                        <td className={`py-3 px-4 text-right ${textColor}`}>
                          R$ {item.budgeted.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className={`py-3 px-4 text-right ${textColor}`}>
                          R$ {item.actual.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className={`py-3 px-4 text-right ${item.variance >= 0 ? 'text-red-500 font-semibold' : 'text-green-500 font-semibold'}`}>
                          {item.variance >= 0 ? '+' : ''}
                          R$ {item.variance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className={`py-3 px-4 text-right ${item.variance >= 0 ? 'text-red-500 font-semibold' : 'text-green-500 font-semibold'}`}>
                          {item.variancePercent >= 0 ? '+' : ''}
                          {item.variancePercent.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className={`border-t-2 ${darkMode ? 'border-zinc-600' : 'border-slate-300'} font-semibold`}>
                      <td colSpan={2} className={`py-3 px-4 ${textColor}`}>Total</td>
                      <td className={`py-3 px-4 text-right ${textColor}`}>
                        R$ {summaryMetrics.totalBudgeted.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className={`py-3 px-4 text-right ${textColor}`}>
                        R$ {summaryMetrics.totalActual.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className={`py-3 px-4 text-right ${summaryMetrics.totalVariance >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {summaryMetrics.totalVariance >= 0 ? '+' : ''}
                        R$ {summaryMetrics.totalVariance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className={`py-3 px-4 text-right ${summaryMetrics.totalVariance >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {summaryMetrics.totalVariancePercent >= 0 ? '+' : ''}
                        {summaryMetrics.totalVariancePercent.toFixed(1)}%
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </>
        )}
    </div>
  );
};

export default BudgetVsActual;

