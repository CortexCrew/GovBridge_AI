const fs = require('fs');
const path = require('path');
const repository = require('./locker.repository');

const CERTIFICATES_DIR = path.join(__dirname, '../../../uploads/certificates');

class LockerService {
  async init() {
    await repository.init();
  }

  /**
   * Generate the approved certificate file and store it in the citizen's
   * Digital Locker. Called automatically when a certificate application
   * is approved — no manual officer step required.
   *
   * @param {number} userId
   * @param {number} applicationId
   * @param {string} certificateType
   */
  async issueCertificate(userId, applicationId, certificateType) {
    if (!fs.existsSync(CERTIFICATES_DIR)) {
      fs.mkdirSync(CERTIFICATES_DIR, { recursive: true });
    }

    const fileName = `certificate-${applicationId}-${Date.now()}.txt`;
    const filePath = path.join(CERTIFICATES_DIR, fileName);
    const contents = [
      `Certificate Type: ${certificateType}`,
      `Application ID: ${applicationId}`,
      `Issued To User ID: ${userId}`,
      `Issued At: ${new Date().toISOString()}`,
    ].join('\n');

    fs.writeFileSync(filePath, contents);

    const relativePath = path.join('uploads', 'certificates', fileName);
    return repository.upsertEntry(userId, applicationId, relativePath);
  }

  /**
   * List a citizen's Digital Locker contents.
   * @param {number} userId
   */
  async getUserLocker(userId) {
    return repository.getByUser(userId);
  }
}

module.exports = new LockerService();
