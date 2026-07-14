// src/controllers/recommendController.js
const medicineRepository = require('../repositories/medicineRepository');

async function recommend(req, res) {
  try {
    const { symptoms } = req.body;

    if (!symptoms || typeof symptoms !== 'string' || !symptoms.trim()) {
      return res.status(400).json({ success: false, error: 'symptoms is required.' });
    }

    // supports comma-separated multi-symptom input, e.g. "fever, headache"
    const symptomList = symptoms.split(',').map((s) => s.trim()).filter(Boolean);

    const medicines = await medicineRepository.findBySymptoms(symptomList);

    res.status(200).json({
      success: true,
      message: `Found ${medicines.length} medicine(s) for "${symptoms}"`,
      receivedSymptoms: symptomList,
      data: medicines,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function searchMedicine(req, res) {
  try {
    const { q } = req.query;

    if (!q || !q.trim()) {
      return res.status(200).json({ success: true, data: [] });
    }

    const medicines = await medicineRepository.searchByName(q.trim());

    res.status(200).json({ success: true, data: medicines });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { recommend, searchMedicine };
