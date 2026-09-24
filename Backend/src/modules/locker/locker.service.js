const repository = require('./locker.repository');

class LockerService {
  async init() {
    await repository.init();
  }
}

module.exports = new LockerService();
