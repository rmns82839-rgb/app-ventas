const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Para permitir el envío de fotos

// --- CONFIGURACIÓN DE AIVEN (MySQL) ---
// En lugar de escribir la contraseña real, usamos process.env
const db = mysql.createConnection({
    host: process.env.DB_HOST, 
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'defaultdb',
    ssl: { rejectUnauthorized: false }
});

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_NAME, 
  api_key: process.env.CLOUDINARY_KEY, 
  api_secret: process.env.CLOUDINARY_SECRET 
});

db.connect(err => {
    if (err) {
        console.error('❌ Error en Aiven:', err);
        return;
    }
    console.log('✅ Conectado a Aiven MySQL');
});

// RUTA: Subir foto a Cloudinary
app.post('/api/subir-foto', async (req, res) => {
    try {
        const fileStr = req.body.data;
        const uploadResponse = await cloudinary.uploader.upload(fileStr, {
            folder: "fotos_ventas"
        });
        res.json({ url: uploadResponse.secure_url });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al subir imagen' });
    }
});

// RUTA: Guardar movimiento en Aiven
app.post('/api/movimientos', (req, res) => {
    const m = req.body;
    const query = `INSERT INTO movimientos (vendedor, cliente, tipo, cantidad, concepto, total, saldo, fecha, evidencia) VALUES (?,?,?,?,?,?,?,?,?)`;
    db.query(query, [m.vendedor, m.cliente, m.tipo, m.cantidad, m.concepto, m.total, m.saldo, m.fecha, m.evidencia], (err) => {
        if (err) return res.status(500).send(err);
        res.json({ message: "Sincronizado correctamente" });
    });
});

// RUTA: Cargar historial
app.get('/api/movimientos', (req, res) => {
    db.query('SELECT * FROM movimientos ORDER BY id DESC', (err, results) => {
        if (err) return res.status(500).send(err);
        res.json(results);
    });
});

app.listen(3000, () => {
    console.log('🚀 Servidor corriendo en http://localhost:3000');
});

// RUTA: Actualizar saldo de una deuda (Abonar)
app.put('/api/pagar', (req, res) => {
    const { id, abono } = req.body;
    
    // Primero obtenemos el saldo actual para restarle el abono
    const queryBusqueda = "SELECT saldo FROM movimientos WHERE id = ?";
    
    db.query(queryBusqueda, [id], (err, results) => {
        if (err || results.length === 0) return res.status(500).send("Error al buscar registro");

        const nuevoSaldo = results[0].saldo - abono;

        // Actualizamos el saldo en la base de datos
        const queryUpdate = "UPDATE movimientos SET saldo = ? WHERE id = ?";
        db.query(queryUpdate, [nuevoSaldo, id], (err) => {
            if (err) return res.status(500).send(err);
            res.json({ message: "Pago procesado", nuevoSaldo: nuevoSaldo });
        });
    });
});