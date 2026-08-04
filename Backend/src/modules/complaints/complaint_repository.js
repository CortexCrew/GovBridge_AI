const db=require('../../config/db')
const createComplaint = async (complaint) => {
    const query = 'INSERT INTO complaints (title, description, status, user_id) VALUES ($1, $2, $3, $4) RETURNING *';
    const values = [complaint.title, complaint.description, complaint.status, complaint.user_id];
    try {
        const result = await db.query(query, values);
        return result.rows[0];
    } catch (error) {
        console.error('Error creating complaint:', error);
        throw error;
    }
};
const getAllComplaints = async () => {
    const query = 'SELECT * FROM complaints';
    try {
        const result = await db.query(query);
        return result.rows;
    }
    catch (error) {
        console.error('Error retrieving complaints:', error);
        throw error;
    }
};
const ai_parser = async (complaint) => {
    const response = await fetch('http://localhost:8000/analyze', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(complaint)
    });
    return response.json();

};
const add_officer=async(ai_response,user_id)=>{
    const aiResult = typeof ai_response === 'string' ? JSON.parse(ai_response.replace(/```json|```/g, '').trim()) : ai_response;
    const query = 'INSERT INTO officer_complaint (department_id, department_name, user_id, category, priority, summary) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *';
    const values = [aiResult.department_id, aiResult.department_name, user_id, aiResult.category, aiResult.priority, aiResult.summary];
    try {
        const result = await db.query(query, values);
        return result.rows[0];
    } catch (error) {
        console.error('Error adding officer:', error);
        throw error;
    }
};

module.exports = {
    createComplaint,
    getAllComplaints,
    ai_parser,
    add_officer
};
