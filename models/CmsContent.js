// ============================================================
// MediConnect – models/CmsContent.js
// Database queries for the cms_content table
// ============================================================

const pool = require('../config/db');

const CmsContent = {
  /**
   * Find a single section by its unique key
   * @param {string} sectionKey - e.g. 'hero', 'features', 'cta'
   */
  async findByKey(sectionKey) {
    const [rows] = await pool.execute(
      `SELECT * FROM cms_content WHERE section_key = ? AND is_active = 1`,
      [sectionKey]
    );
    if (rows[0] && rows[0].section_data) {
      // Parse JSON string if needed (mysql2 may auto-parse JSON columns)
      if (typeof rows[0].section_data === 'string') {
        rows[0].section_data = JSON.parse(rows[0].section_data);
      }
    }
    return rows[0] || null;
  },

  /**
   * Get all active CMS sections
   */
  async findAllActive() {
    const [rows] = await pool.execute(
      `SELECT * FROM cms_content WHERE is_active = 1 ORDER BY section_key`
    );
    return rows.map(row => {
      if (row.section_data && typeof row.section_data === 'string') {
        row.section_data = JSON.parse(row.section_data);
      }
      return row;
    });
  },

  /**
   * Get all CMS sections (including inactive) – for admin panel
   */
  async findAll() {
    const [rows] = await pool.execute(
      `SELECT * FROM cms_content ORDER BY section_key`
    );
    return rows.map(row => {
      if (row.section_data && typeof row.section_data === 'string') {
        row.section_data = JSON.parse(row.section_data);
      }
      return row;
    });
  },

  /**
   * Create or update a CMS section
   */
  async upsert({ section_key, section_data, updated_by }) {
    const dataStr = typeof section_data === 'string'
      ? section_data
      : JSON.stringify(section_data);

    const [result] = await pool.execute(
      `INSERT INTO cms_content (section_key, section_data, updated_by)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
         section_data = VALUES(section_data),
         updated_by = VALUES(updated_by),
         is_active = 1`,
      [section_key, dataStr, updated_by]
    );
    return result;
  },

  /**
   * Update only the section_data for an existing key
   */
  async updateByKey(sectionKey, sectionData, updatedBy) {
    const dataStr = typeof sectionData === 'string'
      ? sectionData
      : JSON.stringify(sectionData);

    const [result] = await pool.execute(
      `UPDATE cms_content SET section_data = ?, updated_by = ? WHERE section_key = ?`,
      [dataStr, updatedBy, sectionKey]
    );
    return result;
  },

  /**
   * Soft-deactivate a section
   */
  async deactivate(sectionKey) {
    const [result] = await pool.execute(
      `UPDATE cms_content SET is_active = 0 WHERE section_key = ?`,
      [sectionKey]
    );
    return result;
  },
};

module.exports = CmsContent;
