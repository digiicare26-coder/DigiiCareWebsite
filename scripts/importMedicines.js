// scripts/importMedicines.js
// Run with: node scripts/importMedicines.js
// Reads data/Medicine_Details.csv and loads it into the medicines table
// (clinical_schema), using the same clinicalPrisma connection as the
// rest of the app (see db.js).
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { clinicalPrisma } = require('../db');

const CSV_PATH = path.join(__dirname, '..', 'data', 'Medicine_Details.csv');

async function importMedicines() {
  const rows = [];

  fs.createReadStream(CSV_PATH)
    .pipe(csv())
    .on('data', (row) => {
      rows.push({
        name: row['Medicine Name'],
        composition: row['Composition'],
        uses: row['Uses'],
        sideEffects: row['Side_effects'],
        imageUrl: row['Image URL'],
        manufacturer: row['Manufacturer'],
        excellentReview: parseFloat(row['Excellent Review %']) || null,
        averageReview: parseFloat(row['Average Review %']) || null,
        poorReview: parseFloat(row['Poor Review %']) || null,
      });
    })
    .on('end', async () => {
      console.log(`Read ${rows.length} rows from ${CSV_PATH}. Inserting...`);
      for (let i = 0; i < rows.length; i += 500) {
        const batch = rows.slice(i, i + 500);
        await clinicalPrisma.medicine.createMany({ data: batch });
        console.log(`Inserted ${i + batch.length} / ${rows.length}`);
      }
      console.log('Done!');
      await clinicalPrisma.$disconnect();
    })
    .on('error', (err) => {
      console.error('Failed to read CSV:', err);
      process.exit(1);
    });
}

importMedicines();
