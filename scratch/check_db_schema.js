const pool = require('../config/db');

async function auditDatabase() {
  console.log('🔍 COMMENCING PROGRAMMATIC DATABASE AUDIT...\n');
  
  const tables = [
    'users', 'patients', 'doctors', 'appointments', 'consultations',
    'lab_tests', 'lab_bookings', 'sample_collection_requests', 'medical_reports',
    'patient_history', 'notifications', 'admin_settings', 'password_reset_tokens',
    'doctor_schedules', 'cms_pages', 'cms_faqs', 'cms_social_links', 'cms_media',
    'notification_preferences', 'scheduled_notifications', 'report_categories',
    'report_activity_logs', 'consultation_notes', 'consultation_status_logs',
    'lab_booking_status_logs', 'sample_collection_status_logs'
  ];

  try {
    for (const table of tables) {
      console.log(`--- Table: ${table} ---`);
      
      // Check if table exists and describe its fields
      try {
        const [fields] = await pool.execute(`DESCRIBE \`${table}\``);
        console.log(`Fields: ${fields.map(f => `${f.Field} (${f.Type})`).join(', ')}`);
      } catch (err) {
        console.log(`⚠️  Table '${table}' DESCRIBE failed: ${err.message}`);
        continue;
      }

      // Check foreign keys
      try {
        const [fks] = await pool.execute(`
          SELECT 
            COLUMN_NAME, 
            CONSTRAINT_NAME, 
            REFERENCED_TABLE_NAME, 
            REFERENCED_COLUMN_NAME
          FROM 
            INFORMATION_SCHEMA.KEY_COLUMN_USAGE
          WHERE 
            TABLE_SCHEMA = 'mediconnect' 
            AND TABLE_NAME = ? 
            AND REFERENCED_TABLE_NAME IS NOT NULL
        `, [table]);
        if (fks.length > 0) {
          console.log(`Foreign Keys: ${fks.map(f => `${f.COLUMN_NAME} -> ${f.REFERENCED_TABLE_NAME}(${f.REFERENCED_COLUMN_NAME}) [Constraint: ${f.CONSTRAINT_NAME}]`).join(', ')}`);
        }
      } catch (err) {
        console.log(`⚠️  Could not retrieve Foreign Keys: ${err.message}`);
      }

      // Check indexes
      try {
        const [indexes] = await pool.execute(`SHOW INDEX FROM \`${table}\``);
        const indexNames = [...new Set(indexes.map(i => i.Key_name))];
        console.log(`Indexes: ${indexNames.join(', ')}`);
      } catch (err) {
        console.log(`⚠️  Could not retrieve Indexes: ${err.message}`);
      }
      
      console.log('');
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Database audit error:', err);
    process.exit(1);
  }
}

auditDatabase();
