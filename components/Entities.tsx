import React, { useState, useMemo } from 'react';
import { Entity } from '../types';
import { Plus, Trash2, Edit2, Building2, User, Users, Mail, Phone, MapPin, FileText, Tag, Table, Grid, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';
import EditableTable from './EditableTable';

interface EntitiesProps {
  entities: Entity[];
  darkMode: boolean;
  onAddEntity: (entity: Omit<Entity, 'id'>) => void;
  onDeleteEntity: (id: string) => void;
  onUpdateEntity: (id: string, data: Partial<Entity>) => void;
}

const Entities: React.FC<EntitiesProps> = ({ entities, darkMode, onAddEntity, onDeleteEntity, onUpdateEntity }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'Cliente' | 'Fornecedor' | 'Ambos'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'editable'>('grid');
  
  // Sorting State
  type SortField = 'name' | 'type' | 'email' | 'city' | 'createdAt';
  type SortDirection = 'asc' | 'desc';
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  // Form State
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'Cliente' | 'Fornecedor' | 'Ambos'>('Cliente');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formWebsite, setFormWebsite] = useState('');
  const [formDocument, setFormDocument] = useState('');
  const [formDocumentType, setFormDocumentType] = useState<'CPF' | 'CNPJ'>('CNPJ');
  const [formStreet, setFormStreet] = useState('');
  const [formNumber, setFormNumber] = useState('');
  const [formComplement, setFormComplement] = useState('');
  const [formNeighborhood, setFormNeighborhood] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formState, setFormState] = useState('');
  const [formZipCode, setFormZipCode] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Styles
  const cardBg = darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200';
  const textColor = darkMode ? 'text-zinc-100' : 'text-slate-800';
  const subText = darkMode ? 'text-zinc-400' : 'text-slate-500';
  const inputBg = darkMode ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-900';

  const openAddModal = () => {
    setEditingEntity(null);
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (entity: Entity) => {
    setEditingEntity(entity);
    setFormName(entity.name);
    setFormType(entity.type);
    setFormEmail(entity.email || '');
    setFormPhone(entity.phone || '');
    setFormWebsite(entity.website || '');
    setFormDocument(entity.document || '');
    setFormDocumentType(entity.documentType || 'CNPJ');
    setFormStreet(entity.address?.street || '');
    setFormNumber(entity.address?.number || '');
    setFormComplement(entity.address?.complement || '');
    setFormNeighborhood(entity.address?.neighborhood || '');
    setFormCity(entity.address?.city || '');
    setFormState(entity.address?.state || '');
    setFormZipCode(entity.address?.zipCode || '');
    setFormNotes(entity.notes || '');
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setFormName('');
    setFormType('Cliente');
    setFormEmail('');
    setFormPhone('');
    setFormWebsite('');
    setFormDocument('');
    setFormDocumentType('CNPJ');
    setFormStreet('');
    setFormNumber('');
    setFormComplement('');
    setFormNeighborhood('');
    setFormCity('');
    setFormState('');
    setFormZipCode('');
    setFormNotes('');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const entityData: Omit<Entity, 'id'> = {
      name: formName.trim(),
      type: formType,
      email: formEmail.trim() || undefined,
      phone: formPhone.trim() || undefined,
      website: formWebsite.trim() || undefined,
      document: formDocument.trim() || undefined,
      documentType: formDocument ? formDocumentType : undefined,
      address: (formStreet || formNumber || formCity) ? {
        street: formStreet.trim() || undefined,
        number: formNumber.trim() || undefined,
        complement: formComplement.trim() || undefined,
        neighborhood: formNeighborhood.trim() || undefined,
        city: formCity.trim() || undefined,
        state: formState.trim() || undefined,
        zipCode: formZipCode.trim() || undefined,
      } : undefined,
      notes: formNotes.trim() || undefined,
      tags: editingEntity?.tags || [],
      createdAt: editingEntity?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: editingEntity?.createdBy || '',
      isActive: editingEntity?.isActive !== false,
    };

    if (editingEntity) {
      onUpdateEntity(editingEntity.id, entityData);
    } else {
      onAddEntity(entityData);
    }

    setIsModalOpen(false);
    resetForm();
  };

  // Filtering, Sorting, and Pagination
  const filteredAndSortedEntities = useMemo(() => {
    // Filter
    const filtered = entities.filter(entity => {
      const matchesType = filterType === 'all' || entity.type === filterType || entity.type === 'Ambos';
      const matchesSearch = searchTerm === '' || 
        entity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entity.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entity.phone?.includes(searchTerm) ||
        entity.document?.includes(searchTerm) ||
        entity.address?.city?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesType && matchesSearch && entity.isActive !== false;
    });

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let valA: any;
      let valB: any;

      switch (sortField) {
        case 'name':
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          break;
        case 'type':
          valA = a.type;
          valB = b.type;
          break;
        case 'email':
          valA = a.email?.toLowerCase() || '';
          valB = b.email?.toLowerCase() || '';
          break;
        case 'city':
          valA = a.address?.city?.toLowerCase() || '';
          valB = b.address?.city?.toLowerCase() || '';
          break;
        case 'createdAt':
          valA = a.createdAt || '';
          valB = b.createdAt || '';
          break;
        default:
          return 0;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [entities, filterType, searchTerm, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedEntities.length / itemsPerPage);
  const paginatedEntities = filteredAndSortedEntities.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1); // Reset to first page on sort
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="opacity-30" />;
    return sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Cliente': return <User size={18} />;
      case 'Fornecedor': return <Building2 size={18} />;
      case 'Ambos': return <Users size={18} />;
      default: return <Building2 size={18} />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Cliente': return darkMode ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case 'Fornecedor': return darkMode ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-blue-50 text-blue-600 border-blue-200';
      case 'Ambos': return darkMode ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : 'bg-yellow-50 text-yellow-600 border-yellow-200';
      default: return darkMode ? 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' : 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className={`text-2xl font-bold ${textColor}`}>Fornecedores & Clientes</h2>
          <p className={subText}>Gerencie seus fornecedores e clientes</p>
        </div>
        <div className="flex gap-2">
          <div className={`flex rounded-lg border overflow-hidden ${darkMode ? 'border-zinc-700' : 'border-slate-300'}`}>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 px-3 ${viewMode === 'grid' 
                ? darkMode ? 'bg-yellow-500 text-zinc-900' : 'bg-blue-600 text-white'
                : darkMode ? 'text-zinc-400 hover:bg-zinc-800' : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="Visualização em cards"
            >
              <Grid size={18} />
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
          <button
            onClick={openAddModal}
            className={`p-2 px-4 rounded-lg flex items-center gap-2 font-medium ${darkMode ? 'bg-yellow-500 text-zinc-900 hover:bg-yellow-400' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
          >
            <Plus size={18} />
            <span>Nova Entidade</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className={`p-4 rounded-xl border ${cardBg}`}>
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Buscar por nome, email, telefone ou documento..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className={`w-full p-2 rounded-lg border ${inputBg}`}
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'Cliente', 'Fornecedor', 'Ambos'] as const).map(type => (
              <button
                key={type}
                onClick={() => { setFilterType(type); setCurrentPage(1); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterType === type
                    ? darkMode ? 'bg-yellow-500 text-zinc-900' : 'bg-blue-600 text-white'
                    : darkMode ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {type === 'all' ? 'Todos' : type}
              </button>
            ))}
          </div>
        </div>
        {viewMode === 'grid' && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`text-sm ${subText}`}>Ordenar por:</span>
              <div className="flex gap-2">
                {(['name', 'type', 'email', 'city'] as SortField[]).map(field => (
                  <button
                    key={field}
                    onClick={() => handleSort(field)}
                    className={`px-3 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
                      sortField === field
                        ? darkMode ? 'bg-zinc-800 text-yellow-400' : 'bg-blue-50 text-blue-600'
                        : darkMode ? 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {field === 'name' ? 'Nome' : field === 'type' ? 'Tipo' : field === 'email' ? 'Email' : 'Cidade'}
                    <SortIcon field={field} />
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-sm ${subText}`}>Itens por página:</span>
              <select 
                value={itemsPerPage} 
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className={`p-2 rounded-lg border outline-none ${inputBg}`}
              >
                <option value={12}>12</option>
                <option value={24}>24</option>
                <option value={48}>48</option>
                <option value={96}>96</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Editable Table View */}
      {viewMode === 'editable' ? (
        <EditableTable
          data={filteredAndSortedEntities}
          columns={[
            { key: 'id', label: 'ID', type: 'text', width: '120px' },
            { key: 'name', label: 'Nome', type: 'text' },
            {
              key: 'type',
              label: 'Tipo',
              type: 'select',
              options: ['Cliente', 'Fornecedor', 'Ambos'],
              width: '120px'
            },
            { key: 'email', label: 'Email', type: 'text', width: '200px' },
            { key: 'phone', label: 'Telefone', type: 'text', width: '150px' },
            { key: 'document', label: 'Documento', type: 'text', width: '150px' },
            { key: 'address' as any, label: 'Cidade', type: 'text', width: '150px' },
          ]}
          onUpdate={(id, field, value) => {
            // Handle nested address field
            if (field === 'address' && typeof value === 'string') {
              const entity = filteredAndSortedEntities.find((e: Entity) => e.id === id);
              onUpdateEntity(id, {
                address: {
                  ...entity?.address,
                  city: value
                }
              } as Partial<Entity>);
            } else {
              onUpdateEntity(id, { [field]: value } as Partial<Entity>);
            }
          }}
          onDelete={onDeleteEntity}
          onAdd={openAddModal}
          getId={(item) => item.id}
          darkMode={darkMode}
        />
      ) : (
        /* Entities Grid */
        <>
          {filteredAndSortedEntities.length === 0 ? (
            <div className={`p-8 text-center rounded-xl border ${cardBg}`}>
              <p className={subText}>Nenhuma entidade encontrada</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedEntities.map(entity => (
                <div key={entity.id} className={`p-5 rounded-xl border relative group ${cardBg}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${darkMode ? 'bg-zinc-800' : 'bg-slate-100'}`}>
                        {getTypeIcon(entity.type)}
                      </div>
                      <div>
                        <h3 className={`font-semibold text-lg ${textColor}`}>{entity.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${getTypeColor(entity.type)}`}>
                          {entity.type}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditModal(entity)}
                        className="p-2 text-blue-500 hover:bg-blue-500/10 rounded"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Tem certeza que deseja excluir ${entity.name}?`)) {
                            onDeleteEntity(entity.id);
                          }
                        }}
                        className="p-2 text-red-500 hover:bg-red-500/10 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    {entity.email && (
                      <div className="flex items-center gap-2 text-xs">
                        <Mail size={14} className={subText} />
                        <span className={subText}>{entity.email}</span>
                      </div>
                    )}
                    {entity.phone && (
                      <div className="flex items-center gap-2 text-xs">
                        <Phone size={14} className={subText} />
                        <span className={subText}>{entity.phone}</span>
                      </div>
                    )}
                    {entity.document && (
                      <div className="flex items-center gap-2 text-xs">
                        <FileText size={14} className={subText} />
                        <span className={subText}>{entity.documentType}: {entity.document}</span>
                      </div>
                    )}
                    {entity.address?.city && (
                      <div className="flex items-center gap-2 text-xs">
                        <MapPin size={14} className={subText} />
                        <span className={subText}>
                          {entity.address.city}{entity.address.state ? `, ${entity.address.state}` : ''}
                        </span>
                      </div>
                    )}
                    {entity.tags && entity.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {entity.tags.map((tag, idx) => (
                          <span key={idx} className={`text-xs px-2 py-0.5 rounded ${darkMode ? 'bg-zinc-800 text-zinc-300' : 'bg-slate-100 text-slate-600'}`}>
                            <Tag size={10} className="inline mr-1" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                ))}
              </div>
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className={`mt-6 p-4 border-t flex items-center justify-between ${darkMode ? 'border-zinc-800' : 'border-slate-200'}`}>
                  <div className={`text-sm ${subText}`}>
                    Mostrando {Math.min(filteredAndSortedEntities.length, (currentPage - 1) * itemsPerPage + 1)} até {Math.min(filteredAndSortedEntities.length, currentPage * itemsPerPage)} de {filteredAndSortedEntities.length} registros
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
              )}
            </>
          )}
        </>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className={`w-full max-w-2xl rounded-xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto ${cardBg}`}>
            <h3 className={`text-xl font-bold mb-4 ${textColor}`}>
              {editingEntity ? 'Editar Entidade' : 'Nova Entidade'}
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium mb-1 ${subText}`}>Nome *</label>
                  <input
                    required
                    className={`w-full p-2 rounded border ${inputBg}`}
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="Nome da entidade"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${subText}`}>Tipo *</label>
                  <select
                    className={`w-full p-2 rounded border ${inputBg}`}
                    value={formType}
                    onChange={e => setFormType(e.target.value as any)}
                  >
                    <option value="Cliente">Cliente</option>
                    <option value="Fornecedor">Fornecedor</option>
                    <option value="Ambos">Ambos</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${subText}`}>Tipo de Documento</label>
                  <select
                    className={`w-full p-2 rounded border ${inputBg}`}
                    value={formDocumentType}
                    onChange={e => setFormDocumentType(e.target.value as any)}
                  >
                    <option value="CNPJ">CNPJ</option>
                    <option value="CPF">CPF</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${subText}`}>Documento</label>
                  <input
                    className={`w-full p-2 rounded border ${inputBg}`}
                    value={formDocument}
                    onChange={e => setFormDocument(e.target.value)}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${subText}`}>Email</label>
                  <input
                    type="email"
                    className={`w-full p-2 rounded border ${inputBg}`}
                    value={formEmail}
                    onChange={e => setFormEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${subText}`}>Telefone</label>
                  <input
                    className={`w-full p-2 rounded border ${inputBg}`}
                    value={formPhone}
                    onChange={e => setFormPhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium mb-1 ${subText}`}>Website</label>
                  <input
                    type="url"
                    className={`w-full p-2 rounded border ${inputBg}`}
                    value={formWebsite}
                    onChange={e => setFormWebsite(e.target.value)}
                    placeholder="https://exemplo.com"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium mb-1 ${subText}`}>Endereço</label>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      className={`col-span-2 p-2 rounded border ${inputBg}`}
                      value={formStreet}
                      onChange={e => setFormStreet(e.target.value)}
                      placeholder="Rua, Avenida..."
                    />
                    <input
                      className={`p-2 rounded border ${inputBg}`}
                      value={formNumber}
                      onChange={e => setFormNumber(e.target.value)}
                      placeholder="Número"
                    />
                  </div>
                  <input
                    className={`mt-2 p-2 rounded border ${inputBg}`}
                    value={formComplement}
                    onChange={e => setFormComplement(e.target.value)}
                    placeholder="Complemento"
                  />
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <input
                      className={`p-2 rounded border ${inputBg}`}
                      value={formNeighborhood}
                      onChange={e => setFormNeighborhood(e.target.value)}
                      placeholder="Bairro"
                    />
                    <input
                      className={`p-2 rounded border ${inputBg}`}
                      value={formCity}
                      onChange={e => setFormCity(e.target.value)}
                      placeholder="Cidade"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <input
                      className={`p-2 rounded border ${inputBg}`}
                      value={formState}
                      onChange={e => setFormState(e.target.value)}
                      placeholder="Estado (UF)"
                      maxLength={2}
                    />
                    <input
                      className={`p-2 rounded border ${inputBg}`}
                      value={formZipCode}
                      onChange={e => setFormZipCode(e.target.value)}
                      placeholder="CEP"
                    />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium mb-1 ${subText}`}>Observações</label>
                  <textarea
                    className={`w-full p-2 rounded border ${inputBg}`}
                    value={formNotes}
                    onChange={e => setFormNotes(e.target.value)}
                    placeholder="Notas adicionais..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className={`px-4 py-2 rounded font-medium ${darkMode ? 'text-zinc-300 hover:bg-zinc-800' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 rounded font-medium ${darkMode ? 'bg-yellow-500 text-zinc-900' : 'bg-blue-600 text-white'}`}
                >
                  {editingEntity ? 'Salvar Alterações' : 'Criar Entidade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Entities;

