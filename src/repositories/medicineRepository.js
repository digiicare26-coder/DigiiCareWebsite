// src/repositories/medicineRepository.js
const { clinicalPrisma } = require('../../db');

// ============================================================
// BE-3 FUNCTIONS
// ============================================================

async function findBySymptoms(symptomList) {
  return clinicalPrisma.medicine.findMany({
    where: {
      OR: symptomList.map((s) => ({
        uses: { contains: s, mode: 'insensitive' },
      })),
    },
    orderBy: {
      excellentReview: 'desc',
    },
    take: 10,
  });
}

async function searchByName(query) {
  return clinicalPrisma.medicine.findMany({
    where: {
      name: { contains: query, mode: 'insensitive' },
    },
    take: 10,
    select: { id: true, name: true },
  });
}

module.exports = {
  findBySymptoms,
  searchByName,
};
