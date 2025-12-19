# Arquitetura e Funcionalidades - Lidera Flow ERP

## 📋 Visão Geral

O **Lidera Flow ERP** é uma aplicação web de gestão financeira desenvolvida com React e TypeScript, utilizando Firebase como backend (Firestore para banco de dados e Authentication para autenticação). O sistema oferece controle completo de fluxo de caixa, gestão de transações, relatórios financeiros e análises avançadas.

## 🛠️ Stack Tecnológico

### Frontend
- **React 18.3.1** - Biblioteca para construção de UI
- **TypeScript 5.2.2** - Tipagem estática
- **Vite 5.1.4** - Build tool e dev server
- **React Router DOM 6.22.1** - Roteamento (BrowserRouter)
- **Tailwind CSS 3.4.1** - Framework CSS utility-first
- **Recharts 2.12.0** - Biblioteca de gráficos
- **Lucide React 0.454.0** - Ícones

### Backend & Infraestrutura
- **Firebase 10.8.0**
  - **Firestore** - Banco de dados NoSQL
  - **Authentication** - Autenticação Google
  - **Storage** (configurado, não utilizado atualmente)

## 📁 Estrutura de Pastas

```
lidera-flow-erp/
├── components/           # Componentes React
│   ├── Accounts.tsx      # Gestão de contas e caixas
│   ├── CashFlowReport.tsx # Relatório de fluxo de caixa horizontal
│   ├── CsvImporter.tsx   # Importador de CSV com mapeamento
│   ├── Dashboard.tsx     # Dashboard principal com abas
│   ├── EditableTable.tsx # Tabela editável estilo Airtable
│   ├── Entities.tsx      # Gestão de fornecedores e clientes
│   ├── Help.tsx          # Página de ajuda
│   ├── Layout.tsx        # Layout principal com sidebar
│   ├── Login.tsx         # Tela de login Google
│   ├── Reports.tsx       # Relatórios gerais
│   ├── Settings.tsx      # Configurações do sistema
│   └── Transactions.tsx  # Gestão de lançamentos
├── services/
│   └── firebase.ts       # Serviços Firebase (CRUD, Auth)
├── types.ts              # Definições TypeScript
├── constants.ts          # Dados mock e constantes
├── App.tsx               # Componente raiz, gerenciamento de estado global
├── index.tsx             # Entry point
└── public/
    └── lidera-logo.png   # Logo da aplicação
```

## 🏗️ Arquitetura de Componentes

### Hierarquia de Componentes

```
App.tsx (Root)
├── Router (BrowserRouter)
│   └── Layout
│       ├── Sidebar (Navigation)
│       └── Routes
│           ├── Dashboard
│           │   ├── Overview Tab
│           │   ├── Cash Flow Tab
│           │   ├── Expenses Tab
│           │   ├── Revenue Tab
│           │   └── Budget vs Actual Tab
│           ├── Transactions
│           │   ├── CsvImporter
│           │   └── EditableTable
│           ├── Accounts
│           ├── Entities
│           │   └── EditableTable
│           ├── CashFlowReport
│           ├── Reports
│           ├── Settings
│           └── Help
└── Login (se não autenticado)
```

### Componentes Principais

#### 1. **App.tsx** - Gerenciador de Estado Global
- Gerencia estado da aplicação (transactions, accounts, entities, settings, subcategories)
- Coordena comunicação entre componentes
- Handlers CRUD para todas as entidades
- Autenticação e proteção de rotas
- Inicialização e carregamento de dados do Firebase

#### 2. **Layout.tsx** - Layout Principal
- Sidebar responsiva com navegação
- Toggle de tema (dark/light mode)
- Exibição de informações do usuário
- Menu mobile

#### 3. **Dashboard.tsx** - Dashboard com Abas
- **Abas implementadas:**
  - Overview (Visão Geral)
  - Cash Flow (Fluxo de Caixa)
  - Expenses (Despesas)
  - Revenue (Receitas)
  - Budget vs Actual (Orçado vs Realizado)
- Filtros globais (período, conta)
- Visualizações:
  - KPIs (Saldo, Receitas, Despesas, Resultado)
  - Gráficos de tendências
  - Heatmap de calendário
  - Análise de Pareto
  - Projeções com cenários
  - Scorecard de saúde financeira

#### 4. **Transactions.tsx** - Gestão de Lançamentos
- CRUD completo de transações
- Visualização em tabela normal ou editável (Airtable style)
- Filtros e paginação
- Integração com CsvImporter
- Suporte a parcelas

