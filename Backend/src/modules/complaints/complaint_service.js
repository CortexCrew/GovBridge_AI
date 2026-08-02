const complaintReprository = require('./complaint_repository');

const createComplaint = async (data) => {
    const complaint={title:data.title, description:data.description,status:'pending', user_id:data.user_id};
    return await complaintRepository.createComplaint(complaint);
};

const getAllComplaints = async (user_id) => {
    return await complaintRepository.getAllComplaints(user_id);
};

module.exports = {
    createComplaint,
    getAllComplaints
};