import React, { useState, useRef, useEffect } from 'react';
import { Edit2, Check, X, Plus, Trash2 } from 'lucide-react';

interface EditableCellProps {
  value: any;
  type?: 'text' | 'number' | 'date' | 'select' | 'currency';
  options?: string[];
  onSave: (value: any) => void;
  darkMode: boolean;
  className?: string;
}

const EditableCell: React.FC<EditableCellProps> = ({ 
  value, 
  type = 'text', 
  options = [],
  onSave, 
  darkMode,
  className = ''
}) => {
  const [isEditing, setIsEditing] = useState(false);
  // Handle nested objects - extract the value to edit
  const getInitialEditValue = () => {
    if (typeof value === 'object' && value !== null) {
      if ('city' in value) {
        return (value as any).city || '';
      }
      return '';
    }
    return value || '';
  };
  const [editValue, setEditValue] = useState(getInitialEditValue());
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(null);
  
  // Update editValue when value changes (but not when editing)
  useEffect(() => {
    if (!isEditing) {
      setEditValue(getInitialEditValue());
    }
  }, [value, isEditing]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select();
      }
    }
  }, [isEditing]);

  const handleSave = () => {
    let finalValue = editValue;
    
    if (type === 'number' || type === 'currency') {
      finalValue = parseFloat(editValue) || 0;
    }
    
    // Handle nested object updates (like address.city)
    if (typeof value === 'object' && value !== null && typeof editValue === 'string') {
      // If editing a nested field, preserve the object structure
      finalValue = { ...value, city: editValue };
    }
    
    onSave(finalValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(val);
  };

  const formatDate = (val: string) => {
    if (!val) return '';
    try {
      const date = new Date(val);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return val;
    }
  };

  // Handle nested objects (like address)
  const getDisplayValue = () => {
    if (type === 'currency' && typeof value === 'number') {
      return formatCurrency(value);
    }
    if (type === 'date' && value) {
      return formatDate(value);
    }
    if (typeof value === 'object' && value !== null) {
      // For nested objects like address, show a summary
      if ('city' in value) {
        return (value as any).city || '';
      }
      return JSON.stringify(value);
    }
    return value || '';
  };

  const displayValue = getDisplayValue();

  const inputBg = darkMode ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-900';
  const cellBg = darkMode ? 'bg-zinc-900' : 'bg-white';

  if (!isEditing) {
    return (
      <td
        className={`px-4 py-2 border-r cursor-pointer hover:bg-opacity-50 ${cellBg} ${className}`}
        onClick={() => setIsEditing(true)}
        title="Clique para editar"
      >
        <div className="flex items-center gap-2 group">
          <span className="flex-1">{displayValue}</span>
          <Edit2 size={14} className="opacity-0 group-hover:opacity-50 transition-opacity" />
        </div>
      </td>
    );
  }

  return (
    <td className={`px-4 py-2 border-r ${cellBg} ${className}`}>
      <div className="flex items-center gap-1">
        {type === 'select' ? (
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            value={editValue || ''}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className={`flex-1 p-1 rounded border text-sm ${inputBg}`}
          >
            <option value="">Selecione...</option>
            {options.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        ) : type === 'date' ? (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="date"
            value={editValue || ''}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className={`flex-1 p-1 rounded border text-sm ${inputBg}`}
          />
        ) : type === 'number' || type === 'currency' ? (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="number"
            step={type === 'currency' ? '0.01' : '1'}
            value={editValue || 0}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className={`flex-1 p-1 rounded border text-sm ${inputBg}`}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={editValue || ''}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className={`flex-1 p-1 rounded border text-sm ${inputBg}`}
          />
        )}
        <button
          onClick={handleSave}
          className="p-1 text-green-500 hover:bg-green-500/10 rounded"
          title="Salvar (Enter)"
        >
          <Check size={14} />
        </button>
        <button
          onClick={handleCancel}
          className="p-1 text-red-500 hover:bg-red-500/10 rounded"
          title="Cancelar (Esc)"
        >
          <X size={14} />
        </button>
      </div>
    </td>
  );
};

interface EditableTableProps<T> {
  data: T[];
  columns: Array<{
    key: keyof T;
    label: string;
    type?: 'text' | 'number' | 'date' | 'select' | 'currency';
    options?: string[];
    width?: string;
  }>;
  onUpdate: (id: string, field: keyof T, value: any) => void;
  onDelete?: (id: string) => void;
  onAdd?: () => void;
  getId: (item: T) => string;
  darkMode: boolean;
  className?: string;
}

function EditableTable<T extends { id: string }>({
  data,
  columns,
  onUpdate,
  onDelete,
  onAdd,
  getId,
  darkMode,
  className = ''
}: EditableTableProps<T>) {
  const tableHeadBg = darkMode ? 'bg-zinc-800/50' : 'bg-slate-50';
  const textColor = darkMode ? 'text-zinc-100' : 'text-slate-800';
  const borderColor = darkMode ? 'border-zinc-800' : 'border-slate-200';

  return (
    <div className={`rounded-xl border overflow-hidden ${borderColor} ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className={tableHeadBg}>
            <tr>
              {columns.map(col => (
                <th
                  key={String(col.key)}
                  className={`px-4 py-3 text-left font-semibold border-r ${borderColor} ${textColor}`}
                  style={{ width: col.width }}
                >
                  {col.label}
                </th>
              ))}
              {onDelete && (
                <th className={`px-4 py-3 text-left font-semibold ${textColor}`}>
                  Ações
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => (
              <tr
                key={getId(item)}
                className={`border-b ${borderColor} ${darkMode ? 'hover:bg-zinc-800/30' : 'hover:bg-slate-50'}`}
              >
                {columns.map(col => (
                  <EditableCell
                    key={String(col.key)}
                    value={item[col.key]}
                    type={col.type}
                    options={col.options}
                    onSave={(value) => onUpdate(getId(item), col.key, value)}
                    darkMode={darkMode}
                  />
                ))}
                {onDelete && (
                  <td className="px-4 py-2">
                    <button
                      onClick={() => {
                        if (window.confirm('Tem certeza que deseja excluir este item?')) {
                          onDelete(getId(item));
                        }
                      }}
                      className="p-2 text-red-500 hover:bg-red-500/10 rounded"
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + (onDelete ? 1 : 0)}
                  className={`px-4 py-8 text-center ${darkMode ? 'text-zinc-400' : 'text-slate-500'}`}
                >
                  Nenhum item encontrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {onAdd && (
        <div className={`p-4 border-t ${borderColor} ${tableHeadBg}`}>
          <button
            onClick={onAdd}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
              darkMode
                ? 'bg-yellow-500 text-zinc-900 hover:bg-yellow-400'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <Plus size={18} />
            Adicionar Linha
          </button>
        </div>
      )}
    </div>
  );
}

export default EditableTable;

