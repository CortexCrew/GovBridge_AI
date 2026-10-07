const service = require('./certificate.service');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '../../../uploads');

class CertificateController {
  /**
   * POST /api/certificates/apply
   * Citizen submits a new certificate application with documents.
   */
  async apply(req, res, next) {
    try {
      const { certificate_type, application_data } = req.body;
      const userId = req.user.user_id;
      const files = req.files;

      const result = await service.applyForCertificate(userId, certificate_type, files, application_data || null);

      return res.status(201).json({
        success: true,
        message: 'Certificate application submitted successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/certificates/my-applications
   * Citizen retrieves all their certificate applications.
   */
  async getMyApplications(req, res, next) {
    try {
      const userId = req.user.user_id;
      const applications = await service.trackApplication(userId);

      return res.status(200).json({
        success: true,
        data: applications
      });
    } catch (error) {
      next(error);
    }
  }

  async getOfficerApplications(req, res, next) {
    try {
      const officerId = req.user.officer_id;
      const applications = await service.getOfficerApplications(officerId);

      return res.status(200).json({
        success: true,
        data: applications
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/certificates/my-applications/:id
   * Citizen retrieves details of a specific application (with documents).
   */
  async getApplicationDetails(req, res, next) {
    try {
      const user = req.user;
      const applicationId = parseInt(req.params.id, 10);

      const application = await service.getApplicationDetails(applicationId, user);

      return res.status(200).json({
        success: true,
        data: application
      });
    } catch (error) {
      next(error);
    }
  }

  async getSupportingDocumentAccess(req, res, next) {
    try {
      const documentId = parseInt(req.params.documentId, 10);
      if (!Number.isInteger(documentId) || documentId < 1) {
        return res.status(400).json({ success: false, message: 'Invalid document request' });
      }
      const disposition = req.query.disposition === 'inline' ? 'inline' : 'attachment';
      const access = await service.getSupportingDocumentAccess(documentId, req.user, disposition);
      return res.status(200).json({ success: true, data: access });
    } catch (error) {
      next(error);
    }
  }

  async getSupportingDocumentFile(req, res, next) {
    try {
      const documentId = parseInt(req.params.documentId, 10);
      if (!Number.isInteger(documentId) || documentId < 1) {
        return res.status(400).json({ success: false, message: 'Invalid document request' });
      }
      const document = await service.getSupportingDocument(documentId, req.user);
      if (document.storage_provider === 'azure') {
        const access = await service.getSupportingDocumentAccess(documentId, req.user, 'attachment');
        return res.redirect(302, access.url);
      }
      const storedName = path.basename(String(document.file_path).replace(/\\/g, '/'));
      const fileName = document.file_name || storedName;
      const absolutePath = path.join(UPLOAD_DIR, storedName);
      if (!fs.existsSync(absolutePath)) {
        const error = new Error('Document not found');
        error.statusCode = 404;
        throw error;
      }
      return res.download(absolutePath, fileName);
    } catch (error) {
      next(error);
    }
  }

  async getIssuedCertificateFile(req, res, next) {
    try {
      const applicationId = parseInt(req.params.applicationId, 10);
      if (!Number.isInteger(applicationId) || applicationId < 1) {
        return res.status(400).json({ success: false, message: 'Invalid certificate request' });
      }
      const certificate = await service.getIssuedCertificateFile(applicationId, req.user);
      const fileName = path.basename(String(certificate.file_path).replace(/\\/g, '/'));
      const absolutePath = path.join(UPLOAD_DIR, fileName);
      if (!fs.existsSync(absolutePath)) {
        const error = new Error('Issued certificate not found');
        error.statusCode = 404;
        throw error;
      }
      return res.download(absolutePath, fileName);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/certificates/:id/review
   * Officer approves or rejects a certificate application.
   * Protected by requireRole('OFFICER') in routes.
   */
  async reviewApplication(req, res, next) {
    try {
      const applicationId = parseInt(req.params.id, 10);
      const { status, remarks } = req.body;
      const officerId = req.user.officer_id || null;

      const result = await service.reviewApplication(
        applicationId,
        status,
        remarks || null,
        officerId,
        req.file || null
      );

      return res.status(200).json({
        success: true,
        message: `Application ${status.toLowerCase()} successfully`,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CertificateController();
