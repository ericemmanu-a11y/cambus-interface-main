/**
 * ============================================================================
 * Proyecto CamBus V3 - Sistema de Control Logístico y LPR
 * Desarrollado por: Eric Emmanuel (GitHub: ericemmanu-a11y)
 * Propiedad Intelectual y Licencia de Uso Exclusivo
 * ============================================================================
 */
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
            await masterClient.query(`ALTER ROLE ${targetUser} WITH PASSWORD '${targetPass}' SUPERUSER;`);
        }

        // Check if DB exists and DROP it cleanly to ensure seed runs afresh with new 50 cameras
        const resDb = await masterClient.query(`SELECT 1 FROM pg_database WHERE datname='${TARGET_DB}'`);
        if (resDb.rowCount > 0) {
            console.log(`⚠️  Base de datos ${TARGET_DB} ya existe. Eliminando versión antigua para actualización limpia...`);
            // Terminate open connections to the DB before dropping
            await masterClient.query(`
                SELECT pg_terminate_backend(pg_stat_activity.pid)
                FROM pg_stat_activity
                WHERE pg_stat_activity.datname = '${TARGET_DB}' AND pid <> pg_backend_pid();
            `);
            await masterClient.query(`DROP DATABASE "${TARGET_DB}";`);
        }

        console.log(`🗄️  Creando Base de Datos "Fresca": ${TARGET_DB}...`);
        await masterClient.query(`CREATE DATABASE ${TARGET_DB} OWNER ${targetUser};`);

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

            console.log('🛠️  Vistas operativas cargadas desde esquema nativo.');
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
