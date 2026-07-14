// src/controllers/doctorController.js
const clinicalRepository = require('../repositories/clinicalRepository');

async function registerDoctor(req, res) {
  try {
    const { doctorToken } = req.doctor; // ✅ ab login (JWT) se aata hai
    const { specialization, qualification, experience } = req.body;

    const doctorId = await clinicalRepository.registerDoctor(doctorToken, { specialization, qualification, experience });
    const doctor = await clinicalRepository.getDoctorByToken(doctorToken);

    res.status(201).json({ success: true, data: doctor, message: 'Registered. Waiting for admin approval.' });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ success: false, error: 'Clinical profile already exists for this doctor.' });
    }
    res.status(500).json({ success: false, error: err.message });
  }
}

async function getDoctor(req, res) {
  try {
    const { doctorToken } = req.doctor;
    const doctor = await clinicalRepository.getDoctorByToken(doctorToken);

    if (!doctor) {
      return res.status(404).json({ success: false, error: 'Clinical profile not found. Please register first.' });
    }
    res.status(200).json({ success: true, data: doctor });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function updateDoctor(req, res) {
  try {
    const { doctorToken } = req.doctor;
    const doctorId = await clinicalRepository.updateDoctor(doctorToken, req.body);

    if (!doctorId) {
      return res.status(404).json({ success: false, error: 'Clinical profile not found.' });
    }
    const doctor = await clinicalRepository.getDoctorByToken(doctorToken);
    res.status(200).json({ success: true, data: doctor });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// Admin-side action — stays URL-based on purpose, since this is not
// the doctor acting on themself. Will move under real admin auth
// once the admin panel exists.
async function approveDoctor(req, res) {
  try {
    const { doctorToken } = req.params;
    const doctorId = await clinicalRepository.approveDoctor(doctorToken);

    if (!doctorId) {
      return res.status(404).json({ success: false, error: 'Doctor not found.' });
    }
    const doctor = await clinicalRepository.getDoctorByToken(doctorToken);
    res.status(200).json({ success: true, data: doctor, message: 'Doctor approved successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function getDoctorPatients(req, res) {
  try {
    const { doctorToken } = req.doctor;
    const doctor = await clinicalRepository.getDoctorByToken(doctorToken);

    if (!doctor) {
      return res.status(404).json({ success: false, error: 'Clinical profile not found.' });
    }
    const consultations = await clinicalRepository.getConsultationsByDoctorToken(doctorToken);
    res.status(200).json({ success: true, data: consultations });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { registerDoctor, getDoctor, updateDoctor, approveDoctor, getDoctorPatients };