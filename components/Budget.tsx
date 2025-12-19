import React, { useState } from 'react';
import { Budget, BudgetItem, CategoryItem, SubcategoryItem } from '../types';
import { Plus, Trash2, Edit2, X, Calendar, Save, Copy } from 'lucide-react';

interface BudgetProps {
  budgets: Budget[];
  categories: CategoryItem[];
  subcategories: SubcategoryItem[];
  darkMode: boolean;
  currentUserId: string;
  onAddBudget: (budget: Omit<Budget, 'id'>) => Promise<void>;
  onUpdateBudget: (id: string, budget: Partial<Budget>) => Promise<void>;
  onDeleteBudget: (id: string) => Promise<void>;
}

const BudgetComponent: React.FC<BudgetProps> = ({
  budgets,
  categories,
  subcategories,
  darkMode,
  currentUserId,
  onAddBudget,
  onUpdateBudget,
  onDeleteBudget,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);

  // Form state for budget
  const [budgetName, setBudgetName] = useState('');
  const [budgetYear, setBudgetYear] = useState(new Date().getFullYear());
  const [budgetDescription, setBudgetDescription] = useState('');

  // Form state for budget item
  const [itemCategoryId, setItemCategoryId] = useState('');
  const [itemSubcategoryId, setItemSubcategoryId] = useState('');
  const [itemMonthlyAmounts, setItemMonthlyAmounts] = useState<{ [month: number]: number }>({});
  const [itemNotes, setItemNotes] = useState('');

  const cardBg = darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200';
  const textColor = darkMode ? 'text-zinc-100' : 'text-slate-800';
  const subText = darkMode ? 'text-zinc-400' : 'text-slate-500';
  const inputBg = darkMode ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-900';
  const buttonPrimary = darkMode ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white';
  const buttonSecondary = darkMode ? 'bg-zinc-700 hover:bg-zinc-600 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-800';

  const monthNames = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
  ];

  const openAddBudgetModal = () => {
    setEditingBudget(null);
    setBudgetName('');
    setBudgetYear(new Date().getFullYear());
    setBudgetDescription('');
    setIsModalOpen(true);
  };

  const openEditBudgetModal = (budget: Budget) => {
    setEditingBudget(budget);
    setBudgetName(budget.name);
    setBudgetYear(budget.year);
    setBudgetDescription(budget.description || '');
    setIsModalOpen(true);
  };

  const openAddItemModal = (budgetId: string) => {
    setSelectedBudgetId(budgetId);
    setEditingItem(null);
    setItemCategoryId('');
    setItemSubcategoryId('');
    setItemMonthlyAmounts({});
    setItemNotes('');
    setIsItemModalOpen(true);
  };

  const openEditItemModal = (budget: Budget, item: BudgetItem) => {
    setSelectedBudgetId(budget.id);
    setEditingItem(item);
    setItemCategoryId(item.categoryId);
    setItemSubcategoryId(item.subcategoryId || '');
    setItemMonthlyAmounts(item.monthlyAmounts);
    setItemNotes(item.notes || '');
    setIsItemModalOpen(true);
  };

  const handleSaveBudget = async () => {
    if (!budgetName.trim()) return;

    const now = new Date().toISOString();
    const budgetData: Omit<Budget, 'id'> = {
      name: budgetName.trim(),
      year: budgetYear,
      description: budgetDescription.trim() || undefined,
      items: editingBudget?.items || [],
      createdAt: editingBudget?.createdAt || now,
      updatedAt: now,
      createdBy: editingBudget?.createdBy || currentUserId,
      isActive: editingBudget?.isActive ?? true,
    };

    try {
      if (editingBudget) {
        await onUpdateBudget(editingBudget.id, budgetData);
      } else {
        await onAddBudget(budgetData);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving budget:', error);
      alert('Erro ao salvar orçamento. Tente novamente.');
    }
  };

  const handleSaveItem = async () => {
    if (!itemCategoryId || !selectedBudgetId) return;

    const budget = budgets.find(b => b.id === selectedBudgetId);
    if (!budget) return;

    // Calculate total
    const totalAmount = Object.values(itemMonthlyAmounts).reduce((sum, val) => sum + (val || 0), 0);

    const itemData: BudgetItem = {
      id: editingItem?.id || Math.random().toString(36).substr(2, 9),
      budgetId: selectedBudgetId,
      categoryId: itemCategoryId,
      subcategoryId: itemSubcategoryId || undefined,
      monthlyAmounts: itemMonthlyAmounts,
      totalAmount: totalAmount,
      notes: itemNotes.trim() || undefined,
    };

    const updatedItems = editingItem
      ? budget.items.map(item => item.id === editingItem.id ? itemData : item)
      : [...budget.items, itemData];

    try {
      await onUpdateBudget(selectedBudgetId, {
        items: updatedItems,
        updatedAt: new Date().toISOString(),
      });
      setIsItemModalOpen(false);
    } catch (error) {
      console.error('Error saving budget item:', error);
      alert('Erro ao salvar item do orçamento. Tente novamente.');
    }
  };

  const handleDeleteItem = async (budgetId: string, itemId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este item do orçamento?')) return;

    const budget = budgets.find(b => b.id === budgetId);
    if (!budget) return;

    const updatedItems = budget.items.filter(item => item.id !== itemId);
    try {
      await onUpdateBudget(budgetId, {
        items: updatedItems,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error deleting budget item:', error);
      alert('Erro ao excluir item do orçamento. Tente novamente.');
    }
  };

  const handleToggleActive = async (budget: Budget) => {
    // If activating this budget, deactivate others
    if (!budget.isActive) {
      const updates = budgets.map(b => {
        if (b.id === budget.id) {
          return onUpdateBudget(b.id, { isActive: true, updatedAt: new Date().toISOString() });
        } else if (b.isActive) {
          return onUpdateBudget(b.id, { isActive: false, updatedAt: new Date().toISOString() });
        }
        return Promise.resolve();
      });
      await Promise.all(updates);
    } else {
      await onUpdateBudget(budget.id, { isActive: false, updatedAt: new Date().toISOString() });
    }
  };

  const handleDuplicateBudget = async (budget: Budget) => {
    const newYear = budget.year + 1;
    const newName = `${budget.name.replace(/\d{4}/, String(newYear))}`;
    
    const duplicateData: Omit<Budget, 'id'> = {
      name: newName,
      year: newYear,
      description: budget.description,
      items: budget.items.map(item => ({
        ...item,
        id: Math.random().toString(36).substr(2, 9),
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: currentUserId,
      isActive: false,
    };

    try {
      await onAddBudget(duplicateData);
    } catch (error) {
      console.error('Error duplicating budget:', error);
      alert('Erro ao duplicar orçamento. Tente novamente.');
    }
  };

  const handleUpdateMonthlyAmount = (month: number, value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value) || 0;
    setItemMonthlyAmounts(prev => ({
      ...prev,
      [month]: numValue,
    }));
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find(c => c.id === categoryId)?.name || categoryId;
  };

  const getSubcategoryName = (subcategoryId: string) => {
    return subcategories.find(s => s.id === subcategoryId)?.name || subcategoryId;
  };

  const getAvailableSubcategories = () => {
    if (!itemCategoryId) return [];
    return subcategories.filter(s => s.categoryId === itemCategoryId);
  };

  const filteredCategories = categories.filter(cat => cat.type === 'Despesa'); // Budgets are typically for expenses

  return (
    <div className={`min-h-screen p-6 ${darkMode ? 'bg-zinc-950' : 'bg-slate-50'}`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className={`text-3xl font-bold ${textColor} mb-2`}>Orçamentos</h1>
            <p className={subText}>Configure e gerencie seus orçamentos anuais</p>
          </div>
          <button
            onClick={openAddBudgetModal}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${buttonPrimary} transition-colors`}
          >
            <Plus size={20} />
            Novo Orçamento
          </button>
        </div>

        {/* Budgets List */}
        <div className="space-y-4">
          {budgets.length === 0 ? (
            <div className={`${cardBg} border rounded-lg p-12 text-center`}>
              <Calendar size={48} className={`mx-auto mb-4 ${subText}`} />
              <h3 className={`text-xl font-semibold ${textColor} mb-2`}>Nenhum orçamento encontrado</h3>
              <p className={subText}>Crie seu primeiro orçamento para começar a planejar</p>
            </div>
          ) : (
            budgets.map(budget => (
              <div key={budget.id} className={`${cardBg} border rounded-lg p-6`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className={`text-xl font-semibold ${textColor}`}>{budget.name}</h2>
                      {budget.isActive && (
                        <span className={`px-2 py-1 rounded text-xs font-medium ${darkMode ? 'bg-yellow-900 text-yellow-300' : 'bg-green-100 text-green-800'}`}>
                          Ativo
                        </span>
                      )}
                    </div>
                    <p className={subText}>Ano: {budget.year}</p>
                    {budget.description && (
                      <p className={`${textColor} mt-2`}>{budget.description}</p>
                    )}
                    <p className={`${subText} text-sm mt-2`}>
                      {budget.items.length} {budget.items.length === 1 ? 'item' : 'itens'} • 
                      Total: R$ {budget.items.reduce((sum, item) => sum + item.totalAmount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleActive(budget)}
                      className={`px-3 py-1.5 rounded text-sm ${budget.isActive ? buttonSecondary : buttonPrimary}`}
                    >
                      {budget.isActive ? 'Desativar' : 'Ativar'}
                    </button>
                    <button
                      onClick={() => handleDuplicateBudget(budget)}
                      className={`px-3 py-1.5 rounded text-sm ${buttonSecondary}`}
                      title="Duplicar para próximo ano"
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      onClick={() => openEditBudgetModal(budget)}
                      className={`p-1.5 rounded ${darkMode ? 'hover:bg-zinc-800' : 'hover:bg-slate-100'}`}
                    >
                      <Edit2 size={18} className={subText} />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Tem certeza que deseja excluir este orçamento?')) {
                          onDeleteBudget(budget.id);
                        }
                      }}
                      className={`p-1.5 rounded ${darkMode ? 'hover:bg-zinc-800' : 'hover:bg-slate-100'}`}
                    >
                      <Trash2 size={18} className="text-red-500" />
                    </button>
                  </div>
                </div>

                {/* Budget Items */}
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className={`font-semibold ${textColor}`}>Itens do Orçamento</h3>
                    <button
                      onClick={() => openAddItemModal(budget.id)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm ${buttonPrimary}`}
                    >
                      <Plus size={16} />
                      Adicionar Item
                    </button>
                  </div>

                  {budget.items.length === 0 ? (
                    <p className={subText}>Nenhum item configurado</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className={`border-b ${darkMode ? 'border-zinc-700' : 'border-slate-200'}`}>
                            <th className={`text-left py-2 px-3 ${subText} text-sm font-medium`}>Categoria</th>
                            <th className={`text-left py-2 px-3 ${subText} text-sm font-medium`}>Subcategoria</th>
                            <th className={`text-right py-2 px-3 ${subText} text-sm font-medium`}>Total Anual</th>
                            <th className={`text-center py-2 px-3 ${subText} text-sm font-medium`}>Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {budget.items.map(item => (
                            <tr key={item.id} className={`border-b ${darkMode ? 'border-zinc-800' : 'border-slate-100'}`}>
                              <td className={`py-2 px-3 ${textColor}`}>{getCategoryName(item.categoryId)}</td>
                              <td className={`py-2 px-3 ${subText}`}>
                                {item.subcategoryId ? getSubcategoryName(item.subcategoryId) : '-'}
                              </td>
                              <td className={`py-2 px-3 text-right ${textColor} font-medium`}>
                                R$ {item.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="py-2 px-3">
                                <div className="flex justify-center gap-2">
                                  <button
                                    onClick={() => openEditItemModal(budget, item)}
                                    className={`p-1 rounded ${darkMode ? 'hover:bg-zinc-800' : 'hover:bg-slate-100'}`}
                                  >
                                    <Edit2 size={16} className={subText} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteItem(budget.id, item.id)}
                                    className={`p-1 rounded ${darkMode ? 'hover:bg-zinc-800' : 'hover:bg-slate-100'}`}
                                  >
                                    <Trash2 size={16} className="text-red-500" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Budget Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${cardBg} rounded-lg p-6 w-full max-w-md border ${darkMode ? 'border-zinc-700' : 'border-slate-300'}`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-xl font-semibold ${textColor}`}>
                {editingBudget ? 'Editar Orçamento' : 'Novo Orçamento'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className={`p-1 rounded ${darkMode ? 'hover:bg-zinc-800' : 'hover:bg-slate-100'}`}
              >
                <X size={20} className={subText} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium ${textColor} mb-1`}>Nome</label>
                <input
                  type="text"
                  value={budgetName}
                  onChange={(e) => setBudgetName(e.target.value)}
                  className={`w-full px-3 py-2 rounded border ${inputBg} focus:outline-none focus:ring-2 ${darkMode ? 'focus:ring-yellow-500' : 'focus:ring-blue-500'}`}
                  placeholder="Ex: Orçamento 2025"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${textColor} mb-1`}>Ano</label>
                <input
                  type="number"
                  value={budgetYear}
                  onChange={(e) => setBudgetYear(parseInt(e.target.value) || new Date().getFullYear())}
                  className={`w-full px-3 py-2 rounded border ${inputBg} focus:outline-none focus:ring-2 ${darkMode ? 'focus:ring-yellow-500' : 'focus:ring-blue-500'}`}
                  min="2000"
                  max="2100"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${textColor} mb-1`}>Descrição (opcional)</label>
                <textarea
                  value={budgetDescription}
                  onChange={(e) => setBudgetDescription(e.target.value)}
                  rows={3}
                  className={`w-full px-3 py-2 rounded border ${inputBg} focus:outline-none focus:ring-2 ${darkMode ? 'focus:ring-yellow-500' : 'focus:ring-blue-500'}`}
                  placeholder="Descreva o orçamento..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className={`flex-1 px-4 py-2 rounded ${buttonSecondary}`}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveBudget}
                  className={`flex-1 px-4 py-2 rounded ${buttonPrimary} flex items-center justify-center gap-2`}
                >
                  <Save size={18} />
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Budget Item Modal */}
      {isItemModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className={`${cardBg} rounded-lg p-6 w-full max-w-4xl border ${darkMode ? 'border-zinc-700' : 'border-slate-300'} my-8`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-xl font-semibold ${textColor}`}>
                {editingItem ? 'Editar Item' : 'Novo Item'}
              </h2>
              <button
                onClick={() => setIsItemModalOpen(false)}
                className={`p-1 rounded ${darkMode ? 'hover:bg-zinc-800' : 'hover:bg-slate-100'}`}
              >
                <X size={20} className={subText} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${textColor} mb-1`}>Categoria *</label>
                  <select
                    value={itemCategoryId}
                    onChange={(e) => {
                      setItemCategoryId(e.target.value);
                      setItemSubcategoryId(''); // Reset subcategory when category changes
                    }}
                    className={`w-full px-3 py-2 rounded border ${inputBg} focus:outline-none focus:ring-2 ${darkMode ? 'focus:ring-yellow-500' : 'focus:ring-blue-500'}`}
                  >
                    <option value="">Selecione uma categoria</option>
                    {filteredCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-medium ${textColor} mb-1`}>Subcategoria (opcional)</label>
                  <select
                    value={itemSubcategoryId}
                    onChange={(e) => setItemSubcategoryId(e.target.value)}
                    disabled={!itemCategoryId}
                    className={`w-full px-3 py-2 rounded border ${inputBg} focus:outline-none focus:ring-2 ${darkMode ? 'focus:ring-yellow-500' : 'focus:ring-blue-500'} disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <option value="">Nenhuma</option>
                    {getAvailableSubcategories().map(sub => (
                      <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium ${textColor} mb-3`}>Valores Mensais</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {monthNames.map((month, index) => {
                    const monthNum = index + 1;
                    return (
                      <div key={monthNum}>
                        <label className={`block text-xs ${subText} mb-1`}>{month}</label>
                        <input
                          type="number"
                          value={itemMonthlyAmounts[monthNum] || ''}
                          onChange={(e) => handleUpdateMonthlyAmount(monthNum, e.target.value)}
                          step="0.01"
                          min="0"
                          className={`w-full px-2 py-1.5 text-sm rounded border ${inputBg} focus:outline-none focus:ring-1 ${darkMode ? 'focus:ring-yellow-500' : 'focus:ring-blue-500'}`}
                          placeholder="0,00"
                        />
                      </div>
                    );
                  })}
                </div>
                <div className={`mt-3 p-3 rounded ${darkMode ? 'bg-zinc-800' : 'bg-slate-100'}`}>
                  <div className="flex justify-between items-center">
                    <span className={`font-medium ${textColor}`}>Total Anual:</span>
                    <span className={`text-lg font-bold ${textColor}`}>
                      R$ {Object.values(itemMonthlyAmounts).reduce((sum, val) => sum + (val || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium ${textColor} mb-1`}>Observações (opcional)</label>
                <textarea
                  value={itemNotes}
                  onChange={(e) => setItemNotes(e.target.value)}
                  rows={2}
                  className={`w-full px-3 py-2 rounded border ${inputBg} focus:outline-none focus:ring-2 ${darkMode ? 'focus:ring-yellow-500' : 'focus:ring-blue-500'}`}
                  placeholder="Adicione observações sobre este item..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setIsItemModalOpen(false)}
                  className={`flex-1 px-4 py-2 rounded ${buttonSecondary}`}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveItem}
                  disabled={!itemCategoryId}
                  className={`flex-1 px-4 py-2 rounded ${buttonPrimary} flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <Save size={18} />
                  Salvar Item
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetComponent;

