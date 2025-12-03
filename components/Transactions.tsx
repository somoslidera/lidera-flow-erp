import React, { useState, useMemo } from 'react';
import { Plus, Search, Trash2, Edit2, X, Upload, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Transaction, AppSettings, TransactionType, TransactionStatus, Account } from '../types';

interface TransactionsProps {
  transactions: Transaction[];
  accounts: Account[];
  settings: AppSettings;
  darkMode: boolean;
  onAdd: (t: Omit<Transaction, 'id'>) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, t: Partial<Transaction>) => void;
  onBulkAdd: (transactions: Omit<Transaction, 'id'>[]) => void;
}

type SortField = 'dataVencimento' | 'descricao' | 'valor' | 'entidade';
type SortDirection = 'asc' | 'desc';

const Transactions: React.FC<TransactionsProps> = ({ 
  transactions, accounts, settings, darkMode, onAdd, onDelete, onUpdate, onBulkAdd 
}) => {
  const [filter, setFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Sorting State
  const [sortField, setSortField] = useState<SortField>('dataVencimento');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Initial Form State
  const initialFormState = {
    dataLancamento: new Date().toISOString().split('T')[0],
    dataVencimento: new Date().toISOString().split('T')[0],
    tipo: 'Saída' as TransactionType,
    categoria: '',
    entidade: '',
    produtoServico: '',
    centroCusto: settings.costCenters[0] || '',
    formaPagamento: settings.paymentMethods[0] || '',
    accountId: accounts[0]?.id || '',
    descricao: '',
    valorPrevisto: 0,
    valorRealizado: 0,
    dataCompetencia: new Date().toISOString().split('T')[0],
    status: 'A pagar' as TransactionStatus
  };

  const [formData, setFormData] = useState(initialFormState);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      onUpdate(editingId, formData);
    } else {
      onAdd(formData);
    }
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(initialFormState);
  };

  const handleEdit = (t: Transaction) => {
    setEditingId(t.id);
    setFormData({
      dataLancamento: t.dataLancamento,
      dataVencimento: t.dataVencimento,
      tipo: t.tipo,
      categoria: t.categoria,
      entidade: t.entidade,
      produtoServico: t.produtoServico,
      centroCusto: t.centroCusto,
      formaPagamento: t.formaPagamento,
      accountId: t.accountId || accounts[0]?.id || '',
      descricao: t.descricao,
      valorPrevisto: t.valorPrevisto,
      valorRealizado: t.valorRealizado,
      dataCompetencia: t.dataCompetencia,
      status: t.status
    });
    setIsModalOpen(true);
  };

  // --- Sorting & Filtering ---
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedData = useMemo(() => {
    // 1. Filter
    const filtered = transactions.filter(t => 
      t.descricao.toLowerCase().includes(filter.toLowerCase()) ||
      t.entidade.toLowerCase().includes(filter.toLowerCase()) ||
      t.categoria.toLowerCase().includes(filter.toLowerCase())
    );

    // 2. Sort
    return filtered.sort((a, b) => {
      let valA: any = a[sortField as keyof Transaction];
      let valB: any = b[sortField as keyof Transaction];

      if (sortField === 'valor') {
        valA = a.status === 'Pago' || a.status === 'Recebido' ? a.valorRealizado : a.valorPrevisto;
        valB = b.status === 'Pago' || b.status === 'Recebido' ? b.valorRealizado : b.valorPrevisto;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [transactions, filter, sortField, sortDirection]);

  // --- Pagination Logic ---
  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);
  const paginatedData = filteredAndSortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // --- CSV Import ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const csvData = event.target?.result as string;
      parseCSV(csvData);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const parseCSV = (csv: string) => {
    const lines = csv.split('\n');
    const headerIndex = lines.findIndex(line => line.includes('Data Lanç.') || line.includes('Data Venc.'));
    
    if (headerIndex === -1) {
      alert('Formato CSV inválido. Cabeçalhos não encontrados.');
      return;
    }

    const newTransactions: Omit<Transaction, 'id'>[] = [];
    
    for (let i = headerIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = line.split(',').map(c => c.replace(/^"|"$/g, '').trim());

      if (cols.length < 10) continue;

      // Robust Date Parsing (DD/MM/YYYY to YYYY-MM-DD)
      const parseDate = (d: string) => {
        if (!d) return new Date().toISOString().split('T')[0];
        // Handle "02/10/2025" or "2025-10-02"
        if (d.includes('/')) {
            const [day, month, year] = d.split('/');
            if (day && month && year) return `${year}-${month}-${day}`;
        }
        return d; 
      };

      const parseMoney = (v: string) => {
        if (!v) return 0;
        return parseFloat(v.replace(/\./g, '').replace(',', '.'));
      };

      try {
        const trans: Omit<Transaction, 'id'> = {
          dataLancamento: parseDate(cols[0]),
          dataVencimento: parseDate(cols[1]),
          tipo: (cols[2] as string).startsWith('S') ? 'Saída' : 'Entrada' as TransactionType,
          categoria: cols[3] || 'Geral',
          entidade: cols[4] || 'Não informado',
          produtoServico: cols[5] || '',
          centroCusto: cols[6] || '',
          formaPagamento: cols[7] || '',
          descricao: cols[8] || 'Importado via CSV',
          valorPrevisto: parseMoney(cols[9]),
          valorRealizado: parseMoney(cols[10]),
          dataPagamento: cols[11] ? parseDate(cols[11]) : undefined,
          dataCompetencia: cols[12] ? parseDate(cols[12]) : parseDate(cols[0]),
          status: cols[13] as TransactionStatus,
          accountId: accounts[0]?.id 
        };
        newTransactions.push(trans);
      } catch (err) {
        console.error("Error parsing line", i, err);
      }
    }

    if (newTransactions.length > 0) {
      if (window.confirm(`Foram encontradas ${newTransactions.length} transações. Importar?`)) {
        onBulkAdd(newTransactions);
      }
    } else {
      alert('Nenhuma transação válida encontrada.');
    }
  };

  // --- Render Helpers ---
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatDate = (dateStr: string) => {
      if(!dateStr) return '-';
      const [y,m,d] = dateStr.split('-');
      return `${d}/${m}/${y}`;
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Pago': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'Recebido': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'A pagar': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'A receber': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'Atrasado': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="opacity-30" />;
    return sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  // Styles
  const cardBg = darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200';
  const tableHeadBg = darkMode ? 'bg-zinc-800/50' : 'bg-slate-50';
  const textColor = darkMode ? 'text-zinc-100' : 'text-slate-800';
  const subText = darkMode ? 'text-zinc-400' : 'text-slate-500';
  const inputBg = darkMode ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-900';

  // Available lists for Modal based on type
  const availableCategories = settings.categories.filter(c => {
    if (formData.tipo === 'Entrada') return c.type === 'Receita';
    return c.type === 'Despesa';
  });

  const availableEntities = settings.entities.filter(e => {
      // Show all or filter strictly? Usually show all or filter by type
      // Let's filter slightly for DX
      if (formData.tipo === 'Entrada') return e.type === 'Cliente' || e.type === 'Ambos';
      return e.type === 'Fornecedor' || e.type === 'Ambos';
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className={`text-2xl font-bold ${textColor}`}>Lançamentos</h2>
          <p className={subText}>Gerencie suas entradas e saídas</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <input type="file" accept=".csv" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            <button className={`h-full p-2 px-4 rounded-lg border flex items-center gap-2 ${darkMode ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
              <Upload size={18} />
              <span className="hidden md:inline">Importar CSV</span>
            </button>
          </div>
          <button 
            onClick={() => { setEditingId(null); setFormData(initialFormState); setIsModalOpen(true); }}
            className={`p-2 px-4 rounded-lg flex items-center gap-2 font-medium ${darkMode ? 'bg-yellow-500 text-zinc-900 hover:bg-yellow-400' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
          >
            <Plus size={18} />
            <span>Novo Lançamento</span>
          </button>
        </div>
      </div>

      {/* Filters & Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${subText}`} size={18} />
          <input 
            type="text"
            placeholder="Buscar..."
            value={filter}
            onChange={(e) => { setFilter(e.target.value); setCurrentPage(1); }} // Reset page on filter
            className={`w-full pl-10 pr-4 py-2 rounded-lg border focus:ring-2 outline-none ${inputBg} ${darkMode ? 'focus:ring-yellow-500/50' : 'focus:ring-blue-500/50'}`}
          />
        </div>
        <div className="flex items-center gap-2">
           <span className={`text-sm ${subText}`}>Itens por página:</span>
           <select 
              value={itemsPerPage} 
              onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className={`p-2 rounded-lg border outline-none ${inputBg}`}
           >
             <option value={10}>10</option>
             <option value={25}>25</option>
             <option value={50}>50</option>
             <option value={100}>100</option>
           </select>
        </div>
      </div>

      {/* Table */}
      <div className={`rounded-xl border overflow-hidden ${cardBg} shadow-sm`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className={`text-xs uppercase font-semibold ${tableHeadBg} ${subText}`}>
              <tr>
                <th className="px-6 py-4 cursor-pointer hover:text-blue-500" onClick={() => handleSort('dataVencimento')}>
                    <div className="flex items-center gap-1">Vencimento <SortIcon field="dataVencimento" /></div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:text-blue-500" onClick={() => handleSort('descricao')}>
                    <div className="flex items-center gap-1">Descrição <SortIcon field="descricao" /></div>
                </th>
                <th className="px-6 py-4">Categoria</th>
                <th className="px-6 py-4 cursor-pointer hover:text-blue-500" onClick={() => handleSort('entidade')}>
                    <div className="flex items-center gap-1">Entidade <SortIcon field="entidade" /></div>
                </th>
                <th className="px-6 py-4">C. Custo</th>
                <th className="px-6 py-4">Conta</th>
                <th className="px-6 py-4 text-right cursor-pointer hover:text-blue-500" onClick={() => handleSort('valor')}>
                     <div className="flex items-center justify-end gap-1">Valor <SortIcon field="valor" /></div>
                </th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? 'divide-zinc-800' : 'divide-slate-200'}`}>
              {paginatedData.map((t) => {
                const accountName = accounts.find(a => a.id === t.accountId)?.name || '-';
                const isPaid = t.status === 'Pago' || t.status === 'Recebido';
                return (
                <tr key={t.id} className={`group transition-colors ${darkMode ? 'hover:bg-zinc-800/30' : 'hover:bg-slate-50'}`}>
                  <td className={`px-6 py-4 font-medium ${textColor}`}>{formatDate(t.dataVencimento)}</td>
                  <td className={`px-6 py-4 ${textColor}`}>
                      <div className="truncate max-w-[200px]" title={t.descricao}>{t.descricao}</div>
                  </td>
                  <td className={`px-6 py-4 ${subText}`}>{t.categoria}</td>
                  <td className={`px-6 py-4 ${subText}`}>{t.entidade}</td>
                  <td className={`px-6 py-4 ${subText} text-xs`}>{t.centroCusto}</td>
                  <td className={`px-6 py-4 ${subText} text-xs`}>{accountName}</td>
                  <td className={`px-6 py-4 text-right font-medium ${t.tipo === 'Entrada' ? 'text-emerald-500' : 'text-red-500'}`}>
                    {t.tipo === 'Saída' ? '-' : '+'} {formatCurrency(isPaid ? t.valorRealizado : t.valorPrevisto)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(t.status)}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(t)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded text-blue-500">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => onDelete(t.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded text-red-500">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
        {/* Pagination Controls */}
        <div className={`p-4 border-t flex items-center justify-between ${darkMode ? 'border-zinc-800' : 'border-slate-200'}`}>
           <div className={`text-sm ${subText}`}>
              Mostrando {Math.min(filteredAndSortedData.length, (currentPage - 1) * itemsPerPage + 1)} até {Math.min(filteredAndSortedData.length, currentPage * itemsPerPage)} de {filteredAndSortedData.length} registros
           </div>
           <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className={`p-2 rounded-lg border disabled:opacity-50 ${darkMode ? 'border-zinc-700 hover:bg-zinc-800' : 'border-slate-300 hover:bg-slate-50'}`}
              >
                <ChevronLeft size={16} />
              </button>
              <span className={`text-sm font-medium ${textColor}`}>Página {currentPage} de {totalPages || 1}</span>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className={`p-2 rounded-lg border disabled:opacity-50 ${darkMode ? 'border-zinc-700 hover:bg-zinc-800' : 'border-slate-300 hover:bg-slate-50'}`}
              >
                <ChevronRight size={16} />
              </button>
           </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={`w-full max-w-3xl rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto ${cardBg}`}>
            <form onSubmit={handleSubmit}>
              <div className={`p-6 border-b flex justify-between items-center ${darkMode ? 'border-zinc-800' : 'border-slate-200'}`}>
                <h3 className={`text-xl font-bold ${textColor}`}>
                  {editingId ? 'Editar Lançamento' : 'Novo Lançamento'}
                </h3>
                <button type="button" onClick={() => setIsModalOpen(false)} className={subText}><X size={24} /></button>
              </div>
              
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tipo Switch */}
                <div className="md:col-span-2 flex justify-center mb-4">
                  <div className={`flex p-1 rounded-lg border ${darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-100 border-slate-200'}`}>
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, tipo: 'Entrada', categoria: ''})}
                      className={`px-6 py-2 rounded-md text-sm font-bold transition-colors ${formData.tipo === 'Entrada' ? 'bg-emerald-500 text-white shadow' : subText}`}
                    >
                      Entrada
                    </button>
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, tipo: 'Saída', categoria: ''})}
                      className={`px-6 py-2 rounded-md text-sm font-bold transition-colors ${formData.tipo === 'Saída' ? 'bg-red-500 text-white shadow' : subText}`}
                    >
                      Saída
                    </button>
                  </div>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className={`text-xs font-medium ${subText}`}>Descrição</label>
                  <input required className={`w-full p-2 rounded border ${inputBg}`} value={formData.descricao} onChange={e => setFormData({...formData, descricao: e.target.value})} />
                </div>

                <div className="space-y-1">
                  <label className={`text-xs font-medium ${subText}`}>Conta / Caixa</label>
                  <select className={`w-full p-2 rounded border ${inputBg}`} value={formData.accountId} onChange={e => setFormData({...formData, accountId: e.target.value})}>
                     {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className={`text-xs font-medium ${subText}`}>Entidade</label>
                  <select className={`w-full p-2 rounded border ${inputBg}`} value={formData.entidade} onChange={e => setFormData({...formData, entidade: e.target.value})}>
                     <option value="">Selecione...</option>
                     {availableEntities.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
                     {/* Fallback for imported data that might not be in settings */}
                     {!availableEntities.find(e => e.name === formData.entidade) && formData.entidade && (
                        <option value={formData.entidade}>{formData.entidade}</option>
                     )}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className={`text-xs font-medium ${subText}`}>Categoria</label>
                  <select className={`w-full p-2 rounded border ${inputBg}`} value={formData.categoria} onChange={e => setFormData({...formData, categoria: e.target.value})}>
                     <option value="">Selecione...</option>
                     {availableCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                     {/* Fallback */}
                     {!availableCategories.find(c => c.name === formData.categoria) && formData.categoria && (
                        <option value={formData.categoria}>{formData.categoria}</option>
                     )}
                  </select>
                </div>
                
                 <div className="space-y-1">
                  <label className={`text-xs font-medium ${subText}`}>Centro de Custo</label>
                  <select className={`w-full p-2 rounded border ${inputBg}`} value={formData.centroCusto} onChange={e => setFormData({...formData, centroCusto: e.target.value})}>
                     <option value="">Selecione...</option>
                     {settings.costCenters.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className={`text-xs font-medium ${subText}`}>Valor Previsto</label>
                  <input type="number" step="0.01" className={`w-full p-2 rounded border ${inputBg}`} value={formData.valorPrevisto} onChange={e => setFormData({...formData, valorPrevisto: parseFloat(e.target.value)})} />
                </div>
                
                 <div className="space-y-1">
                  <label className={`text-xs font-medium ${subText}`}>Valor Realizado</label>
                  <input type="number" step="0.01" className={`w-full p-2 rounded border ${inputBg}`} value={formData.valorRealizado} onChange={e => setFormData({...formData, valorRealizado: parseFloat(e.target.value)})} />
                </div>

                <div className="space-y-1">
                  <label className={`text-xs font-medium ${subText}`}>Data Vencimento</label>
                  <input type="date" className={`w-full p-2 rounded border ${inputBg}`} value={formData.dataVencimento} onChange={e => setFormData({...formData, dataVencimento: e.target.value})} />
                </div>
                 <div className="space-y-1">
                  <label className={`text-xs font-medium ${subText}`}>Data Competência</label>
                  <input type="date" className={`w-full p-2 rounded border ${inputBg}`} value={formData.dataCompetencia} onChange={e => setFormData({...formData, dataCompetencia: e.target.value})} />
                </div>

                <div className="space-y-1">
                  <label className={`text-xs font-medium ${subText}`}>Status</label>
                  <select className={`w-full p-2 rounded border ${inputBg}`} value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as TransactionStatus})}>
                     <option value="A pagar">A pagar</option>
                     <option value="Pago">Pago</option>
                     <option value="A receber">A receber</option>
                     <option value="Recebido">Recebido</option>
                     <option value="Atrasado">Atrasado</option>
                  </select>
                </div>
              </div>

              <div className={`p-6 border-t flex justify-end gap-3 ${darkMode ? 'border-zinc-800' : 'border-slate-200'}`}>
                <button type="button" onClick={() => setIsModalOpen(false)} className={`px-4 py-2 rounded-lg font-medium ${darkMode ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-slate-100 text-slate-600'}`}>Cancelar</button>
                <button type="submit" className={`px-4 py-2 rounded-lg font-medium ${darkMode ? 'bg-yellow-500 text-zinc-900 hover:bg-yellow-400' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;