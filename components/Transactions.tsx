import React, { useState, useMemo } from 'react';
import { Plus, Search, Trash2, Edit2, X, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Table, List, Filter, XCircle } from 'lucide-react';
import { Transaction, AppSettings, TransactionType, TransactionStatus, Account, Entity, SubcategoryItem } from '../types';
import CsvImporter from './CsvImporter';
import EditableTable from './EditableTable';
import { authService } from '../services/firebase';

interface TransactionsProps {
  transactions: Transaction[];
  accounts: Account[];
  entities: Entity[];
  subcategories: SubcategoryItem[];
  settings: AppSettings;
  darkMode: boolean;
  onAdd: (t: Omit<Transaction, 'id'>) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, t: Partial<Transaction>) => void;
  onBulkAdd: (transactions: Omit<Transaction, 'id'>[]) => void;
  onImportEntities?: (entities: Array<{ name: string; type: 'Cliente' | 'Fornecedor' | 'Ambos'; tags?: string[] }>) => void;
  onAddEntity?: (entity: Omit<Entity, 'id'>) => void;
}

type SortField = 'dueDate' | 'description' | 'valor' | 'entity';
type SortDirection = 'asc' | 'desc';

const Transactions: React.FC<TransactionsProps> = ({ 
  transactions, accounts, entities, subcategories, settings, darkMode, onAdd, onDelete, onUpdate, onBulkAdd, onImportEntities, onAddEntity
}) => {
  const [filter, setFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'editable'>('table');
  
  // Advanced Filters State
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'Entrada' | 'Saída'>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterEntity, setFilterEntity] = useState<string>('all');
  const [filterAccount, setFilterAccount] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [filterAmountMin, setFilterAmountMin] = useState<string>('');
  const [filterAmountMax, setFilterAmountMax] = useState<string>('');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Sorting State
  const [sortField, setSortField] = useState<SortField>('dueDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');


  // Installment State (Form)
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentsCount, setInstallmentsCount] = useState(2);

  // Function to get initial form state - with safety checks
  const getInitialFormState = useMemo(() => ({
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    type: 'Saída' as TransactionType,
    category: '',
    categoryId: '',
    subcategoryId: '',
    entity: '', // Entity is optional - can be empty
    productService: '',
    costCenter: (settings?.costCenters && settings.costCenters.length > 0) ? settings.costCenters[0] : '',
    paymentMethod: (settings?.paymentMethods && settings.paymentMethods.length > 0) ? settings.paymentMethods[0] : '',
    accountId: accounts && accounts.length > 0 ? (accounts[0]?.id || '') : '',
    description: '',
    expectedAmount: 0,
    actualAmount: 0,
    accrualDate: new Date().toISOString().split('T')[0],
    status: 'A pagar' as TransactionStatus
  }), [settings, accounts]);

  const [formData, setFormData] = useState(getInitialFormState);

  // Entity creation modal state
  const [isEntityModalOpen, setIsEntityModalOpen] = useState(false);
  const [newEntityName, setNewEntityName] = useState('');
  const [newEntityType, setNewEntityType] = useState<'Cliente' | 'Fornecedor' | 'Ambos'>('Cliente');

  // Handler to create new entity
  const handleCreateEntity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntityName.trim() || !onAddEntity) return;

    try {
      const currentUser = authService?.getCurrentUser?.();
      const userId = currentUser?.uid || 'system';
      const now = new Date().toISOString();

      const newEntity: Omit<Entity, 'id'> = {
        name: newEntityName.trim(),
        type: newEntityType,
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
        isActive: true
      };

      await onAddEntity(newEntity);
      
      // Update form to select the new entity immediately
      setFormData({ ...formData, entity: newEntityName.trim() });
      
      // Close modal and reset form
      setIsEntityModalOpen(false);
      setNewEntityName('');
    } catch (error: any) {
      console.error("Error creating entity:", error);
      alert("Erro ao criar entidade. Tente novamente.");
    }
  };

  // --- Handlers ---

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingId) {
      onUpdate(editingId, formData);
    } else {
      if (isInstallment && installmentsCount > 1) {
        // Handle Installments logic
        const baseExpectedAmount = formData.expectedAmount / installmentsCount;
        const baseActualAmount = formData.actualAmount / installmentsCount;
        const baseDate = new Date(formData.dueDate);
        
        for (let i = 0; i < installmentsCount; i++) {
          const newDate = new Date(baseDate);
          newDate.setMonth(baseDate.getMonth() + i);
          
          const dateStr = newDate.toISOString().split('T')[0];
          
          onAdd({
            ...formData,
            description: `${formData.description} (${i + 1}/${installmentsCount})`,
            expectedAmount: Number(baseExpectedAmount.toFixed(2)),
            actualAmount: Number(baseActualAmount.toFixed(2)),
            dueDate: dateStr,
            accrualDate: dateStr, // Assuming competence follows due date for simplicity
            issueDate: new Date().toISOString().split('T')[0]
          });
        }
        } else {
        // Single Transaction
        // Ensure categoryId is set based on category name if not already set
        const finalFormData = { ...formData };
        if (!finalFormData.categoryId && finalFormData.category) {
          const matchingCategory = settings.categories.find(
            c => c.name.toLowerCase() === finalFormData.category.toLowerCase()
          );
          if (matchingCategory) {
            finalFormData.categoryId = matchingCategory.id;
          }
        }
        onAdd(finalFormData);
      }
    }
    
    closeModal();
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(getInitialFormState);
    setIsInstallment(false);
    setInstallmentsCount(2);
  };

  const handleEdit = (t: Transaction) => {
    setEditingId(t.id);
    setFormData({
      issueDate: t.issueDate,
      dueDate: t.dueDate,
      type: t.type,
      category: t.category || '',
      categoryId: t.categoryId || '',
      subcategoryId: t.subcategoryId || '',
      entity: t.entity || '', // Entity can be empty/null
      productService: t.productService,
      costCenter: t.costCenter,
      paymentMethod: t.paymentMethod,
      accountId: t.accountId || accounts[0]?.id || '',
      description: t.description,
      expectedAmount: t.expectedAmount,
      actualAmount: t.actualAmount,
      accrualDate: t.accrualDate,
      status: t.status
    });
    setIsInstallment(false); // Can't convert existing to installment easily in edit mode
    setIsModalOpen(true);
  };

  // Helper functions - defined before useMemo that uses them
  const getCategoryName = (categoryId?: string) => {
    if (!categoryId || !settings?.categories) return '';
    const category = settings.categories.find(c => c.id === categoryId);
    return category?.name || '';
  };

  const getSubcategoryName = (subcategoryId?: string) => {
    if (!subcategoryId || !subcategories) return '';
    const subcategory = subcategories.find(s => s.id === subcategoryId);
    return subcategory?.name || '';
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
    const filterLower = filter.toLowerCase();
    const filtered = transactions.filter(t => {
      // Text search filter
      const categoryName = t.categoryId 
        ? getCategoryName(t.categoryId) 
        : t.category || '';
      const subcategoryName = t.subcategoryId 
        ? getSubcategoryName(t.subcategoryId) 
        : '';
      
      const matchesText = filter === '' || (
        t.description?.toLowerCase().includes(filterLower) ||
        (t.entity && t.entity.toLowerCase().includes(filterLower)) ||
        categoryName?.toLowerCase().includes(filterLower) ||
        subcategoryName?.toLowerCase().includes(filterLower)
      );
      
      // Advanced filters
      const matchesType = filterType === 'all' || t.type === filterType;
      const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
      const matchesCategory = filterCategory === 'all' || 
        (t.categoryId === filterCategory) || 
        (t.categoryId && getCategoryName(t.categoryId) === filterCategory) ||
        (t.category === filterCategory);
      const matchesEntity = filterEntity === 'all' || 
        (t.entity && t.entity.toLowerCase() === filterEntity.toLowerCase());
      const matchesAccount = filterAccount === 'all' || t.accountId === filterAccount;
      
      // Date filters
      const matchesDateFrom = !filterDateFrom || t.dueDate >= filterDateFrom;
      const matchesDateTo = !filterDateTo || t.dueDate <= filterDateTo;
      
      // Amount filters
      const transactionAmount = t.status === 'Pago' || t.status === 'Recebido' ? t.actualAmount : t.expectedAmount;
      const matchesAmountMin = !filterAmountMin || transactionAmount >= parseFloat(filterAmountMin);
      const matchesAmountMax = !filterAmountMax || transactionAmount <= parseFloat(filterAmountMax);
      
      return matchesText && matchesType && matchesStatus && matchesCategory && 
             matchesEntity && matchesAccount && matchesDateFrom && matchesDateTo &&
             matchesAmountMin && matchesAmountMax;
    });

    return filtered.sort((a, b) => {
      let valA: any = a[sortField as keyof Transaction];
      let valB: any = b[sortField as keyof Transaction];

      if (sortField === 'valor') {
        valA = a.status === 'Pago' || a.status === 'Recebido' ? a.actualAmount : a.expectedAmount;
        valB = b.status === 'Pago' || b.status === 'Recebido' ? b.actualAmount : b.expectedAmount;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [transactions, filter, sortField, sortDirection, settings, subcategories]);

  // --- Pagination Logic ---
  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);
  const paginatedData = filteredAndSortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );


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
    if (formData.type === 'Entrada') return c.type === 'Receita';
    return c.type === 'Despesa';
  });

  // Get subcategories for selected category
  const availableSubcategories = useMemo(() => {
    if (!formData.categoryId) return [];
    return subcategories.filter(s => s.categoryId === formData.categoryId);
  }, [formData.categoryId, subcategories]);


  // Use entities from Firebase, fallback to settings.entities for backward compatibility
  // Add safety checks to prevent errors when entities are undefined or missing type
  const availableEntitiesList = useMemo(() => {
    try {
      if (entities && entities.length > 0) {
        return entities.filter(e => {
          if (!e || !e.type) return false; // Skip entities without type
          if (formData.type === 'Entrada') return e.type === 'Cliente' || e.type === 'Ambos';
          return e.type === 'Fornecedor' || e.type === 'Ambos';
        });
      }
      
      if (settings?.entities && Array.isArray(settings.entities) && settings.entities.length > 0) {
        return settings.entities.filter((e: any) => {
          if (!e || !e.type) return false; // Skip entities without type
          if (formData.type === 'Entrada') return e.type === 'Cliente' || e.type === 'Ambos';
          return e.type === 'Fornecedor' || e.type === 'Ambos';
        });
      }
      
      return []; // Return empty array if no entities available
    } catch (error) {
      console.error("Error filtering entities:", error);
      return []; // Return empty array on error
    }
  }, [entities, settings?.entities, formData.type]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className={`text-2xl font-bold ${textColor}`}>Lançamentos</h2>
          <p className={subText}>Gerencie suas entradas e saídas</p>
        </div>
        <div className="flex gap-2">
          <div className={`flex rounded-lg border overflow-hidden ${darkMode ? 'border-zinc-700' : 'border-slate-300'}`}>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 px-3 ${viewMode === 'table' 
                ? darkMode ? 'bg-yellow-500 text-zinc-900' : 'bg-blue-600 text-white'
                : darkMode ? 'text-zinc-400 hover:bg-zinc-800' : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="Visualização em tabela"
            >
              <List size={18} />
            </button>
            <button
              onClick={() => setViewMode('editable')}
              className={`p-2 px-3 ${viewMode === 'editable' 
                ? darkMode ? 'bg-yellow-500 text-zinc-900' : 'bg-blue-600 text-white'
                : darkMode ? 'text-zinc-400 hover:bg-zinc-800' : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="Tabela editável (estilo Airtable)"
            >
              <Table size={18} />
            </button>
          </div>
          <CsvImporter
            onImport={onBulkAdd}
            onImportEntities={onImportEntities}
            existingTransactions={transactions}
            existingEntities={entities.map(e => ({ name: e.name, type: e.type }))}
            categories={settings.categories}
            subcategories={subcategories}
            accounts={accounts}
            darkMode={darkMode}
          />
          <button 
            onClick={() => { 
              try {
                setEditingId(null); 
                setFormData(getInitialFormState); 
                setIsModalOpen(true); 
              } catch (error) {
                console.error("Error opening transaction modal:", error);
                alert("Erro ao abrir formulário. Verifique se todas as configurações estão carregadas.");
              }
            }}
            className={`p-2 px-4 rounded-lg flex items-center gap-2 font-medium ${darkMode ? 'bg-yellow-500 text-zinc-900 hover:bg-yellow-400' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
          >
            <Plus size={18} />
            <span>Novo Lançamento</span>
          </button>
        </div>
      </div>

      {/* Filters & Controls */}
      <div className="space-y-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${subText}`} size={18} />
            <input 
              type="text"
              placeholder="Buscar por descrição, categoria, entidade..."
              value={filter}
              onChange={(e) => { setFilter(e.target.value); setCurrentPage(1); }}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border focus:ring-2 outline-none ${inputBg} ${darkMode ? 'focus:ring-yellow-500/50' : 'focus:ring-blue-500/50'}`}
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`p-2 px-4 rounded-lg flex items-center gap-2 font-medium transition-colors ${
                showAdvancedFilters
                  ? darkMode ? 'bg-yellow-500 text-zinc-900' : 'bg-blue-600 text-white'
                  : darkMode ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Filter size={18} />
              <span>Filtros Avançados</span>
            </button>
            {viewMode === 'table' && (
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
            )}
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showAdvancedFilters && (
          <div className={`p-4 rounded-xl border ${cardBg} space-y-4`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-sm font-semibold ${textColor}`}>Filtros Avançados</h3>
              <button
                onClick={() => {
                  setFilterType('all');
                  setFilterStatus('all');
                  setFilterCategory('all');
                  setFilterEntity('all');
                  setFilterAccount('all');
                  setFilterDateFrom('');
                  setFilterDateTo('');
                  setFilterAmountMin('');
                  setFilterAmountMax('');
                  setCurrentPage(1);
                }}
                className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${subText} hover:underline`}
              >
                <XCircle size={14} />
                Limpar Filtros
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className={`text-xs font-medium ${subText}`}>Tipo</label>
                <select 
                  value={filterType} 
                  onChange={(e) => { setFilterType(e.target.value as any); setCurrentPage(1); }}
                  className={`w-full p-2 rounded-lg border outline-none ${inputBg}`}
                >
                  <option value="all">Todos</option>
                  <option value="Entrada">Entrada</option>
                  <option value="Saída">Saída</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className={`text-xs font-medium ${subText}`}>Status</label>
                <select 
                  value={filterStatus} 
                  onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                  className={`w-full p-2 rounded-lg border outline-none ${inputBg}`}
                >
                  <option value="all">Todos</option>
                  <option value="A pagar">A pagar</option>
                  <option value="Pago">Pago</option>
                  <option value="A receber">A receber</option>
                  <option value="Recebido">Recebido</option>
                  <option value="Atrasado">Atrasado</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className={`text-xs font-medium ${subText}`}>Categoria</label>
                <select 
                  value={filterCategory} 
                  onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1); }}
                  className={`w-full p-2 rounded-lg border outline-none ${inputBg}`}
                >
                  <option value="all">Todas</option>
                  {settings.categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className={`text-xs font-medium ${subText}`}>Entidade</label>
                <select 
                  value={filterEntity} 
                  onChange={(e) => { setFilterEntity(e.target.value); setCurrentPage(1); }}
                  className={`w-full p-2 rounded-lg border outline-none ${inputBg}`}
                >
                  <option value="all">Todas</option>
                  {entities.map(e => (
                    <option key={e.id} value={e.name}>{e.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className={`text-xs font-medium ${subText}`}>Conta</label>
                <select 
                  value={filterAccount} 
                  onChange={(e) => { setFilterAccount(e.target.value); setCurrentPage(1); }}
                  className={`w-full p-2 rounded-lg border outline-none ${inputBg}`}
                >
                  <option value="all">Todas</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className={`text-xs font-medium ${subText}`}>Data Inicial</label>
                <input 
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => { setFilterDateFrom(e.target.value); setCurrentPage(1); }}
                  className={`w-full p-2 rounded-lg border outline-none ${inputBg}`}
                />
              </div>
              <div className="space-y-1">
                <label className={`text-xs font-medium ${subText}`}>Data Final</label>
                <input 
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => { setFilterDateTo(e.target.value); setCurrentPage(1); }}
                  className={`w-full p-2 rounded-lg border outline-none ${inputBg}`}
                />
              </div>
              <div className="space-y-1">
                <label className={`text-xs font-medium ${subText}`}>Valor Mínimo</label>
                <input 
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={filterAmountMin}
                  onChange={(e) => { setFilterAmountMin(e.target.value); setCurrentPage(1); }}
                  className={`w-full p-2 rounded-lg border outline-none ${inputBg}`}
                />
              </div>
              <div className="space-y-1">
                <label className={`text-xs font-medium ${subText}`}>Valor Máximo</label>
                <input 
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={filterAmountMax}
                  onChange={(e) => { setFilterAmountMax(e.target.value); setCurrentPage(1); }}
                  className={`w-full p-2 rounded-lg border outline-none ${inputBg}`}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Editable Table View */}
      {viewMode === 'editable' ? (
        <EditableTable
          data={filteredAndSortedData}
          columns={[
            { key: 'id', label: 'ID', type: 'text', width: '120px' },
            { key: 'dueDate', label: 'Vencimento', type: 'date', width: '140px' },
            { key: 'description', label: 'Descrição', type: 'text' },
            { 
              key: 'type', 
              label: 'Tipo', 
              type: 'select', 
              options: ['Entrada', 'Saída'],
              width: '100px'
            },
            { key: 'category', label: 'Categoria', type: 'text', width: '150px' },
            { key: 'entity', label: 'Entidade', type: 'text', width: '150px' },
            { key: 'expectedAmount', label: 'Valor Previsto', type: 'currency', width: '130px' },
            { key: 'actualAmount', label: 'Valor Realizado', type: 'currency', width: '130px' },
            {
              key: 'status',
              label: 'Status',
              type: 'select',
              options: ['A pagar', 'Pago', 'A receber', 'Recebido', 'Atrasado', 'Cancelado'],
              width: '120px'
            },
            { key: 'paymentDate', label: 'Data Pagamento', type: 'date', width: '140px' },
          ]}
          onUpdate={(id, field, value) => {
            onUpdate(id, { [field]: value } as Partial<Transaction>);
          }}
          onDelete={onDelete}
          onAdd={() => {
            try {
              setEditingId(null);
              setFormData(getInitialFormState);
              setIsModalOpen(true);
            } catch (error) {
              console.error("Error opening transaction modal:", error);
              alert("Erro ao abrir formulário. Verifique se todas as configurações estão carregadas.");
            }
          }}
          getId={(item) => item.id}
          darkMode={darkMode}
        />
      ) : (
        /* Regular Table View */
      <div className={`rounded-xl border overflow-hidden ${cardBg} shadow-sm`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className={`text-xs uppercase font-semibold ${tableHeadBg} ${subText}`}>
              <tr>
                <th className="px-6 py-4 cursor-pointer hover:text-blue-500" onClick={() => handleSort('dueDate')}>
                    <div className="flex items-center gap-1">Vencimento <SortIcon field="dueDate" /></div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:text-blue-500" onClick={() => handleSort('description')}>
                    <div className="flex items-center gap-1">Descrição <SortIcon field="description" /></div>
                </th>
                <th className="px-6 py-4">Categoria</th>
                <th className="px-6 py-4 cursor-pointer hover:text-blue-500" onClick={() => handleSort('entity')}>
                    <div className="flex items-center gap-1">Entidade <SortIcon field="entity" /></div>
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
                  <td className={`px-6 py-4 font-medium ${textColor}`}>{formatDate(t.dueDate)}</td>
                  <td className={`px-6 py-4 ${textColor}`}>
                      <div className="truncate max-w-[200px]" title={t.description}>{t.description}</div>
                  </td>
                  <td className={`px-6 py-4 ${subText}`}>
                    <div>
                      {t.categoryId ? getCategoryName(t.categoryId) : (t.category || '-')}
                      {t.subcategoryId && (
                        <div className="text-xs opacity-75">
                          {getSubcategoryName(t.subcategoryId)}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className={`px-6 py-4 ${subText}`}>{t.entity}</td>
                  <td className={`px-6 py-4 ${subText} text-xs`}>{accountName}</td>
                  <td className={`px-6 py-4 text-right font-medium ${t.type === 'Entrada' ? 'text-emerald-500' : 'text-red-500'}`}>
                    {t.type === 'Saída' ? '-' : '+'} {formatCurrency(isPaid ? t.actualAmount : t.expectedAmount)}
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
                      onClick={() => setFormData({...formData, type: 'Entrada', category: ''})}
                      className={`px-6 py-2 rounded-md text-sm font-bold transition-colors ${formData.type === 'Entrada' ? 'bg-emerald-500 text-white shadow' : subText}`}
                    >
                      Entrada
                    </button>
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, type: 'Saída', category: ''})}
                      className={`px-6 py-2 rounded-md text-sm font-bold transition-colors ${formData.type === 'Saída' ? 'bg-red-500 text-white shadow' : subText}`}
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
                  <input required className={`w-full p-2 rounded border ${inputBg}`} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                </div>

                <div className="space-y-1">
                  <label className={`text-xs font-medium ${subText}`}>Conta / Caixa</label>
                  <select className={`w-full p-2 rounded border ${inputBg}`} value={formData.accountId} onChange={e => setFormData({...formData, accountId: e.target.value})}>
                     {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className={`text-xs font-medium ${subText}`}>Entidade</label>
                  <div className="flex gap-2">
                    <select className={`flex-1 p-2 rounded border ${inputBg}`} value={formData.entity} onChange={e => setFormData({...formData, entity: e.target.value})}>
                       <option value="">Selecione...</option>
                       {availableEntitiesList.map((e: any) => <option key={e.id || e.name} value={e.name}>{e.name}</option>)}
                       {!availableEntitiesList.find((e: any) => e.name === formData.entity) && formData.entity && (
                          <option value={formData.entity}>{formData.entity}</option>
                       )}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        // Set default type based on transaction type
                        const defaultType = formData.type === 'Entrada' ? 'Cliente' : 'Fornecedor';
                        setNewEntityType(defaultType);
                        setNewEntityName('');
                        setIsEntityModalOpen(true);
                      }}
                      className={`px-3 py-2 rounded border flex items-center gap-1 font-medium transition-colors ${
                        darkMode 
                          ? 'bg-zinc-800 border-zinc-700 text-yellow-400 hover:bg-zinc-700' 
                          : 'bg-blue-50 border-blue-300 text-blue-600 hover:bg-blue-100'
                      }`}
                      title="Adicionar nova entidade"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className={`text-xs font-medium ${subText}`}>Categoria</label>
                  <select 
                    className={`w-full p-2 rounded border ${inputBg}`} 
                    value={formData.categoryId} 
                    onChange={e => {
                      const selectedCategory = settings.categories.find(c => c.id === e.target.value);
                      setFormData({
                        ...formData, 
                        categoryId: e.target.value,
                        category: selectedCategory?.name || '', // Keep legacy field
                        subcategoryId: '' // Reset subcategory when category changes
                      });
                    }}
                  >
                     <option value="">Selecione...</option>
                     {availableCategories.map(c => (
                       <option key={c.id} value={c.id}>{c.name}</option>
                     ))}
                     {/* Fallback for legacy data without categoryId */}
                     {!formData.categoryId && formData.category && (
                        <option value="">{formData.category} (legado)</option>
                     )}
                  </select>
                </div>

                {formData.categoryId && availableSubcategories.length > 0 && (
                  <div className="space-y-1">
                    <label className={`text-xs font-medium ${subText}`}>Subcategoria</label>
                    <select 
                      className={`w-full p-2 rounded border ${inputBg}`} 
                      value={formData.subcategoryId || ''} 
                      onChange={e => setFormData({...formData, subcategoryId: e.target.value})}
                    >
                      <option value="">Nenhuma subcategoria</option>
                      {availableSubcategories.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                 <div className="space-y-1">
                  <label className={`text-xs font-medium ${subText}`}>Centro de Custo</label>
                  <select className={`w-full p-2 rounded border ${inputBg}`} value={formData.costCenter} onChange={e => setFormData({...formData, costCenter: e.target.value})}>
                     <option value="">Selecione...</option>
                     {settings.costCenters.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className={`text-xs font-medium ${subText}`}>Valor Previsto {isInstallment && '(Total)'}</label>
                  <input type="number" step="0.01" className={`w-full p-2 rounded border ${inputBg}`} value={formData.expectedAmount} onChange={e => setFormData({...formData, expectedAmount: parseFloat(e.target.value)})} />
                  {isInstallment && <p className="text-[10px] text-gray-500">Será {(formData.expectedAmount / installmentsCount).toFixed(2)} por parcela</p>}
                </div>
                
                 <div className="space-y-1">
                  <label className={`text-xs font-medium ${subText}`}>Valor Realizado {isInstallment && '(Total)'}</label>
                  <input type="number" step="0.01" className={`w-full p-2 rounded border ${inputBg}`} value={formData.actualAmount} onChange={e => setFormData({...formData, actualAmount: parseFloat(e.target.value)})} />
                </div>

                <div className="space-y-1">
                  <label className={`text-xs font-medium ${subText}`}>Data Vencimento {isInstallment && '(1ª Parcela)'}</label>
                  <input type="date" className={`w-full p-2 rounded border ${inputBg}`} value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} />
                </div>
                 <div className="space-y-1">
                  <label className={`text-xs font-medium ${subText}`}>Data Competência</label>
                  <input type="date" className={`w-full p-2 rounded border ${inputBg}`} value={formData.accrualDate} onChange={e => setFormData({...formData, accrualDate: e.target.value})} />
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

      {/* Entity Creation Modal */}
      {isEntityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md rounded-xl shadow-2xl ${cardBg}`}>
            <form onSubmit={handleCreateEntity}>
              <div className={`p-6 border-b flex justify-between items-center ${darkMode ? 'border-zinc-800' : 'border-slate-200'}`}>
                <h3 className={`text-xl font-bold ${textColor}`}>Nova Entidade</h3>
                <button 
                  type="button" 
                  onClick={() => {
                    setIsEntityModalOpen(false);
                    setNewEntityName('');
                  }} 
                  className={subText}
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className={`text-xs font-medium ${subText}`}>Nome da Entidade *</label>
                  <input 
                    required
                    className={`w-full p-2 rounded border ${inputBg}`} 
                    value={newEntityName} 
                    onChange={e => setNewEntityName(e.target.value)}
                    placeholder="Ex: Empresa XYZ"
                    autoFocus
                  />
                </div>

                <div className="space-y-1">
                  <label className={`text-xs font-medium ${subText}`}>Tipo *</label>
                  <select 
                    className={`w-full p-2 rounded border ${inputBg}`} 
                    value={newEntityType} 
                    onChange={e => setNewEntityType(e.target.value as 'Cliente' | 'Fornecedor' | 'Ambos')}
                  >
                    <option value="Cliente">Cliente</option>
                    <option value="Fornecedor">Fornecedor</option>
                    <option value="Ambos">Ambos</option>
                  </select>
                </div>

                <p className={`text-xs ${subText}`}>
                  💡 A entidade será criada e automaticamente selecionada no formulário de lançamento.
                </p>
              </div>

              <div className={`p-6 border-t flex justify-end gap-3 ${darkMode ? 'border-zinc-800' : 'border-slate-200'}`}>
                <button 
                  type="button"
                  onClick={() => {
                    setIsEntityModalOpen(false);
                    setNewEntityName('');
                  }}
                  className={`px-4 py-2 rounded-lg font-medium ${darkMode ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className={`px-4 py-2 rounded-lg font-medium ${darkMode ? 'bg-yellow-500 text-zinc-900 hover:bg-yellow-400' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                >
                  Criar Entidade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;