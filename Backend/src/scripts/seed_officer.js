require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../config/db');

const DEFAULT_PASSWORD = 'GovBridge@123';

// certificate_type -> department_name, mirrors the certificate types an
// officer in that department is authorized to review.
const CERTIFICATE_TYPES_BY_DEPARTMENT = {
  'Revenue Department': ['Income Certificate', 'Nativity Certificate', 'Residence Certificate'],
  'Health and Family Welfare': ['Birth Certificate'],
  'Social Welfare Department': ['Community Certificate'],
};

const OFFICERS = [
  { name: 'Rajesh Kumar', email: 'officer.rajesh@gov.in', department: 'Revenue Department' },
  { name: 'Ananya Sharma', email: 'officer.ananya@gov.in', department: 'Municipal Administration' },
  { name: 'Suresh Menon', email: 'officer.suresh@gov.in', department: 'Rural Development and Panchayat Raj' },
  { name: 'Priya Sundaram', email: 'officer.priya@gov.in', department: 'Water Supply Department' },
  { name: 'Amitabh Roy', email: 'officer.amitabh@gov.in', department: 'Electricity Department' },
  { name: 'Deepa Krishnan', email: 'officer.deepa@gov.in', department: 'Health and Family Welfare' },
  { name: 'Vikramaditya Shah', email: 'officer.vikram@gov.in', department: 'Transport Department' },
  { name: 'Karthik Venkat', email: 'officer.karthik@gov.in', department: 'Police Department' },
  { name: 'Sunita Agarwal', email: 'officer.sunita@gov.in', department: 'Public Works Department' },
  { name: 'Manoj Pandey', email: 'officer.manoj@gov.in', department: 'Agriculture Department' },
  { name: 'Lakshmi Naidu', email: 'officer.lakshmi@gov.in', department: 'Social Welfare Department' },
  { name: 'Arvind Saxena', email: 'officer.arvind@gov.in', department: 'Education Department' },
  { name: 'Nitin Gadkari', email: 'officer.nitin@gov.in', department: 'Information Technology and Digital Services' },
];

async function seedOfficers() {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const { rows: departments } = await client.query('SELECT department_id, department_name FROM departments');
    const departmentIdByName = new Map(departments.map((d) => [d.department_name, d.department_id]));

    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    await client.query('DELETE FROM officers');

    for (const officer of OFFICERS) {
      const departmentId = departmentIdByName.get(officer.department);
      if (!departmentId) {
        throw new Error(`Unknown department "${officer.department}". Run officer module init() first.`);
      }
      const certificateTypes = CERTIFICATE_TYPES_BY_DEPARTMENT[officer.department] || [];

      await client.query(
        `INSERT INTO officers (name, email, password_hash, department_id, certificate_types, role, is_active)
         VALUES ($1, $2, $3, $4, $5, 'OFFICER', TRUE)`,
        [officer.name, officer.email, passwordHash, departmentId, certificateTypes]
      );
    }

    await client.query('COMMIT');
    console.log(`Seeded ${OFFICERS.length} officers. Default password for all: ${DEFAULT_PASSWORD}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to seed officers:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await db.pool.end();
  }
}

seedOfficers();
