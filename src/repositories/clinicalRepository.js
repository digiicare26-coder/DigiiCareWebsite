const { clinicalPrisma } = require('../../db');

// ============================================================
// BE-1 FUNCTIONS
// ============================================================

async function saveVitals(linkToken, vitals) {
  try {
    const result = await clinicalPrisma.vitals.create({
      data: {
        linkToken,
        age: vitals.age,
        gender: vitals.gender,
        height: vitals.height,
        weight: vitals.weight,
        bp: vitals.bp,
        temperature: vitals.temperature,
        bloodGroup: vitals.bloodGroup,
      },
    });
    return result.recordId;
  } catch (err) {
    if (err.code === 'P2011' || err.code === 'P2012') {
      throw new Error('Missing a required vitals field (age/gender are mandatory).');
    }
    throw err;
  }
}

async function getVitalsByToken(linkToken) {
  return clinicalPrisma.vitals.findMany({
    where: { linkToken },
  });
}

// NOTE: saveReport()/getReportsByToken() removed — there is no
// clinical_schema.reports table in create_scans_tables.sql or
// create_vitals_table.sql. If a reports table exists elsewhere,
// tell me and I'll add its model + these functions back.

// ============================================================
// BE-4 FUNCTIONS
// ============================================================

async function saveScan(linkToken, scanData) {
  try {
    const { scanType, fileName, filePath, thumbnailPath, fileSize, mimeType, metadata } = scanData;

    const result = await clinicalPrisma.scan.create({
      data: {
        linkToken,
        scanType,
        fileName,
        filePath,
        thumbnailPath: thumbnailPath || null,
        fileSize,
        mimeType,
        status: 'UPLOADED',
        metadata: metadata || {},
      },
    });

    return result.scanId;
  } catch (err) {
    console.error('Error saving scan:', err);
    throw err;
  }
}

