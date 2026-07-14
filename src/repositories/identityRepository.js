const { identityPrisma } = require('../../db');
const { generateLinkToken } = require('../services/linkingService');

/**
 * Pulls the next value from identity_schema.uid_seq (see migration
 * 004_add_signup_fields.sql). A dedicated DB sequence is used —
 * instead of something like COUNT(*) + 1 — so two signups arriving
 * at the same time can never end up with the same UID. This is why
 * it always runs inside the same transaction as the patient insert.
 */
async function getNextUid(tx) {
  const rows = await tx.$queryRaw`SELECT nextval('identity_schema.uid_seq') AS uid`;
  return rows[0].uid.toString();
}

/**
 * POST /api/auth/signup
 * Creates a brand new patient account: full name, email, CNIC,
 * mobile number and password. The UID is never supplied by the
 * client — it is always assigned here, sequentially (1, 2, 3, ...),
 * so signup order and UID order always match.
 */
async function createPatientForSignup(fullName, email, cnic, mobile, passwordHash) {
  try {
    return await identityPrisma.$transaction(async (tx) => {
      const uid = await getNextUid(tx);

      const patient = await tx.patient.create({
        data: {
          fullName,
          email,
          cnic,
          mobileNumber: mobile,
          uid,
          passwordHash,
        },
      });

      const linkToken = generateLinkToken(patient.patientId.toString());

      await tx.linkToken.create({
        data: { linkToken, patientId: patient.patientId },
      });

      return { patientId: patient.patientId, uid, linkToken };
    });
  } catch (err) {
    if (err.code === 'P2002') { // Prisma unique constraint violation
      throw new Error('A patient with this email / CNIC / mobile number already exists.');
    }
    throw err;
  }
}

async function createPatient(fullName, cnic, mobile, uid) {
  try {
    return await identityPrisma.$transaction(async (tx) => {
      const patient = await tx.patient.create({
        data: { fullName, cnic, mobileNumber: mobile, uid },
      });
      const linkToken = generateLinkToken(patient.patientId.toString());

      await tx.linkToken.create({
        data: { linkToken, patientId: patient.patientId },
      });

      return { patientId: patient.patientId, linkToken };
    });
  } catch (err) {
    if (err.code === 'P2002') { // Prisma unique constraint violation
      throw new Error('A patient with this CNIC / mobile / UID already exists.');
    }
    throw err;
  }
}

/**
 * Sub-ID linking: wife/kids never get a brand new, separate account —
 * their row is FK-linked to the father/husband's patient_id
 * (parent_patient_id) and gets a sub-uid derived from HIS uid:
 *
 *   parent uid "1"  ->  sub uids "1_1", "1_2", "1_3", ...
 *
 * The parent row is locked with SELECT ... FOR UPDATE for the
 * duration of the transaction, so two sub-account creations for the
 * SAME parent arriving at the same time can never end up computing
 * the same next-in-line suffix (mirrors the uid_seq pattern used for
 * patients.uid, just scoped per-parent instead of global).
 */
async function createSubAccount(parentPatientId, fullName, relation) {
  if (!['child', 'spouse'].includes(relation)) {
    throw new Error(`Invalid relation: ${relation}`);
  }

  return identityPrisma.$transaction(async (tx) => {
    const lockedParent = await tx.$queryRaw`
      SELECT patient_id, uid
      FROM identity_schema.patients
      WHERE patient_id = ${parentPatientId}
      FOR UPDATE
    `;

    const parent = lockedParent[0];
    if (!parent) {
      throw new Error(`No patient found with id ${parentPatientId}`);
    }
    if (!parent.uid) {
      throw new Error('Parent account has no uid yet; cannot create a linked sub-account.');
    }

    const existingCount = await tx.patient.count({
      where: { parentPatientId },
    });
    const subUid = `${parent.uid}_${existingCount + 1}`;

    const subAccount = await tx.patient.create({
      data: { fullName, relation, uid: subUid, parentPatientId },
    });
    const linkToken = generateLinkToken(subAccount.patientId.toString());

    await tx.linkToken.create({
      data: { linkToken, patientId: subAccount.patientId },
    });

    return { subAccountId: subAccount.patientId, uid: subUid, linkToken };
  });
}

