const complaintRepository = require('./complaint_repository');

const normalizePriority = (priority) => {
  const normalized = (priority || '').toString().trim();
  const accepted = ['Low', 'Medium', 'High'];
  const match = accepted.find((item) => item.toLowerCase() === normalized.toLowerCase());
  if (!match) {
    throw new Error('Invalid AI priority value. Expected Low, Medium, or High.');
  }
  return match;
};

const normalizeAIResult = (result) => {
  if (!result || typeof result !== 'object') {
    throw new Error('AI returned an invalid response format.');
  }

  const category = (result.category || result.issue_category || '').toString().trim();
  const department = (result.department || result.department_name || '').toString().trim();
  const priority = normalizePriority(result.priority || '');
  const summary = (result.summary || result.ai_summary || '').toString().trim();

  if (!category) {
    throw new Error('AI response is missing category.');
  }
  if (!department) {
    throw new Error('AI response is missing department.');
  }
  if (!summary) {
    throw new Error('AI response is missing summary.');
  }

  return { category, department, priority, summary };
};

const createComplaint = async (data) => {
  const complaint = {
    title: data.title,
    description: data.description,
    status: 'Pending',
    user_id: data.user_id,
  };

  const savedComplaint = await complaintRepository.createComplaint(complaint);

  try {
    const aiResponse = await complaintRepository.ai_parser({
      title: savedComplaint.title,
      description: savedComplaint.description,
    });

    const parsedAI = normalizeAIResult(aiResponse);
    console.log('AI Response Parsed:', { department: parsedAI.department, category: parsedAI.category, priority: parsedAI.priority });

    // Look up the department_id from the AI-returned department name
    let departmentId;
    try {
      departmentId = await complaintRepository.getDepartmentIdByName(parsedAI.department);
      console.log(`Department lookup successful: "${parsedAI.department}" → department_id = ${departmentId}`);
    } catch (error) {
      console.error('Department lookup error:', error.message);
      // If department lookup fails, delete the incomplete complaint and throw error
      await complaintRepository.deleteComplaintById(savedComplaint.complaint_id);
      throw error;
    }

    const updatedComplaint = await complaintRepository.updateComplaintWithAI(savedComplaint.complaint_id, {
      category: parsedAI.category,
      priority: parsedAI.priority,
      department: parsedAI.department,
      department_id: departmentId,
      ai_summary: parsedAI.summary,
    });

    console.log(`Complaint created successfully with department_id = ${departmentId}`, updatedComplaint);
    return updatedComplaint;
  } catch (error) {
    console.error('AI processing failed for complaint:', error.message);
    throw error;
  }
};

const getAllComplaints = async (user_id, role, officerId = null) => {
  return await complaintRepository.getAllComplaints(user_id, role, officerId);
};

const deleteComplaint = async (complaintId, userId) => {
  const complaint = await complaintRepository.getAllComplaints(userId);
  const exists = complaint.some((item) => Number(item.complaint_id) === Number(complaintId));

  if (!exists) {
    throw new Error('Complaint not found or not authorized to delete.');
  }

  await complaintRepository.deleteComplaintById(complaintId);
  return { complaint_id: Number(complaintId), deleted: true };
};

module.exports = {
  createComplaint,
  getAllComplaints,
  deleteComplaint,
};

