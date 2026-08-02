const service = require('./certificate.service');

class CertificateController {
  async apply(req, res, next) {
    try {
      const { certificate_type } = req.body;
      const userId = req.user.id;
      const files = req.files; // Expected to be an array from multer

      const result = await service.applyForCertificate(userId, certificate_type, files);
      
      res.status(201).json({
        success: true,
        message: 'Certificate application submitted successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async getMyApplications(req, res, next) {
    try {
      const userId = req.user.id;
      const applications = await service.trackApplication(userId);
      
      res.status(200).json({
        success: true,
        data: applications
      });
    } catch (error) {
      next(error);
    }
  }

  async getApplicationDetails(req, res, next) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      
      const application = await service.getApplicationDetails(id, userId);
      
      res.status(200).json({
        success: true,
        data: application
      });
    } catch (error) {
      next(error);
    }
  }

  // To be used by Officer Module
  async reviewApplication(req, res, next) {
    try {
      // In a real scenario, check if req.user.role === 'officer'
      const { id } = req.params;
      const { status, remarks } = req.body;
      
      // If approved, an officer might upload the final certificate file
      let certificateFilePath = null;
      if (req.file) {
        certificateFilePath = req.file.path;
      }

      const result = await service.reviewApplication(id, status, remarks, certificateFilePath);
      
      res.status(200).json({
        success: true,
        message: `Application ${status.toLowerCase()} successfully`,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async getMyDigitalLocker(req, res, next) {
    try {
      const userId = req.user.id;
      const locker = await service.getDigitalLocker(userId);
      
      res.status(200).json({
        success: true,
        data: locker
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CertificateController();
