const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const MASTER_DB = 'postgres';
const MASTER_USER = 'postgres';
const MASTER_PASSWORD = process.env.PG_MASTER_PASS || 'postgres'; // Permite contraseña dinámica desde el Installer GUI
const TARGET_DB = 'cambus_db';

const targetUser = 'cambus_admin';
const targetPass = 'cambus_admin_123';

async function setupDatabase() {
    console.log('🔄 Conectando a PostgreSQL local (usuario principal por defecto)...');

    // Connect to the default postgres database just to create roles and the new DB
    const masterClient = new Client({
        user: MASTER_USER,
        host: '127.0.0.1',
        database: MASTER_DB,
        password: MASTER_PASSWORD,
        port: 5432,
    });

    try {
        await masterClient.connect();

        console.log('✅ Conexión maestra exitosa.');

        const resRole = await masterClient.query(`SELECT 1 FROM pg_roles WHERE rolname='${targetUser}'`);
        if (resRole.rowCount === 0) {
            console.log(`👤 Creando usuario administrador: ${targetUser}...`);
            await masterClient.query(`CREATE ROLE ${targetUser} WITH LOGIN PASSWORD '${targetPass}' SUPERUSER;`);
        } else {
            console.log(`✔️  Usuario ${targetUser} ya existe, forzando actualización de la contraseña...`);
            await masterClient.query(`ALTER ROLE ${targetUser} WITH PASSWORD '${targetPass}';`);
        }

        // Check if DB exists
        const resDb = await masterClient.query(`SELECT 1 FROM pg_database WHERE datname='${TARGET_DB}'`);
        if (resDb.rowCount === 0) {
            console.log(`🗄️  Creando Base de Datos: ${TARGET_DB}...`);
            await masterClient.query(`CREATE DATABASE ${TARGET_DB} OWNER ${targetUser};`);
            // Adding pgcrypto to the new DB requires connecting to it, we'll do that below.
        } else {
            console.log(`✔️  Base de datos ${TARGET_DB} ya existe, conectando para asegurar esquemas...`);
        }
    } catch (err) {
        console.log('❌ ERROR GRAVE: No se pudo conectar al servidor PostgreSQL.');
        console.log('Por favor, asegúrate de que PostgreSQL está instalado y corriendo con usuario "postgres" y contraseña "postgres".');
        process.exit(1);
    } finally {
        await masterClient.end();
    }

    // Step 2: Connect to the Cambus Database and Inject SQL File
    console.log(`🔄 Conectando a la nueva base de datos ${TARGET_DB} para poblar datos...`);
    const appClient = new Client({
        user: MASTER_USER,
        host: '127.0.0.1',
        database: TARGET_DB,
        password: MASTER_PASSWORD,
        port: 5432,
    });

    try {
        await appClient.connect();
        await appClient.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');

        const sqlFilePath = path.join(__dirname, '..', 'cambus_v2.sql');
        if (fs.existsSync(sqlFilePath)) {
            console.log('📄 Cargando e inyectando esquema inicial y datos semilla desde cambus_v2.sql...');
            const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');
            await appClient.query(sqlContent);
            console.log('✅ Esquema y datos semilla inyectados con éxito. 100 Andenes Listos.');

            console.log('🛠️  Forzando actualización de la vista de Andenes (v_dashboard_andenes) por seguridad...');
            // Optional fallback if views act out on sequential runs:
            await appClient.query(`
               CREATE OR REPLACE VIEW public.v_dashboard_andenes AS 
               SELECT 
                 a.id_anden AS numero_anden,
                 a.tipo_carga AS zona,
                 CASE
                   WHEN r.id_registro IS NOT NULL THEN 'ocupado'::text
                   ELSE 'disponible'::text
                 END AS estado_actual,
                 r.placa AS placa_actual,
                 r.fecha_hora_entrada,
                 CASE
                   WHEN r.fecha_hora_entrada IS NOT NULL THEN date_part('epoch'::text, now() - r.fecha_hora_entrada) / 60::double precision
                   ELSE 0::double precision
                 END AS minutos_en_anden
               FROM andenes a
                 LEFT JOIN registros_vehiculos r ON a.id_anden = r.id_anden AND r.evento::text = 'entrada'::text AND r.fecha_hora_salida IS NULL;
            `);
        } else {
            console.log('⚠️  El archivo cambus_v2.sql no se encontró. Saltando el rellenado avanzado.');
        }

        console.log('🎉 BASE DE DATOS TOTALMENTE CONFIGURADA Y LISTA.');
    } catch (err) {
        console.log('❌ Error inicializando los esquemas: ', err.message);
    } finally {
        await appClient.end();
    }
}

setupDatabase();