#### 5. **Entities.tsx** - Gestão de Fornecedores e Clientes
- CRUD completo de entidades
- Visualização em grid ou tabela editável
- Campos completos: contato, fiscal, endereço
- Sistema de tags

#### 6. **CashFlowReport.tsx** - Relatório Horizontal
- Tabela dinâmica estilo pivot table
- Agrupamento por categoria/subcategoria
- Expandir/colapsar anos e trimestres
- Filtros por conta e categoria
- Exportação CSV

#### 7. **Settings.tsx** - Configurações
- Gestão de categorias (com subcategorias hierárquicas)
- Gestão de entidades (legado)
- Formas de pagamento
- Centros de custo
- Interface expandível para subcategorias

#### 8. **Accounts.tsx** - Gestão de Contas
- CRUD completo de contas bancárias/caixas
- Tipos: Corrente, Poupança, Caixa, Investimento
- Saldo inicial e cor personalizada

#### 9. **CsvImporter.tsx** - Importador CSV
- Mapeamento visual de colunas
- Preview dos dados
- Validação de dados
- Estratégias de duplicatas (importar tudo, pular, atualizar)
- Extração automática de entidades
- Sistema de tags (padrão + customizável)
- Progresso visual durante importação

#### 10. **EditableTable.tsx** - Tabela Editável Reutilizável
- Edição inline de células
- Suporte a múltiplos tipos de campo (text, number, date, select, currency, tags)
- Salvamento automático ao sair do campo ou Enter
- Cancelamento com Escape
- Suporte a campos aninhados (ex: `address.city`)

## 🔥 Serviços Firebase

### Collections do Firestore

1. **transactions** - Lançamentos financeiros
2. **accounts** - Contas bancárias e caixas
3. **entities** - Fornecedores e clientes
4. **subcategories** - Subcategorias de custos
5. **budgets** - Orçamentos (estrutura criada, funcionalidades pendentes)
6. **settings** - Configurações (documento único: `main`)

### Serviços Implementados (`services/firebase.ts`)

#### Transaction Service
- `getAll()` - Lista todas as transações
- `add(transaction)` - Adiciona nova transação
- `update(id, data)` - Atualiza transação
- `delete(id)` - Remove transação

#### Account Service
- `getAll()` - Lista todas as contas
- `add(account)` - Adiciona nova conta
- `update(id, data)` - Atualiza conta
- `delete(id)` - Remove conta

#### Entity Service
- `getAll()` - Lista todas as entidades
- `getById(id)` - Busca entidade por ID
- `getByType(type)` - Filtra por tipo (Cliente/Fornecedor/Ambos)
- `add(entity)` - Adiciona nova entidade
- `update(id, data)` - Atualiza entidade
- `delete(id)` - Remove entidade

#### Subcategory Service
- `getAll()` - Lista todas as subcategorias
- `getById(id)` - Busca subcategoria por ID
- `getByCategoryId(categoryId)` - Filtra por categoria pai
- `add(subcategory)` - Adiciona nova subcategoria
- `update(id, data)` - Atualiza subcategoria
- `delete(id)` - Remove subcategoria

#### Budget Service
- `getAll()` - Lista todos os orçamentos
- `getById(id)` - Busca orçamento por ID
- `getByYear(year)` - Busca orçamento por ano
- `getActive()` - Busca orçamento ativo
- `add(budget)` - Adiciona novo orçamento
- `update(id, data)` - Atualiza orçamento
- `delete(id)` - Remove orçamento

#### Settings Service
- `get()` - Busca configurações (documento único)
- `save(settings)` - Salva configurações

#### Auth Service
- `signInWithGoogle()` - Login com Google
- `signOut()` - Logout
- `onAuthStateChanged(callback)` - Listener de mudanças de autenticação
- `getCurrentUser()` - Retorna usuário atual

## 📊 Modelos de Dados

### Transaction
```typescript
{
  id: string;
  issueDate: string;          // Data de lançamento
  dueDate: string;            // Data de vencimento
  type: 'Entrada' | 'Saída';
  category: string;           // Legado (compatibilidade)
  categoryId?: string;        // ID da categoria
  subcategoryId?: string;     // ID da subcategoria
  entity: string;             // Nome da entidade
  productService: string;
  costCenter: string;
  paymentMethod: string;
  accountId?: string;         // ID da conta
  description: string;
  expectedAmount: number;     // Valor previsto
  actualAmount: number;       // Valor realizado
  paymentDate?: string;
  accrualDate: string;        // Data de competência
  status: TransactionStatus;
  tags?: string[];
  importSource?: string;
  importedAt?: string;
}
```

