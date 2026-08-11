const officerRepository = require('./officer.repository');

class OfficerService {
  /**
   * Get department information by department ID.
   * @param {number|string} departmentId 
   * @returns {Promise<Object>} Department details
   */
  async getDepartmentInfo(departmentId) {
    if (!departmentId) {
      const error = new Error('Department ID is required');
      error.statusCode = 400;
      throw error;
    }

    const department = await officerRepository.getDepartmentById(departmentId);
    if (!department) {
      const error = new Error('Department not found');
      error.statusCode = 404;
      throw error;
    }

    return department;
  }
}

module.exports = new OfficerService();
