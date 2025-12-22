import React, { useState } from 'react';
import { AppSettings } from '../types';
import { Plus, Trash2, Edit2, X, Check } from 'lucide-react';

interface SettingsProps {
  settings: AppSettings;
  darkMode: boolean;
  onUpdateSettings: (s: AppSettings) => void;
}

const Settings: React.FC<SettingsProps> = ({ settings, darkMode, onUpdateSettings }) => {
  const [activeTab, setActiveTab] = useState<keyof AppSettings>('categories');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Form State
  const [itemName, setItemName] = useState('');
  const [itemType, setItemType] = useState<string>(''); // For Category (Receita/Despesa) or Entity (Cliente/Fornecedor)

  // Styling
  const cardBg = darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200';
  const textColor = darkMode ? 'text-zinc-100' : 'text-slate-800';
  const subText = darkMode ? 'text-zinc-400' : 'text-slate-500';
  const inputBg = darkMode ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-900';

  const openAddModal = () => {
    setEditingIndex(null);
    setItemName('');
    // Set default types based on tab
    if (activeTab === 'categories') setItemType('Despesa');
    if (activeTab === 'entities') setItemType('Cliente');
    setIsModalOpen(true);
  };

  const openEditModal = (index: number, item: any) => {
    setEditingIndex(index);
    if (typeof item === 'string') {
      setItemName(item);
    } else {
      setItemName(item.name);
      setItemType(item.type);
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!itemName.trim()) return;

    let newItem: any;
    
    // Construct new item based on type
    if (activeTab === 'categories') {
      newItem = { 
        id: Math.random().toString(36).substr(2, 9), 
        name: itemName, 
        type: itemType as 'Receita' | 'Despesa' 
      };
    } else if (activeTab === 'entities') {
      newItem = { 
        id: Math.random().toString(36).substr(2, 9), 
        name: itemName, 
        type: itemType as 'Cliente' | 'Fornecedor' | 'Ambos'
      };
    } else {
      newItem = itemName; // String arrays
    }

    const updatedList = [...settings[activeTab]];
    
    if (editingIndex !== null) {
      // Update existing
      if (typeof updatedList[editingIndex] === 'object') {
         // Keep ID if object
         updatedList[editingIndex] = { ...(updatedList[editingIndex] as any), ...newItem, id: (updatedList[editingIndex] as any).id };
      } else {
         updatedList[editingIndex] = newItem;
      }
    } else {
      // Add new
      updatedList.push(newItem);
    }

    onUpdateSettings({
      ...settings,
      [activeTab]: updatedList
    });
    
    setIsModalOpen(false);
  };

  const handleDelete = (index: number) => {
    if (!window.confirm('Tem certeza que deseja excluir este item?')) return;
    const updated = [...settings[activeTab]];
    updated.splice(index, 1);
    onUpdateSettings({
      ...settings,
      [activeTab]: updated
    });
  };

  const tabs: { key: keyof AppSettings; label: string }[] = [
    { key: 'categories', label: 'Categorias' },
    { key: 'entities', label: 'Entidades' },
    { key: 'paymentMethods', label: 'Formas de Pagamento' },
    { key: 'costCenters', label: 'Centros de Custo' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className={`text-2xl font-bold ${textColor}`}>Configurações</h2>
        <p className={subText}>Gerencie os parâmetros do sistema</p>
      </div>

      <div className={`rounded-xl border flex flex-col md:flex-row overflow-hidden ${cardBg}`}>
        {/* Tabs Sidebar */}
        <div className={`w-full md:w-64 flex flex-col border-b md:border-b-0 md:border-r ${darkMode ? 'border-zinc-800 bg-zinc-950/50' : 'border-slate-200 bg-slate-50'}`}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`p-4 text-left font-medium transition-colors border-l-4 ${
                activeTab === tab.key 
                  ? (darkMode ? 'bg-zinc-800 border-yellow-500 text-yellow-500' : 'bg-white border-blue-600 text-blue-600 shadow-sm')
                  : (darkMode ? 'border-transparent text-zinc-400 hover:bg-zinc-800/50' : 'border-transparent text-slate-500 hover:bg-slate-100')
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className={`text-lg font-bold ${textColor}`}>
              Gerenciar {tabs.find(t => t.key === activeTab)?.label}
            </h3>
            <button 
              onClick={openAddModal}
              className={`p-2 px-4 rounded-lg font-medium flex items-center gap-2 ${darkMode ? 'bg-yellow-500 text-zinc-900 hover:bg-yellow-400' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
            >
              <Plus size={18} /> Novo Item
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3">
             {settings[activeTab].map((item: any, index: number) => {
                const isObject = typeof item === 'object';
                const name = isObject ? item.name : item;
                const type = isObject ? item.type : null;

                return (
                  <div key={index} className={`flex justify-between items-center p-4 rounded-lg border group ${darkMode ? 'bg-zinc-800/30 border-zinc-800 hover:border-zinc-700' : 'bg-slate-50 border-slate-200 hover:border-blue-200'}`}>
                     <div className="flex items-center gap-3">
                        <span className={`font-medium ${textColor}`}>{name}</span>
                        {type && (
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${
                            type === 'Receita' || type === 'Cliente' 
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                              : type === 'Despesa' || type === 'Fornecedor'
                                ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                          }`}>
                            {type}
                          </span>
                        )}
                     </div>
                     <div className="flex items-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                       <button 
                        onClick={() => openEditModal(index, item)}
                        className={`p-2 rounded ${darkMode ? 'hover:bg-zinc-700 text-blue-400' : 'hover:bg-blue-100 text-blue-600'}`}
                       >
                         <Edit2 size={16} />
                       </button>
                       <button 
                        onClick={() => handleDelete(index)}
                        className={`p-2 rounded ${darkMode ? 'hover:bg-zinc-700 text-red-400' : 'hover:bg-red-100 text-red-600'}`}
                       >
                         <Trash2 size={16} />
                       </button>
                     </div>
                  </div>
                );
             })}
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
           <div className={`w-full max-w-md rounded-xl shadow-2xl p-6 ${cardBg}`}>
              <div className="flex justify-between items-center mb-4">
                 <h3 className={`text-xl font-bold ${textColor}`}>
                   {editingIndex !== null ? 'Editar Item' : 'Novo Item'}
                 </h3>
                 <button onClick={() => setIsModalOpen(false)}><X className={subText} /></button>
              </div>

              <div className="space-y-4">
                 <div>
                    <label className={`block text-sm font-medium mb-1 ${subText}`}>Nome</label>
                    <input 
                      autoFocus
                      className={`w-full p-2.5 rounded-lg border ${inputBg}`} 
                      value={itemName}
                      onChange={e => setItemName(e.target.value)}
                    />
                 </div>

                 {activeTab === 'categories' && (
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${subText}`}>Tipo da Categoria</label>
                      <div className="flex gap-2">
                        {['Receita', 'Despesa'].map(t => (
                          <button
                            key={t}
                            onClick={() => setItemType(t)}
                            className={`flex-1 py-2 rounded-lg border flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
                              itemType === t 
                                ? (t === 'Receita' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-red-500 text-white border-red-600')
                                : (darkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-400' : 'bg-slate-50 border-slate-200 text-slate-600')
                            }`}
                          >
                            {itemType === t && <Check size={14} />} {t}
                          </button>
                        ))}
                      </div>
                    </div>
                 )}

                {activeTab === 'entities' && (
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${subText}`}>Tipo da Entidade</label>
                      <div className="flex gap-2">
                        {['Cliente', 'Fornecedor', 'Ambos'].map(t => (
                          <button
                            key={t}
                            onClick={() => setItemType(t)}
                            className={`flex-1 py-2 rounded-lg border flex items-center justify-center gap-2 text-xs font-medium transition-colors ${
                              itemType === t 
                                ? (darkMode ? 'bg-yellow-500 text-zinc-900' : 'bg-blue-600 text-white')
                                : (darkMode ? 'bg-zinc-800 border-zinc-700 text-zinc-400' : 'bg-slate-50 border-slate-200 text-slate-600')
                            }`}
                          >
                            {itemType === t && <Check size={14} />} {t}
                          </button>
                        ))}
                      </div>
                    </div>
                 )}
              </div>

              <div className="flex justify-end gap-3 mt-8">
                 <button onClick={() => setIsModalOpen(false)} className={`px-4 py-2 rounded-lg font-medium ${darkMode ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-slate-100 text-slate-600'}`}>Cancelar</button>
                 <button onClick={handleSave} className={`px-4 py-2 rounded-lg font-medium ${darkMode ? 'bg-yellow-500 text-zinc-900 hover:bg-yellow-400' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>Salvar</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Settings;