### Account
```typescript
{
  id: string;
  name: string;
  type: 'Corrente' | 'Poupança' | 'Caixa' | 'Investimento';
  initialBalance: number;
  color: string;              // Cor hexadecimal
}
```

### Entity
```typescript
{
  id: string;
  name: string;
  type: 'Cliente' | 'Fornecedor' | 'Ambos';
  email?: string;
  phone?: string;
  website?: string;
  document?: string;          // CPF/CNPJ
  documentType?: 'CPF' | 'CNPJ';
  address?: {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  notes?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;          // userId
  isActive: boolean;
}
```

### CategoryItem
```typescript
{
  id: string;
  name: string;
  type: 'Receita' | 'Despesa';
  subcategories?: SubcategoryItem[];  // Hierárquico
}
```

### SubcategoryItem
```typescript
{
  id: string;
  name: string;
  categoryId: string;         // Referência à categoria pai
}
```

### Budget
```typescript
{
  id: string;
  year: number;
  name: string;
  description?: string;
  items: BudgetItem[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  isActive: boolean;
}
```

### BudgetItem
```typescript
{
  id: string;
  budgetId: string;
  categoryId: string;
  subcategoryId?: string;
  monthlyAmounts: {
    [month: number]: number;  // 1-12
  };
  totalAmount: number;
  notes?: string;
}
```

## 🗺️ Rotas e Navegação

### Rotas Disponíveis

| Rota | Alternativa (PT) | Componente | Descrição |
|------|------------------|------------|-----------|
| `/` | `/dashboard` | Dashboard | Dashboard principal |
| `/transactions` | `/lancamentos` | Transactions | Gestão de lançamentos |
| `/accounts` | `/contas` | Accounts | Gestão de contas |
| `/entities` | `/fornecedores-clientes` | Entities | Gestão de fornecedores/clientes |
| `/reports` | `/relatorios` | Reports | Relatórios gerais |
| `/cashflow-report` | `/relatorio-fluxo-caixa` | CashFlowReport | Relatório horizontal |
| `/settings` | `/configuracoes` | Settings | Configurações |
| `/help` | `/ajuda` | Help | Ajuda |

### Proteção de Rotas

- **Login obrigatório**: Todas as rotas (exceto `/login`) requerem autenticação
- Se usuário não autenticado, redireciona para tela de login
- Estado de autenticação verificado via `authService.onAuthStateChanged()`

## 🔄 Fluxo de Dados

### Inicialização da Aplicação

1. **App.tsx** monta
2. Verifica estado de autenticação via Firebase Auth
3. Se autenticado:
   - Carrega dados em paralelo:
     - Transações (`transactionService.getAll()`)
     - Configurações (`settingsService.get()`)
     - Contas (`accountsService.getAll()`)
     - Entidades (`entityService.getAll()`)
     - Subcategorias (`subcategoryService.getAll()`)
   - Inicializa com dados mock se coleções vazias
   - Migração automática de entities (settings → entities collection)
4. Renderiza Layout com rotas protegidas

### Fluxo de Criação/Atualização

1. Usuário interage com formulário/modal
2. Handler em **App.tsx** é chamado
3. Dados são salvos no Firebase via service
4. Estado local é atualizado (otimistic update)
5. UI reflete mudanças imediatamente

### Fluxo de Importação CSV

1. Usuário seleciona arquivo CSV
2. **CsvImporter** lê e parseia arquivo
3. Usuário mapeia colunas para campos do sistema
4. Preview dos dados validados
5. Usuário escolhe estratégia de duplicatas
6. Usuário configura tags de importação
7. Dados são processados em lotes (50 por vez)
8. Entidades são extraídas e salvas
9. Transações são salvas com `Promise.allSettled` para robustez
10. Feedback de progresso visual
11. Relatório de erros (se houver)

## 🎨 Sistema de Tema

- **Dark Mode / Light Mode** implementado
- Toggle no Layout
- Preferência salva em `localStorage`
- Classes Tailwind dinâmicas baseadas em `darkMode` state
- Cores principais:
  - Dark: Zinc (900, 800, 700) + Yellow accents
  - Light: Slate (50, 100, 200) + Blue accents

## ✨ Funcionalidades Principais

### ✅ Implementadas

1. **Autenticação Google**
   - Login/logout
   - Proteção de rotas
   - Informações do usuário no sidebar

2. **Gestão de Transações**
   - CRUD completo
   - Parcelas automáticas
   - Filtros e busca
   - Paginação
   - Tabela editável inline

3. **Gestão de Contas**
   - CRUD completo
   - Múltiplos tipos de conta
   - Cores personalizadas

