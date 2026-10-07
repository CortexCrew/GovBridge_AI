const service = require('./locker.service');

class LockerController {
  /**
   * GET /api/locker/my-locker
   * Citizen retrieves issued certificates and uploaded documents together.
   */
  async getMyLocker(req, res, next) {
    try {
      const items = await service.getUserLocker(req.user.user_id);

      return res.status(200).json({
        success: true,
        data: items
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/locker/download/:kind/:id
   * Citizen downloads one of their own locker files.
   */
  async download(req, res, next) {
    try {
      const { kind } = req.params;
      const id = parseInt(req.params.id, 10);

      if (!['issued', 'document'].includes(kind) || !Number.isInteger(id) || id < 1) {
        return res.status(400).json({
          success: false,
          message: 'Invalid download request'
        });
      }

      const result = await service.getDownload(req.user.user_id, kind, id);
      if (result.isSas) return res.redirect(302, result.url);
      const { absolutePath, fileName } = result;
      return res.download(absolutePath, fileName);
    } catch (error) {
      next(error);
    }
  }

  async access(req, res, next) {
    try {
      const { kind } = req.params;
      const id = parseInt(req.params.id, 10);
      const disposition = req.query.disposition === 'inline' ? 'inline' : 'attachment';

      if (!['issued', 'document'].includes(kind) || !Number.isInteger(id) || id < 1) {
        return res.status(400).json({ success: false, message: 'Invalid document request' });
      }

      const access = await service.getDocumentAccess(req.user.user_id, kind, id, disposition);
      return res.status(200).json({ success: true, data: access });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new LockerController();
