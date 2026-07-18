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

// ============================================================
// BE-4 FUNCTIONS (Original)
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
        version: 1,
        isLatest: true,
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
      where: { 
        linkToken, 
        status: { not: 'DELETED' },
        isLatest: true,
      },
      orderBy: { uploadedAt: 'desc' },
      skip,
      take: limit,
    }),
    clinicalPrisma.scan.count({
      where: { 
        linkToken, 
        status: { not: 'DELETED' },
        isLatest: true,
      },
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
    if (err.code === 'P2025') return undefined;
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
// 🆕 BE-4: SEARCH SCANS BY OCR TEXT
// ============================================================

async function searchScansByText(linkToken, searchTerm) {
  try {
    const scans = await clinicalPrisma.scan.findMany({
      where: {
        linkToken: linkToken,
        OR: [
          { ocrText: { contains: searchTerm, mode: 'insensitive' } },
          { fileName: { contains: searchTerm, mode: 'insensitive' } }
        ],
        status: { not: 'DELETED' }
      },
      orderBy: { uploadedAt: 'desc' }
    });
    
    return scans;
  } catch (err) {
    console.error('Search scans error:', err);
    throw err;
  }
}

// ============================================================
// 🆕 BE-4: REPORT HISTORY / VERSIONING FUNCTIONS
// ============================================================

async function createNewVersion(originalScanId, scanData) {
  try {
    const currentScan = await clinicalPrisma.scan.findUnique({
      where: { scanId: originalScanId }
    });

    if (!currentScan) {
      throw new Error('Original scan not found');
    }

    const parentScanId = currentScan.parentScanId || currentScan.scanId;

    const latestVersion = await clinicalPrisma.scan.findFirst({
      where: {
        OR: [
          { scanId: parentScanId },
          { parentScanId: parentScanId }
        ]
      },
      orderBy: { version: 'desc' }
    });

    const newVersionNumber = (latestVersion?.version || 0) + 1;

    await clinicalPrisma.scan.updateMany({
      where: {
        OR: [
          { scanId: parentScanId },
          { parentScanId: parentScanId }
        ]
      },
      data: {
        isLatest: false
      }
    });

    const { scanType, fileName, filePath, thumbnailPath, fileSize, mimeType, metadata } = scanData;

    const newScan = await clinicalPrisma.scan.create({
      data: {
        linkToken: currentScan.linkToken,
        scanType: scanType || currentScan.scanType,
        fileName: fileName,
        filePath: filePath,
        thumbnailPath: thumbnailPath || null,
        fileSize: fileSize,
        mimeType: mimeType,
        status: 'UPLOADED',
        metadata: metadata || {},
        version: newVersionNumber,
        parentScanId: parentScanId,
        isLatest: true
      }
    });

    return newScan;

  } catch (error) {
    console.error('Create New Version Error:', error);
    throw error;
  }
}

async function getScanHistory(scanId) {
  try {
    const originalScan = await clinicalPrisma.scan.findUnique({
      where: { scanId: scanId }
    });

    if (!originalScan) {
      return null;
    }

    const rootId = originalScan.parentScanId || originalScan.scanId;

    const versions = await clinicalPrisma.scan.findMany({
      where: {
        OR: [
          { scanId: rootId },
          { parentScanId: rootId }
        ],
        status: { not: 'DELETED' }
      },
      orderBy: {
        version: 'asc'
      }
    });

    return {
      rootId: rootId,
      totalVersions: versions.length,
      versions: versions
    };

  } catch (error) {
    console.error('Get Scan History Error:', error);
    throw error;
  }
}

async function getLatestVersion(scanId) {
  try {
    const originalScan = await clinicalPrisma.scan.findUnique({
      where: { scanId: scanId }
    });

    if (!originalScan) {
      return null;
    }

    const rootId = originalScan.parentScanId || originalScan.scanId;

    const latest = await clinicalPrisma.scan.findFirst({
      where: {
        OR: [
          { scanId: rootId },
          { parentScanId: rootId }
        ],
        isLatest: true,
        status: { not: 'DELETED' }
      }
    });

    return latest;

  } catch (error) {
    console.error('Get Latest Version Error:', error);
    throw error;
  }
}

async function getScansByLinkToken(linkToken) {
  try {
    const scans = await clinicalPrisma.scan.findMany({
      where: {
        linkToken: linkToken,
        isLatest: true,
        status: { not: 'DELETED' }
      },
      orderBy: {
        uploadedAt: 'desc'
      }
    });
    return scans;
  } catch (error) {
    console.error('Get Scans By LinkToken Error:', error);
    throw error;
  }
}

async function getScanByVersion(rootId, version) {
  try {
    const scan = await clinicalPrisma.scan.findFirst({
      where: {
        OR: [
          { scanId: rootId },
          { parentScanId: rootId }
        ],
        version: version,
        status: { not: 'DELETED' }
      }
    });
    return scan;
  } catch (error) {
    console.error('Get Scan By Version Error:', error);
    throw error;
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
    if (err.code === 'P2025') return undefined;
    throw err;
  }
}

async function deletePatientProfile(linkToken) {
  try {
    await clinicalPrisma.patientProfile.delete({ where: { linkToken } });
    return true;
  } catch (err) {
    if (err.code === 'P2025') return false;
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
    if (err.code === 'P2025') return undefined;
    throw err;
  }
}

async function approveDoctor(doctorToken) {
  try {
    const result = await clinicalPrisma.doctor.update({
      where: { doctorToken },
      data: { isApproved: true, updatedAt: new Date() },
    });
    return result.doctorId;
  } catch (err) {
    if (err.code === 'P2025') return undefined;
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

// ============================================================
// BE-2: REWARDS FUNCTIONS
// ============================================================

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
    if (err.code === 'P2002') return null;
    throw err;
  }
}

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
    if (err.code === 'P2002') return null;
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

async function approveRedemption(redemptionId) {
  return clinicalPrisma.redemptionRequest.updateMany({
    where: { redemptionId, status: 'PENDING' },
    data: { status: 'APPROVED', reviewedAt: new Date() },
  });
}

async function rejectRedemption(redemptionId) {
  return clinicalPrisma.$transaction(async (tx) => {
    const request = await tx.redemptionRequest.findFirst({
      where: { redemptionId, status: 'PENDING' },
    });

    if (!request) return null;

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
// 🆕 BE-4: PRINT FUNCTIONS
// ============================================================

async function updateScanPrintInfo(scanId, pdfPath) {
  try {
    const result = await clinicalPrisma.scan.update({
      where: { scanId },
      data: {
        printedPdfPath: pdfPath,
        printedAt: new Date()
      }
    });
    return result;
  } catch (error) {
    console.error('Update Scan Print Info Error:', error);
    throw error;
  }
}

async function createPrintJob(scanId, pdfPath) {
  try {
    const result = await clinicalPrisma.printJob.create({
      data: {
        scanId: scanId,
        pdfPath: pdfPath
      }
    });
    return result;
  } catch (error) {
    console.error('Create Print Job Error:', error);
    throw error;
  }
}

async function getPrintJobsByScanId(scanId) {
  try {
    const printJobs = await clinicalPrisma.printJob.findMany({
      where: { scanId: scanId },
      orderBy: { createdAt: 'desc' }
    });
    return printJobs;
  } catch (error) {
    console.error('Get Print Jobs Error:', error);
    return [];
  }
}

// ============================================================
// MODULE EXPORTS
// ============================================================

module.exports = {
  // BE-1
  saveVitals,
  getVitalsByToken,

  // BE-4 - Original
  saveScan,
  getScansByToken,
  getScanById,
  updateScanStatus,
  deleteScan,
  logAudit,
  searchScansByText,

  // BE-4 - Versioning
  createNewVersion,
  getScanHistory,
  getLatestVersion,
  getScansByLinkToken,
  getScanByVersion,

  // BE-4 - Print
  updateScanPrintInfo,
  createPrintJob,
  getPrintJobsByScanId,

  // BE-2
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

  // BE-2 - Rewards
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