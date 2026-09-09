const officerService = require('./officer.service');

class OfficerController {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await officerService.loginOfficer(email, password);
      return res.status(200).json(result);
    } catch (error) {
      const statusCode = error.statusCode || 401;
      return res.status(statusCode).json({
        success: false,
        message: error.message || 'Officer login failed'
      });
    }
  }

  async getDashboard(req, res, next) {
    try {
      const officerId = req.user && req.user.officer_id;
      const result = await officerService.getOfficerDashboard(officerId);
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to load officer dashboard'
      });
    }
  }

  async getDepartmentOfficers(req, res, next) {
    try {
      const officerId = req.user && req.user.officer_id;
      const officers = await officerService.getDepartmentOfficers(officerId);
      return res.status(200).json({ success: true, data: officers });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({ success: false, message: error.message || 'Failed to load department officers' });
    }
  }
}

module.exports = new OfficerController();
