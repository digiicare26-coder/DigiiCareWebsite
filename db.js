// db.js
require('dotenv').config();
const { PrismaClient: IdentityPrismaClient } = require('./generated/identity-client');
const { PrismaClient: ClinicalPrismaClient } = require('./generated/clinical-client');

const identityPrisma = new IdentityPrismaClient();
const clinicalPrisma = new ClinicalPrismaClient();

module.exports = { identityPrisma, clinicalPrisma };