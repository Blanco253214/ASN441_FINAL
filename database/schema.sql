-- =============================================================================
-- SISTEMA DE CONTROL DE BOLETAS Y VISIBILIDAD DE CARGA TERRESTRE (AWS RDS MySQL)
-- Proyecto de Cátedra - Administración de Servicios en la Nube
-- =============================================================================

CREATE DATABASE IF NOT EXISTS db_transporte_cloud
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_unicode_ci;

USE db_transporte_cloud;

-- Desactivar temporalmente revisión de llaves foráneas para reinicio limpio
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS auditoria;
DROP TABLE IF EXISTS evidencia;
DROP TABLE IF EXISTS factura;
DROP TABLE IF EXISTS estado_historial;
DROP TABLE IF EXISTS boleta;
DROP TABLE IF EXISTS viaje;
DROP TABLE IF EXISTS aduana;
DROP TABLE IF EXISTS operador;
DROP TABLE IF EXISTS unidad;
DROP TABLE IF EXISTS motorista;
DROP TABLE IF EXISTS cliente;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Tabla: cliente
CREATE TABLE cliente (
    id_cliente INT AUTO_INCREMENT PRIMARY KEY,
    razon_social VARCHAR(150) NOT NULL,
    nit_cuit VARCHAR(30) NOT NULL UNIQUE,
    contacto_nombre VARCHAR(100) NOT NULL,
    contacto_email VARCHAR(100) NOT NULL,
    contacto_telefono VARCHAR(20) NOT NULL,
    plan_servicio ENUM('estandar', 'prioritario') DEFAULT 'estandar',
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Tabla: motorista
CREATE TABLE motorista (
    id_motorista INT AUTO_INCREMENT PRIMARY KEY,
    nombre_completo VARCHAR(120) NOT NULL,
    licencia VARCHAR(50) NOT NULL UNIQUE,
    telefono VARCHAR(20) NOT NULL,
    cognito_sub VARCHAR(100) DEFAULT NULL, -- UUID asignado en Amazon Cognito
    estado ENUM('disponible', 'en_ruta', 'inactivo') DEFAULT 'disponible'
) ENGINE=InnoDB;

-- 3. Tabla: unidad (Vehículo / Camión)
CREATE TABLE unidad (
    id_unidad INT AUTO_INCREMENT PRIMARY KEY,
    placa VARCHAR(20) NOT NULL UNIQUE,
    tipo VARCHAR(50) NOT NULL, -- ej. 'Cabezal', 'Contenedor 40ft'
    capacidad_toneladas DECIMAL(8,2) NOT NULL,
    dispositivo_gps_id VARCHAR(100) NOT NULL,
    estado ENUM('disponible', 'en_viaje', 'mantenimiento') DEFAULT 'disponible'
) ENGINE=InnoDB;

-- 4. Tabla: operador (Personal logístico interno)
CREATE TABLE operador (
    id_operador INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    turno ENUM('dia', 'noche') NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    cognito_sub VARCHAR(100) DEFAULT NULL
) ENGINE=InnoDB;

-- 5. Tabla: aduana
CREATE TABLE aduana (
    id_aduana INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    pais VARCHAR(50) NOT NULL, -- ej. 'El Salvador', 'Guatemala', 'Honduras'
    ubicacion VARCHAR(150) NOT NULL
) ENGINE=InnoDB;

-- 6. Tabla: viaje (Núcleo de la operación)
CREATE TABLE viaje (
    id_viaje INT AUTO_INCREMENT PRIMARY KEY,
    codigo_seguimiento VARCHAR(20) NOT NULL UNIQUE, -- Código/Huella para el cliente
    id_cliente INT NOT NULL,
    id_motorista INT NOT NULL,
    id_unidad INT NOT NULL,
    id_operador INT NOT NULL,
    id_aduana INT NOT NULL,
    origen VARCHAR(150) NOT NULL,
    destino VARCHAR(150) NOT NULL,
    estado_actual ENUM('Programada', 'En aduana', 'Despachada', 'En camino', 'Entregada', 'Lista para retiro') DEFAULT 'Programada',
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_entrega_estimada DATETIME NULL,
    FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente),
    FOREIGN KEY (id_motorista) REFERENCES motorista(id_motorista),
    FOREIGN KEY (id_unidad) REFERENCES unidad(id_unidad),
    FOREIGN KEY (id_operador) REFERENCES operador(id_operador),
    FOREIGN KEY (id_aduana) REFERENCES aduana(id_aduana)
) ENGINE=InnoDB;

-- 7. Tabla: boleta (Documento de carga)
CREATE TABLE boleta (
    id_boleta INT AUTO_INCREMENT PRIMARY KEY,
    numero_boleta VARCHAR(50) NOT NULL UNIQUE,
    id_viaje INT NOT NULL,
    descripcion_mercancia TEXT NOT NULL,
    peso_kg DECIMAL(10,2) NOT NULL,
    valor_declarado_usd DECIMAL(12,2) NOT NULL,
    s3_pdf_url VARCHAR(255) NULL, -- Referencia al PDF de la boleta guardado en Amazon S3
    fecha_emision DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_viaje) REFERENCES viaje(id_viaje) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 8. Tabla: estado_historial (Trazabilidad del flujo de carga)
