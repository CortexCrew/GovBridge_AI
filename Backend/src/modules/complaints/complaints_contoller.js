complaintsservice=require('./complaints_service')
const create_complaint=async(req,res)=>{
    try {
        const complaint = await complaintService.createComplaint(req.body);
        res.status(201).json(complaint);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }

}
const get_all_complaints=async(req,res)=>{
    try {
        const citizen_id=req.userid
        const complaints = await complaintService.getAllComplaints(citizen_id);
        res.status(200).json(complaints);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
module.exports={
    create_complaint,
    get_all_complaints
}