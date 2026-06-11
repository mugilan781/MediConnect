// ============================================================
// MediConnect – controllers/labTestController.js
// Lab test catalog management (admin)
// ============================================================

const LabTest = require('../models/LabTest');

exports.getAll = async (req, res, next) => {
  try {
    const result = await LabTest.findAll(req.query);
    res.json({ success: true, data: result.data, pagination: { page: result.page, limit: result.limit, total: result.total, totalPages: result.totalPages } });
  } catch (error) { next(error); }
};

exports.getById = async (req, res, next) => {
  try {
    const test = await LabTest.findById(req.params.id);
    if (!test) return res.status(404).json({ success: false, message: 'Lab test not found.' });
    res.json({ success: true, data: test });
  } catch (error) { next(error); }
};

exports.create = async (req, res, next) => {
  try {
    const result = await LabTest.create(req.body);
    const test = await LabTest.findById(result.insertId);
    res.status(201).json({ success: true, message: 'Lab test created.', data: test });
  } catch (error) { next(error); }
};

exports.update = async (req, res, next) => {
  try {
    await LabTest.update(req.params.id, req.body);
    const updated = await LabTest.findById(req.params.id);
    res.json({ success: true, message: 'Lab test updated.', data: updated });
  } catch (error) { next(error); }
};

exports.deactivate = async (req, res, next) => {
  try {
    await LabTest.deactivate(req.params.id);
    res.json({ success: true, message: 'Lab test deactivated.' });
  } catch (error) { next(error); }
};

exports.getCategories = async (req, res, next) => {
  try {
    const categories = await LabTest.getCategories();
    res.json({ success: true, data: categories });
  } catch (error) { next(error); }
};
