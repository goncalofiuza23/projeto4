# Outlook Kanban - Gerenciador de Conversas

Um sistema Kanban para gerenciar conversas de email do Outlook/Microsoft 365 com funcionalidades avançadas.

## 🚀 Funcionalidades

### ✅ Funcionalidades Básicas (Sem Supabase)
- ✅ Login com Microsoft 365
- ✅ Visualização de conversas em formato Kanban
- ✅ Agrupamento automático de emails relacionados (threads)
- ✅ Drag & drop entre colunas
- ✅ Visualização detalhada de emails
- ✅ Responder, encaminhar e compor emails
- ✅ Filtros básicos (busca, remetente, assunto, anexos, leitura, data)

### 🔧 Funcionalidades Avançadas (Com Supabase)
- 🔧 Colunas personalizadas
- 🔧 Tags e prioridades por conversa
- 🔧 Filtros avançados por tags/prioridade
- 🔧 Persistência de configurações

## 📋 Pré-requisitos

1. **Microsoft Azure App Registration** (Obrigatório)
2. **Supabase Project** (Opcional - para funcionalidades avançadas)

## 🛠️ Configuração

### 1. Clone o repositório
\`\`\`bash
git clone <repository-url>
cd outlook-kanban
npm install
\`\`\`

### 2. Configure as variáveis de ambiente
\`\`\`bash
cp .env.example .env.local
\`\`\`

Edite `.env.local`:
\`\`\`env
# Obrigatório
NEXT_PUBLIC_MICROSOFT_CLIENT_ID=your_microsoft_client_id

# Opcional (para funcionalidades avançadas)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
\`\`\`

### 3. Configure o Azure App Registration

1. Acesse [Azure Portal](https://portal.azure.com)
2. Vá para "Azure Active Directory" > "App registrations"
3. Clique em "New registration"
4. Configure:
   - **Name**: Outlook Kanban
   - **Supported account types**: Accounts in any organizational directory and personal Microsoft accounts
   - **Redirect URI**: `http://localhost:3000` (para desenvolvimento)

5. Após criar, vá para "Authentication":
   - Marque "Access tokens" e "ID tokens"
   - Adicione `http://localhost:3000` em "Single-page application"

6. Vá para "API permissions":
   - Adicione as permissões:
     - `Mail.ReadWrite`
     - `Mail.Send`
     - `User.Read`

7. Copie o "Application (client) ID" para `NEXT_PUBLIC_MICROSOFT_CLIENT_ID`

### 4. Configure o Supabase (Opcional)

Se você quiser as funcionalidades avançadas:

1. Crie um projeto no [Supabase](https://supabase.com)
2. Execute os scripts SQL em `scripts/`:
   - `create-custom-columns.sql`
   - `create-tables.sql`
3. Configure as variáveis `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 5. Execute o projeto
\`\`\`bash
npm run dev
\`\`\`

## 🎯 Como Usar

### Modo Básico (Sem Supabase)
1. Faça login com sua conta Microsoft
2. Visualize suas conversas na coluna Caixa de Entrada
3. Use drag & drop para mover conversas entre colunas
4. Use os filtros básicos para encontrar conversas
5. Clique nas conversas para expandir e ver todos os emails
6. Use os botões para responder, encaminhar ou compor novos emails

### Modo Avançado (Com Supabase)
1. Todas as funcionalidades básicas +
2. Crie colunas personalizadas
3. Adicione tags e defina prioridades para conversas inteiras
4. Use filtros avançados por tags/prioridade
5. Configurações persistem entre sessões

## 🔧 Troubleshooting

### Erro: "supabaseUrl is required"
- **Causa**: Variáveis do Supabase não configuradas
- **Solução**: Configure as variáveis ou use apenas o modo básico

### Erro: "user_cancelled"
- **Causa**: Usuário cancelou o login (comportamento normal)
- **Solução**: Tente fazer login novamente

### Erro: "Unauthorized" ou "403"
- **Causa**: Permissões insuficientes no Azure
- **Solução**: Verifique as permissões da API no Azure Portal

### Popup bloqueado
- **Causa**: Navegador bloqueou popup de login
- **Solução**: Permita popups para o site

## 📁 Estrutura do Projeto

\`\`\`
outlook-kanban/
├── components/           # Componentes React
├── lib/                 # Utilitários e configurações
├── scripts/             # Scripts SQL do Supabase
├── app/                 # Páginas Next.js
└── .env.example         # Exemplo de variáveis de ambiente
\`\`\`

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT.
