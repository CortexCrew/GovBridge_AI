const complaintService = require('./complaint_service');

const create_complaint = async (req, res) => {
  try {
    const userId = req.user && req.user.user_id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized. User not authenticated.' });
    }

    const { title, description } = req.body;
    if (!title || !description) {
      return res.status(400).json({ success: false, message: 'Title and description are required.' });
    }

    const complaint = await complaintService.createComplaint({ title, description, user_id: userId });
    return res.status(201).json({ success: true, data: complaint });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const get_all_complaints = async (req, res) => {
  try {
    const userId = req.user && req.user.user_id;
    const officerId = req.user && req.user.officer_id;

    if (req.user && req.user.role === 'OFFICER') {
      if (!officerId) {
        return res.status(401).json({ success: false, message: 'Unauthorized. Officer not authenticated.' });
      }

      const complaints = await complaintService.getAllComplaints(userId, req.user.role, officerId);
      return res.status(200).json({ success: true, data: complaints });
    }

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized. User not authenticated.' });
    }

    const complaints = await complaintService.getAllComplaints(userId, req.user.role);
    return res.status(200).json({ success: true, data: complaints });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const delete_complaint = async (req, res) => {
  try {
    const userId = req.user && req.user.user_id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized. User not authenticated.' });
    }

    const complaintId = req.params.complaintId;
    if (!complaintId) {
      return res.status(400).json({ success: false, message: 'Complaint ID is required.' });
    }

    const result = await complaintService.deleteComplaint(complaintId, userId);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    const statusCode = error.message.includes('not found') || error.message.includes('not authorized') ? 404 : 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

const sendComplaintError = (res, error) => {
  const statusCode = error.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? 'Unable to process complaint request.' : error.message,
  });
};

const get_complaint = async (req, res) => {
  try {
    const complaintId = Number(req.params.complaintId);
    if (!Number.isInteger(complaintId) || complaintId < 1) {
      return res.status(400).json({ success: false, message: 'Complaint ID must be a positive integer.' });
    }
    if (req.user.role === 'OFFICER' && !req.user.officer_id) {
      return res.status(401).json({ success: false, message: 'Officer authentication required.' });
    }
    const result = await complaintService.getComplaintDetails(complaintId, req.user);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return sendComplaintError(res, error);
  }
};

const get_complaint_history = async (req, res) => {
  try {
    const complaintId = Number(req.params.complaintId);
    if (!Number.isInteger(complaintId) || complaintId < 1) {
      return res.status(400).json({ success: false, message: 'Complaint ID must be a positive integer.' });
    }
    const history = await complaintService.getComplaintHistory(complaintId, req.user);
    return res.status(200).json({ success: true, data: history });
  } catch (error) {
    return sendComplaintError(res, error);
  }
};

const get_complaint_assignment = async (req, res) => {
  try {
    const result = await complaintService.getComplaintDetails(Number(req.params.complaintId), req.user);
    return res.status(200).json({ success: true, data: result.assignment });
  } catch (error) {
    return sendComplaintError(res, error);
  }
};

const assign_complaint = async (req, res) => {
  try {
    const complaintId = Number(req.params.complaintId);
    const officerId = Number(req.body.officer_id);
    if (!Number.isInteger(complaintId) || !Number.isInteger(officerId) || complaintId < 1 || officerId < 1) {
      return res.status(400).json({ success: false, message: 'Complaint ID and officer_id must be positive integers.' });
    }
    const assignment = await complaintService.assignComplaint(complaintId, officerId, req.user.officer_id);
    return res.status(201).json({ success: true, data: assignment });
  } catch (error) {
    return sendComplaintError(res, error);
  }
};

const update_complaint_status = async (req, res) => {
  try {
    const complaintId = Number(req.params.complaintId);
    const status = String(req.body.status || '').trim().toUpperCase();
    const allowedStatuses = ['PENDING', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED'];
    if (!Number.isInteger(complaintId) || complaintId < 1 || !allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Status must be one of: ${allowedStatuses.join(', ')}.` });
    }
    const complaint = await complaintService.updateComplaintStatus(complaintId, status, req.body.remarks, req.user.officer_id);
    return res.status(200).json({ success: true, data: complaint });
  } catch (error) {
    return sendComplaintError(res, error);
  }
};

const get_officer_complaints = async (req, res) => {
  try {
    if (!req.user.officer_id) {
      return res.status(401).json({ success: false, message: 'Officer authentication required.' });
    }
    const complaints = await complaintService.getAllComplaints(null, 'OFFICER', req.user.officer_id);
    const filters = ['status', 'priority', 'category'];
    const filtered = complaints.filter((complaint) => filters.every((field) => !req.query[field] || String(complaint[field]).toLowerCase() === String(req.query[field]).toLowerCase()));
    return res.status(200).json({ success: true, data: filtered });
  } catch (error) {
    return sendComplaintError(res, error);
  }
};

module.exports = {
  create_complaint,
  get_all_complaints,
  delete_complaint,
  get_complaint,
  get_complaint_history,
  get_complaint_assignment,
  assign_complaint,
  update_complaint_status,
  get_officer_complaints,
};
