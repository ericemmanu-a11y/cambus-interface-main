-- =============================================
-- CAMBUS: Script Final de Base de Datos
-- PostgreSQL 16 | Febrero 2026
-- =============================================

-- CREAR LA BASE DE DATOS Y CONECTARSE
-- DROP DATABASE IF EXISTS cambus_db;
-- CREATE DATABASE cambus_db;
-- \c cambus_db;

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS pgcrypto;  

-- =========================================================
-- SECCIÓN 1: TABLAS DE ADMINISTRACIÓN Y CATÁLOGOS
-- =========================================================

CREATE TABLE usuarios (
    id_usuario     SERIAL PRIMARY KEY,
    nombre_usuario VARCHAR(100) NOT NULL,
    correo         VARCHAR(150) UNIQUE NOT NULL,
    password_hash  VARCHAR(255) NOT NULL,
    rol            VARCHAR(20)  NOT NULL
                   CHECK (rol IN ('admin', 'supervisor', 'operador')),
    activo         BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE camaras (
    id_camara     SERIAL PRIMARY KEY,
    nombre_camara VARCHAR(50)  NOT NULL,
    ip_local      VARCHAR(15),
    modelo        VARCHAR(50)  DEFAULT 'DH-IPC-B1E40',
    ubicacion     VARCHAR(100),
    estado        VARCHAR(15)  DEFAULT 'activa'
                  CHECK (estado IN ('activa', 'inactiva', 'mantenimiento')),
    fecha_alta    TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE andenes (
    id_anden      SERIAL PRIMARY KEY,
    numero_anden  INTEGER UNIQUE NOT NULL
                  CHECK (numero_anden BETWEEN 1 AND 200),
    id_camara     INTEGER REFERENCES camaras(id_camara),
    zona          VARCHAR(30),  
    estado_actual VARCHAR(15)  DEFAULT 'libre'
                  CHECK (estado_actual IN ('libre', 'ocupado', 'fuera_servicio'))
);

-- =========================================================
-- SECCIÓN 2: TABLA PRINCIPAL CON PARTICIONAMIENTO
-- =========================================================

CREATE TABLE registros_vehiculos (
    id_registro         SERIAL,
    placa               VARCHAR(15)   NOT NULL,
    id_anden            INTEGER       REFERENCES andenes(id_anden),
    id_camara           INTEGER       REFERENCES camaras(id_camara),
    fecha_hora_entrada  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    fecha_hora_salida   TIMESTAMPTZ,
    confianza_placa     NUMERIC(5,2)
                        CHECK (confianza_placa BETWEEN 0 AND 100),
    ruta_imagen         VARCHAR(255),
    hash_imagen         CHAR(64),     
    evento              VARCHAR(10)   NOT NULL
                        CHECK (evento IN ('entrada', 'salida')),
    PRIMARY KEY (id_registro, fecha_hora_entrada)
) PARTITION BY RANGE (fecha_hora_entrada);

CREATE TABLE reg_vehiculos_2025 PARTITION OF registros_vehiculos
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

CREATE TABLE reg_vehiculos_2026 PARTITION OF registros_vehiculos
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

CREATE TABLE reg_vehiculos_2027 PARTITION OF registros_vehiculos
    FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');

CREATE TABLE reg_vehiculos_2028 PARTITION OF registros_vehiculos
    FOR VALUES FROM ('2028-01-01') TO ('2029-01-01');

CREATE TABLE reg_vehiculos_2029 PARTITION OF registros_vehiculos
    FOR VALUES FROM ('2029-01-01') TO ('2030-01-01');

CREATE TABLE reg_vehiculos_default PARTITION OF registros_vehiculos DEFAULT;

CREATE TABLE bitacora_acciones (
    id_bitacora SERIAL PRIMARY KEY,
    id_usuario  INTEGER REFERENCES usuarios(id_usuario),
    accion      VARCHAR(50) NOT NULL,
    detalle     TEXT,
    ip_origen   VARCHAR(45),
    fecha_hora  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE incidencias (
    id_incidencia SERIAL PRIMARY KEY,
    id_usuario INTEGER REFERENCES usuarios(id_usuario),
    titulo VARCHAR(150) NOT NULL,
    descripcion TEXT NOT NULL,
    nivel_gravedad VARCHAR(20) DEFAULT 'media' CHECK (nivel_gravedad IN ('baja', 'media', 'alta', 'critica')),
    estado VARCHAR(20) DEFAULT 'abierta' CHECK (estado IN ('abierta', 'en_progreso', 'resuelta')),
    fecha_reporte TIMESTAMPTZ DEFAULT NOW(),
    fecha_resolucion TIMESTAMPTZ
);

CREATE TABLE estado_simulador (
    id INTEGER PRIMARY KEY,
    ultimo_latido TIMESTAMPTZ NOT NULL
);

-- =========================================================
-- SECCIÓN 3: ÍNDICES OPTIMIZADOS
-- =========================================================

CREATE INDEX idx_reg_placa ON registros_vehiculos (placa, fecha_hora_entrada DESC);
CREATE INDEX idx_reg_dashboard ON registros_vehiculos (id_anden, evento, fecha_hora_entrada DESC) WHERE fecha_hora_salida IS NULL;
CREATE INDEX idx_reg_camara_fecha ON registros_vehiculos (id_camara, fecha_hora_entrada DESC);
CREATE INDEX idx_reg_evento ON registros_vehiculos (evento, fecha_hora_entrada DESC);
CREATE INDEX idx_bitacora_usuario ON bitacora_acciones (id_usuario, fecha_hora DESC);
CREATE INDEX idx_bitacora_fecha ON bitacora_acciones (fecha_hora DESC);

-- =========================================================
-- SECCIÓN 4: ROLES Y PRIVILEGIOS
-- =========================================================
-- Importante: Si los roles ya existen, esto fallará. 
-- Asegúrate de que no existan antes de crearlos, o ignora los errores.
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles WHERE  rolname = 'cambus_admin') THEN
      CREATE ROLE cambus_admin WITH LOGIN PASSWORD 'cambus_admin_123';
   END IF;
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles WHERE  rolname = 'cambus_supervisor') THEN
      CREATE ROLE cambus_supervisor WITH LOGIN PASSWORD 'cambus_super_123';
   END IF;
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles WHERE  rolname = 'cambus_operador') THEN
      CREATE ROLE cambus_operador WITH LOGIN PASSWORD 'cambus_oper_123';
   END IF;
