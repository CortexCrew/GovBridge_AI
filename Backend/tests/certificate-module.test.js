const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/config/db');
const officerRepository = require('../src/modules/officers/officer.repository');
const { validateApplication } = require('../src/modules/certificates/certificate.validation');

test('officer eligibility query matches active officers by certificate type', async () => {
  const calls = [];
  db.query = async (text, params) => {
    calls.push({ text, params });
    return { rows: [{ officer_id: 10, name: 'Officer A', email: 'a@example.com', department_id: 1 }] };
  };

  const result = await officerRepository.findEligibleOfficersByCertificateType('Income Certificate');

  assert.equal(result.length, 1);
  assert.equal(result[0].officer_id, 10);
  assert.equal(calls[0].params[0], 'Income Certificate');
  assert.match(calls[0].text, /\$1\s*=\s*ANY\(certificate_types\)/i);
});

test('unsupported certificate types are rejected', () => {
  const req = { body: { certificate_type: 'Passport Certificate' } };
  const res = {
    status(code) {
      this.code = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    }
  };

  let nextCalled = false;
  const next = () => {
    nextCalled = true;
  };

  validateApplication(req, res, next);

  assert.equal(res.code, 400);
  assert.equal(nextCalled, false);
  assert.match(res.payload.message, /Must be one of:/i);
});
