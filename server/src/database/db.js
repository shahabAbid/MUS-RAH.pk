
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Store database outside src folder
const dataDirectory = path.join(__dirname, '../../data');

if (!fs.existsSync(dataDirectory)) {
  fs.mkdirSync(dataDirectory, { recursive: true });
}

const databasePath = path.join(dataDirectory, 'aurelia.db');
const db = new Database(databasePath);

// Show the exact database file being used
console.log('ACTUAL DATABASE PATH:', databasePath);

// Enable foreign key relationships
db.pragma('foreign_keys = ON');

// Improve reliability
db.pragma('journal_mode = WAL');

console.log('SQLite database connected successfully');

// Check the categories table columns
try {
  const categoryColumns = db
    .prepare('PRAGMA table_info(categories)')
    .all()
    .map((column) => column.name);

  console.log('CATEGORIES TABLE:', categoryColumns);
} catch (error) {
  console.error('CATEGORY TABLE CHECK ERROR:', error.message);
}

// Verify all categories in this database
try {
  const allCategories = db.prepare(`
    SELECT id, name, is_active, parent_id
    FROM categories
    ORDER BY name
  `).all();

  console.log('ALL DATABASE CATEGORY NAMES:', allCategories);
  console.log('TOTAL DATABASE CATEGORIES:', allCategories.length);

  const summerCollection = db.prepare(`
    SELECT id, name, is_active, parent_id
    FROM categories
    WHERE id = ?
  `).get('summer_collection_restored');

  console.log('SUMMER COLLECTION CHECK:', summerCollection);

} catch (error) {
  console.error('DATABASE VERIFICATION ERROR:', error.message);
}

// Display all database tables
try {
  const tables = db.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
      AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all();

  console.log('\n========== DATABASE TABLES ==========');
  console.log(tables);

  // Inspect order-related and payment-related tables
  const relatedTables = tables.filter((table) =>
    /order|payment/i.test(table.name)
  );

  console.log('\n========== ORDER / PAYMENT TABLE DETAILS ==========');

  for (const table of relatedTables) {
    const safeTableName = table.name.replace(/"/g, '""');

    const columns = db.prepare(
      `PRAGMA table_info("${safeTableName}")`
    ).all();

    const foreignKeys = db.prepare(
      `PRAGMA foreign_key_list("${safeTableName}")`
    ).all();

    console.log(`\nTABLE: ${table.name}`);
    console.log('COLUMNS:', columns);
    console.log('FOREIGN KEYS:', foreignKeys);
  }

} catch (error) {
  console.error('DATABASE STRUCTURE CHECK ERROR:', error.message);
}

// Check every table that references orders
try {
  console.log('\n========== ALL REFERENCES TO ORDERS ==========');

  const allTables = db.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
      AND name NOT LIKE 'sqlite_%'
  `).all();

  let foundReferences = false;

  for (const table of allTables) {
    const safeTableName = table.name.replace(/"/g, '""');

    const foreignKeys = db.prepare(
      `PRAGMA foreign_key_list("${safeTableName}")`
    ).all();

    const orderReferences = foreignKeys.filter(
      (fk) => fk.table === 'orders'
    );

    if (orderReferences.length > 0) {
      foundReferences = true;
      console.log(`TABLE: ${table.name}`);
      console.log('REFERENCES:', orderReferences);
    }
  }

  if (!foundReferences) {
    console.log('No foreign-key references to orders found.');
  }

} catch (error) {
  console.error('ORDER REFERENCES CHECK ERROR:', error.message);
}

// Check database integrity
try {
  console.log(
    '\nDATABASE INTEGRITY:',
    db.pragma('integrity_check')
  );
} catch (error) {
  console.error('DATABASE INTEGRITY ERROR:', error.message);
}

module.exports = db;
