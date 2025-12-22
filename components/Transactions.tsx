import React, { useState, useMemo } from 'react';
import { Plus, Search, Trash2, Edit2, X, Upload, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, FileSpreadsheet } from 'lucide-react';
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

  // CSV Import State
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvPreviewData, setCsvPreviewData] = useState<string[][]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({}); // systemField -> csvColumnIndex
  const [duplicateStrategy, setDuplicateStrategy] = useState<'import_all' | 'skip_exact'>('skip_exact');

  // Installment State (Form)
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentsCount, setInstallmentsCount] = useState(2);

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

  // --- Handlers ---

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingId) {
      onUpdate(editingId, formData);
    } else {
      if (isInstallment && installmentsCount > 1) {
        // Handle Installments logic
        const baseValuePrevisto = formData.valorPrevisto / installmentsCount;
        const baseValueRealizado = formData.valorRealizado / installmentsCount;
        const baseDate = new Date(formData.dataVencimento);
        
        for (let i = 0; i < installmentsCount; i++) {
          const newDate = new Date(baseDate);
          newDate.setMonth(baseDate.getMonth() + i);
          
          const dateStr = newDate.toISOString().split('T')[0];
          
          onAdd({
            ...formData,
            descricao: `${formData.descricao} (${i + 1}/${installmentsCount})`,
            valorPrevisto: Number(baseValuePrevisto.toFixed(2)),
            valorRealizado: Number(baseValueRealizado.toFixed(2)),
            dataVencimento: dateStr,
            dataCompetencia: dateStr, // Assuming competence follows due date for simplicity
            dataLancamento: new Date().toISOString().split('T')[0]
          });
        }
      } else {
        // Single Transaction
        onAdd(formData);
      }
    }
    
    closeModal();
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(initialFormState);
    setIsInstallment(false);
    setInstallmentsCount(2);
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
    setIsInstallment(false); // Can't convert existing to installment easily in edit mode
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
    const filtered = transactions.filter(t => 
      t.descricao.toLowerCase().includes(filter.toLowerCase()) ||
      t.entidade.toLowerCase().includes(filter.toLowerCase()) ||
      t.categoria.toLowerCase().includes(filter.toLowerCase())
    );

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

  // --- CSV Import Handlers ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const csvData = event.target?.result as string;
      const lines = csvData.split('\n').filter(l => l.trim() !== '');
      if (lines.length < 1) return;

      // Basic parsing to split columns
      const parsed = lines.map(line => {
         // Handle quotes if simple splitting fails, but for now simple split
         // A more robust regex for CSV splitting:
         const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
         return matches.map(m => m.replace(/^"|"$/g, '').trim());
      });

      setCsvHeaders(parsed[0]);
      setCsvPreviewData(parsed.slice(1, 6)); // Preview 5 rows
      setAllCsvRows(parsed.slice(1)); // Store all
      
      // Auto-guess mapping
      const initialMap: Record<string, string> = {};
      parsed[0].forEach((h, idx) => {
         const lower = h.toLowerCase();
         if (lower.includes('desc')) initialMap['descricao'] = idx.toString();
         else if (lower.includes('val')) initialMap['valorPrevisto'] = idx.toString();
         else if (lower.includes('venc') || lower.includes('data')) initialMap['dataVencimento'] = idx.toString();
         else if (lower.includes('cat')) initialMap['categoria'] = idx.toString();
         else if (lower.includes('entid') || lower.includes('clien') || lower.includes('forne')) initialMap['entidade'] = idx.toString();
         else if (lower.includes('tipo')) initialMap['tipo'] = idx.toString();
         else if (lower.includes('status')) initialMap['status'] = idx.toString();
      });
      setFieldMapping(initialMap);
      setIsCsvModalOpen(true);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const [allCsvRows, setAllCsvRows] = useState<string[][]>([]);

  const processCsvImport = () => {
    const newTransactions: Omit<Transaction, 'id'>[] = [];
    let skippedCount = 0;

    allCsvRows.forEach(row => {
       if (row.length < 2) return;

       // Helpers
       const getCol = (field: keyof Omit<Transaction, 'id'>) => {
          const idx = fieldMapping[field];
          if (!idx) return undefined;
          return row[parseInt(idx)];
       };

       // Parsers
       const parseDate = (val?: string) => {
          if (!val) return new Date().toISOString().split('T')[0];
          // Try DD/MM/YYYY
          if (val.includes('/')) {
             const parts = val.split('/');
             if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
          }
          // Try YYYY-MM-DD
          if (val.includes('-')) return val;
          return new Date().toISOString().split('T')[0];
       };

       const parseMoney = (val?: string) => {
          if (!val) return 0;
          // Clean currency symbol and dots, keep comma as decimal or dot as decimal
          // Assuming BR format: 1.000,00
          let clean = val.replace(/[R$\s]/g, '');
          if (clean.includes(',') && clean.includes('.')) {
             clean = clean.replace(/\./g, '').replace(',', '.');
          } else if (clean.includes(',')) {
             clean = clean.replace(',', '.');
          }
          return parseFloat(clean) || 0;
       };

       const typeRaw = getCol('tipo') || 'Saída';
       const tipo: TransactionType = typeRaw.toLowerCase().startsWith('e') ? 'Entrada' : 'Saída';

       const t: Omit<Transaction, 'id'> = {
         dataLancamento: new Date().toISOString().split('T')[0],
         dataVencimento: parseDate(getCol('dataVencimento')),
         dataCompetencia: parseDate(getCol('dataCompetencia')) || parseDate(getCol('dataVencimento')),
         tipo: tipo,
         categoria: getCol('categoria') || 'Geral',
         entidade: getCol('entidade') || 'Não informado',
         produtoServico: getCol('produtoServico') || '',
         centroCusto: getCol('centroCusto') || '',
         formaPagamento: getCol('formaPagamento') || '',
         descricao: getCol('descricao') || 'Importado via CSV',
         valorPrevisto: parseMoney(getCol('valorPrevisto')),
         valorRealizado: parseMoney(getCol('valorRealizado')) || parseMoney(getCol('valorPrevisto')),
         accountId: accounts[0]?.id || '',
         status: (getCol('status') as TransactionStatus) || 'Pago'
       };

       // Duplicate Check
       if (duplicateStrategy === 'skip_exact') {
          const exists = transactions.some(exist => 
             exist.descricao === t.descricao && 
             exist.valorPrevisto === t.valorPrevisto && 
             exist.dataVencimento === t.dataVencimento
          );
          if (exists) {
            skippedCount++;
            return;
          }
       }

       newTransactions.push(t);
    });

    onBulkAdd(newTransactions);
    setIsCsvModalOpen(false);
    alert(`Importação concluída! ${newTransactions.length} registros importados. ${skippedCount} duplicatas ignoradas.`);
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
            placeholder="Buscar por descrição, categoria, entidade..."
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

      {/* CSV Mapping Modal */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <div className={`w-full max-w-4xl rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto ${cardBg}`}>
              <div className={`p-6 border-b flex justify-between items-center ${darkMode ? 'border-zinc-800' : 'border-slate-200'}`}>
                <h3 className={`text-xl font-bold flex items-center gap-2 ${textColor}`}>
                   <FileSpreadsheet /> Importação Inteligente de CSV
                </h3>
                <button type="button" onClick={() => setIsCsvModalOpen(false)} className={subText}><X size={24} /></button>
              </div>
              
              <div className="p-6 space-y-6">
                 {/* Duplicate Strategy */}
                 <div className={`p-4 rounded-lg border ${darkMode ? 'bg-zinc-950/50 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
                    <h4 className={`font-semibold mb-3 ${textColor}`}>Em caso de duplicidade (mesma data, valor e descrição):</h4>
                    <div className="flex gap-4">
                       <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="radio" 
                            name="strategy" 
                            checked={duplicateStrategy === 'skip_exact'}
                            onChange={() => setDuplicateStrategy('skip_exact')}
                          />
                          <span className={textColor}>Pular (Não importar)</span>
                       </label>
                       <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="radio" 
                            name="strategy" 
                            checked={duplicateStrategy === 'import_all'}
                            onChange={() => setDuplicateStrategy('import_all')}
                          />
                          <span className={textColor}>Importar Tudo (Pode duplicar)</span>
                       </label>
                    </div>
                 </div>

                 {/* Column Mapping */}
                 <div>
                    <h4 className={`font-semibold mb-3 ${textColor}`}>Mapeie as colunas do seu arquivo:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                       {[
                         { key: 'descricao', label: 'Descrição' },
                         { key: 'valorPrevisto', label: 'Valor' },
                         { key: 'dataVencimento', label: 'Data Vencimento' },
                         { key: 'categoria', label: 'Categoria' },
                         { key: 'entidade', label: 'Entidade/Cliente' },
                         { key: 'tipo', label: 'Tipo (Entrada/Saída)' },
                         { key: 'status', label: 'Status' }
                       ].map(field => (
                          <div key={field.key}>
                             <label className={`block text-xs font-medium mb-1 ${subText}`}>{field.label}</label>
                             <select 
                                value={fieldMapping[field.key] || ''}
                                onChange={(e) => setFieldMapping({...fieldMapping, [field.key]: e.target.value})}
                                className={`w-full p-2 rounded border ${inputBg}`}
                             >
                                <option value="">Não mapear</option>
                                {csvHeaders.map((h, i) => (
                                   <option key={i} value={i}>{h}</option>
                                ))}
                             </select>
                          </div>
                       ))}
                    </div>
                 </div>

                 {/* Preview */}
                 <div>
                    <h4 className={`font-semibold mb-3 ${textColor}`}>Pré-visualização (Primeiras 5 linhas):</h4>
                    <div className="overflow-x-auto rounded border border-gray-200 dark:border-zinc-800">
                       <table className="w-full text-xs">
                          <thead className={tableHeadBg}>
                             <tr>
                               {csvHeaders.map((h, i) => <th key={i} className={`p-2 border-r ${darkMode ? 'border-zinc-700 text-zinc-400' : 'border-slate-200 text-slate-500'}`}>{h}</th>)}
                             </tr>
                          </thead>
                          <tbody>
                             {csvPreviewData.map((row, rIdx) => (
                               <tr key={rIdx} className="border-t border-gray-100 dark:border-zinc-800">
                                  {row.map((cell, cIdx) => <td key={cIdx} className={`p-2 border-r truncate max-w-[100px] ${darkMode ? 'border-zinc-800 text-zinc-400' : 'border-slate-100 text-slate-600'}`}>{cell}</td>)}
                               </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                 </div>
              </div>

              <div className={`p-6 border-t flex justify-end gap-3 ${darkMode ? 'border-zinc-800' : 'border-slate-200'}`}>
                <button type="button" onClick={() => setIsCsvModalOpen(false)} className={`px-4 py-2 rounded-lg font-medium ${darkMode ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-slate-100 text-slate-600'}`}>Cancelar</button>
                <button type="button" onClick={processCsvImport} className={`px-4 py-2 rounded-lg font-medium ${darkMode ? 'bg-yellow-500 text-zinc-900 hover:bg-yellow-400' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                   Confirmar Importação
                </button>
              </div>
           </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={`w-full max-w-3xl rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto ${cardBg}`}>
            <form onSubmit={handleSubmit}>
              <div className={`p-6 border-b flex justify-between items-center ${darkMode ? 'border-zinc-800' : 'border-slate-200'}`}>
                <h3 className={`text-xl font-bold ${textColor}`}>
                  {editingId ? 'Editar Lançamento' : 'Novo Lançamento'}
                </h3>
                <button type="button" onClick={closeModal} className={subText}><X size={24} /></button>
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

                {/* --- Parcelamento Checkbox (Only on Create) --- */}
                {!editingId && (
                  <div className={`md:col-span-2 p-3 rounded-lg border flex flex-col md:flex-row gap-4 items-center ${darkMode ? 'bg-zinc-950/50 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                       <input 
                         type="checkbox" 
                         checked={isInstallment}
                         onChange={(e) => setIsInstallment(e.target.checked)}
                         className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                       />
                       <span className={`font-medium ${textColor}`}>É um parcelamento?</span>
                    </label>

                    {isInstallment && (
                       <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-4">
                          <span className={`text-sm ${subText}`}>Dividir em</span>
                          <input 
                            type="number" 
                            min="2" 
                            max="60"
                            value={installmentsCount}
                            onChange={(e) => setInstallmentsCount(parseInt(e.target.value))}
                            className={`w-16 p-1 text-center rounded border ${inputBg}`}
                          />
                          <span className={`text-sm ${subText}`}>vezes (mensais)</span>
                       </div>
                    )}
                  </div>
                )}

                <div className="space-y-1 md:col-span-2">
                  <label className={`text-xs font-medium ${subText}`}>Descrição {isInstallment && '(Será numerada ex: 1/x)'}</label>
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
                  <label className={`text-xs font-medium ${subText}`}>Valor Previsto {isInstallment && '(Total)'}</label>
                  <input type="number" step="0.01" className={`w-full p-2 rounded border ${inputBg}`} value={formData.valorPrevisto} onChange={e => setFormData({...formData, valorPrevisto: parseFloat(e.target.value)})} />
                  {isInstallment && <p className="text-[10px] text-gray-500">Será {(formData.valorPrevisto / installmentsCount).toFixed(2)} por parcela</p>}
                </div>
                
                 <div className="space-y-1">
                  <label className={`text-xs font-medium ${subText}`}>Valor Realizado {isInstallment && '(Total)'}</label>
                  <input type="number" step="0.01" className={`w-full p-2 rounded border ${inputBg}`} value={formData.valorRealizado} onChange={e => setFormData({...formData, valorRealizado: parseFloat(e.target.value)})} />
                </div>

                <div className="space-y-1">
                  <label className={`text-xs font-medium ${subText}`}>Data Vencimento {isInstallment && '(1ª Parcela)'}</label>
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
                <button type="button" onClick={closeModal} className={`px-4 py-2 rounded-lg font-medium ${darkMode ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-slate-100 text-slate-600'}`}>Cancelar</button>
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