END
$do$;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO cambus_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO cambus_admin;
GRANT CREATE ON SCHEMA public TO cambus_admin;

GRANT SELECT, INSERT, UPDATE ON registros_vehiculos TO cambus_supervisor;
GRANT SELECT ON andenes, camaras, usuarios TO cambus_supervisor;
GRANT SELECT, INSERT, UPDATE ON incidencias TO cambus_supervisor;
GRANT SELECT, INSERT, UPDATE, DELETE ON estado_simulador TO cambus_supervisor;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO cambus_supervisor;

GRANT SELECT ON andenes, camaras TO cambus_operador;
GRANT SELECT, INSERT, UPDATE, DELETE ON estado_simulador TO cambus_operador;

-- =========================================================
-- SECCIÓN 5: TRIGGERS 
-- =========================================================

CREATE OR REPLACE FUNCTION fn_actualizar_estado_anden()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.evento = 'entrada' THEN
        UPDATE andenes SET estado_actual = 'ocupado' WHERE id_anden = NEW.id_anden;
    ELSIF NEW.evento = 'salida' THEN
        UPDATE andenes SET estado_actual = 'libre' WHERE id_anden = NEW.id_anden;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_estado_anden
    AFTER INSERT ON registros_vehiculos
    FOR EACH ROW EXECUTE FUNCTION fn_actualizar_estado_anden();


CREATE OR REPLACE FUNCTION fn_validar_integridad_imagen()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.evento = 'entrada' THEN
        IF NEW.hash_imagen IS NULL OR LENGTH(TRIM(NEW.hash_imagen)) != 64 THEN
            RAISE WARNING 'Registro % sin hash de imagen válido. Placa: %, Andén: %', NEW.id_registro, NEW.placa, NEW.id_anden;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_hash
    BEFORE INSERT ON registros_vehiculos
    FOR EACH ROW EXECUTE FUNCTION fn_validar_integridad_imagen();


