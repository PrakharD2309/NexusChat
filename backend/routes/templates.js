const express = require('express');
const router = express.Router();
const templateService = require('../services/templateService');
const auth = require('../middleware/auth');

// Create a new template
router.post('/', auth, async (req, res) => {
  try {
    const template = await templateService.createTemplate(req.user.id, req.body);
    res.json(template);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Use a template
router.post('/:templateId/use', auth, async (req, res) => {
  try {
    const { variables } = req.body;
    const result = await templateService.useTemplate(
      req.params.templateId,
      req.user.id,
      variables
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get user's templates
router.get('/', auth, async (req, res) => {
  try {
    const filters = {
      category: req.query.category,
      isQuickReply: req.query.isQuickReply === 'true',
      tags: req.query.tags ? req.query.tags.split(',') : []
    };
    const templates = await templateService.getUserTemplates(req.user.id, filters);
    res.json(templates);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update a template
router.put('/:templateId', auth, async (req, res) => {
  try {
    const template = await templateService.updateTemplate(
      req.params.templateId,
      req.user.id,
      req.body
    );
    res.json(template);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a template
router.delete('/:templateId', auth, async (req, res) => {
  try {
    const result = await templateService.deleteTemplate(
      req.params.templateId,
      req.user.id
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get template statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const stats = await templateService.getTemplateStats(req.user.id);
    res.json(stats);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Search templates
router.get('/search', auth, async (req, res) => {
  try {
    const templates = await templateService.searchTemplates(
      req.user.id,
      req.query.q
    );
    res.json(templates);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router; 