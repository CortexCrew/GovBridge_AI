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

module.exports = {
  create_complaint,
  get_all_complaints,
  delete_complaint,
};