CREATE OR REPLACE FUNCTION fn_log_registro_vehiculo()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO bitacora_acciones (id_usuario, accion, detalle)
    VALUES (
        NULL, 
        'registro_automatico',
        FORMAT('Vehículo %s - %s en andén %s | Confianza: %s%% | Hash: %s',
               NEW.placa, NEW.evento, NEW.id_anden,
               COALESCE(NEW.confianza_placa::TEXT, 'N/A'),
               COALESCE(LEFT(NEW.hash_imagen, 16) || '...', 'SIN HASH'))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_vehiculo
    AFTER INSERT ON registros_vehiculos
    FOR EACH ROW EXECUTE FUNCTION fn_log_registro_vehiculo();

-- =========================================================
-- SECCIÓN 6: VISTAS OPERATIVAS
-- =========================================================

CREATE OR REPLACE VIEW v_dashboard_andenes AS
SELECT
    a.numero_anden,
    a.zona,
    a.estado_actual,
    r.placa         AS placa_actual,
    r.fecha_hora_entrada,
    ROUND(EXTRACT(EPOCH FROM (NOW() - r.fecha_hora_entrada)) / 60, 2) AS minutos_en_anden,
    r.confianza_placa,
    c.nombre_camara
FROM andenes a
LEFT JOIN LATERAL (
    SELECT placa, fecha_hora_entrada, confianza_placa
    FROM registros_vehiculos rv
    WHERE rv.id_anden = a.id_anden
      AND rv.evento = 'entrada'
      AND rv.fecha_hora_salida IS NULL
    ORDER BY rv.fecha_hora_entrada DESC
    LIMIT 1
) r ON TRUE
LEFT JOIN camaras c ON a.id_camara = c.id_camara
ORDER BY a.numero_anden;

GRANT SELECT ON v_dashboard_andenes TO cambus_operador;
GRANT SELECT ON v_dashboard_andenes TO cambus_supervisor;
GRANT ALL ON v_dashboard_andenes TO cambus_admin;

CREATE OR REPLACE VIEW v_resumen_diario AS
SELECT
    DATE(fecha_hora_entrada)    AS fecha,
    COUNT(*)                     AS total_movimientos,
    COUNT(DISTINCT placa)        AS vehiculos_unicos,
    ROUND(AVG(EXTRACT(EPOCH FROM (fecha_hora_salida - fecha_hora_entrada)) / 60), 2) AS estancia_promedio_min,
    MAX(EXTRACT(EPOCH FROM (fecha_hora_salida - fecha_hora_entrada)) / 60) AS estancia_maxima_min,
    ROUND(AVG(confianza_placa), 2) AS confianza_promedio_ocr
FROM registros_vehiculos
WHERE evento = 'entrada'
  AND fecha_hora_salida IS NOT NULL
GROUP BY DATE(fecha_hora_entrada)
ORDER BY fecha DESC;

GRANT SELECT ON v_resumen_diario TO cambus_supervisor;
GRANT ALL ON v_resumen_diario TO cambus_admin;

CREATE OR REPLACE VIEW v_alertas_sobreestancia AS
SELECT
    a.numero_anden,
    rv.placa,
    rv.fecha_hora_entrada,
    ROUND(EXTRACT(EPOCH FROM (NOW() - rv.fecha_hora_entrada)) / 60, 0) AS minutos_transcurridos,
    CASE
        WHEN EXTRACT(EPOCH FROM (NOW() - rv.fecha_hora_entrada)) / 60 > 480 THEN 'CRITICO'
        WHEN EXTRACT(EPOCH FROM (NOW() - rv.fecha_hora_entrada)) / 60 > 240 THEN 'ALERTA'
        ELSE 'NORMAL'
    END AS nivel_alerta
FROM registros_vehiculos rv
JOIN andenes a ON rv.id_anden = a.id_anden
WHERE rv.evento = 'entrada'
  AND rv.fecha_hora_salida IS NULL
  AND EXTRACT(EPOCH FROM (NOW() - rv.fecha_hora_entrada)) / 60 > 240
ORDER BY rv.fecha_hora_entrada ASC;

GRANT SELECT ON v_alertas_sobreestancia TO cambus_supervisor;
GRANT SELECT ON v_alertas_sobreestancia TO cambus_operador;
GRANT ALL ON v_alertas_sobreestancia TO cambus_admin;

-- =========================================================
-- SECCIÓN 8: DATOS DE PRUEBA
-- =========================================================

INSERT INTO usuarios (nombre_usuario, correo, password_hash, rol)
VALUES ('Administrador CamBus', 'admin@cambus.local', crypt('CamBus2026!', gen_salt('bf')), 'admin');

INSERT INTO usuarios (nombre_usuario, correo, password_hash, rol)
VALUES ('Supervisor Turno 1', 'supervisor1@cambus.local', crypt('Sup3rv1sor!', gen_salt('bf')), 'supervisor');

INSERT INTO camaras (nombre_camara, ip_local, ubicacion) VALUES
('CAM-A01', '192.168.1.101', 'Andén 1 - Zona Norte'),
('CAM-A02', '192.168.1.102', 'Andén 2 - Zona Norte'),
('CAM-A03', '192.168.1.103', 'Andén 3 - Zona Sur'),
('CAM-A04', '192.168.1.104', 'Andén 4 - Zona Sur'),
('CAM-A05', '192.168.1.105', 'Andén 5 - Zona Este'),
('CAM-A06', '192.168.1.106', 'Zona Ext 6'),
('CAM-A07', '192.168.1.107', 'Zona Ext 7'),
('CAM-A08', '192.168.1.108', 'Zona Ext 8'),
('CAM-A09', '192.168.1.109', 'Zona Ext 9'),
('CAM-A10', '192.168.1.110', 'Zona Ext 10'),
('CAM-A11', '192.168.1.111', 'Zona Ext 11'),
('CAM-A12', '192.168.1.112', 'Zona Ext 12'),
('CAM-A13', '192.168.1.113', 'Zona Ext 13'),
('CAM-A14', '192.168.1.114', 'Zona Ext 14'),
('CAM-A15', '192.168.1.115', 'Zona Ext 15'),
('CAM-A16', '192.168.1.116', 'Zona Ext 16'),
('CAM-A17', '192.168.1.117', 'Zona Ext 17'),
('CAM-A18', '192.168.1.118', 'Zona Ext 18'),
('CAM-A19', '192.168.1.119', 'Zona Ext 19'),
('CAM-A20', '192.168.1.120', 'Zona Ext 20'),
('CAM-A21', '192.168.1.121', 'Zona Ext 21'),
('CAM-A22', '192.168.1.122', 'Zona Ext 22'),
('CAM-A23', '192.168.1.123', 'Zona Ext 23'),
('CAM-A24', '192.168.1.124', 'Zona Ext 24'),
('CAM-A25', '192.168.1.125', 'Zona Ext 25'),
('CAM-A26', '192.168.1.126', 'Zona Ext 26'),
('CAM-A27', '192.168.1.127', 'Zona Ext 27'),
('CAM-A28', '192.168.1.128', 'Zona Ext 28'),
('CAM-A29', '192.168.1.129', 'Zona Ext 29'),
('CAM-A30', '192.168.1.130', 'Zona Ext 30'),
('CAM-A31', '192.168.1.131', 'Zona Ext 31'),
('CAM-A32', '192.168.1.132', 'Zona Ext 32'),
('CAM-A33', '192.168.1.133', 'Zona Ext 33'),
('CAM-A34', '192.168.1.134', 'Zona Ext 34'),
('CAM-A35', '192.168.1.135', 'Zona Ext 35'),
('CAM-A36', '192.168.1.136', 'Zona Ext 36'),
('CAM-A37', '192.168.1.137', 'Zona Ext 37'),
('CAM-A38', '192.168.1.138', 'Zona Ext 38'),
('CAM-A39', '192.168.1.139', 'Zona Ext 39'),
('CAM-A40', '192.168.1.140', 'Zona Ext 40'),
('CAM-A41', '192.168.1.141', 'Zona Ext 41'),
('CAM-A42', '192.168.1.142', 'Zona Ext 42'),
('CAM-A43', '192.168.1.143', 'Zona Ext 43'),
('CAM-A44', '192.168.1.144', 'Zona Ext 44'),
('CAM-A45', '192.168.1.145', 'Zona Ext 45'),
('CAM-A46', '192.168.1.146', 'Zona Ext 46'),
('CAM-A47', '192.168.1.147', 'Zona Ext 47'),
('CAM-A48', '192.168.1.148', 'Zona Ext 48'),
('CAM-A49', '192.168.1.149', 'Zona Ext 49'),
('CAM-A50', '192.168.1.150', 'Zona Ext 50');

INSERT INTO andenes (numero_anden, id_camara, zona) VALUES
(1, 1, 'Norte'), (2, 2, 'Norte'), (3, 3, 'Sur'),
(4, 4, 'Sur'),   (5, 5, 'Este'),
(6, 6, 'Expansión'),
(7, 7, 'Expansión'),
(8, 8, 'Expansión'),
(9, 9, 'Expansión'),
(10, 10, 'Expansión'),
(11, 11, 'Expansión'),
(12, 12, 'Expansión'),
(13, 13, 'Expansión'),
(14, 14, 'Expansión'),
(15, 15, 'Expansión'),
(16, 16, 'Expansión'),
(17, 17, 'Expansión'),
(18, 18, 'Expansión'),
(19, 19, 'Expansión'),
(20, 20, 'Expansión'),
(21, 21, 'Expansión'),
(22, 22, 'Expansión'),
(23, 23, 'Expansión'),
(24, 24, 'Expansión'),
(25, 25, 'Expansión'),
(26, 26, 'Expansión'),
(27, 27, 'Expansión'),
(28, 28, 'Expansión'),
(29, 29, 'Expansión'),
(30, 30, 'Expansión'),
(31, 31, 'Expansión'),
(32, 32, 'Expansión'),
(33, 33, 'Expansión'),
(34, 34, 'Expansión'),
(35, 35, 'Expansión'),
(36, 36, 'Expansión'),
(37, 37, 'Expansión'),
(38, 38, 'Expansión'),
(39, 39, 'Expansión'),
(40, 40, 'Expansión'),
(41, 41, 'Expansión'),
(42, 42, 'Expansión'),
(43, 43, 'Expansión'),
(44, 44, 'Expansión'),
(45, 45, 'Expansión'),
(46, 46, 'Expansión'),
(47, 47, 'Expansión'),
(48, 48, 'Expansión'),
(49, 49, 'Expansión'),
(50, 50, 'Expansión'),
(51, NULL, 'Expansión'),
(52, NULL, 'Expansión'),
(53, NULL, 'Expansión'),
(54, NULL, 'Expansión'),
(55, NULL, 'Expansión'),
(56, NULL, 'Expansión'),
(57, NULL, 'Expansión'),
(58, NULL, 'Expansión'),
(59, NULL, 'Expansión'),
(60, NULL, 'Expansión'),
(61, NULL, 'Expansión'),
(62, NULL, 'Expansión'),
(63, NULL, 'Expansión'),
(64, NULL, 'Expansión'),
(65, NULL, 'Expansión'),
(66, NULL, 'Expansión'),
(67, NULL, 'Expansión'),
(68, NULL, 'Expansión'),
(69, NULL, 'Expansión'),
(70, NULL, 'Expansión'),
(71, NULL, 'Expansión'),
(72, NULL, 'Expansión'),
(73, NULL, 'Expansión'),
(74, NULL, 'Expansión'),
(75, NULL, 'Expansión'),
(76, NULL, 'Expansión'),
(77, NULL, 'Expansión'),
(78, NULL, 'Expansión'),
(79, NULL, 'Expansión'),
(80, NULL, 'Expansión'),
(81, NULL, 'Expansión'),
(82, NULL, 'Expansión'),
(83, NULL, 'Expansión'),
(84, NULL, 'Expansión'),
(85, NULL, 'Expansión'),
(86, NULL, 'Expansión'),
(87, NULL, 'Expansión'),
(88, NULL, 'Expansión'),
(89, NULL, 'Expansión'),
(90, NULL, 'Expansión'),
(91, NULL, 'Expansión'),
(92, NULL, 'Expansión'),
(93, NULL, 'Expansión'),
(94, NULL, 'Expansión'),
(95, NULL, 'Expansión'),
(96, NULL, 'Expansión'),
(97, NULL, 'Expansión'),
(98, NULL, 'Expansión'),
(99, NULL, 'Expansión'),
(100, NULL, 'Expansión');

INSERT INTO registros_vehiculos
    (placa, id_anden, id_camara, fecha_hora_entrada, fecha_hora_salida, confianza_placa, ruta_imagen, hash_imagen, evento)
VALUES
    ('ABC-123-A', 1, 1, NOW() - INTERVAL '3 hours', NOW() - INTERVAL '1 hour', 95.7, '/imagenes/2026/02/cam01_001.jpg', encode(digest('evidencia_prueba_1', 'sha256'), 'hex'), 'entrada'),
    ('XYZ-789-B', 2, 2, NOW() - INTERVAL '45 minutes', NULL, 88.3, '/imagenes/2026/02/cam02_001.jpg', encode(digest('evidencia_prueba_2', 'sha256'), 'hex'), 'entrada'),
    ('DEF-456-C', 3, 3, NOW() - INTERVAL '6 hours', NOW() - INTERVAL '2 hours', 92.1, '/imagenes/2026/02/cam03_001.jpg', encode(digest('evidencia_prueba_3', 'sha256'), 'hex'), 'entrada');

