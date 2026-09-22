const fs = require('fs');
const repository = require('./certificate.repository');
const officerRepository = require('../officers/officer.repository');
const lockerService = require('../locker/locker.service');
const { ALLOWED_CERTIFICATE_TYPES } = require('./certificate.validation');

class CertificateService {
  /**
   * Initialize DB tables for the certificate module.
   */
  async init() {
    await repository.createTables();
  }

  /**
   * Submit a new certificate application with supporting documents.
   * Cleans up uploaded files from disk if DB insertion fails.
   *
   * @param {number} userId - From JWT (req.user.user_id)
   * @param {string} certificateType
   * @param {Array} files - Multer file array
   */
  async applyForCertificate(userId, certificateType, files) {
    if (!ALLOWED_CERTIFICATE_TYPES.includes(certificateType)) {
      const err = new Error(`Invalid certificate_type. Allowed: ${ALLOWED_CERTIFICATE_TYPES.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }

    if (!files || files.length === 0) {
      const err = new Error('At least one supporting document must be uploaded');
      err.statusCode = 400;
      throw err;
    }

    let application;
    try {
      application = await repository.createApplication(userId, certificateType);
    } catch (dbErr) {
      this._cleanUpFiles(files);
      throw dbErr;
    }

    const savedDocuments = [];
    try {
      for (const file of files) {
        const docType = file.fieldname || 'Supporting Document';
        const doc = await repository.saveDocument(
          application.application_id,
          userId,
          file.path,
          docType
        );
        savedDocuments.push(doc);
      }
    } catch (docErr) {
      this._cleanUpFiles(files);
      throw docErr;
    }

    return { ...application, documents: savedDocuments };
  }

  /**
   * Get all applications for a citizen.
   * @param {number} userId
   */
  async trackApplication(userId) {
    return await repository.getApplicationsByUser(userId);
  }

  async getOfficerApplications(officerId) {
    const officer = await officerRepository.findById(officerId);

    if (!officer) {
      const err = new Error('Officer not found');
      err.statusCode = 404;
      throw err;
    }

    if (!officer.is_active) {
      const err = new Error('Officer account is inactive');
      err.statusCode = 403;
      throw err;
    }

    return await repository.getApplicationsForOfficer(officerId);
  }

  /**
   * Get full details of one application (including its documents).
   * Enforces that only the owning citizen can view it.
   *
   * @param {number} applicationId
   * @param {number} userId - From JWT
   */
  async getApplicationDetails(applicationId, userId) {
    const application = await repository.getApplicationById(applicationId);

    if (!application) {
      const err = new Error('Application not found');
      err.statusCode = 404;
      throw err;
    }

    if (application.user_id !== userId) {
      const err = new Error('Access denied. You do not own this application.');
      err.statusCode = 403;
      throw err;
    }

    const documents = await repository.getDocumentsByApplicationId(applicationId);
    return { ...application, documents };
  }

  /**
   * Officer reviews an application — sets status, remarks, and records officer_id.
   *
   * @param {number} applicationId
   * @param {string} status - 'Approved' | 'Rejected'
   * @param {string|null} remarks
   * @param {number|null} officerId
   */
  async reviewApplication(applicationId, status, remarks, officerId = null) {
    if (!officerId) {
      const err = new Error('Officer authentication required');
      err.statusCode = 401;
      throw err;
    }

    const officer = await officerRepository.findById(officerId);
    if (!officer) {
      const err = new Error('Officer not found');
      err.statusCode = 404;
      throw err;
    }

    if (!officer.is_active) {
      const err = new Error('Officer account is inactive');
      err.statusCode = 403;
      throw err;
    }

    const application = await repository.getApplicationById(applicationId);
    if (!application) {
      const err = new Error('Application not found');
      err.statusCode = 404;
      throw err;
    }

    const officerCertificateTypes = Array.isArray(officer.certificate_types)
      ? officer.certificate_types
      : [];

    if (!officerCertificateTypes.includes(application.certificate_type)) {
      const err = new Error('You are not authorized to review this certificate type');
      err.statusCode = 403;
      throw err;
    }

    const updatedApplication = await repository.updateApplicationStatus(
      applicationId,
      status,
      remarks
    );

    if (!updatedApplication) {
      const err = new Error('Application not found');
      err.statusCode = 404;
      throw err;
    }

    if (status === 'Approved') {
      try {
        await lockerService.issueCertificate(
          updatedApplication.user_id,
          updatedApplication.application_id,
          updatedApplication.certificate_type
        );
      } catch (lockerErr) {
        console.error('Failed to issue certificate to Digital Locker:', lockerErr.message);
      }
    }

    return { application: updatedApplication };
  }

  /**
   * Internal helper — removes uploaded files from disk.
   * @param {Array} files - Multer file objects
   */
  _cleanUpFiles(files) {
    if (!files) return;
    for (const file of files) {
      try {
        if (file.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch (e) {
        console.warn(`File cleanup failed for ${file.path}:`, e.message);
      }
    }
  }
}

module.exports = new CertificateService();
