import React, { useState } from 'react';
import { Upload, X, Download, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';
import { Transaction, TransactionType, TransactionStatus } from '../types';

interface CsvImporterProps {
  onImport: (transactions: Omit<Transaction, 'id'>[]) => void;
  existingTransactions: Transaction[];
  accounts: Array<{ id: string; name: string }>;
  darkMode: boolean;
}

// Field mapping configuration (using standardized field names)
const SYSTEM_FIELDS = [
  { key: 'issueDate', label: 'Data de Lançamento', required: false, example: '02/10/2025' },
  { key: 'dueDate', label: 'Data de Vencimento', required: true, example: '02/10/2025' },
  { key: 'type', label: 'Tipo (Entrada/Saída)', required: true, example: 'Entrada' },
  { key: 'category', label: 'Categoria', required: true, example: 'Receita de serviços' },
  { key: 'entity', label: 'Entidade (Cliente/Fornecedor)', required: true, example: 'Cia da Fruta' },
  { key: 'productService', label: 'Produto ou Serviço', required: false, example: 'Consultoria' },
  { key: 'costCenter', label: 'Centro de Custo', required: false, example: 'Consultoria' },
  { key: 'paymentMethod', label: 'Forma de Pagamento', required: false, example: 'Pix' },
  { key: 'description', label: 'Descrição', required: true, example: 'Consultoria Mensal' },
  { key: 'expectedAmount', label: 'Valor Previsto', required: true, example: '1100,00' },
  { key: 'actualAmount', label: 'Valor Realizado', required: false, example: '1100,00' },
  { key: 'paymentDate', label: 'Data de Pagamento/Recebimento', required: false, example: '05/10/2025' },
  { key: 'accrualDate', label: 'Data de Competência', required: false, example: '05/10/2025' },
  { key: 'status', label: 'Status', required: false, example: 'Recebido' },
] as const;

const CsvImporter: React.FC<CsvImporterProps> = ({ 
  onImport, 
  existingTransactions, 
  accounts,
  darkMode 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvPreviewData, setCsvPreviewData] = useState<string[][]>([]);
  const [allCsvRows, setAllCsvRows] = useState<string[][]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [duplicateStrategy, setDuplicateStrategy] = useState<'import_all' | 'skip_exact'>('skip_exact');
  const [importErrors, setImportErrors] = useState<string[]>([]);

  // Styles
  const cardBg = darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200';
  const textColor = darkMode ? 'text-zinc-100' : 'text-slate-800';
  const subText = darkMode ? 'text-zinc-400' : 'text-slate-500';
  const inputBg = darkMode ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-white border-slate-300 text-slate-900';
  const tableHeadBg = darkMode ? 'bg-zinc-800/50' : 'bg-slate-50';

  // Parse CSV with proper handling of quoted fields
  const parseCSV = (csvText: string): string[][] => {
    const lines: string[][] = [];
    let currentLine: string[] = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < csvText.length; i++) {
      const char = csvText[i];
      const nextChar = csvText[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentField += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        currentLine.push(currentField.trim());
        currentField = '';
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (currentField || currentLine.length > 0) {
          currentLine.push(currentField.trim());
          currentField = '';
          if (currentLine.some(f => f.length > 0)) {
            lines.push(currentLine);
          }
          currentLine = [];
        }
        if (char === '\r' && nextChar === '\n') {
          i++; // Skip \n after \r
        }
      } else {
        currentField += char;
      }
    }

    // Add last field and line
    if (currentField || currentLine.length > 0) {
      currentLine.push(currentField.trim());
      if (currentLine.some(f => f.length > 0)) {
        lines.push(currentLine);
      }
    }

    return lines;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const csvData = event.target?.result as string;
      const parsed = parseCSV(csvData);
      
      if (parsed.length < 1) {
        alert('Arquivo CSV vazio ou inválido');
        return;
      }

      setCsvHeaders(parsed[0]);
      setCsvPreviewData(parsed.slice(1, 6)); // Preview 5 rows
      setAllCsvRows(parsed.slice(1));
      
      // Auto-guess mapping (supports both old and new field names for compatibility)
      const initialMap: Record<string, string> = {};
      parsed[0].forEach((header, idx) => {
        const lower = header.toLowerCase().trim();
        
        // Smart matching - supports both Portuguese CSV headers and English field names
        if (lower.includes('data lanç') || lower.includes('data lanc') || lower.includes('issue date')) initialMap['issueDate'] = idx.toString();
        else if (lower.includes('data venc') || lower.includes('vencimento') || lower.includes('due date')) initialMap['dueDate'] = idx.toString();
        else if (lower.includes('tipo') || lower.includes('type')) initialMap['type'] = idx.toString();
        else if (lower.includes('categoria') && !lower.includes('centro') || lower.includes('category')) initialMap['category'] = idx.toString();
        else if (lower.includes('entidade') || lower.includes('cliente') || lower.includes('fornecedor') || lower.includes('entity')) initialMap['entity'] = idx.toString();
        else if (lower.includes('produto') || lower.includes('serviço') || lower.includes('servico') || lower.includes('product') || lower.includes('service')) initialMap['productService'] = idx.toString();
        else if (lower.includes('centro') && lower.includes('custo') || lower.includes('cost center')) initialMap['costCenter'] = idx.toString();
        else if (lower.includes('forma') && lower.includes('pagamento') || lower.includes('payment method')) initialMap['paymentMethod'] = idx.toString();
        else if (lower.includes('descrição') || lower.includes('descricao') || lower.includes('desc') || lower.includes('description')) initialMap['description'] = idx.toString();
        else if (lower.includes('valor previsto') || (lower.includes('valor') && lower.includes('prev')) || lower.includes('expected amount')) initialMap['expectedAmount'] = idx.toString();
        else if (lower.includes('valor realizado') || (lower.includes('valor') && lower.includes('real')) || lower.includes('actual amount')) initialMap['actualAmount'] = idx.toString();
        else if (lower.includes('data pag') || lower.includes('data rec') || lower.includes('data pgto') || lower.includes('payment date')) initialMap['paymentDate'] = idx.toString();
        else if (lower.includes('data competência') || lower.includes('data competencia') || lower.includes('accrual date')) initialMap['accrualDate'] = idx.toString();
        else if (lower.includes('status')) initialMap['status'] = idx.toString();
      });
      
      setFieldMapping(initialMap);
      setImportErrors([]);
      setIsModalOpen(true);
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  const parseDate = (val?: string): string => {
    if (!val || val.trim() === '') return new Date().toISOString().split('T')[0];
    
    // Try DD/MM/YYYY
    if (val.includes('/')) {
      const parts = val.split('/').map(p => p.trim());
      if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        return `${year}-${month}-${day}`;
      }
    }
    
    // Try YYYY-MM-DD
    if (val.includes('-') && val.match(/^\d{4}-\d{2}-\d{2}/)) {
      return val.split(' ')[0]; // Take only date part if time included
    }
    
    return new Date().toISOString().split('T')[0];
  };

  const parseMoney = (val?: string): number => {
    if (!val || val.trim() === '') return 0;
    
    // Remove currency symbols and spaces
    let clean = val.replace(/[R$\s]/g, '').trim();
    
    // Handle Brazilian format: 1.000,00 or 1000,00
    if (clean.includes(',') && clean.includes('.')) {
      // Format: 1.000,00
      clean = clean.replace(/\./g, '').replace(',', '.');
    } else if (clean.includes(',')) {
      // Format: 1000,00
      clean = clean.replace(',', '.');
    }
    
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  };

  const processCsvImport = () => {
    const newTransactions: Omit<Transaction, 'id'>[] = [];
    const errors: string[] = [];
    let skippedCount = 0;

    // Validate required fields
    const requiredFields = SYSTEM_FIELDS.filter(f => f.required);
    const missingFields = requiredFields.filter(f => !fieldMapping[f.key]);
    
    if (missingFields.length > 0) {
      setImportErrors([`Campos obrigatórios não mapeados: ${missingFields.map(f => f.label).join(', ')}`]);
      return;
    }

    allCsvRows.forEach((row, rowIndex) => {
      if (row.length < 2) return;

      const getCol = (field: string): string | undefined => {
        const idx = fieldMapping[field];
        if (!idx) return undefined;
        const colIndex = parseInt(idx);
        return row[colIndex]?.trim();
      };

      // Parse type
      const typeRaw = getCol('type') || '';
      const type: TransactionType = typeRaw.toLowerCase().startsWith('e') || 
                                     typeRaw.toLowerCase().includes('entrada') ? 'Entrada' : 'Saída';

      // Parse status
      const statusRaw = getCol('status') || '';
      let status: TransactionStatus = 'Pago';
      if (statusRaw) {
        const statusLower = statusRaw.toLowerCase();
        if (statusLower.includes('recebido')) status = 'Recebido';
        else if (statusLower.includes('a receber')) status = 'A receber';
        else if (statusLower.includes('a pagar')) status = 'A pagar';
        else if (statusLower.includes('atrasado')) status = 'Atrasado';
        else if (statusLower.includes('cancelado')) status = 'Cancelado';
        else if (statusLower.includes('pago')) status = 'Pago';
      } else {
        // Auto-detect status based on type
        status = type === 'Entrada' ? 'A receber' : 'A pagar';
      }

      const description = getCol('description') || 'Importado via CSV';
      const expectedAmount = parseMoney(getCol('expectedAmount'));
      const actualAmount = parseMoney(getCol('actualAmount')) || expectedAmount;

      if (!description || expectedAmount === 0) {
        errors.push(`Linha ${rowIndex + 2}: Descrição ou valor inválido`);
        return;
      }

      const transaction: Omit<Transaction, 'id'> = {
        issueDate: parseDate(getCol('issueDate')) || new Date().toISOString().split('T')[0],
        dueDate: parseDate(getCol('dueDate')) || new Date().toISOString().split('T')[0],
        accrualDate: parseDate(getCol('accrualDate')) || parseDate(getCol('dueDate')) || new Date().toISOString().split('T')[0],
        paymentDate: getCol('paymentDate') ? parseDate(getCol('paymentDate')) : undefined,
        type,
        category: getCol('category') || 'Geral',
        entity: getCol('entity') || 'Não informado',
        productService: getCol('productService') || '',
        costCenter: getCol('costCenter') || '',
        paymentMethod: getCol('paymentMethod') || '',
        description,
        expectedAmount,
        actualAmount,
        accountId: accounts[0]?.id || '',
        status
      };

      // Duplicate check
      if (duplicateStrategy === 'skip_exact') {
        const exists = existingTransactions.some(exist => 
          exist.description === transaction.description && 
          Math.abs(exist.expectedAmount - transaction.expectedAmount) < 0.01 &&
          exist.dueDate === transaction.dueDate
        );
        if (exists) {
          skippedCount++;
          return;
        }
      }

      newTransactions.push(transaction);
    });

    setImportErrors(errors);

    if (errors.length === 0 && newTransactions.length > 0) {
      onImport(newTransactions);
      setIsModalOpen(false);
      alert(`✅ Importação concluída!\n\n${newTransactions.length} registros importados.\n${skippedCount} duplicatas ignoradas.${errors.length > 0 ? `\n${errors.length} erros encontrados.` : ''}`);
    } else if (errors.length > 0) {
      setImportErrors(errors);
    } else {
      alert('Nenhuma transação válida encontrada para importar.');
    }
  };

  const downloadTemplate = () => {
    // Create CSV template with examples (using Portuguese headers for user-friendly export)
    // Helper to escape CSV values (add quotes if contains comma, quote, or newline)
    // Also quote numeric values with comma (Brazilian format) to ensure proper parsing
    const escapeCsvValue = (value: string): string => {
      if (value === '') return '';
      // Always quote values with commas (like "1100,00" for Brazilian currency)
      // or if contains quote, newline, or special characters
      if (value.includes(',') || value.includes('"') || value.includes('\n') || 
          value.includes('[') || value.includes(']') || value.includes('|')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const headers = SYSTEM_FIELDS.map(f => escapeCsvValue(f.label)).join(',');
    
    // Ensure examples match SYSTEM_FIELDS order exactly (14 fields)
    const examples = [
      [
        '02/10/2025',                    // issueDate - Data de Lançamento
        '02/10/2025',                    // dueDate - Data de Vencimento
        'Entrada',                       // type - Tipo
        'Receita de serviços',           // category - Categoria
        'Cia da Fruta',                  // entity - Entidade
        'Consultoria',                   // productService - Produto ou Serviço
        'Consultoria',                   // costCenter - Centro de Custo
        'Pix',                           // paymentMethod - Forma de Pagamento
        'Consultoria Mensal',            // description - Descrição
        '1100,00',                       // expectedAmount - Valor Previsto
        '1100,00',                       // actualAmount - Valor Realizado
        '05/10/2025',                    // paymentDate - Data de Pagamento/Recebimento
        '05/10/2025',                    // accrualDate - Data de Competência
        'Recebido'                       // status - Status
      ],
      [
        '22/09/2025',                    // issueDate
        '10/10/2025',                    // dueDate
        'Saída',                         // type
        'Despesas operacionais',         // category
        'Google Workspace',              // entity
        '',                              // productService
        'Ferramentas operacionais',      // costCenter
        'Cartão de Crédito [Lidera]',    // paymentMethod
        'Google Workspace [2 usuários]', // description
        '100,88',                        // expectedAmount
        '100,88',                        // actualAmount
        '10/10/2025',                    // paymentDate
        '10/10/2025',                    // accrualDate
        'Pago'                           // status
      ],
      [
        '28/09/2025',                    // issueDate
        '20/10/2025',                    // dueDate
        'Entrada',                       // type
        'Receita de mentoria',           // category
        'Savana Imóveis',                // entity
        'Mentoria',                      // productService
        '',                              // costCenter
        'Pix',                           // paymentMethod
        'Mentoria | A Jornada do Líder 1/9', // description
        '200,00',                        // expectedAmount
        '0,00',                          // actualAmount
        '',                              // paymentDate
        '20/10/2025',                    // accrualDate
        'A receber'                      // status
      ]
    ];

    const csvContent = [
      headers,
      ...examples.map(row => row.map(escapeCsvValue).join(','))
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'modelo-importacao-lancamentos.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={downloadTemplate}
          className={`h-full p-2 px-4 rounded-lg border flex items-center gap-2 ${darkMode ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}
          title="Baixar modelo CSV"
        >
          <Download size={18} />
          <span className="hidden md:inline">Baixar Modelo</span>
        </button>
        <div className="relative">
          <input 
            type="file" 
            accept=".csv,.xls,.xlsx" 
            onChange={handleFileUpload} 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
          />
          <button className={`h-full p-2 px-4 rounded-lg border flex items-center gap-2 ${darkMode ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
            <Upload size={18} />
            <span className="hidden md:inline">Importar CSV</span>
          </button>
        </div>
      </div>

      {/* Import Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className={`w-full max-w-6xl rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto ${cardBg}`}>
            <div className={`p-6 border-b flex justify-between items-center ${darkMode ? 'border-zinc-800' : 'border-slate-200'}`}>
              <h3 className={`text-xl font-bold flex items-center gap-2 ${textColor}`}>
                <FileSpreadsheet /> Configuração de Importação CSV
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className={subText}>
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Errors */}
              {importErrors.length > 0 && (
                <div className={`p-4 rounded-lg border ${darkMode ? 'bg-red-950/20 border-red-800 text-red-300' : 'bg-red-50 border-red-200 text-red-700'}`}>
                  <div className="flex items-center gap-2 font-semibold mb-2">
                    <AlertCircle size={18} />
                    Erros encontrados:
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {importErrors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Duplicate Strategy */}
              <div className={`p-4 rounded-lg border ${darkMode ? 'bg-zinc-950/50 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
                <h4 className={`font-semibold mb-3 ${textColor}`}>
                  Em caso de duplicidade (mesma descrição, valor e data):
                </h4>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="strategy"
                      checked={duplicateStrategy === 'skip_exact'}
                      onChange={() => setDuplicateStrategy('skip_exact')}
                      className="w-4 h-4"
                    />
                    <span className={textColor}>Pular (Não importar)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="strategy"
                      checked={duplicateStrategy === 'import_all'}
                      onChange={() => setDuplicateStrategy('import_all')}
                      className="w-4 h-4"
                    />
                    <span className={textColor}>Importar Tudo (Pode duplicar)</span>
                  </label>
                </div>
              </div>

              {/* Column Mapping */}
              <div>
                <h4 className={`font-semibold mb-3 ${textColor}`}>
                  Mapeie as colunas do seu arquivo:
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {SYSTEM_FIELDS.map(field => {
                    const isMapped = !!fieldMapping[field.key];
                    const isRequired = field.required;
                    return (
                      <div key={field.key} className="space-y-1">
                        <label className={`block text-xs font-medium ${isRequired ? 'text-red-500' : subText}`}>
                          {field.label} {isRequired && '*'}
                        </label>
                        <select
                          value={fieldMapping[field.key] || ''}
                          onChange={(e) => setFieldMapping({ ...fieldMapping, [field.key]: e.target.value })}
                          className={`w-full p-2 rounded border text-sm ${inputBg} ${isRequired && !isMapped ? 'border-red-500' : ''}`}
                        >
                          <option value="">Não mapear</option>
                          {csvHeaders.map((h, i) => (
                            <option key={i} value={i}>
                              {h} {fieldMapping[field.key] === i.toString() && '✓'}
                            </option>
                          ))}
                        </select>
                        {field.example && (
                          <p className={`text-[10px] ${subText}`}>Ex: {field.example}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Preview */}
              <div>
                <h4 className={`font-semibold mb-3 ${textColor}`}>
                  Pré-visualização (Primeiras 5 linhas):
                </h4>
                <div className="overflow-x-auto rounded border border-gray-200 dark:border-zinc-800">
                  <table className="w-full text-xs">
                    <thead className={tableHeadBg}>
                      <tr>
                        {csvHeaders.map((h, i) => (
                          <th key={i} className={`p-2 border-r ${darkMode ? 'border-zinc-700 text-zinc-400' : 'border-slate-200 text-slate-500'}`}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvPreviewData.map((row, rIdx) => (
                        <tr key={rIdx} className="border-t border-gray-100 dark:border-zinc-800">
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className={`p-2 border-r truncate max-w-[150px] ${darkMode ? 'border-zinc-800 text-zinc-400' : 'border-slate-100 text-slate-600'}`} title={cell}>
                              {cell || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className={`p-6 border-t flex justify-end gap-3 ${darkMode ? 'border-zinc-800' : 'border-slate-200'}`}>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className={`px-4 py-2 rounded-lg font-medium ${darkMode ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-slate-100 text-slate-600'}`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={processCsvImport}
                className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${darkMode ? 'bg-yellow-500 text-zinc-900 hover:bg-yellow-400' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              >
                <CheckCircle size={18} />
                Confirmar Importação ({allCsvRows.length} registros)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CsvImporter;

