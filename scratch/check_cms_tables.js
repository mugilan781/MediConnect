const pool = require('../config/db');

async function main() {
  try {
    const [tables] = await pool.execute("SHOW TABLES");
    console.log("ALL TABLES:");
    console.log(tables.map(t => Object.values(t)[0]));

    const [cmsContentCols] = await pool.execute("DESCRIBE cms_content");
    console.log("\ncms_content COLUMNS:");
    console.log(cmsContentCols);

    const [cmsContentRows] = await pool.execute("SELECT section_key, is_active FROM cms_content");
    console.log("\ncms_content ROWS:");
    console.log(cmsContentRows);

    try {
      const [adminSettingsCols] = await pool.execute("DESCRIBE admin_settings");
      console.log("\nadmin_settings COLUMNS:");
      console.log(adminSettingsCols);
    } catch (e) {
      console.log("\nadmin_settings table does not exist or error:", e.message);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
main();
