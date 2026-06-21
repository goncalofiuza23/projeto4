# Outlook Kanban - Plataforma de Produtividade

Um sistema web desenvolvido em Next.js que transforma a caixa de entrada tradicional do Microsoft Outlook num quadro Kanban interativo, focado na máxima produtividade e organização.

## 🚀 Funcionalidades Principais

### 📋 Gestão Kanban & Produtividade
- **Quadro Interativo:** Visualização de conversas (threads) em formato Kanban com drag & drop.
- **Colunas Personalizadas:** Criação e gestão de colunas com ícones e cores próprias.
- **Snooze (Adiar):** Capacidade de esconder emails temporariamente (adiar para o dia seguinte).
- **Tags e Prioridades:** Classificação de conversas com etiquetas de cor e 4 níveis de prioridade.
- **Vistas Inteligentes:** Acesso rápido a Enviados, Arquivados, Adiados, Spam e Eliminados.

### 📧 Comunicação Avançada
- **Editor Rich Text:** Compositor de e-mails completo com formatação avançada de texto, cores e listas.
- **Gestão de Assinaturas:** Criação, edição e inserção rápida de múltiplas assinaturas personalizadas (com suporte a imagens).
- **Autocomplete Inteligente:** Sugestão automática de contactos baseada no histórico local e na API da Microsoft.
- **Gestão de Anexos:** Suporte nativo para leitura, envio e remoção de anexos.
- **Ações Rápidas:** Responder, Responder a Todos, Reencaminhar e Mover diretamente do compositor.

### ⚙️ Personalização & Administração
- **Painel de Administração (Backoffice):** Área reservada para administradores com métricas de utilização e monitorização de contas ativas em tempo real.
- **Definições Visuais:** Personalização do fundo da plataforma (cores sólidas e imagens) e menu lateral colapsável.
- **Multi-idioma:** Suporte integrado para alternar entre Português e Inglês.
- **Sincronização Híbrida:** Utiliza a API Microsoft Graph para os emails pesados e o Supabase para configurações leves e rápidas.

---

## 📋 Pré-requisitos

1. **Microsoft Azure App Registration** (Para autenticação SSO e leitura de e-mails)
2. **Supabase Project** (Base de dados PostgreSQL para metadados, permissões e definições)
3. **Node.js** (Versão 18+ recomendada)

---

## 🛠️ Configuração e Instalação

### 1. Clonar o repositório
```bash
git clone <repository-url>
cd outlook-kanban
npm install
```

### 2. Configurar as Variáveis de Ambiente
Crie um ficheiro `.env.local` na raiz do projeto:
```env
# Autenticação Microsoft
NEXT_PUBLIC_MICROSOFT_CLIENT_ID=seu_microsoft_client_id

# Base de Dados (Supabase)
NEXT_PUBLIC_SUPABASE_URL=seu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_supabase_anon_key
```

### 3. Configurar o Azure App Registration
1. Aceda ao [Azure Portal](https://portal.azure.com).
2. Navegue para "Microsoft Entra ID" > "App registrations" > "New registration".
3. Configure o **Redirect URI** como `Single-page application` apontando para `http://localhost:3000`.
4. Em "API permissions", adicione e conceda consentimento para:
   - `Mail.ReadWrite`
   - `Mail.Send`
   - `User.Read`
   - `People.Read` (Para o autocomplete de contactos)

### 4. Configurar a Base de Dados (Supabase)
Crie as seguintes tabelas no seu projeto Supabase para garantir o funcionamento total:
- `user_stats` (Registo de utilizadores, datas de acesso e permissões `is_admin`).
- `user_preferences` (Temas, estado da barra lateral, assinaturas de e-mail).
- `email_metadata` (Tags, colunas, prioridades e datas de snooze ligadas ao ID do e-mail).
- `custom_columns` (Definição visual das colunas criadas pelo utilizador).

### 5. Executar o Projeto
```bash
npm run dev
```
Abra [http://localhost:3000](http://localhost:3000) no seu navegador.

---

## 📁 Estrutura do Projeto

O projeto segue a arquitetura moderna do Next.js (App Router):

```text
outlook-kanban/
├── app/                  # Roteamento e Páginas Principais
│   ├── admin/            # Painel de Administração (Backoffice protegido)
│   ├── layout.tsx        # Layout Global e Providers
│   └── page.tsx          # Dashboard Principal (Kanban)
├── components/           # Componentes React Reutilizáveis UI e Lógica
├── hooks/                # Custom Hooks (ex: gestão de Toasts)
├── lib/                  # Serviços Externos
│   ├── microsoft-graph.ts  # Comunicação com a MS Graph API
│   └── supabase.ts         # Configuração e tipagem estrita do Supabase
└── public/               # Ficheiros estáticos (imagens, ícones)
```

---

## 🔧 Resolução de Problemas (Troubleshooting)

### Acesso Negado no Painel de Administração
- **Causa:** O seu e-mail não tem o cargo de administrador na base de dados.
- **Solução:** Na página de erro "Área Reservada", verifique a "Caixa de Diagnóstico" para confirmar o seu ID/E-mail exato enviado pela Microsoft. Vá ao Supabase, tabela `user_stats`, localize a sua linha e altere a coluna `is_admin` para `true`.

### E-mails não carregam ou demoram muito
- **Causa:** O token de acesso da Microsoft pode ter expirado ou o limite de paginação foi atingido.
- **Solução:** Utilize o botão de recarregar no topo da plataforma ou faça logout e login novamente para renovar o token SSO silenciosamente.

---

## 📄 Licença e Autoria

Projeto desenvolvido no âmbito académico no Instituto Politécnico de Viana do Castelo (IPVC).  
**Autor:** Gonçalo Fiúza, Daniel Gonçalves