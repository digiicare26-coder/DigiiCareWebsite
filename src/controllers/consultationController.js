// src/controllers/consultationController.js
const clinicalRepository = require('../repositories/clinicalRepository');

async function createConsultation(req, res) {
  try {
    const { linkToken } = req.user; // Patient ka login se
    const { doctorToken } = req.body;

    if (!doctorToken || !doctorToken.trim()) {
      return res.status(400).json({ success: false, error: 'doctorToken is required.' });
    }

    const doctor = await clinicalRepository.getDoctorByToken(doctorToken);
    if (!doctor) {
      return res.status(404).json({ success: false, error: 'Doctor not found.' });
    }
    if (!doctor.isApproved) {
      return res.status(403).json({ success: false, error: 'This doctor is not yet approved.' });
    }

    const consultation = await clinicalRepository.createConsultation(linkToken, doctorToken);
    return res.status(201).json({ success: true, data: consultation });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { createConsultation };