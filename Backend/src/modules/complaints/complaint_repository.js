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

module.exports = {
    createComplaint,
    getAllComplaints
};