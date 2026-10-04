const fs = require('fs');
const repository = require('./certificate.repository');
const officerRepository = require('../officers/officer.repository');
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
   * @param {Object|null} applicationData - Type-specific form fields
   */
  async applyForCertificate(userId, certificateType, files, applicationData = null) {
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
      application = await repository.createApplication(userId, certificateType, applicationData);
    } catch (dbErr) {
      this._cleanUpFiles(files);
      throw dbErr;
    }

    const savedDocuments = [];
    try {
      for (const file of files) {
        const docType = file.originalname || file.fieldname || 'Supporting Document';
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
   * Enforces that only the owning citizen or an authorized officer can view it.
   *
   * @param {number} applicationId
   * @param {Object} user - From JWT (req.user)
   */
  async getApplicationDetails(applicationId, user) {
    const application = await repository.getApplicationById(applicationId);

    if (!application) {
      const err = new Error('Application not found');
      err.statusCode = 404;
      throw err;
    }

    if (user.role === 'OFFICER') {
      const officerId = user.officer_id || user.id;
      const officer = officerId ? await officerRepository.findById(officerId) : null;
      if (!officer || !officer.is_active) {
        const err = new Error('Access denied. Inactive officer account.');
        err.statusCode = 403;
        throw err;
      }
      const rawTypes = officer.certificate_types;
      const types = Array.isArray(rawTypes)
        ? rawTypes
        : (typeof rawTypes === 'string' ? rawTypes.replace(/[{}]/g, '').split(',').map(s => s.trim()).filter(Boolean) : []);
      if (types.length > 0 && !types.includes(application.certificate_type)) {
        const err = new Error('Access denied. You are not authorized for this certificate type.');
        err.statusCode = 403;
        throw err;
      }
    } else if (application.user_id !== user.user_id) {
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
   * @param {Object|null} certificateFile - Multer file; required when approving
   */
  async reviewApplication(applicationId, status, remarks, officerId = null, certificateFile = null) {
    try {
      return await this._reviewApplication(applicationId, status, remarks, officerId, certificateFile);
    } catch (error) {
      if (certificateFile) this._cleanUpFiles([certificateFile]);
      throw error;
    }
  }

  async _reviewApplication(applicationId, status, remarks, officerId, certificateFile) {
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

    const rawTypes = officer.certificate_types;
    const officerCertificateTypes = Array.isArray(rawTypes)
      ? rawTypes
      : (typeof rawTypes === 'string' ? rawTypes.replace(/[{}]/g, '').split(',').map(s => s.trim().replace(/^"|"$/g, '')).filter(Boolean) : []);

    if (officerCertificateTypes.length > 0 && !officerCertificateTypes.includes(application.certificate_type)) {
      const err = new Error('You are not authorized to review this certificate type');
      err.statusCode = 403;
      throw err;
    }

    let updatedApplication;
    if (status === 'Approved') {
      if (!certificateFile) {
        const err = new Error('The approved certificate file must be uploaded to approve an application');
        err.statusCode = 400;
        throw err;
      }
      updatedApplication = await repository.approveWithCertificate(
        applicationId,
        remarks,
        application.user_id,
        officerId,
        certificateFile.path
      );
    } else {
      if (certificateFile) this._cleanUpFiles([certificateFile]);
      updatedApplication = await repository.updateApplicationStatus(
        applicationId,
        status,
        remarks
      );
    }

    if (!updatedApplication) {
      const err = new Error('Application not found');
      err.statusCode = 404;
      throw err;
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
