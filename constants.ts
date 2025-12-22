import { Transaction, AppSettings, Account } from './types';

export const MOCK_ACCOUNTS: Account[] = [
  { id: 'acc1', name: 'Banco Inter', type: 'Corrente', initialBalance: 5000, color: '#FF7F00' },
  { id: 'acc2', name: 'Caixa Física', type: 'Caixa', initialBalance: 1200, color: '#10B981' }
];

export const MOCK_SETTINGS: AppSettings = {
  categories: [
    { id: 'c1', name: 'Despesas administrativas', type: 'Despesa' },
    { id: 'c2', name: 'Despesas operacionais', type: 'Despesa' },
    { id: 'c3', name: 'Despesas fixas', type: 'Despesa' },
    { id: 'c4', name: 'Receita de serviços', type: 'Receita' },
    { id: 'c5', name: 'Receita de consultoria', type: 'Receita' },
    { id: 'c6', name: 'Receita de mentoria', type: 'Receita' }
  ],
  entities: [
    { id: 'e1', name: 'A Lenha', type: 'Fornecedor' },
    { id: 'e2', name: 'AppSheet', type: 'Fornecedor' },
    { id: 'e3', name: 'Alice Salazar', type: 'Cliente' },
    { id: 'e4', name: 'Ágil Disc', type: 'Fornecedor' },
    { id: 'e5', name: 'Mercado Livre', type: 'Fornecedor' },
    { id: 'e6', name: 'Google Workspace', type: 'Fornecedor' },
    { id: 'e7', name: 'Rose Portal Advocacia', type: 'Cliente' },
    { id: 'e8', name: 'Vitória', type: 'Cliente' },
    { id: 'e9', name: 'Ferrão', type: 'Fornecedor' }
  ],
  paymentMethods: [
    'Dinheiro', 'Boleto', 'Pix', 'Cartão de Crédito [Lidera]', 
    'Cartão de Crédito [Charles]', 'Cartão de Crédito [Rafaella]'
  ],
  costCenters: [
    'Produtos e Serviços', 'Alimentação', 'Aluguel', 'Assessoria', 
    'Capacitação', 'Colaboradores', 'Consultoria', 'Marketing e Publicidade'
  ]
};

export const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: '1',
    dataLancamento: '2025-10-02',
    dataVencimento: '2025-10-02',
    tipo: 'Saída',
    categoria: 'Despesas operacionais',
    entidade: 'Ágil Disc',
    produtoServico: 'Análise de Perfis',
    centroCusto: 'Ferramentas operacionais',
    formaPagamento: 'Boleto',
    accountId: 'acc1',
    descricao: 'Análise de Perfis Comportamentais',
    valorPrevisto: 209.30,
    valorRealizado: 209.30,
    dataPagamento: '2025-10-02',
    dataCompetencia: '2025-10-02',
    status: 'Pago'
  },
  {
    id: '2',
    dataLancamento: '2025-09-22',
    dataVencimento: '2025-10-05',
    tipo: 'Entrada',
    categoria: 'Receita de serviços',
    entidade: 'Cia da Fruta',
    produtoServico: 'Consultoria',
    centroCusto: 'Consultoria',
    formaPagamento: 'Pix',
    accountId: 'acc1',
    descricao: 'Consultoria Mensal',
    valorPrevisto: 1100.00,
    valorRealizado: 1100.00,
    dataPagamento: '2025-10-05',
    dataCompetencia: '2025-10-05',
    status: 'Recebido'
  },
  {
    id: '3',
    dataLancamento: '2025-09-28',
    dataVencimento: '2025-10-05',
    tipo: 'Saída',
    categoria: 'Despesas fixas',
    entidade: 'Sócios',
    produtoServico: '',
    centroCusto: 'Pro-labore',
    formaPagamento: 'Pix',
    accountId: 'acc1',
    descricao: 'Pro-labore Sócios',
    valorPrevisto: 6000.00,
    valorRealizado: 3000.00,
    dataPagamento: '2025-10-13',
    dataCompetencia: '2025-10-13',
    status: 'Pago'
  },
  {
    id: '4',
    dataLancamento: '2025-09-22',
    dataVencimento: '2025-11-20',
    tipo: 'Entrada',
    categoria: 'Receita de mentoria',
    entidade: 'Savana Imóveis',
    produtoServico: 'Mentoria',
    centroCusto: 'Mentoria',
    formaPagamento: 'Pix',
    accountId: 'acc1',
    descricao: 'Mentoria | A Jornada do Líder 2/9',
    valorPrevisto: 200.00,
    valorRealizado: 0.00,
    dataCompetencia: '2025-11-20',
    status: 'A receber'
  },
  {
    id: '5',
    dataLancamento: '2025-09-28',
    dataVencimento: '2025-11-20',
    tipo: 'Saída',
    categoria: 'Despesas administrativas',
    entidade: 'Receita Federal',
    produtoServico: '',
    centroCusto: 'Impostos',
    formaPagamento: 'Boleto',
    accountId: 'acc1',
    descricao: 'Simples Nacional',
    valorPrevisto: 525.00,
    valorRealizado: 0.00,
    dataCompetencia: '2025-11-20',
    status: 'A pagar'
  }
];