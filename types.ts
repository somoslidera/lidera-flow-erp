export type TransactionType = 'Entrada' | 'Saída';
export type TransactionStatus = 'Pago' | 'Recebido' | 'A pagar' | 'A receber' | 'Atrasado' | 'Cancelado';

export interface Account {
  id: string;
  name: string;
  type: 'Corrente' | 'Poupança' | 'Caixa' | 'Investimento';
  initialBalance: number;
  color: string;
}

export interface Transaction {
  id: string;
  dataLancamento: string;
  dataVencimento: string;
  tipo: TransactionType;
  categoria: string;
  entidade: string; // Cliente ou Fornecedor
  produtoServico: string;
  centroCusto: string;
  formaPagamento: string;
  accountId?: string; // Linked bank account
  descricao: string;
  valorPrevisto: number;
  valorRealizado: number;
  dataPagamento?: string;
  dataCompetencia: string;
  status: TransactionStatus;
}

export interface CategoryItem {
  id: string;
  name: string;
  type: 'Receita' | 'Despesa';
}

export interface EntityItem {
  id: string;
  name: string;
  type: 'Cliente' | 'Fornecedor' | 'Ambos';
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