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

    const updatedComplaint = await complaintRepository.updateComplaintWithAI(savedComplaint.complaint_id, {
      category: parsedAI.category,
      priority: parsedAI.priority,
      department: parsedAI.department,
      ai_summary: parsedAI.summary,
    });

    return updatedComplaint;
  } catch (error) {
    console.error('AI processing failed for complaint:', error.message);
    throw error;
  }
};

const getAllComplaints = async (user_id, role) => {
  return await complaintRepository.getAllComplaints(user_id);
};

module.exports = {
  createComplaint,
  getAllComplaints,
};