4. **Gestão de Entidades (Fornecedores/Clientes)**
   - Sistema completo de cadastro
   - Campos completos (contato, fiscal, endereço)
   - Tabela editável
   - Sistema de tags

5. **Sistema de Subcategorias**
   - Hierarquia 1:N (categoria → subcategorias)
   - Interface expandível em Settings
   - Integração com transações

6. **Importação CSV**
   - Mapeamento visual de colunas
   - Validação de dados
   - Estratégias de duplicatas
   - Extração automática de entidades
   - Sistema de tags
   - Progresso visual

7. **Dashboard com Abas**
   - Estrutura de abas implementada
   - Filtros globais
   - Visualizações avançadas (KPIs, gráficos, heatmap, Pareto, etc.)

8. **Relatório de Fluxo de Caixa Horizontal**
   - Tabela dinâmica estilo pivot
   - Expandir/colapsar anos/trimestres
   - Filtros
   - Exportação CSV

9. **Configurações**
   - Gestão de categorias e subcategorias
   - Formas de pagamento
   - Centros de custo

### 🚧 Em Desenvolvimento / Pendentes

1. **Sistema de Orçamento**
   - Estrutura de dados criada
   - Serviços Firebase implementados
   - **Pendente**: Interface de configuração de orçamento
   - **Pendente**: Relatório Orçado vs Realizado
   - **Pendente**: Integração com Dashboard (aba Budget vs Actual)

2. **Análises por Subcategoria**
   - Dashboard com análises por subcategoria nas abas Expenses/Revenue

3. **Reorganização de Visualizações no Dashboard**
   - Distribuir visualizações existentes nas abas apropriadas

## 📈 Estado da Aplicação (App.tsx)

### Estados Globais

```typescript
- darkMode: boolean                    // Tema dark/light
- user: User | null                    // Usuário autenticado
- authLoading: boolean                 // Carregando autenticação
- transactions: Transaction[]          // Lista de transações
- accounts: Account[]                  // Lista de contas
- entities: Entity[]                   // Lista de entidades
- subcategories: SubcategoryItem[]     // Lista de subcategorias
- settings: AppSettings                // Configurações
- loading: boolean                     // Carregando dados iniciais
```

### Handlers Principais

- `handleAddTransaction` / `handleUpdateTransaction` / `handleDeleteTransaction`
- `handleBulkAddTransactions` (importação em lotes)
- `handleAddAccount` / `handleUpdateAccount` / `handleDeleteAccount`
- `handleAddEntity` / `handleUpdateEntity` / `handleDeleteEntity`
- `handleImportEntities` (importação de entidades do CSV)
- `handleAddSubcategory` / `handleUpdateSubcategory` / `handleDeleteSubcategory`
- `handleUpdateSettings`

## 🔐 Segurança

- **Autenticação obrigatória** para todas as funcionalidades
- **Regras do Firestore** devem ser configuradas no console do Firebase
- Validação de dados no cliente
- Sanitização de dados antes de salvar (remoção de undefined)

## 🚀 Próximos Passos Recomendados

1. **Completar Sistema de Orçamento**
   - Interface de configuração
   - Relatório Orçado vs Realizado
   - Integração com Dashboard

2. **Melhorias no Dashboard**
   - Reorganizar visualizações nas abas
   - Adicionar análises por subcategoria
   - Melhorar performance com virtualização para grandes datasets

3. **Melhorias de Performance**
   - Implementar paginação server-side para grandes volumes
   - Cache de dados frequentes
   - Lazy loading de componentes pesados

4. **Funcionalidades Adicionais**
   - Exportação de relatórios (PDF, Excel)
   - Notificações de vencimentos
   - Dashboard mobile otimizado
   - Filtros avançados e salvos

5. **Testes**
   - Testes unitários para serviços
   - Testes de integração
   - Testes E2E

## 📝 Notas Técnicas

- **Padronização de Campos**: Campos em inglês (camelCase) para compatibilidade
- **Migração de Dados**: Sistema preparado para migration de `category` (string) para `categoryId`
- **Compatibilidade Retroativa**: Mantém campos legados durante período de transição
- **Batch Processing**: Importações processadas em lotes de 50 para evitar timeouts
- **Error Handling**: Tratamento robusto de erros com `Promise.allSettled`

## 📚 Documentação Adicional

- `API_DOCUMENTATION.md` - Documentação de campos e estruturas
- `FIELD_MIGRATION.md` - Mapeamento de migração de campos
- `FIREBASE_SETUP.md` - Instruções de setup do Firebase
- `MIGRATION_PLAN.md` - Plano de migração de entidades

---

**Última atualização**: Dezembro 2024  
**Versão**: 1.0.0

