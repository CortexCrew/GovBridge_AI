const complaintReprository = require('./complaint_repository');

const createComplaint = async (data) => {
    const complaint={title:data.title, description:data.description,status:'pending', user_id:data.user_id};
    return await complaintRepository.createComplaint(complaint);
};

const getAllComplaints = async (user_id) => {
    return await complaintRepository.getAllComplaints(user_id);
};
const ai_parser = async (complaint) => {
    return await complaintRepository.ai_parser(complaint);
};
const add_officer=async(ai_response,complaint_id)=>{
    return await complaintRepository.add_officer(ai_response,complaint_id);
}

module.exports = {
    createComplaint,
    getAllComplaints,
    ai_parser,
    add_officer
};

