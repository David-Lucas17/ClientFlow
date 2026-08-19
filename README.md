# ClientFlow

ClientFlow é uma aplicação web para gestão de clientes, com autenticação de usuários e painel administrativo. Cada usuário gerencia sua própria carteira de clientes, com dados isolados e protegidos em nível de banco de dados.

## Funcionalidades

* **Autenticação de usuários** — cadastro, login e logout
* **Dashboard** com métricas em tempo real (total de clientes, clientes ativos, novos cadastros nos últimos 7 dias, taxa de ativos)
* **Gestão de clientes (CRUD)** — criar, listar, editar e excluir (soft delete)
* **Filtros e busca** — por status (ativo, pendente, inativo) e por nome/contato/email
* **Histórico de atividades (timeline)** — registro automático de criação, edição, mudança de status e exclusão de cada cliente
* **Configurações de conta** — atualização de nome, email e senha
* **Layout responsivo** — adaptado para desktop e mobile

## Tecnologias

* **Frontend:** HTML5, CSS3, JavaScript (vanilla, sem frameworks)
* **Backend / Banco de dados:** Supabase (PostgreSQL + Auth + API REST automática)
* **Hospedagem / Deploy:** Cloudflare Pages
* **Ícones:** Font Awesome
* **Segurança:** Row Level Security (RLS) do PostgreSQL

## Deploy

A aplicação está publicada e hospedada utilizando o **Cloudflare Pages**, responsável pela entrega dos arquivos estáticos do frontend.

O backend, autenticação e banco de dados são gerenciados pelo **Supabase**.

**Arquitetura utilizada:**

```text
Usuário
   │
   ▼
Cloudflare Pages
   │
   │ Frontend (HTML + CSS + JavaScript)
   ▼
Supabase
   ├── Auth
   ├── PostgreSQL
   └── API REST
```

## Estrutura do projeto

```text
ClientFlow/
├── index.html          # Página inicial (landing page)
├── login.html          # Tela de login e cadastro
├── dashboard.html      # Painel principal (dashboard, clientes, configurações)
├── css/
│   └── style.css      # Estilos globais
└── js/
    ├── config.js       # Inicialização do client Supabase
    ├── auth.js         # Lógica de autenticação (login, cadastro, logout, checkAuth, atualizarUsuario)
    ├── clientes.js     # CRUD de clientes, timeline e modais
    └── dashboard.js    # Lógica do dashboard, navegação, filtros e formulários
```

## Como funciona a autenticação

A aplicação usa o Supabase Auth para gerenciar contas de usuário:

* `supabaseClient.auth.signUp()` — cria uma nova conta, salvando o nome do usuário em `user_metadata`
* `supabaseClient.auth.signInWithPassword()` — autentica o usuário
* `supabaseClient.auth.getUser()` / `getSession()` — recupera o usuário autenticado na sessão atual
* `supabaseClient.auth.signOut()` — encerra a sessão
* `checkAuth()` — função auxiliar que protege páginas restritas, redirecionando para o login caso não haja sessão ativa

## Segurança dos dados (Row Level Security)

Sem nenhuma proteção extra, um usuário logado poderia, em teoria, ver ou editar os clientes de outra pessoa — o banco de dados sozinho não sabe "de quem" é cada cliente.

Para evitar isso, cada tabela (`clientes`, `cliente_atividades`) tem uma regra de **Row Level Security (RLS)** diretamente no PostgreSQL, que funciona como um filtro automático: toda vez que alguém tenta ler, criar, editar ou excluir uma linha, o banco verifica se o `user_id` daquela linha é igual ao ID do usuário que está logado (`auth.uid()`). Se não for, a operação é bloqueada — mesmo que a pessoa tente manipular o site pelo navegador.

```sql
CREATE POLICY "clientes_update" ON public.clientes
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

Essa regra diz: "só permita atualizar a linha se o dono dela (`user_id`) for o mesmo usuário autenticado na requisição".

## Exclusão de clientes (soft delete)

Clientes não são removidos permanentemente do banco. Em vez de `DELETE`, a exclusão marca a coluna `deleted_at` com a data/hora atual, e todas as consultas filtram por `deleted_at IS NULL`. Isso preserva o histórico e permite auditoria futura.

## Configuração do projeto

1. Crie um projeto no Supabase.
2. Configure as tabelas `clientes` e `cliente_atividades` com as respectivas políticas de RLS.
3. No arquivo `js/config.js`, informe a URL e a chave pública (anon key) do seu projeto:

```javascript
const SUPABASE_URL = 'SUA_URL_AQUI';
const SUPABASE_ANON_KEY = 'SUA_CHAVE_AQUI';
```

4. Para desenvolvimento local, abra `index.html` em um servidor local (ex: Live Server do VS Code).
5. Para publicação, o projeto pode ser conectado ao **Cloudflare Pages**, que realiza o deploy dos arquivos estáticos do frontend.

Não é necessário build ou instalação de dependências.
