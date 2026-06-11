// ============================================================
// MediConnect – models/CmsPage.js
// Database queries for the cms_pages table
// ============================================================

const pool = require('../config/db');

const CmsPage = {
  /**
   * Find page by slug
   */
  async findBySlug(slug) {
    const [rows] = await pool.execute(
      `SELECT * FROM cms_pages WHERE slug = ?`,
      [slug]
    );
    return rows[0] || null;
  },

  /**
   * Find page by ID
   */
  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT * FROM cms_pages WHERE id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  /**
   * Get all pages
   */
  async findAll() {
    const [rows] = await pool.execute(
      `SELECT * FROM cms_pages ORDER BY title`
    );
    return rows;
  },

  /**
   * Create a new page
   */
  async create({ slug, title, meta_title, meta_description, meta_keywords, og_title, og_description, og_image, is_active }) {
    const [result] = await pool.execute(
      `INSERT INTO cms_pages (slug, title, meta_title, meta_description, meta_keywords, og_title, og_description, og_image, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        slug,
        title,
        meta_title || null,
        meta_description || null,
        meta_keywords || null,
        og_title || null,
        og_description || null,
        og_image || null,
        is_active === undefined ? 1 : (is_active ? 1 : 0)
      ]
    );
    return result;
  },

  /**
   * Update page details
   */
  async update(id, { title, meta_title, meta_description, meta_keywords, og_title, og_description, og_image, is_active }) {
    const fields = [];
    const values = [];

    if (title !== undefined) { fields.push('title = ?'); values.push(title); }
    if (meta_title !== undefined) { fields.push('meta_title = ?'); values.push(meta_title); }
    if (meta_description !== undefined) { fields.push('meta_description = ?'); values.push(meta_description); }
    if (meta_keywords !== undefined) { fields.push('meta_keywords = ?'); values.push(meta_keywords); }
    if (og_title !== undefined) { fields.push('og_title = ?'); values.push(og_title); }
    if (og_description !== undefined) { fields.push('og_description = ?'); values.push(og_description); }
    if (og_image !== undefined) { fields.push('og_image = ?'); values.push(og_image); }
    if (is_active !== undefined) { fields.push('is_active = ?'); values.push(is_active ? 1 : 0); }

    if (fields.length === 0) return null;

    values.push(id);
    const [result] = await pool.execute(
      `UPDATE cms_pages SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    return result;
  },

  /**
   * Delete a page
   */
  async delete(id) {
    const [result] = await pool.execute(
      `DELETE FROM cms_pages WHERE id = ?`,
      [id]
    );
    return result;
  }
};

module.exports = CmsPage;
