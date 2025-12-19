// Transaction Types (values remain in Portuguese for Brazilian UI)
export type TransactionType = 'Entrada' | 'Saída';
export type TransactionStatus = 'Pago' | 'Recebido' | 'A pagar' | 'A receber' | 'Atrasado' | 'Cancelado';
export type AccountType = 'Corrente' | 'Poupança' | 'Caixa' | 'Investimento';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: number;
  color: string;
}

export interface Transaction {
  id: string;
  issueDate: string; // Data de lançamento
  dueDate: string; // Data de vencimento
  type: TransactionType; // Tipo (Entrada/Saída)
  category: string; // Categoria (legado - manter para compatibilidade durante migration)
  categoryId?: string; // ID da categoria (novo campo)
  subcategoryId?: string; // ID da subcategoria (novo campo)
  entity: string; // Entidade (Cliente/Fornecedor)
  productService: string; // Produto ou Serviço
  costCenter: string; // Centro de Custo
  paymentMethod: string; // Forma de Pagamento
  accountId?: string; // Linked bank account
  description: string; // Descrição
  expectedAmount: number; // Valor Previsto
  actualAmount: number; // Valor Realizado
  paymentDate?: string; // Data de Pagamento/Recebimento
  accrualDate: string; // Data de Competência
  status: TransactionStatus;
  tags?: string[]; // Tags for tracking imports and custom labels
  importSource?: string; // Source file name for imports
  importedAt?: string; // Import timestamp
}

export interface SubcategoryItem {
  id: string;
  name: string;
  categoryId: string; // Referência à categoria pai
}

export interface CategoryItem {
  id: string;
  name: string;
  type: 'Receita' | 'Despesa';
  subcategories?: SubcategoryItem[]; // Subcategorias hierárquicas
}

export interface EntityItem {
  id: string;
  name: string;
  type: 'Cliente' | 'Fornecedor' | 'Ambos';
}

// Full Entity interface for dedicated registration system
export interface Entity {
  id: string;
  name: string;
  type: 'Cliente' | 'Fornecedor' | 'Ambos';
  
  // Contact Information
  email?: string;
  phone?: string;
  website?: string;
  
  // Fiscal Information
  document?: string; // CPF/CNPJ
  documentType?: 'CPF' | 'CNPJ';
  
  // Address
  address?: {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  
  // Metadata
  notes?: string;
  tags?: string[]; // Tags for tracking imports and custom labels
  createdAt: string;
  updatedAt: string;
  createdBy: string; // userId
  isActive: boolean;
}

export interface AppSettings {
  categories: CategoryItem[];
  entities: EntityItem[];
  paymentMethods: string[];
  costCenters: string[];
}

export interface DashboardMetrics {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  pendingIncome: number;
  pendingExpense: number;
  projectedBalance: number;
}

export interface BudgetItem {
  id: string;
  budgetId: string;
  categoryId: string;
  subcategoryId?: string;
  monthlyAmounts: {
    [month: number]: number; // 1-12 para cada mês
  };
  totalAmount: number; // Soma dos 12 meses
  notes?: string;
}

export interface Budget {
  id: string;
  year: number;
  name: string; // Ex: "Orçamento 2025"
  description?: string;
  items: BudgetItem[];
  createdAt: string;
  updatedAt: string;
  createdBy: string; // userId
  isActive: boolean;
}