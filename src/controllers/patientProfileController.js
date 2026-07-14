// src/controllers/patientProfileController.js
const clinicalRepository = require('../repositories/clinicalRepository');

async function createProfile(req, res) {
  try {
    const { linkToken } = req.user;
    const profileId = await clinicalRepository.createPatientProfile(linkToken, req.body);
    const profile = await clinicalRepository.getPatientProfileByToken(linkToken);

    res.status(201).json({ success: true, data: profile, message: 'Profile created successfully' });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ success: false, error: 'Profile already exists for this account.' });
    }
    res.status(500).json({ success: false, error: err.message });
  }
}

async function getProfile(req, res) {
  try {
    const { linkToken } = req.user;
    const profile = await clinicalRepository.getPatientProfileByToken(linkToken);

    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found.' });
    }
    res.status(200).json({ success: true, data: profile });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function updateProfile(req, res) {
  try {
    const { linkToken } = req.user;
    const profileId = await clinicalRepository.updatePatientProfile(linkToken, req.body);

    if (!profileId) {
      return res.status(404).json({ success: false, error: 'Profile not found.' });
    }
    const profile = await clinicalRepository.getPatientProfileByToken(linkToken);
    res.status(200).json({ success: true, data: profile });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

async function deleteProfile(req, res) {
  try {
    const { linkToken } = req.user;
    const deleted = await clinicalRepository.deletePatientProfile(linkToken);

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Profile not found.' });
    }
    res.status(200).json({ success: true, message: 'Profile deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { createProfile, getProfile, updateProfile, deleteProfile };