import os
import uuid
import sqlite3
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory, g
from werkzeug.utils import secure_filename
from functools import wraps

app = Flask(__name__, static_folder='static')
app.config['SECRET_KEY'] = 'tao-doce-quanto-ella-secret-2024'
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10MB
app.config['ALLOWED_EXTENSIONS'] = {'jpg', 'jpeg', 'png', 'webp'}

DATABASE = 'doceria.db'
ADMIN_PASSWORD = 'ella2024'

# ─── Database ────────────────────────────────────────────────────────────────

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def init_db():
    with app.app_context():
        db = get_db()
        db.executescript('''
            CREATE TABLE IF NOT EXISTS produtos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                descricao TEXT,
                preco REAL NOT NULL,
                imagem TEXT,
                categoria TEXT DEFAULT 'geral',
                ativo INTEGER DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS configuracoes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                whatsapp TEXT DEFAULT '',
                instagram TEXT DEFAULT '',
                endereco TEXT DEFAULT '',
                horario_funcionamento TEXT DEFAULT ''
            );
        ''')

        # Seed configurações padrão
        existing = db.execute('SELECT COUNT(*) as c FROM configuracoes').fetchone()
        if existing['c'] == 0:
            db.execute('''INSERT INTO configuracoes (whatsapp, instagram, endereco, horario_funcionamento)
                          VALUES (?, ?, ?, ?)''',
                       ('5511999999999', '@taodocequeella',
                        'Rua das Flores, 123 – Bairro Jardim', 'Seg a Sex: 9h–18h | Sáb: 9h–14h'))

        # Seed produtos de exemplo
        count = db.execute('SELECT COUNT(*) as c FROM produtos').fetchone()
        if count['c'] == 0:
            produtos_seed = [
                ('Brigadeiro Gourmet', 'Brigadeiro artesanal de chocolate belga com granulado crocante', 6.50, None, 'docinhos'),
                ('Bolo de Pote Ninho', 'Camadas de bolo fofinho com creme de leite ninho e morangos frescos', 18.00, None, 'bolos de pote'),
                ('Trufa de Maracujá', 'Trufa cremosa de chocolate branco com recheio de maracujá', 8.00, None, 'trufas'),
                ('Caixa de Doces Sortidos', 'Caixa com 12 doces finos artesanais para presentear', 75.00, None, 'caixas'),
                ('Bolo de Pote Red Velvet', 'Clássico red velvet em pote individual com cream cheese', 20.00, None, 'bolos de pote'),
                ('Brownie Recheado', 'Brownie intenso de cacau com recheio de doce de leite belga', 14.00, None, 'bolos'),
            ]
            for p in produtos_seed:
                db.execute('INSERT INTO produtos (nome, descricao, preco, imagem, categoria) VALUES (?,?,?,?,?)', p)

        db.commit()

# ─── Helpers ─────────────────────────────────────────────────────────────────

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

def row_to_dict(row):
    return dict(row)

def check_admin(password):
    return password == ADMIN_PASSWORD

# ─── CORS ────────────────────────────────────────────────────────────────────

