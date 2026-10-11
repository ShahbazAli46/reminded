import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function initDatabase(): Promise<void> {
  console.log(`Connecting to MySQL at ${config.db.host}:${config.db.port}...`);

  // Step 1: Connect to server without database selected to create database if not exists
  let rootConnection;
  try {
    rootConnection = await mysql.createConnection({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      multipleStatements: true,
    });

    await rootConnection.query(
      `CREATE DATABASE IF NOT EXISTS \`${config.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    console.log(`✅ Database "${config.db.database}" checked/created.`);
    await rootConnection.end();
  } catch (err: any) {
    console.warn(`⚠️ Could not auto-create database (might lack root privilege or DB already exists): ${err.message}`);
  }

  // Step 2: Connect to target database and execute schema
  try {
    const connection = await mysql.createConnection({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      multipleStatements: true,
    });

    let schemaPath = path.join(__dirname, 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      schemaPath = path.join(__dirname, '../../src/database/schema.sql');
    }
    if (!fs.existsSync(schemaPath)) {
      schemaPath = path.resolve(process.cwd(), 'src/database/schema.sql');
    }
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

    await connection.query(schemaSql);
    console.log('✅ Schema tables & default records initialized successfully.');

    // Step 3: Run defensive, idempotent column & index migrations for existing databases
    await applyMigrations(connection);

    await connection.end();
  } catch (err: any) {
    console.error('❌ Failed to run schema migrations:', err.message);
    throw err;
  }
}

async function applyMigrations(connection: mysql.Connection): Promise<void> {
  console.log('🔄 Checking and applying schema refinements...');

  // Helper to safely execute an ALTER statement
  const safeQuery = async (label: string, sql: string) => {
    try {
      await connection.query(sql);
      console.log(`  ✓ ${label}`);
    } catch (err: any) {
      // Ignore common idempotent errors (e.g. duplicate column, index already exists, etc.)
      if (err.errno === 1060 || err.errno === 1061 || err.errno === 1091) {
        return;
      }
      console.warn(`  ⚠️ Migration note (${label}): ${err.message}`);
    }
  };

  // 1. Sanitize phone numbers in users
  await safeQuery(
    'Trim whitespace on users.phone_number',
    `UPDATE users SET phone_number = TRIM(phone_number) WHERE phone_number LIKE ' %' OR phone_number LIKE '% ';`
  );

  // 2. Refine users table columns to ASCII charset
  await safeQuery(
    'Refine users.phone_number and phone_hash to ASCII',
    `ALTER TABLE users 
     MODIFY COLUMN phone_number VARCHAR(20) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
     MODIFY COLUMN phone_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL;`
  );

  // 3. Upgrade idx_phone_hash to UNIQUE KEY uniq_phone_hash on users
  try {
    const [indexes]: any = await connection.query(`SHOW INDEX FROM users WHERE Key_name = 'uniq_phone_hash';`);
    if (!indexes || indexes.length === 0) {
      await safeQuery(
        'Add UNIQUE KEY uniq_phone_hash on users',
        `ALTER TABLE users ADD UNIQUE KEY uniq_phone_hash (phone_hash);`
      );
      // Clean up old non-unique index if present
      await safeQuery(
        'Drop legacy non-unique idx_phone_hash if present',
        `ALTER TABLE users DROP INDEX idx_phone_hash;`
      );
    }
  } catch (err: any) {
    console.warn(`  ⚠️ Could not check/upgrade phone_hash unique index: ${err.message}`);
  }

  // 4. Refine otps table columns and indexes
  await safeQuery(
    'Refine otps.phone_number to ASCII',
    `ALTER TABLE otps 
     MODIFY COLUMN phone_number VARCHAR(20) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL;`
  );

  await safeQuery(
    'Add index idx_otp_phone on otps',
    `ALTER TABLE otps ADD INDEX idx_otp_phone (phone_number);`
  );

  await safeQuery(
    'Add index idx_otp_expires_at on otps',
    `ALTER TABLE otps ADD INDEX idx_otp_expires_at (expires_at);`
  );

  await safeQuery(
    'Add index idx_otp_created_at on otps',
    `ALTER TABLE otps ADD INDEX idx_otp_created_at (created_at);`
  );

  // 5. Refine tasks assignee_phone column for index compatibility
  await safeQuery(
    'Refine tasks.assignee_phone to ASCII for collation alignment',
    `ALTER TABLE tasks 
     MODIFY COLUMN assignee_phone VARCHAR(20) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL;`
  );

  // 6. Refine user_devices table
  await safeQuery(
    'Refine user_devices.fcm_token to ASCII charset',
    `ALTER TABLE user_devices 
     MODIFY COLUMN fcm_token VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL;`
  );

  await safeQuery(
    'Add index idx_user_devices_user on user_devices',
    `ALTER TABLE user_devices ADD INDEX idx_user_devices_user (user_id, updated_at DESC);`
  );

  await safeQuery(
    'Add index idx_user_devices_token on user_devices',
    `ALTER TABLE user_devices ADD INDEX idx_user_devices_token (fcm_token);`
  );

  // 7. Add feed indexes on tasks to eliminate filesort across all filters
  await safeQuery(
    'Add index idx_tasks_creator_feed on tasks',
    `ALTER TABLE tasks ADD INDEX idx_tasks_creator_feed (creator_id, due_at, status);`
  );

  await safeQuery(
    'Add index idx_tasks_assignee_feed on tasks',
    `ALTER TABLE tasks ADD INDEX idx_tasks_assignee_feed (assignee_id, due_at, status);`
  );

  await safeQuery(
    'Add index idx_tasks_phone_feed on tasks',
    `ALTER TABLE tasks ADD INDEX idx_tasks_phone_feed (assignee_phone, due_at, status);`
  );

  // 8. Add index on contacts_relations for instant request listings
  await safeQuery(
    'Add index idx_receiver_requests on contacts_relations',
    `ALTER TABLE contacts_relations ADD INDEX idx_receiver_requests (receiver_id, status, created_at DESC);`
  );

  // 9. Upgrade tasks.read_state to include 'notified'
  await safeQuery(
    'Upgrade tasks.read_state to include notified',
    `ALTER TABLE tasks MODIFY COLUMN read_state ENUM('sent', 'delivered', 'notified', 'opened') NOT NULL DEFAULT 'sent';`
  );

  console.log('✅ Schema refinements applied successfully.');
}

// Run directly if invoked from CLI
if (process.argv[1] && (process.argv[1].endsWith('init.ts') || process.argv[1].endsWith('init.js'))) {
  initDatabase()
    .then(() => {
      console.log('🎉 Database initialization complete.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Fatal database init error:', err);
      process.exit(1);
    });
}
