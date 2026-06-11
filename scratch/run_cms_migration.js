const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

async function run() {
  const sqlFile = path.join(__dirname, '../database/migration_cms.sql');
  const content = fs.readFileSync(sqlFile, 'utf8');
  
  // Split by semicolon, filter comments and empty queries
  const statements = content
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0);

  console.log(`Executing ${statements.length} statements from migration_cms.sql...`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    // Remove comments line-by-line
    const cleanStmt = stmt
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n')
      .trim();

    if (cleanStmt.length === 0) continue;

    console.log(`Running statement ${i + 1}/${statements.length}...`);
    try {
      await pool.query(cleanStmt);
      console.log(`Statement ${i + 1} succeeded.`);
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_TABLE_EXISTS_ERROR' || err.code === 'ER_MULTIPLE_PRI_KEY' || err.code === 'ER_DUP_KEYNAME') {
        console.log(`Statement ${i + 1} already applied (skipped).`);
      } else {
        throw err;
      }
    }
  }

  console.log('✅ CMS schema migration completed successfully!');
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
