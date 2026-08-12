const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const officerRepository = require('./officer.repository');
const certificateRepository = require('../certificates/certificate.repository');
const complaintRepository = require('../complaints/complaint_repository');

class OfficerService {
  /**
   * Officer login.
   * @param {string} email
   * @param {string} password
   */
  async loginOfficer(email, password) {
    if (!email || !password) {
      const error = new Error('Email and password are required');
      error.statusCode = 400;
      throw error;
    }

    const officer = await officerRepository.findByEmail(email.trim().toLowerCase());
    if (!officer) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    if (!officer.is_active) {
      const error = new Error('Officer account is inactive');
      error.statusCode = 401;
      throw error;
    }

    const isPasswordValid = await bcrypt.compare(password, officer.password_hash);
    if (!isPasswordValid) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    const token = jwt.sign(
      {
        officer_id: officer.officer_id,
        department_id: officer.department_id,
        email: officer.email,
        role: officer.role || 'OFFICER'
      },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      success: true,
      token,
      officer: {
        officer_id: officer.officer_id,
        name: officer.name,
        email: officer.email,
        role: officer.role || 'OFFICER',
        department_id: officer.department_id,
        is_active: officer.is_active
      }
    };
  }

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

  async getOfficerDashboard(officerId) {
    if (!officerId) {
      const error = new Error('Officer authentication required');
      error.statusCode = 401;
      throw error;
    }

    const officer = await officerRepository.findById(officerId);
    if (!officer) {
      const error = new Error('Officer not found');
      error.statusCode = 404;
      throw error;
    }

    if (!officer.is_active) {
      const error = new Error('Officer account is inactive');
      error.statusCode = 403;
      throw error;
    }

    const officerCertificateTypes = Array.isArray(officer.certificate_types)
      ? officer.certificate_types
      : [];

    const applications = (await certificateRepository.getApplicationsForOfficer(officerId))
      .filter((application) => officerCertificateTypes.includes(application.certificate_type));

    const complaints = (await complaintRepository.getComplaintsByDepartment(officer.department_id))
      .filter((complaint) => Number(complaint.department_id) === Number(officer.department_id));

    return {
      officer: {
        officer_id: officer.officer_id,
        name: officer.name,
        email: officer.email,
        department_id: officer.department_id,
        certificate_types: officerCertificateTypes,
        role: officer.role,
        is_active: officer.is_active
      },
      applications,
      complaints
    };
  }
}

module.exports = new OfficerService();
