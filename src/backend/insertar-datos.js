const mysql = require('mysql2/promise');
require('dotenv').config();

async function agregarNuevoViaje() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('Conectando a AWS RDS para insertar nuevos registros...');

        // 1. Definir los datos del nuevo viaje
        const codigoTracking = `TRP-2026-00${Math.floor(Math.random() * 900) + 100}`; // Genera código único ej: TRP-2026-342
        const idCliente = 2;   // Comercializadora Textil SV
        const idMotorista = 2; // Roberto Gomez
        const idUnidad = 2;    // C-90411
        const idOperador = 2;  // Sofia Rivas
        const idAduana = 2;    // Aduana El Amatillo
        const origen = 'Puerto Barrios, Guatemala';
        const destino = 'Zona Franca San Bartolo, El Salvador';

        // 2. Insertar el Viaje
        const [resultViaje] = await connection.query(`
            INSERT INTO viaje (codigo_seguimiento, id_cliente, id_motorista, id_unidad, id_operador, id_aduana, origen, destino, estado_actual)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Programada')
        `, [codigoTracking, idCliente, idMotorista, idUnidad, idOperador, idAduana, origen, destino]);

        const idViajeCreado = resultViaje.insertId;

        // 3. Insertar la Boleta asociada al Viaje
        const numeroBoleta = `BOL-2026-${Math.floor(Math.random() * 9000) + 1000}`;
        await connection.query(`
            INSERT INTO boleta (numero_boleta, id_viaje, descripcion_mercancia, peso_kg, valor_declarado_usd)
            VALUES (?, ?, 'Lote de maquinaria industrial y repuestos', 14200.00, 68000.00)
        `, [numeroBoleta, idViajeCreado]);

        // 4. Insertar el Historial Inicial
        await connection.query(`
            INSERT INTO estado_historial (id_viaje, estado, registrado_por, nota)
            VALUES (?, 'Programada', 'Sofia Rivas (Operador)', 'Carga registrada y lista para asignación')
        `, [idViajeCreado]);

        console.log(`\n ¡Viaje agregado exitosamente!`);
        console.log(` Código de Seguimiento: ${codigoTracking}`);
        console.log(` Número de Boleta: ${numeroBoleta}\n`);

        await connection.end();
    } catch (error) {
        console.error(' Error insertando datos:', error.message);
    }
}

agregarNuevoViaje();