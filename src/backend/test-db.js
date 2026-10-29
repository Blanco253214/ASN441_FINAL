const mysql = require('mysql2/promise');
require('dotenv').config();

async function auditarTablas() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('\n=============================================================');
        console.log(' AUDITORÍA DE TABLAS Y REGISTROS EN AWS RDS (MySQL)');
        console.log('=============================================================\n');

        // 1. Clientes
        const [clientes] = await connection.query('SELECT id_cliente, razon_social, plan_servicio FROM cliente');
        console.log('--- 1. TABLA CLIENTES ---');
        console.table(clientes);

        // 2. Motoristas y Unidades
        const [motoristas] = await connection.query('SELECT id_motorista, nombre_completo, licencia FROM motorista');
        console.log('\n--- 2. TABLA MOTORISTAS ---');
        console.table(motoristas);

        const [unidades] = await connection.query('SELECT id_unidad, placa, tipo, capacidad_toneladas FROM unidad');
        console.log('\n--- 3. TABLA UNIDADES (CAMIONES) ---');
        console.table(unidades);

        // 3. Boletas registradas
        const [boletas] = await connection.query('SELECT numero_boleta, descripcion_mercancia, peso_kg, valor_declarado_usd FROM boleta');
        console.log('\n--- 4. TABLA BOLETAS DE CARGA ---');
        console.table(boletas);

        // 4. Historial de Cambios de Estado (Trazabilidad SQL)
        const [historial] = await connection.query(`
            SELECT 
                h.id_historial,
                v.codigo_seguimiento,
                h.estado,
                h.registrado_por,
                h.nota,
                h.fecha_hora
            FROM estado_historial h
            JOIN viaje v ON h.id_viaje = v.id_viaje
            ORDER BY h.fecha_hora ASC
        `);
        console.log('\n--- 5. TABLA HISTORIAL DE ESTADOS (TRAZABILIDAD) ---');
        console.table(historial);

        await connection.end();
    } catch (error) {
        console.error('Error durante la auditoría:', error.message);
    }
}

auditarTablas();