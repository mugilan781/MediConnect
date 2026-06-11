// ============================================================
// MediConnect – models/CmsFaq.js
// Database queries for the cms_faqs table
// ============================================================

const pool = require('../config/db');

const CmsFaq = {
  /**
   * Find FAQ by ID
   */
  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT * FROM cms_faqs WHERE id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  /**
   * Find all active FAQs (sorted by display_order)
   */
  async findAllActive() {
    const [rows] = await pool.execute(
      `SELECT * FROM cms_faqs WHERE is_active = 1 ORDER BY display_order ASC, id ASC`
    );
    return rows;
  },

  /**
   * Find all FAQs (including inactive, sorted by display_order)
   */
  async findAll() {
    const [rows] = await pool.execute(
      `SELECT * FROM cms_faqs ORDER BY display_order ASC, id ASC`
    );
    return rows;
  },

  /**
   * Create new FAQ
   */
  async create({ question, answer, display_order, is_active }) {
    const [result] = await pool.execute(
      `INSERT INTO cms_faqs (question, answer, display_order, is_active)
       VALUES (?, ?, ?, ?)`,
      [
        question,
        answer,
        display_order || 0,
        is_active === undefined ? 1 : (is_active ? 1 : 0)
      ]
    );
    return result;
  },

  /**
   * Update FAQ details
   */
  async update(id, { question, answer, display_order, is_active }) {
    const fields = [];
    const values = [];

    if (question !== undefined) { fields.push('question = ?'); values.push(question); }
    if (answer !== undefined) { fields.push('answer = ?'); values.push(answer); }
    if (display_order !== undefined) { fields.push('display_order = ?'); values.push(display_order); }
    if (is_active !== undefined) { fields.push('is_active = ?'); values.push(is_active ? 1 : 0); }

    if (fields.length === 0) return null;

    values.push(id);
    const [result] = await pool.execute(
      `UPDATE cms_faqs SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    return result;
  },

  /**
   * Delete FAQ
   */
  async delete(id) {
    const [result] = await pool.execute(
      `DELETE FROM cms_faqs WHERE id = ?`,
      [id]
    );
    return result;
  },

  /**
   * Update display order of multiple FAQs (reorder)
   * @param {Array<{id: number, display_order: number}>} orderArray
   */
  async updateOrder(orderArray) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      for (const item of orderArray) {
        await connection.execute(
          `UPDATE cms_faqs SET display_order = ? WHERE id = ?`,
          [item.display_order, item.id]
        );
      }
      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
};

module.exports = CmsFaq;
