# Outlook Kanban - Plataforma de Produtividade

Um sistema web desenvolvido em Next.js que transforma a caixa de entrada tradicional do Microsoft Outlook num quadro Kanban interativo, focado na máxima produtividade e organização.

## 🚀 Funcionalidades Principais

### 📋 Gestão Kanban & Produtividade
- **Quadro Interativo:** Visualização de conversas (threads) em formato Kanban com drag & drop.
- **Colunas Personalizadas:** Criação e gestão de colunas com ícones e cores próprias.
- **Snooze (Adiar):** Capacidade de esconder emails temporariamente (adiar para o dia seguinte).
- **Tags e Prioridades:** Classificação de conversas com etiquetas de colunas, etiquetas de texto e 4 níveis de prioridade.
- **Vistas Inteligentes:** Acesso rápido a Enviados, Arquivados, Adiados, Spam e Eliminados.

### 📧 Comunicação Avançada
- **Editor Rich Text:** Compositor de e-mails completo com formatação avançada de texto, cores, fontes, tamanhos e listas.
- **Gestão de Assinaturas:** Criação, edição e inserção rápida de múltiplas assinaturas personalizadas (com suporte a imagens).
- **Autocomplete Inteligente:** Sugestão automática de contactos baseada no histórico local de envios e na API da Microsoft.
- **Gestão de Anexos:** Suporte nativo para leitura, envio e remoção de ficheiros anexados.
- **Ações Rápidas:** Responder, Responder a Todos, Reencaminhar e Mover automaticamente após o envio.

### ⚙️ Personalização & Administração
- **Painel de Administração (Backoffice):** Área reservada para administradores com métricas de utilização e monitorização de contas ativas em tempo real.
- **Definições Visuais:** Personalização do fundo da plataforma (cores sólidas e imagens via Unsplash) e menu lateral colapsável.
- **Multi-idioma:** Suporte integrado para alternar dinamicamente entre Português e Inglês.
- **Sincronização Híbrida:** Utiliza a API Microsoft Graph para processar os e-mails em tempo real e o Supabase para a persistência de metadados leves.

---

## 📋 Pré-requisitos

1. **Microsoft Azure App Registration** (Para autenticação SSO e leitura de e-mails)
2. **Supabase Project** (Base de dados PostgreSQL para metadados, permissões e definições)
3. **Node.js** (Versão 18+ recomendada)

---

## 🛠️ Configuração e Instalação

### 1. Clonar o repositório
```bash
git clone [https://github.com/goncalofiuza23/projeto4.git](https://github.com/goncalofiuza23/projeto4.git)
cd projeto4
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
4. Para suportar tanto o desenvolvimento como a produção, adicione os seguintes caminhos de redirecionamento:
   - `http://localhost:3000` (Ambiente Local)
   - `https://kanoutlook.ipvc.pt` (Ambiente de Produção / IPVC)
5. Em "API permissions", adicione e conceda consentimento para:
   - `Mail.ReadWrite`
   - `Mail.Send`
   - `User.Read`
   - `People.Read`

### 4. Configurar a Base de Dados (Supabase)
Para inicializar a estrutura da base de dados e criar todas as tabelas necessárias automaticamente, siga os seguintes passos:
1. Aceda ao painel do seu projeto no [Supabase](https://supabase.com).
2. No menu lateral esquerdo, abra a secção **SQL Editor**.
3. Clique em **New Query**.
4. Copie o conteúdo integral do ficheiro `schema.sql` (disponível na raiz deste projeto) e cole-o no editor.
5. Clique em **Run** para executar o script. Todas as tabelas (`user_stats`, `user_preferences`, `email_metadata` e `custom_columns`), índices e gatilhos automatizados serão configurados imediatamente.

### 5. Executar e Aceder ao Projeto

#### Desenvolvimento Local:
```bash
npm run dev
```
Abra [http://localhost:3000](http://localhost:3000) no seu navegador.

#### Ambiente de Produção Oficial:
A aplicação encontra-se publicada e disponível para a comunidade académica através do domínio oficial:
👉 [https://kanoutlook.ipvc.pt](https://kanoutlook.ipvc.pt)

---

## 📁 Estrutura do Projeto

O projeto segue a arquitetura modular moderna do Next.js (App Router):

```text
projeto4/
├── app/                  # Roteamento, Views e Páginas Principais
│   ├── admin/            # Painel de Administração (Backoffice protegido)
│   ├── layout.tsx        # Layout Global, Estilos e Providers (Auth/Language)
│   └── page.tsx          # Dashboard Principal e Inicialização do Quadro
├── components/           # Componentes React Reutilizáveis (Kanban, Composer, Modais)
├── hooks/                # Custom Hooks (ex: controlo de Toasts e alertas)
├── lib/                  # Serviços de Integração com APIs Externas
│   ├── microsoft-graph.ts  # Tratamento e agrupamento de threads da MS API
│   └── supabase.ts         # Métodos de fallback seguro e operações na BD
└── public/               # Recursos estáticos (Logótipos, imagens de suporte)
```

---

## 🔧 Resolução de Problemas (Troubleshooting)

### Acesso Negado no Painel de Administração
- **Causa:** O utilizador atual não possui privilégios administrativos explícitos.
- **Solução:** No ecrã de "Área Reservada", consulte a "Info de Diagnóstico" para identificar o ID e Email exatos enviados pela Microsoft. Aceda ao painel do Supabase, tabela `user_stats`, localize o utilizador correspondente e altere o valor da coluna `is_admin` para `true`.

### E-mails não carregam ou a sincronização falha
- **Causa:** O token de acesso OAuth expirou ou ocorreram conflitos com cookies de sessões institucionais antigas.
- **Solução:** Utilize o botão de atualizar no topo da interface. Se o problema persistir, efetue Logout local na barra de definições do perfil e volte a autenticar-se para renovar as credenciais.

---

## 📄 Licença e Autoria

Projeto desenvolvido no âmbito académico e engenharia de software para o Instituto Politécnico de Viana do Castelo (IPVC).  
**Autores:** Gonçalo Fiúza, Daniel Gonçalves