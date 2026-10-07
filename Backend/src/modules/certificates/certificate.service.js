const path = require('path');
const crypto = require('crypto');
const repository = require('./certificate.repository');
const officerRepository = require('../officers/officer.repository');
const blobStorage = require('../../services/blob-storage.service');
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

    const application = await repository.createApplication(userId, certificateType, applicationData);
    const savedDocuments = [];
    const uploadedBlobs = [];
    try {
      for (const file of files) {
        const docType = file.originalname || file.fieldname || 'Supporting Document';
        const extension = path.extname(file.originalname || '').toLowerCase();
        const blobName = `${userId}/${crypto.randomUUID()}${extension}`;
        uploadedBlobs.push(blobName);
        await blobStorage.uploadFile(file, blobName);
        const doc = await repository.saveDocument(
          application.application_id,
          userId,
          blobName,
          docType,
          {
            file_name: file.originalname,
            content_type: file.mimetype,
            file_size: file.size,
            storage_provider: 'azure'
          }
        );
        savedDocuments.push(doc);
      }
    } catch (error) {
      await Promise.all(uploadedBlobs.map(blobStorage.deleteFile));
      try {
        await repository.deleteApplication(application.application_id, userId);
      } catch (cleanupError) {
        console.warn('Certificate application cleanup failed:', cleanupError.message);
      }
      throw error;
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

  async getSupportingDocument(documentId, user) {
    const document = await repository.getDocumentById(documentId);
    if (!document) {
      const err = new Error('Document not found');
      err.statusCode = 404;
      throw err;
    }

    const application = await this.getApplicationDetails(document.application_id, user);
    if (document.user_id !== application.user_id) {
      const err = new Error('Access denied. You do not own this document.');
      err.statusCode = 403;
      throw err;
    }
    return document;
  }

  async getSupportingDocumentAccess(documentId, user, disposition = 'attachment') {
    const document = await this.getSupportingDocument(documentId, user);
    const fileName = document.file_name || path.basename(String(document.file_path).replace(/\\/g, '/'));
    const contentType = document.content_type || 'application/octet-stream';

    if (document.storage_provider === 'azure') {
      return {
        ...(await blobStorage.createReadUrl(document.file_path, fileName, contentType, disposition)),
        file_name: fileName,
        content_type: contentType
      };
    }

    return {
      local_url: `/api/certificates/documents/${document.document_id}/file`,
      file_name: fileName,
      content_type: contentType
    };
  }

  async getIssuedCertificateFile(applicationId, user) {
    await this.getApplicationDetails(applicationId, user);
    const certificate = await repository.getIssuedCertificate(applicationId);
    if (!certificate) {
      const err = new Error('Issued certificate not found');
      err.statusCode = 404;
      throw err;
    }
    return certificate;
  }

  async getIssuedCertificateAccess(applicationId, user, disposition = 'attachment') {
    const certificate = await this.getIssuedCertificateFile(applicationId, user);
    const fileName = certificate.file_name || path.basename(String(certificate.file_path).replace(/\\/g, '/'));
    const contentType = certificate.content_type || 'application/octet-stream';

    if (certificate.storage_provider === 'azure') {
      return {
        ...(await blobStorage.createReadUrl(certificate.file_path, fileName, contentType, disposition)),
        file_name: fileName,
        content_type: contentType
      };
    }

    return {
      local_url: `/api/certificates/applications/${applicationId}/issued-file`,
      file_name: fileName,
      content_type: contentType
    };
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
    return this._reviewApplication(applicationId, status, remarks, officerId, certificateFile);
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
      const extension = path.extname(certificateFile.originalname || '').toLowerCase();
      const blobName = `${application.user_id}/issued/${crypto.randomUUID()}${extension}`;
      try {
        await blobStorage.uploadFile(certificateFile, blobName);
        updatedApplication = await repository.approveWithCertificate(
          applicationId,
          remarks,
          application.user_id,
          officerId,
          blobName,
          {
            file_name: certificateFile.originalname,
            content_type: certificateFile.mimetype,
            file_size: certificateFile.size,
            storage_provider: 'azure'
          }
        );
        if (!updatedApplication) {
          const err = new Error('Application not found');
          err.statusCode = 404;
          throw err;
        }
      } catch (error) {
        await blobStorage.deleteFile(blobName);
        throw error;
      }
    } else {
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

}

module.exports = new CertificateService();
