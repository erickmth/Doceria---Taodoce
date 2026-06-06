# Tão Doce Quanto Ella — Sistema Web

Doceria boutique com site para clientes e painel administrativo.

## Estrutura

```
doceria/
├── app.py              ← Backend Flask (API REST + rotas)
├── requirements.txt    ← Dependências Python
├── index.html          ← Site do cliente
├── admin.html          ← Painel administrativo
├── doceria.db          ← Banco SQLite (gerado automaticamente)
├── uploads/            ← Imagens dos produtos
└── static/
    ├── css/
    │   ├── style.css   ← Estilos do site
    │   └── admin.css   ← Estilos do admin
    └── js/
        ├── app.js      ← JavaScript do site
        └── admin.js    ← JavaScript do admin
```

## Deploy no PythonAnywhere

### 1. Fazer upload dos arquivos
No painel do PythonAnywhere, faça upload de todos os arquivos para
`/home/banco/doceria/` (ou o diretório do seu usuário).

### 2. Instalar dependências
No console Bash:
```bash
cd ~/doceria
pip install -r requirements.txt
```

### 3. Configurar Web App
- Vá em **Web** → **Add a new web app**
- Escolha **Flask** e Python 3.10+
- Source code: `/home/banco/doceria`
- Working directory: `/home/banco/doceria`
- WSGI file: edite para apontar ao `app.py`

### 4. WSGI file
Edite o arquivo WSGI gerado pelo PythonAnywhere:
```python
import sys
sys.path.insert(0, '/home/banco/doceria')
from app import app as application
# Inicializar banco
from app import init_db
init_db()
```

### 5. Static files
Em **Web** → **Static files**:
- URL: `/static/`  →  Directory: `/home/banco/doceria/static`
- URL: `/uploads/` →  Directory: `/home/banco/doceria/uploads`

### 6. Criar pasta uploads
```bash
mkdir -p ~/doceria/uploads
```

### 7. Reload
Clique em **Reload** no painel Web.

## Acesso

- **Site:** `https://banco.pythonanywhere.com/`
- **Admin:** `https://banco.pythonanywhere.com/admin`
- **Senha padrão:** `ella2024`

⚠️ **Importante:** Troque a senha padrão editando `ADMIN_PASSWORD` no `app.py`!

## Configurar WhatsApp

1. Acesse o admin em `/admin`
2. Vá em **Configurações**
3. Preencha o WhatsApp no formato: `5511999999999` (DDI+DDD+número, sem espaços)

## Funcionalidades

### Site do cliente
- ✅ Hero elegante com identidade visual da marca
- ✅ Seção de destaques
- ✅ Catálogo com filtros por categoria
- ✅ Carrinho lateral completo
- ✅ Finalização com envio automático pelo WhatsApp
- ✅ Seção Sobre (homenagem à Ella/Manoella)
- ✅ Informações de contato dinâmicas
- ✅ Responsivo (mobile-first)

### Painel Admin
- ✅ Login protegido por senha
- ✅ Dashboard com estatísticas
- ✅ CRUD completo de produtos
- ✅ Upload de imagens (JPG, PNG, WEBP)
- ✅ Ativar/desativar produtos
- ✅ Configurações da loja (WhatsApp, Instagram, endereço, horário)

## API Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/login` | Login admin |
| GET | `/api/produtos` | Listar produtos |
| POST | `/api/produtos` | Criar produto *(admin)* |
| PUT | `/api/produtos/:id` | Editar produto *(admin)* |
| POST | `/api/produtos/:id/toggle` | Ativar/desativar *(admin)* |
| DELETE | `/api/produtos/:id` | Excluir *(admin)* |
| GET | `/api/configuracoes` | Ler configurações |
| PUT | `/api/configuracoes` | Salvar configurações *(admin)* |
| GET | `/api/stats` | Estatísticas *(admin)* |

*Rotas marcadas com (admin) requerem o header `X-Admin-Password`.*
