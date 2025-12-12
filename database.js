const mysql = require('mysql2/promise');
const crypto = require('crypto');
const speakeasy = require('speakeasy');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'sistema_plantas'  // ← NOME DO SEU BANCO
});

function criarHash(senha) {
    return crypto.createHash('sha256').update(senha).digest('hex');
}

async function cadastrarUsuario(nome, email, senha) {
    const senhaHash = criarHash(senha);
    
    const secret = speakeasy.generateSecret({
        length: 20,
        name: `AmantePlantas:${email}`
    }).base32;
    
    try {
        const [result] = await pool.execute(
            'INSERT INTO usuarios (nome, email, senha_hash, dois_fa_secret) VALUES (?, ?, ?, ?)',
            [nome, email, senhaHash, secret]
        );
        
        return { 
            success: true, 
            id: result.insertId
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function loginUsuario(email, senha) {
    const senhaHash = criarHash(senha);
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM usuarios WHERE email = ? AND senha_hash = ?',
            [email, senhaHash]
        );
        
        if (rows.length > 0) {
            // Gera código de 6 dígitos
            const codigo2FA = Math.floor(100000 + Math.random() * 900000).toString();
            const expiraEm = new Date(Date.now() + 10 * 60000);
            
            // Cria tabela de sessões se não existir
            await pool.execute(`
                CREATE TABLE IF NOT EXISTS sessoes_2fa (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    usuario_id INT,
                    codigo VARCHAR(6),
                    expira_em DATETIME
                )
            `);
            
            await pool.execute(
                'INSERT INTO sessoes_2fa (usuario_id, codigo, expira_em) VALUES (?, ?, ?)',
                [rows[0].id, codigo2FA, expiraEm]
            );
            
            return { 
                success: true, 
                usuario: {
                    id: rows[0].id,
                    nome: rows[0].nome,
                    email: rows[0].email
                },
                precisa2FA: true,
                codigo2FA: codigo2FA
            };
        } else {
            return { success: false, error: 'Email ou senha incorretos' };
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function verificar2FA(usuarioId, codigo) {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM sessoes_2fa WHERE usuario_id = ? AND codigo = ? AND expira_em > NOW()',
            [usuarioId, codigo]
        );
        
        if (rows.length > 0) {
            await pool.execute('DELETE FROM sessoes_2fa WHERE id = ?', [rows[0].id]);
            
            const [usuario] = await pool.execute(
                'SELECT * FROM usuarios WHERE id = ?',
                [usuarioId]
            );
            
            return { 
                success: true, 
                usuario: {
                    id: usuario[0].id,
                    nome: usuario[0].nome,
                    email: usuario[0].email,
                    data: usuario[0].data_cadastro
                }
            };
        } else {
            return { success: false, error: 'Código inválido ou expirado' };
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
}

module.exports = { 
    cadastrarUsuario, 
    loginUsuario, 
    verificar2FA,
    criarHash 
};