async function getScansByToken(linkToken, page = 1, limit = 10) {
  const skip = (page - 1) * limit;

  const [scans, total] = await Promise.all([
    clinicalPrisma.scan.findMany({
      where: { linkToken, status: { not: 'DELETED' } },
      orderBy: { uploadedAt: 'desc' },
      skip,
      take: limit,
    }),
    clinicalPrisma.scan.count({
      where: { linkToken, status: { not: 'DELETED' } },
    }),
  ]);

  return {
    scans,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

async function getScanById(scanId, linkToken) {
  return clinicalPrisma.scan.findFirst({
    where: { scanId, linkToken, status: { not: 'DELETED' } },
  });
}

async function updateScanStatus(scanId, status, ocrText = null, confidence = null) {
  const data = { status };
  if (ocrText !== null) data.ocrText = ocrText;
  if (confidence !== null) data.ocrConfidence = confidence;
  if (status === 'OCR_COMPLETE' || status === 'FAILED') {
    data.processedAt = new Date();
  }

  try {
    const result = await clinicalPrisma.scan.update({
      where: { scanId },
      data,
    });
    return result?.scanId;
  } catch (err) {
    if (err.code === 'P2025') return undefined; // record not found
    throw err;
  }
}

async function deleteScan(scanId, linkToken) {
  const result = await clinicalPrisma.scan.updateMany({
    where: { scanId, linkToken },
    data: { status: 'DELETED' },
  });
  return result.count > 0 ? scanId : undefined;
}

async function logAudit(auditData) {
  try {
    const { linkToken, action, scanId, status, errorMessage, ipAddress, userAgent } = auditData;

    const result = await clinicalPrisma.auditLog.create({
      data: {
        linkToken,
        action,
        scanId: scanId || null,
        status,
        errorMessage: errorMessage || null,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
    });

    return result.logId;
  } catch (err) {
    console.error('Audit log failed:', err.message);
    return null;
  }
}

// ============================================================
// BE-2 FUNCTIONS
// ============================================================

async function createPatientProfile(linkToken, profileData) {
  const { profilePicUrl, preferredLanguage } = profileData;
  const result = await clinicalPrisma.patientProfile.create({
    data: {
      linkToken,
      profilePicUrl: profilePicUrl || null,
      preferredLanguage: preferredLanguage || 'en',
    },
  });
  return result.profileId;
}

async function getPatientProfileByToken(linkToken) {
  return clinicalPrisma.patientProfile.findUnique({
    where: { linkToken },
  });
}

async function updatePatientProfile(linkToken, profileData) {
  const { profilePicUrl, preferredLanguage } = profileData;
  try {
    const result = await clinicalPrisma.patientProfile.update({
      where: { linkToken },
      data: {
        ...(profilePicUrl !== undefined && { profilePicUrl }),
        ...(preferredLanguage !== undefined && { preferredLanguage }),
        updatedAt: new Date(),
      },
    });
    return result.profileId;
  } catch (err) {
    if (err.code === 'P2025') return undefined; // record not found
    throw err;
  }
}

async function deletePatientProfile(linkToken) {
  try {
    await clinicalPrisma.patientProfile.delete({ where: { linkToken } });
    return true;
  } catch (err) {
    if (err.code === 'P2025') return false; // record not found
    throw err;
  }
}

async function registerDoctor(doctorToken, doctorData) {
  const { specialization, qualification, experience } = doctorData;
  const result = await clinicalPrisma.doctor.create({
    data: {
      doctorToken,
      specialization: specialization || null,
      qualification: qualification || null,
      experience: experience || null,
    },
  });
  return result.doctorId;
}

async function getDoctorByToken(doctorToken) {
  return clinicalPrisma.doctor.findUnique({
    where: { doctorToken },
  });
}

async function updateDoctor(doctorToken, doctorData) {
  const { specialization, qualification, experience } = doctorData;
  try {
    const result = await clinicalPrisma.doctor.update({
      where: { doctorToken },
      data: {
        ...(specialization !== undefined && { specialization }),
        ...(qualification !== undefined && { qualification }),
        ...(experience !== undefined && { experience }),
        updatedAt: new Date(),
      },
    });
    return result.doctorId;
  } catch (err) {
    if (err.code === 'P2025') return undefined; // record not found
    throw err;
  }
}

// 🔥 ADDED: doctors.is_approved existed in the schema/migration but no
// function ever set it — an admin had no way to approve a doctor
// through the API. This closes that gap without touching anything else.
async function approveDoctor(doctorToken) {
  try {
    const result = await clinicalPrisma.doctor.update({
      where: { doctorToken },
      data: { isApproved: true, updatedAt: new Date() },
    });
    return result.doctorId;
  } catch (err) {
    if (err.code === 'P2025') return undefined; // record not found
    throw err;
  }
}

async function getConsultationsByDoctorToken(doctorToken) {
  return clinicalPrisma.consultation.findMany({
    where: { doctorToken },
    orderBy: { createdAt: 'desc' },
  });
}

async function createConsultation(linkToken, doctorToken) {
  return clinicalPrisma.consultation.create({
    data: { linkToken, doctorToken, status: 'ACTIVE' },
  });
}

async function createConsentLog(linkToken, consentGiven, consentVersion) {
  return clinicalPrisma.consentLog.create({
    data: { linkToken, consentGiven, consentVersion },
  });
}

async function getLatestConsent(linkToken) {
  return clinicalPrisma.consentLog.findFirst({
    where: { linkToken },
    orderBy: { createdAt: 'desc' },
  });
}

async function getConsentHistory(linkToken) {
  return clinicalPrisma.consentLog.findMany({
    where: { linkToken },
    orderBy: { createdAt: 'desc' },
  });
}

// Awards points and logs the transaction in a single atomic DB
// transaction — either both the balance update and the ledger entry
// happen, or neither does. If the account doesn't exist yet, it's
// created here (upsert).
async function earnPoints(linkToken, points, reason, actionKey) {
  try {
    return await clinicalPrisma.$transaction(async (tx) => {
      const account = await tx.rewardAccount.upsert({
        where: { linkToken },
        create: { linkToken, pointsBalance: points },
        update: { pointsBalance: { increment: points } },
      });
      const transaction = await tx.rewardTransaction.create({
        data: { linkToken, points, type: 'EARNED', reason, actionKey },
      });
      return { account, transaction };
    });
  } catch (err) {
    if (err.code === 'P2002') return null; // duplicate actionKey — already awarded
    throw err;
  }
}

// Deducts points and logs the transaction, also atomically. Checks
// the balance INSIDE the same transaction, so a race condition
// (two redemptions at once) can't push the balance negative.
async function redeemPoints(linkToken, points, reason, actionKey) {
  try {
    return await clinicalPrisma.$transaction(async (tx) => {
      const account = await tx.rewardAccount.findUnique({ where: { linkToken } });

      if (!account || account.pointsBalance < points) {
        throw new Error('INSUFFICIENT_BALANCE');
      }

      const updatedAccount = await tx.rewardAccount.update({
        where: { linkToken },
        data: { pointsBalance: { decrement: points } },
      });
      const transaction = await tx.rewardTransaction.create({
        data: { linkToken, points: -points, type: 'REDEEMED', reason, actionKey },
      });
      return { account: updatedAccount, transaction };
    });
  } catch (err) {
    if (err.code === 'P2002') return null; // duplicate actionKey
    throw err;
  }
}

async function getRewardBalance(linkToken) {
  const account = await clinicalPrisma.rewardAccount.findUnique({ where: { linkToken } });
  return account ? account.pointsBalance : 0;
}

async function getRewardHistory(linkToken) {
  return clinicalPrisma.rewardTransaction.findMany({
    where: { linkToken },
    orderBy: { createdAt: 'desc' },
  });
}

// Creates a redemption request and deducts the points immediately,
// atomically. Deducting up-front (rather than only on approval)
// prevents the same points from being requested twice while a
// request is still pending.
async function createRedemptionRequest(linkToken, pointsRequested, reason) {
  return clinicalPrisma.$transaction(async (tx) => {
    const account = await tx.rewardAccount.findUnique({ where: { linkToken } });

    if (!account || account.pointsBalance < pointsRequested) {
      throw new Error('INSUFFICIENT_BALANCE');
    }

    await tx.rewardAccount.update({
      where: { linkToken },
      data: { pointsBalance: { decrement: pointsRequested } },
    });

    const request = await tx.redemptionRequest.create({
      data: { linkToken, pointsRequested, reason: reason || null, status: 'PENDING' },
    });

    await tx.rewardTransaction.create({
      data: {
        linkToken,
        points: -pointsRequested,
        type: 'REDEEMED',
        reason: reason || 'redemption_request',
        actionKey: `${linkToken}_redemption_${request.redemptionId}`,
      },
    });

    return request;
  });
}

async function getRedemptionRequestById(redemptionId) {
  return clinicalPrisma.redemptionRequest.findUnique({ where: { redemptionId } });
}

async function getRedemptionRequestsByToken(linkToken) {
  return clinicalPrisma.redemptionRequest.findMany({
    where: { linkToken },
    orderBy: { requestedAt: 'desc' },
  });
}

// Approval just flips the status — the points were already deducted
// when the request was created, so nothing else needs to happen.
async function approveRedemption(redemptionId) {
  return clinicalPrisma.redemptionRequest.updateMany({
    where: { redemptionId, status: 'PENDING' },
    data: { status: 'APPROVED', reviewedAt: new Date() },
  });
}

// Rejection refunds the points back to the account — atomically,
// so the refund and the status change either both happen or neither
// does.
async function rejectRedemption(redemptionId) {
  return clinicalPrisma.$transaction(async (tx) => {
    const request = await tx.redemptionRequest.findFirst({
      where: { redemptionId, status: 'PENDING' },
    });

    if (!request) return null; // not found, or already reviewed

    const updated = await tx.redemptionRequest.update({
      where: { redemptionId },
      data: { status: 'REJECTED', reviewedAt: new Date() },
    });

    await tx.rewardAccount.update({
      where: { linkToken: request.linkToken },
      data: { pointsBalance: { increment: request.pointsRequested } },
    });

    await tx.rewardTransaction.create({
      data: {
        linkToken: request.linkToken,
        points: request.pointsRequested,
        type: 'EARNED',
        reason: 'redemption_rejected_refund',
        actionKey: `${request.linkToken}_refund_${redemptionId}`,
      },
    });

    return updated;
  });
}

// ============================================================
// MODULE EXPORTS
// ============================================================

module.exports = {
  saveVitals,
  getVitalsByToken,
  saveScan,
  getScansByToken,
  getScanById,
  updateScanStatus,
  deleteScan,
  logAudit,
  createPatientProfile,
  getPatientProfileByToken,
  updatePatientProfile,
  deletePatientProfile,
  registerDoctor,
  getDoctorByToken,
  updateDoctor,
  approveDoctor,
  getConsultationsByDoctorToken,
  createConsultation,
  createConsentLog,
  getLatestConsent,
  getConsentHistory,
  earnPoints,
  redeemPoints,
  getRewardBalance,
  getRewardHistory,
  createRedemptionRequest,
  getRedemptionRequestById,
  getRedemptionRequestsByToken,
  approveRedemption,
  rejectRedemption,
};
