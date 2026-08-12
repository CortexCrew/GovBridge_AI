const test = require('node:test');
const assert = require('node:assert/strict');

const officerRepository = require('../src/modules/officers/officer.repository');
const officerService = require('../src/modules/officers/officer.service');
const certificateRepository = require('../src/modules/certificates/certificate.repository');
const complaintRepository = require('../src/modules/complaints/complaint_repository');

test('officer dashboard only includes applications for handled certificate types and complaints for the officer department', async () => {
  const originalFindById = officerRepository.findById;
  const originalGetApplicationsForOfficer = certificateRepository.getApplicationsForOfficer;
  const originalGetComplaintsByDepartment = complaintRepository.getComplaintsByDepartment;

  officerRepository.findById = async () => ({
    officer_id: 14,
    department_id: 5,
    certificate_types: ['Income Certificate', 'Residence Certificate'],
    is_active: true,
    role: 'OFFICER',
    name: 'Officer 14',
    email: 'officer14@test.com'
  });

  certificateRepository.getApplicationsForOfficer = async () => [
    { application_id: 101, certificate_type: 'Income Certificate', status: 'Pending' },
    { application_id: 102, certificate_type: 'Residence Certificate', status: 'Approved' },
    { application_id: 103, certificate_type: 'Birth Certificate', status: 'Pending' }
  ];

  complaintRepository.getComplaintsByDepartment = async () => [
    { complaint_id: 201, department_id: 5, title: 'Road repair' },
    { complaint_id: 202, department_id: 9, title: 'Another dept complaint' }
  ];

  try {
    const dashboard = await officerService.getOfficerDashboard(14);
    assert.equal(dashboard.officer.department_id, 5);
    assert.equal(dashboard.applications.length, 2);
    assert.equal(dashboard.applications.every((app) => ['Income Certificate', 'Residence Certificate'].includes(app.certificate_type)), true);
    assert.equal(dashboard.complaints.length, 1);
    assert.equal(dashboard.complaints[0].complaint_id, 201);
  } finally {
    officerRepository.findById = originalFindById;
    certificateRepository.getApplicationsForOfficer = originalGetApplicationsForOfficer;
    complaintRepository.getComplaintsByDepartment = originalGetComplaintsByDepartment;
  }
});

test('officer login rejects inactive officers', async () => {
  const originalFindByEmail = officerRepository.findByEmail;
  officerRepository.findByEmail = async () => ({
    officer_id: 7,
    email: 'inactive@test.com',
    password_hash: '$2a$10$testhash',
    is_active: false,
    role: 'OFFICER',
    department_id: 4,
    certificate_types: ['Income Certificate']
  });

  try {
    await assert.rejects(
      () => officerService.loginOfficer('inactive@test.com', 'Password123'),
      /inactive|deactivated/i
    );
  } finally {
    officerRepository.findByEmail = originalFindByEmail;
  }
});