@app.after_request
def add_cors(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE,OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization,X-Admin-Password'
    return response

@app.route('/', defaults={'path': ''}, methods=['OPTIONS'])
@app.route('/<path:path>', methods=['OPTIONS'])
def handle_options(path):
    return jsonify({}), 200

# ─── Auth middleware ──────────────────────────────────────────────────────────

def require_admin(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        password = request.headers.get('X-Admin-Password') or request.args.get('password')
        if not check_admin(password):
            return jsonify({'error': 'Não autorizado'}), 401
        return f(*args, **kwargs)
    return decorated

# ─── Auth ────────────────────────────────────────────────────────────────────

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    if check_admin(data.get('password', '')):
        return jsonify({'success': True, 'token': ADMIN_PASSWORD})
    return jsonify({'error': 'Senha incorreta'}), 401

# ─── Produtos ────────────────────────────────────────────────────────────────

@app.route('/api/produtos', methods=['GET'])
def get_produtos():
    db = get_db()
    admin = request.headers.get('X-Admin-Password') == ADMIN_PASSWORD
    if admin:
        rows = db.execute('SELECT * FROM produtos ORDER BY created_at DESC').fetchall()
    else:
        rows = db.execute('SELECT * FROM produtos WHERE ativo=1 ORDER BY created_at DESC').fetchall()
    return jsonify([row_to_dict(r) for r in rows])

@app.route('/api/produtos/<int:pid>', methods=['GET'])
def get_produto(pid):
    db = get_db()
    row = db.execute('SELECT * FROM produtos WHERE id=?', (pid,)).fetchone()
    if not row:
        return jsonify({'error': 'Produto não encontrado'}), 404
    return jsonify(row_to_dict(row))

@app.route('/api/produtos', methods=['POST'])
@require_admin
def create_produto():
    db = get_db()
    nome = request.form.get('nome', '').strip()
    descricao = request.form.get('descricao', '').strip()
    preco_str = request.form.get('preco', '0')
    categoria = request.form.get('categoria', 'geral').strip()

    if not nome:
        return jsonify({'error': 'Nome é obrigatório'}), 400
    try:
        preco = float(preco_str.replace(',', '.'))
    except ValueError:
        return jsonify({'error': 'Preço inválido'}), 400

    imagem = None
    if 'imagem' in request.files:
        file = request.files['imagem']
        if file and file.filename and allowed_file(file.filename):
            ext = file.filename.rsplit('.', 1)[1].lower()
            filename = f"{uuid.uuid4().hex}.{ext}"
            os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
            imagem = filename

    cur = db.execute(
        'INSERT INTO produtos (nome, descricao, preco, imagem, categoria) VALUES (?,?,?,?,?)',
        (nome, descricao, preco, imagem, categoria)
    )
    db.commit()
    row = db.execute('SELECT * FROM produtos WHERE id=?', (cur.lastrowid,)).fetchone()
    return jsonify(row_to_dict(row)), 201

@app.route('/api/produtos/<int:pid>', methods=['PUT'])
@require_admin
def update_produto(pid):
    db = get_db()
    row = db.execute('SELECT * FROM produtos WHERE id=?', (pid,)).fetchone()
    if not row:
        return jsonify({'error': 'Produto não encontrado'}), 404

    nome = request.form.get('nome', row['nome']).strip()
    descricao = request.form.get('descricao', row['descricao']).strip()
    preco_str = request.form.get('preco', str(row['preco']))
    categoria = request.form.get('categoria', row['categoria']).strip()
    ativo_str = request.form.get('ativo', str(row['ativo']))
    ativo = 1 if str(ativo_str) in ('1', 'true', 'True') else 0

    try:
        preco = float(preco_str.replace(',', '.'))
    except ValueError:
        return jsonify({'error': 'Preço inválido'}), 400

    imagem = row['imagem']
    if 'imagem' in request.files:
        file = request.files['imagem']
        if file and file.filename and allowed_file(file.filename):
            ext = file.filename.rsplit('.', 1)[1].lower()
            filename = f"{uuid.uuid4().hex}.{ext}"
            os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
            imagem = filename

    db.execute(
        'UPDATE produtos SET nome=?, descricao=?, preco=?, imagem=?, categoria=?, ativo=? WHERE id=?',
        (nome, descricao, preco, imagem, categoria, ativo, pid)
    )
    db.commit()
    updated = db.execute('SELECT * FROM produtos WHERE id=?', (pid,)).fetchone()
    return jsonify(row_to_dict(updated))

@app.route('/api/produtos/<int:pid>/toggle', methods=['POST'])
@require_admin
def toggle_produto(pid):
    db = get_db()
    row = db.execute('SELECT * FROM produtos WHERE id=?', (pid,)).fetchone()
    if not row:
        return jsonify({'error': 'Produto não encontrado'}), 404
    novo = 0 if row['ativo'] == 1 else 1
    db.execute('UPDATE produtos SET ativo=? WHERE id=?', (novo, pid))
    db.commit()
    return jsonify({'ativo': novo})

@app.route('/api/produtos/<int:pid>', methods=['DELETE'])
@require_admin
def delete_produto(pid):
    db = get_db()
    row = db.execute('SELECT * FROM produtos WHERE id=?', (pid,)).fetchone()
    if not row:
        return jsonify({'error': 'Produto não encontrado'}), 404
    if row['imagem']:
        try:
            os.remove(os.path.join(app.config['UPLOAD_FOLDER'], row['imagem']))
        except:
            pass
    db.execute('DELETE FROM produtos WHERE id=?', (pid,))
    db.commit()
    return jsonify({'success': True})

# ─── Configurações ───────────────────────────────────────────────────────────

@app.route('/api/configuracoes', methods=['GET'])
def get_configuracoes():
    db = get_db()
    row = db.execute('SELECT * FROM configuracoes LIMIT 1').fetchone()
    return jsonify(row_to_dict(row) if row else {})

@app.route('/api/configuracoes', methods=['PUT'])
@require_admin
def update_configuracoes():
    db = get_db()
    data = request.get_json() or {}
    row = db.execute('SELECT * FROM configuracoes LIMIT 1').fetchone()
    if row:
        db.execute('''UPDATE configuracoes SET whatsapp=?, instagram=?, endereco=?, horario_funcionamento=? WHERE id=?''',
                   (data.get('whatsapp', ''), data.get('instagram', ''),
                    data.get('endereco', ''), data.get('horario_funcionamento', ''), row['id']))
    else:
        db.execute('''INSERT INTO configuracoes (whatsapp, instagram, endereco, horario_funcionamento) VALUES (?,?,?,?)''',
                   (data.get('whatsapp', ''), data.get('instagram', ''),
                    data.get('endereco', ''), data.get('horario_funcionamento', '')))
    db.commit()
    updated = db.execute('SELECT * FROM configuracoes LIMIT 1').fetchone()
    return jsonify(row_to_dict(updated))

# ─── Stats ───────────────────────────────────────────────────────────────────

@app.route('/api/stats', methods=['GET'])
@require_admin
def get_stats():
    db = get_db()
    total = db.execute('SELECT COUNT(*) as c FROM produtos').fetchone()['c']
    ativos = db.execute('SELECT COUNT(*) as c FROM produtos WHERE ativo=1').fetchone()['c']
    inativos = db.execute('SELECT COUNT(*) as c FROM produtos WHERE ativo=0').fetchone()['c']
    return jsonify({'total': total, 'ativos': ativos, 'inativos': inativos})

# ─── Static files ─────────────────────────────────────────────────────────────

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/admin')
def admin():
    return send_from_directory('.', 'admin.html')

@app.route('/<path:filename>')
def serve_static(filename):
    if os.path.exists(filename):
        return send_from_directory('.', filename)
    return 'Not found', 404

# ─── Init ─────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    os.makedirs('uploads', exist_ok=True)
    init_db()
    app.run(debug=True, host='0.0.0.0', port=5000)
