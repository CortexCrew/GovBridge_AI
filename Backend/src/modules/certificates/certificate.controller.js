const service = require('./certificate.service');

class CertificateController {
  /**
   * POST /api/certificates/apply
   * Citizen submits a new certificate application with documents.
   */
  async apply(req, res, next) {
    try {
      const { certificate_type } = req.body;
      const userId = req.user.user_id;
      const files = req.files;

      const result = await service.applyForCertificate(userId, certificate_type, files);

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

  /**
   * GET /api/certificates/my-applications/:id
   * Citizen retrieves details of a specific application (with documents).
   */
  async getApplicationDetails(req, res, next) {
    try {
      const userId = req.user.user_id;
      const applicationId = parseInt(req.params.id, 10);

      const application = await service.getApplicationDetails(applicationId, userId);

      return res.status(200).json({
        success: true,
        data: application
      });
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
      const officerId = req.user.officer_id || req.user.user_id || null;

      const result = await service.reviewApplication(
        applicationId,
        status,
        remarks || null,
        officerId
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
