const service = require('./locker.service');

class LockerController {
  /**
   * GET /api/locker/my-locker
   * Citizen retrieves their Digital Locker contents.
   */
  async getMyLocker(req, res, next) {
    try {
      const userId = req.user.user_id;
      const entries = await service.getUserLocker(userId);

      return res.status(200).json({
        success: true,
        data: entries
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new LockerController();