CREATE TABLE estado_historial (
    id_historial INT AUTO_INCREMENT PRIMARY KEY,
    id_viaje INT NOT NULL,
    estado ENUM('Programada', 'En aduana', 'Despachada', 'En camino', 'Entregada', 'Lista para retiro') NOT NULL,
    registrado_por VARCHAR(100) NOT NULL, -- Nombre de usuario / Rol que cambió el estado
    nota TEXT NULL,
    fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_viaje) REFERENCES viaje(id_viaje) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 9. Tabla: evidencia (Fotografías y firmas almacenadas en S3)
CREATE TABLE evidencia (
    id_evidencia INT AUTO_INCREMENT PRIMARY KEY,
    id_viaje INT NOT NULL,
    tipo ENUM('foto_carga', 'firma_recepcion', 'documento_aduanal') NOT NULL,
    s3_key VARCHAR(255) NOT NULL, -- Key del objeto dentro del bucket trp-documentos
    s3_bucket VARCHAR(100) NOT NULL DEFAULT 'trp-documentos',
    subido_por VARCHAR(100) NOT NULL,
    fecha_carga DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_viaje) REFERENCES viaje(id_viaje) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 10. Tabla: factura
CREATE TABLE factura (
    id_factura INT AUTO_INCREMENT PRIMARY KEY,
    numero_factura VARCHAR(50) NOT NULL UNIQUE,
    id_viaje INT NOT NULL UNIQUE,
    monto_subtotal DECIMAL(10,2) NOT NULL,
    monto_impuestos DECIMAL(10,2) NOT NULL,
    monto_total DECIMAL(10,2) NOT NULL,
    estado ENUM('generada', 'pagada', 'anulada') DEFAULT 'generada',
    s3_factura_url VARCHAR(255) NULL,
    fecha_emision DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_viaje) REFERENCES viaje(id_viaje)
) ENGINE=InnoDB;

-- 11. Tabla: auditoria (Seguridad y cumplimiento)
CREATE TABLE auditoria (
    id_auditoria INT AUTO_INCREMENT PRIMARY KEY,
    usuario VARCHAR(100) NOT NULL,
    accion VARCHAR(100) NOT NULL,
    detalles TEXT NULL,
    ip_origen VARCHAR(45) NULL,
    fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =============================================================================
-- DATOS SEMILLA (SEED DATA PARA PRUEBAS RÁPIDAS EN LA DEMO)
-- =============================================================================

INSERT INTO cliente (razon_social, nit_cuit, contacto_nombre, contacto_email, contacto_telefono, plan_servicio) VALUES
('Naviera Del Pacifico S.A.', '0614-150890-101-1', 'Carlos Mendoza', 'cmendoza@navierapacifico.com', '+503 7890-1234', 'prioritario'),
('Comercializadora Textil SV', '0614-200195-102-3', 'Ana Lopez', 'alopez@textilsv.com', '+503 7123-4567', 'estandar');

INSERT INTO motorista (nombre_completo, licencia, telefono) VALUES
('Juan Carlos Perez', 'LIC-SV-99482', '+503 7000-1111'),
('Roberto Gomez', 'LIC-SV-88310', '+503 7000-2222');

INSERT INTO unidad (placa, tipo, capacidad_toneladas, dispositivo_gps_id) VALUES
('C-89123', 'Cabezal Freightliner', 22.50, 'GPS-TRACKER-001'),
('C-90411', 'Cabezal International', 25.00, 'GPS-TRACKER-002');

INSERT INTO operador (nombre, turno, telefono) VALUES
('Diego Torres', 'dia', '+503 7555-8888'),
('Sofia Rivas', 'noche', '+503 7555-9999');

INSERT INTO aduana (nombre, pais, ubicacion) VALUES
('Aduana Terrestre La Hortaliza / San Bartolo', 'El Salvador', 'Ilopango, San Salvador'),
('Aduana El Amatillo', 'El Salvador', 'Pasaquina, La Union');

INSERT INTO viaje (codigo_seguimiento, id_cliente, id_motorista, id_unidad, id_operador, id_aduana, origen, destino, estado_actual) VALUES
('TRP-2026-001', 1, 1, 1, 1, 1, 'Puerto de Acajutla', 'Zona Franca San Marcos', 'En aduana');

INSERT INTO boleta (numero_boleta, id_viaje, descripcion_mercancia, peso_kg, valor_declarado_usd) VALUES
('BOL-2026-1001', 1, 'Contenedor 40ft con materia prima textil', 18500.00, 45000.00);

INSERT INTO estado_historial (id_viaje, estado, registrado_por, nota) VALUES
(1, 'Programada', 'Diego Torres (Operador)', 'Viaje creado y unidad C-89123 asignada'),
(1, 'En aduana', 'Juan Carlos Perez (Motorista)', 'Unidad ingresó a rampa de inspección aduanal');