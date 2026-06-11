// ============================================================
// MediConnect – models/CmsMedia.js
// Database queries for the cms_media table
// ============================================================

const pool = require('../config/db');

const CmsMedia = {
  /**
   * Find media file metadata by ID
   */
  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT m.*, u.full_name AS uploaded_by_name
       FROM cms_media m
       LEFT JOIN users u ON m.uploaded_by = u.id
       WHERE m.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  /**
   * Get all uploaded media metadata
   */
  async findAll() {
    const [rows] = await pool.execute(
      `SELECT m.*, u.full_name AS uploaded_by_name
       FROM cms_media m
       LEFT JOIN users u ON m.uploaded_by = u.id
       ORDER BY m.created_at DESC`
    );
    return rows;
  },

  /**
   * Register a new uploaded asset
   */
  async create({ filename, original_name, mime_type, file_size, file_path, uploaded_by }) {
    const [result] = await pool.execute(
      `INSERT INTO cms_media (filename, original_name, mime_type, file_size, file_path, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [filename, original_name, mime_type, file_size, file_path, uploaded_by]
    );
    return result;
  },

  /**
   * Remove media asset entry
   */
  async delete(id) {
    const [result] = await pool.execute(
      `DELETE FROM cms_media WHERE id = ?`,
      [id]
    );
    return result;
  }
};

module.exports = CmsMedia;
//
