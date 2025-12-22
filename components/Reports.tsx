import React, { useState, useMemo } from 'react';
import { Transaction } from '../types';
import { Printer, FileText } from 'lucide-react';

interface ReportsProps {
  transactions: Transaction[];
  darkMode: boolean;
}

type DreViewMode = 'comparison' | 'realized' | 'predicted';

const Reports: React.FC<ReportsProps> = ({ transactions, darkMode }) => {
  const [activeTab, setActiveTab] = useState<'payables' | 'dre'>('payables');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [dreViewMode, setDreViewMode] = useState<DreViewMode>('comparison');

  const cardBg = darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200';
  const textColor = darkMode ? 'text-zinc-100' : 'text-slate-800';
  const subText = darkMode ? 'text-zinc-400' : 'text-slate-500';

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Data for Payables/Receivables
  const pendingPayables = transactions.filter(t => t.tipo === 'Saída' && t.status === 'A pagar');
  const pendingReceivables = transactions.filter(t => t.tipo === 'Entrada' && t.status === 'A receber');
  const totalPayable = pendingPayables.reduce((acc, curr) => acc + curr.valorPrevisto, 0);
  const totalReceivable = pendingReceivables.reduce((acc, curr) => acc + curr.valorPrevisto, 0);

  // Data for DRE
  const dreData = useMemo(() => {
    // Filter by year
    const yearTransactions = transactions.filter(t => 
       new Date(t.dataCompetencia).getFullYear() === selectedYear
    );

    const categories = Array.from(new Set(yearTransactions.map(t => t.categoria)));
    
    const reportData = categories.map(cat => {
      const catTrans = yearTransactions.filter(t => t.categoria === cat);
      const isIncome = catTrans[0]?.tipo === 'Entrada';
      
      const realized = catTrans
        .filter(t => t.status === 'Pago' || t.status === 'Recebido')
        .reduce((acc, t) => acc + t.valorRealizado, 0);
        
      const predicted = catTrans
        .reduce((acc, t) => acc + t.valorPrevisto, 0);

      return { category: cat, isIncome, realized, predicted };
    }).sort((a, b) => {
        // Sort: Income first, then Expenses
        if (a.isIncome === b.isIncome) return b.realized - a.realized;
        return a.isIncome ? -1 : 1;
    });

    const totalIncomeRealized = reportData.filter(d => d.isIncome).reduce((acc, d) => acc + d.realized, 0);
    const totalExpenseRealized = reportData.filter(d => !d.isIncome).reduce((acc, d) => acc + d.realized, 0);
    const resultRealized = totalIncomeRealized - totalExpenseRealized;

    const totalIncomePredicted = reportData.filter(d => d.isIncome).reduce((acc, d) => acc + d.predicted, 0);
    const totalExpensePredicted = reportData.filter(d => !d.isIncome).reduce((acc, d) => acc + d.predicted, 0);
    const resultPredicted = totalIncomePredicted - totalExpensePredicted;

    return { 
      items: reportData, 
      summary: { 
         realized: { income: totalIncomeRealized, expense: totalExpenseRealized, result: resultRealized },
         predicted: { income: totalIncomePredicted, expense: totalExpensePredicted, result: resultPredicted }
      }
    };
  }, [transactions, selectedYear]);

  // CSV Export Logic
  const handleExportCSV = () => {
    const headers = ['Categoria', 'Tipo', 'Valor Previsto', 'Valor Realizado', 'Diferença'];
    const rows = dreData.items.map(item => [
      item.category,
      item.isIncome ? 'Receita' : 'Despesa',
      item.predicted.toFixed(2).replace('.', ','),
      item.realized.toFixed(2).replace('.', ','),
      (item.realized - item.predicted).toFixed(2).replace('.', ',')
    ]);

    // Add Summary Rows
    rows.push(['---', '---', '---', '---', '---']);
    rows.push(['RESULTADO', '', 
       dreData.summary.predicted.result.toFixed(2).replace('.', ','),
       dreData.summary.realized.result.toFixed(2).replace('.', ','),
       ''
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(";") + "\n" 
        + rows.map(e => e.join(";")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `DRE_Gerencial_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PDF / Print Logic
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
          <div>
            <h2 className={`text-2xl font-bold ${textColor}`}>Relatórios</h2>
            <p className={subText}>Análises financeiras detalhadas</p>
          </div>
          <div className={`flex p-1 rounded-lg border ${darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-100 border-slate-200'}`}>
            <button 
              onClick={() => setActiveTab('payables')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'payables' ? (darkMode ? 'bg-zinc-800 text-white' : 'bg-white text-blue-600 shadow-sm') : subText}`}
            >
              Contas a Pagar/Receber
            </button>
            <button 
              onClick={() => setActiveTab('dre')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'dre' ? (darkMode ? 'bg-zinc-800 text-white' : 'bg-white text-blue-600 shadow-sm') : subText}`}
            >
              DRE Gerencial
            </button>
          </div>
        </div>
        
        {activeTab === 'payables' ? (
          <div className="flex flex-col lg:flex-row gap-6 print:hidden">
            <div className={`p-6 rounded-xl border flex-1 ${cardBg}`}>
              <div className="flex justify-between items-center mb-6">
                <h3 className={`font-bold text-lg ${textColor}`}>Contas a Receber</h3>
                <span className="text-xl font-bold text-emerald-500">{formatCurrency(totalReceivable)}</span>
              </div>
              <div className="space-y-3">
                  {pendingReceivables.slice(0, 10).map((t) => (
                    <div key={t.id} className={`flex justify-between items-center p-3 rounded border ${darkMode ? 'bg-zinc-950/50 border-zinc-800' : 'bg-slate-50 border-slate-100'}`}>
                        <div>
                          <p className={`font-medium text-sm ${textColor}`}>{t.descricao}</p>
                          <p className={`text-xs ${subText}`}>{t.entidade} • {t.dataVencimento}</p>
                        </div>
                        <span className="font-medium text-emerald-500">{formatCurrency(t.valorPrevisto)}</span>
                    </div>
                  ))}
                  {pendingReceivables.length === 0 && <p className={`text-center py-4 ${subText}`}>Nada pendente.</p>}
              </div>
            </div>

            <div className={`p-6 rounded-xl border flex-1 ${cardBg}`}>
              <div className="flex justify-between items-center mb-6">
                <h3 className={`font-bold text-lg ${textColor}`}>Contas a Pagar</h3>
                <span className="text-xl font-bold text-red-500">{formatCurrency(totalPayable)}</span>
              </div>
              <div className="space-y-3">
                  {pendingPayables.slice(0, 10).map((t) => (
                    <div key={t.id} className={`flex justify-between items-center p-3 rounded border ${darkMode ? 'bg-zinc-950/50 border-zinc-800' : 'bg-slate-50 border-slate-100'}`}>
                        <div>
                          <p className={`font-medium text-sm ${textColor}`}>{t.descricao}</p>
                          <p className={`text-xs ${subText}`}>{t.entidade} • {t.dataVencimento}</p>
                        </div>
                        <span className="font-medium text-red-500">{formatCurrency(t.valorPrevisto)}</span>
                    </div>
                  ))}
                  {pendingPayables.length === 0 && <p className={`text-center py-4 ${subText}`}>Nada pendente.</p>}
              </div>
            </div>
          </div>
        ) : (
          <div className={`rounded-xl border overflow-hidden ${cardBg} print:border-none print:shadow-none`}>
             {/* DRE Header Controls */}
             <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex flex-col md:flex-row justify-between items-center gap-4 print:hidden">
                <div className="flex items-center gap-4">
                  <h3 className={`font-bold text-lg ${textColor}`}>Demonstrativo do Resultado</h3>
                  <select 
                    value={selectedYear} 
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className={`p-2 rounded border outline-none ${darkMode ? 'bg-zinc-950 border-zinc-700' : 'bg-white border-slate-200'}`}
                  >
                    {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>

                <div className="flex gap-2">
                   <div className={`flex p-1 rounded-lg border mr-4 ${darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-100 border-slate-200'}`}>
                      <button onClick={() => setDreViewMode('comparison')} className={`px-3 py-1 text-xs font-medium rounded ${dreViewMode === 'comparison' ? (darkMode ? 'bg-zinc-700 text-white' : 'bg-white text-blue-600 shadow') : subText}`}>Prev. x Real.</button>
                      <button onClick={() => setDreViewMode('realized')} className={`px-3 py-1 text-xs font-medium rounded ${dreViewMode === 'realized' ? (darkMode ? 'bg-zinc-700 text-white' : 'bg-white text-blue-600 shadow') : subText}`}>Apenas Realizado</button>
                      <button onClick={() => setDreViewMode('predicted')} className={`px-3 py-1 text-xs font-medium rounded ${dreViewMode === 'predicted' ? (darkMode ? 'bg-zinc-700 text-white' : 'bg-white text-blue-600 shadow') : subText}`}>Apenas Previsto</button>
                   </div>
                   
                   <button onClick={handleExportCSV} className={`p-2 rounded border hover:bg-opacity-80 ${darkMode ? 'border-zinc-700 hover:bg-zinc-800' : 'border-slate-300 hover:bg-slate-50'}`} title="Baixar CSV">
                      <FileText size={18} className={textColor} />
                   </button>
                   <button onClick={handlePrint} className={`p-2 rounded border hover:bg-opacity-80 ${darkMode ? 'border-zinc-700 hover:bg-zinc-800' : 'border-slate-300 hover:bg-slate-50'}`} title="Imprimir / Salvar PDF">
                      <Printer size={18} className={textColor} />
                   </button>
                </div>
             </div>
             
             {/* DRE Content (Printable Area) */}
             <div className="p-8 print:p-0">
               <div className="space-y-6 max-w-4xl mx-auto print:max-w-none print:w-full">
                  <div className="hidden print:block text-center mb-8 border-b pb-4">
                     <h1 className="text-2xl font-bold">Relatório DRE Gerencial</h1>
                     <p className="text-sm text-gray-500">Exercício {selectedYear}</p>
                  </div>

                  {/* Header Row */}
                  <div className="grid grid-cols-12 gap-4 pb-2 border-b font-bold text-xs uppercase tracking-wider opacity-60">
                     <div className="col-span-6">Categoria</div>
                     {dreViewMode !== 'realized' && <div className={`text-right ${dreViewMode === 'comparison' ? 'col-span-2' : 'col-span-6'}`}>Previsto</div>}
                     {dreViewMode !== 'predicted' && <div className={`text-right ${dreViewMode === 'comparison' ? 'col-span-2' : 'col-span-6'}`}>Realizado</div>}
                     {dreViewMode === 'comparison' && <div className="col-span-2 text-right">Dif.</div>}
                  </div>

                  {/* Receitas */}
                  <div className="space-y-2">
                    <h4 className="text-emerald-500 font-bold uppercase tracking-wider text-sm border-b border-emerald-500/30 pb-1">Receitas</h4>
                    {dreData.items.filter(i => i.isIncome).map((item, idx) => (
                      <div key={idx} className={`grid grid-cols-12 gap-4 text-sm ${subText}`}>
                        <div className="col-span-6">{item.category}</div>
                        {dreViewMode !== 'realized' && (
                           <div className={`text-right ${dreViewMode === 'comparison' ? 'col-span-2' : 'col-span-6'}`}>{formatCurrency(item.predicted)}</div>
                        )}
                        {dreViewMode !== 'predicted' && (
                           <div className={`text-right ${dreViewMode === 'comparison' ? 'col-span-2' : 'col-span-6'}`}>{formatCurrency(item.realized)}</div>
                        )}
                         {dreViewMode === 'comparison' && (
                           <div className={`text-right col-span-2 ${item.realized >= item.predicted ? 'text-emerald-500' : 'text-red-400'}`}>
                             {formatCurrency(item.realized - item.predicted)}
                           </div>
                        )}
                      </div>
                    ))}
                    {/* Subtotal Receita */}
                    <div className={`grid grid-cols-12 gap-4 pt-2 font-bold ${textColor} border-t border-dashed border-gray-700`}>
                        <div className="col-span-6">TOTAL RECEITAS</div>
                        {dreViewMode !== 'realized' && (
                           <div className={`text-right ${dreViewMode === 'comparison' ? 'col-span-2' : 'col-span-6'}`}>{formatCurrency(dreData.summary.predicted.income)}</div>
                        )}
                        {dreViewMode !== 'predicted' && (
                           <div className={`text-right ${dreViewMode === 'comparison' ? 'col-span-2' : 'col-span-6'}`}>{formatCurrency(dreData.summary.realized.income)}</div>
                        )}
                        {dreViewMode === 'comparison' && <div className="col-span-2"></div>}
                    </div>
                  </div>

                  {/* Despesas */}
                  <div className="space-y-2 pt-4">
                    <h4 className="text-red-500 font-bold uppercase tracking-wider text-sm border-b border-red-500/30 pb-1">Despesas</h4>
                    {dreData.items.filter(i => !i.isIncome).map((item, idx) => (
                      <div key={idx} className={`grid grid-cols-12 gap-4 text-sm ${subText}`}>
                        <div className="col-span-6">{item.category}</div>
                         {dreViewMode !== 'realized' && (
                           <div className={`text-right ${dreViewMode === 'comparison' ? 'col-span-2' : 'col-span-6'}`}>({formatCurrency(item.predicted)})</div>
                        )}
                        {dreViewMode !== 'predicted' && (
                           <div className={`text-right ${dreViewMode === 'comparison' ? 'col-span-2' : 'col-span-6'}`}>({formatCurrency(item.realized)})</div>
                        )}
                         {dreViewMode === 'comparison' && (
                           <div className={`text-right col-span-2 ${item.realized <= item.predicted ? 'text-emerald-500' : 'text-red-400'}`}>
                             {formatCurrency(item.predicted - item.realized)} 
                             {/* Note: Positive diff in expense means saving (good), negative means overspending */}
                           </div>
                        )}
                      </div>
                    ))}
                    {/* Subtotal Despesa */}
                    <div className={`grid grid-cols-12 gap-4 pt-2 font-bold ${textColor} border-t border-dashed border-gray-700`}>
                        <div className="col-span-6">TOTAL DESPESAS</div>
                        {dreViewMode !== 'realized' && (
                           <div className={`text-right ${dreViewMode === 'comparison' ? 'col-span-2' : 'col-span-6'}`}>({formatCurrency(dreData.summary.predicted.expense)})</div>
                        )}
                        {dreViewMode !== 'predicted' && (
                           <div className={`text-right ${dreViewMode === 'comparison' ? 'col-span-2' : 'col-span-6'}`}>({formatCurrency(dreData.summary.realized.expense)})</div>
                        )}
                        {dreViewMode === 'comparison' && <div className="col-span-2"></div>}
                    </div>
                  </div>

                  {/* Resultado Final */}
                  <div className={`mt-8 pt-4 border-t-2 flex justify-between items-center ${darkMode ? 'border-zinc-700' : 'border-slate-200'}`}>
                     <div className="w-full grid grid-cols-12 gap-4 items-center">
                        <div className={`col-span-6 font-bold text-xl ${textColor}`}>RESULTADO LÍQUIDO</div>
                         {dreViewMode !== 'realized' && (
                           <div className={`text-right font-bold text-xl ${dreViewMode === 'comparison' ? 'col-span-2' : 'col-span-6'} ${dreData.summary.predicted.result >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                             {formatCurrency(dreData.summary.predicted.result)}
                           </div>
                        )}
                        {dreViewMode !== 'predicted' && (
                           <div className={`text-right font-bold text-xl ${dreViewMode === 'comparison' ? 'col-span-2' : 'col-span-6'} ${dreData.summary.realized.result >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                             {formatCurrency(dreData.summary.realized.result)}
                           </div>
                        )}
                        {dreViewMode === 'comparison' && <div className="col-span-2"></div>}
                     </div>
                  </div>
               </div>
               
               <div className="hidden print:block text-center mt-12 text-xs text-gray-400">
                  <p>Lidera Flow ERP • Gerado em {new Date().toLocaleDateString()}</p>
               </div>
             </div>
          </div>
        )}
    </div>
  );
};

export default Reports;