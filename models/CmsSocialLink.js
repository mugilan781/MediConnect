// ============================================================
// MediConnect – models/CmsSocialLink.js
// Database queries for the cms_social_links table
// ============================================================

const pool = require('../config/db');

const CmsSocialLink = {
  /**
   * Find social link by ID
   */
  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT * FROM cms_social_links WHERE id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  /**
   * Find social link by platform name
   */
  async findByPlatform(platform) {
    const [rows] = await pool.execute(
      `SELECT * FROM cms_social_links WHERE platform = ?`,
      [platform]
    );
    return rows[0] || null;
  },

  /**
   * Get all active social links
   */
  async findAllActive() {
    const [rows] = await pool.execute(
      `SELECT * FROM cms_social_links WHERE is_active = 1 ORDER BY platform`
    );
    return rows;
  },

  /**
   * Get all social links (including inactive)
   */
  async findAll() {
    const [rows] = await pool.execute(
      `SELECT * FROM cms_social_links ORDER BY platform`
    );
    return rows;
  },

  /**
   * Create or update platform link
   */
  async upsert({ platform, url, is_active }) {
    const [result] = await pool.execute(
      `INSERT INTO cms_social_links (platform, url, is_active)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
         url = VALUES(url),
         is_active = VALUES(is_active)`,
      [platform, url, is_active === undefined ? 1 : (is_active ? 1 : 0)]
    );
    return result;
  },

  /**
   * Update platforms
   */
  async update(id, { url, is_active }) {
    const fields = [];
    const values = [];

    if (url !== undefined) { fields.push('url = ?'); values.push(url); }
    if (is_active !== undefined) { fields.push('is_active = ?'); values.push(is_active ? 1 : 0); }

    if (fields.length === 0) return null;

    values.push(id);
    const [result] = await pool.execute(
      `UPDATE cms_social_links SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    return result;
  }
};

module.exports = CmsSocialLink;
