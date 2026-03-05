const mysql = require('mysql2');

c// server.js
const db = mysql.createConnection({
    host: process.env.DB_HOST, 
    port: process.env.DB_PORT, // 15708 en tu caso
    user: process.env.DB_USER, // avnadmin
    password: process.env.DB_PASSWORD, // Aquí irá la clave secreta
    database: 'defaultdb',
    ssl: { rejectUnauthorized: false }
});

const sql = `
CREATE TABLE IF NOT EXISTS movimientos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vendedor VARCHAR(100),
    cliente VARCHAR(100),
    tipo VARCHAR(50),
    cantidad INT,
    concepto VARCHAR(255),
    total DECIMAL(15,2),
    saldo DECIMAL(15,2),
    fecha VARCHAR(50),
    evidencia TEXT
);`;

db.connect(err => {
    if (err) throw err;
    db.query(sql, (err, result) => {
        if (err) throw err;
        console.log("✅ ¡Tabla 'movimientos' creada con éxito en Aiven!");
        process.exit();
    });
});