# Configuração do Firebase Firestore

## ⚠️ IMPORTANTE: Configurar Regras de Segurança

As coleções no Firestore são criadas **automaticamente** quando você adiciona o primeiro documento. No entanto, você precisa configurar as **regras de segurança** para permitir leitura e escrita.

## Passo a Passo

### 1. Acesse o Console do Firebase

1. Vá para: https://console.firebase.google.com/project/lidera-flow/firestore
2. Clique em **"Regras"** (Rules) no menu lateral

### 2. Configure as Regras de Segurança

Para **desenvolvimento/teste**, você pode usar estas regras (permitem tudo):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permite leitura e escrita para todas as coleções
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

⚠️ **ATENÇÃO**: Essas regras permitem acesso total. Para produção, você deve implementar autenticação e regras mais restritivas.

### 3. Regras Recomendadas para Produção (com Autenticação)

Se você implementar autenticação no futuro, use regras como estas:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Coleção de transações
    match /transactions/{transactionId} {
      allow read, write: if request.auth != null;
    }
    
    // Coleção de configurações
    match /settings/{settingId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 4. Publicar as Regras

1. Clique em **"Publicar"** (Publish) após editar as regras
2. Aguarde alguns segundos para as regras serem aplicadas

## Verificando se Funciona

Após configurar as regras:

1. Execute o app: `npm run dev`
2. Tente adicionar uma nova transação
3. Verifique o console do navegador para erros
4. No console do Firebase, vá em **Firestore Database** → **Dados** para ver as coleções criadas

## Coleções que Serão Criadas Automaticamente

- `transactions` - Armazena todas as transações financeiras
- `settings` - Armazena configurações do app (futuro)

## Troubleshooting

### Erro: "Permission denied"

- ✅ Verifique se as regras de segurança foram publicadas
- ✅ Verifique se você está usando as regras corretas (versão 2)
- ✅ Aguarde alguns segundos após publicar as regras

### Coleções não aparecem no console

- ✅ As coleções só aparecem após adicionar o primeiro documento
- ✅ Tente adicionar uma transação pelo app primeiro
- ✅ Recarregue a página do console do Firebase

### Erro de conexão

- ✅ Verifique se o `firebaseConfig` está correto no arquivo `services/firebase.ts`
- ✅ Verifique se o projeto Firebase está ativo
- ✅ Verifique a conexão com a internet

