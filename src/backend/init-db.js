const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function initDB() {
    try {
        console.log('Conectando a AWS RDS...');
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            multipleStatements: true
        });

        console.log('Conexión establecida. Ejecutando schema.sql...');
        const sqlPath = path.join(__dirname, '../../database/schema.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        await connection.query(sql);
        console.log(' ¡Base de datos y tablas creadas exitosamente en AWS RDS!');
        await connection.end();
    } catch (error) {
        console.error(' Error inicializando la base de datos:', error.message);
    }
}

initDB();