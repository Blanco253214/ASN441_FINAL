const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const db = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Servir archivos estáticos del Frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Endpoint: Monitoreo y Salud (CloudWatch Health Check)
app.get('/api/v1/health', async (req, res) => {
    try {
        await db.query('SELECT 1');
        res.status(200).json({
            status: 'OK',
            service: 'Transporte Cloud API',
            region: process.env.AWS_REGION,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ status: 'ERROR', message: error.message });
    }
});

// Endpoint: Consultar todos los viajes (Vista Operador)
app.get('/api/v1/viajes', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                v.id_viaje,
                v.codigo_seguimiento,
                c.razon_social AS cliente,
                m.nombre_completo AS motorista,
                u.placa AS unidad,
                a.nombre AS aduana,
                v.origen,
                v.destino,
                v.estado_actual,
                v.fecha_creacion
            FROM viaje v
            JOIN cliente c ON v.id_cliente = c.id_cliente
            JOIN motorista m ON v.id_motorista = m.id_motorista
            JOIN unidad u ON v.id_unidad = u.id_unidad
            JOIN aduana a ON v.id_aduana = a.id_aduana
            ORDER BY v.fecha_creacion DESC
        `);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint: Trazabilidad por código (Vista Cliente)
app.get('/api/v1/viajes/rastreo/:codigo', async (req, res) => {
    const { codigo } = req.params;
    try {
        const [viaje] = await db.query(`
            SELECT 
                v.codigo_seguimiento,
                c.razon_social AS cliente,
                v.origen,
                v.destino,
                v.estado_actual,
                v.fecha_creacion
            FROM viaje v
            JOIN cliente c ON v.id_cliente = c.id_cliente
            WHERE v.codigo_seguimiento = ?
        `, [codigo]);

        if (viaje.length === 0) {
            return res.status(404).json({ success: false, message: 'Código no registrado' });
        }

        const [historial] = await db.query(`
            SELECT estado, registrado_por, nota, fecha_hora 
            FROM estado_historial 
            WHERE id_viaje = (SELECT id_viaje FROM viaje WHERE codigo_seguimiento = ?)
            ORDER BY fecha_hora ASC
        `, [codigo]);

        res.json({
            success: true,
            data: {
                detalles: viaje[0],
                historial: historial
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint: Cambiar estado de la carga
app.patch('/api/v1/viajes/:id/estado', async (req, res) => {
    const { id } = req.params;
    const { nuevo_estado, registrado_por, nota } = req.body;

    try {
        await db.query('UPDATE viaje SET estado_actual = ? WHERE id_viaje = ?', [nuevo_estado, id]);
        
        await db.query(`
            INSERT INTO estado_historial (id_viaje, estado, registrado_por, nota) 
            VALUES (?, ?, ?, ?)
        `, [id, nuevo_estado, registrado_por || 'Operador Logístico', nota || 'Actualización de estado']);

        res.json({ success: true, message: `Estado actualizado a '${nuevo_estado}'` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(` Servidor Backend ejecutándose en http://localhost:${PORT}`);
});