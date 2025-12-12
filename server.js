const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// ROTAS
app.post('/api/register', async (req, res) => {
    const resultado = await db.cadastrarUsuario(req.body.nome, req.body.email, req.body.senha);
    res.json(resultado);
});

app.post('/api/login', async (req, res) => {
    const resultado = await db.loginUsuario(req.body.email, req.body.senha);
    res.json(resultado);
});

app.post('/api/verify-2fa', async (req, res) => {
    const resultado = await db.verificar2FA(req.body.usuarioId, req.body.codigo);
    res.json(resultado);
});

app.get('/api/hash/:senha', (req, res) => {
    res.json({ 
        senha: req.params.senha, 
        hash: db.criarHash(req.params.senha) 
    });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
    console.log(`✅ Servidor: http://localhost:${PORT}`);
    console.log(`🔐 API: http://localhost:${PORT}/api`);
});