/**
 * All sub-accounts (wife/kids) FK-linked under one father/husband,
 * e.g. to list a family: patient 1 -> linked rows 1_1, 1_2, 1_3.
 * These are patients rows too now — just ones with parentPatientId set.
 */
async function findSubAccountsByParent(parentPatientId) {
  return identityPrisma.patient.findMany({
    where: { parentPatientId },
    orderBy: { patientId: 'asc' },
  });
}

/**
 * Look up a wife/kid row directly by its sub-uid (e.g. "1_2").
 */
async function findSubAccountByUid(uid) {
  return identityPrisma.patient.findFirst({
    where: { uid, parentPatientId: { not: null } },
    include: { linkToken: true },
  });
}

/**
 * Login only ever happens against an independent (father/husband)
 * account, never a linked spouse/child row directly — kids/spouse
 * don't have their own login credentials, they're reached through
 * the parent's account. parentPatientId: null excludes linked rows
 * even though they live in the same table now.
 * The user picks any one of email, CNIC, mobile number, or uid as
 * their identifier — this matches it against whichever field it is.
 */
async function findPatientByIdentifier(identifier) {
  return identityPrisma.patient.findFirst({
    where: {
      parentPatientId: null,
      OR: [
        { email: identifier },
        { mobileNumber: identifier },
        { cnic: identifier },
        { uid: identifier },
      ],
    },
    include: { linkToken: true },
  });
}

/**
 * Pulls the next value from identity_schema.doctor_uid_seq — a
 * separate sequence from patients' uid_seq, since doctors are a
 * different account type. Same reasoning as getNextUid() above:
 * a dedicated DB sequence so two doctor signups at the same time
 * never collide.
 */
async function getNextDoctorUid(tx) {
  const rows = await tx.$queryRaw`SELECT nextval('identity_schema.doctor_uid_seq') AS uid`;
  return rows[0].uid.toString();
}

/**
 * POST /api/doctor-auth/signup
 * Creates a new doctor identity: full name, email, license number,
 * mobile number, password. Issues a doctorToken (same shape/HMAC
 * scheme as a patient's linkToken) — that doctorToken is exactly
 * what src/routes/doctorRoute.js already expects for registering
 * the clinical profile (specialization, qualification, etc.) via
 * the existing POST /api/doctor endpoint.
 */
async function createDoctorForSignup(fullName, email, licenseNumber, mobile, passwordHash) {
  try {
    return await identityPrisma.$transaction(async (tx) => {
      const uid = await getNextDoctorUid(tx);

      const doctor = await tx.doctor.create({
        data: {
          fullName,
          email,
          licenseNumber,
          mobileNumber: mobile,
          uid,
          passwordHash,
        },
      });

      const doctorToken = generateLinkToken(`doctor-${doctor.doctorId}`);

      await tx.doctorLinkToken.create({
        data: { doctorToken, doctorId: doctor.doctorId },
      });

      return { doctorId: doctor.doctorId, uid, doctorToken };
    });
  } catch (err) {
    if (err.code === 'P2002') { // Prisma unique constraint violation
      throw new Error('A doctor with this email / license number / mobile number already exists.');
    }
    throw err;
  }
}

/**
 * Login lookup for a doctor — same idea as findPatientByIdentifier,
 * matched against email, license number, mobile number, or uid.
 */
async function findDoctorByIdentifier(identifier) {
  return identityPrisma.doctor.findFirst({
    where: {
      OR: [
        { email: identifier },
        { mobileNumber: identifier },
        { licenseNumber: identifier },
        { uid: identifier },
      ],
    },
    include: { doctorToken: true },
  });
}

module.exports = {
  createPatient,
  createPatientForSignup,
  createSubAccount,
  findSubAccountsByParent,
  findSubAccountByUid,
  findPatientByIdentifier,
  createDoctorForSignup,
  findDoctorByIdentifier,
};