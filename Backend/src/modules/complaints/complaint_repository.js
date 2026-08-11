const db = require('../../config/db');
const env = require('../../config/env');

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

const getAllComplaints = async (userId, role = 'CITIZEN') => {
  if (role === 'OFFICER') {
    const query = 'SELECT * FROM complaints ORDER BY created_at DESC';
    try {
      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error retrieving officer complaints:', error);
      throw error;
    }
  }

  const query = 'SELECT * FROM complaints WHERE user_id = $1 ORDER BY created_at DESC';
  try {
    const result = await db.query(query, [userId]);
    return result.rows;
  } catch (error) {
    console.error('Error retrieving complaints:', error);
    throw error;
  }
};

const ai_parser = async (complaint) => {
  let response;
  try {
    response = await fetch(`${env.AI_SERVICE_URL}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: complaint.title, description: complaint.description }),
    });
  } catch (error) {
    throw new Error(`AI service request failed: ${error.message}`);
  }

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`AI service returned ${response.status}: ${text}`);
  }

  const cleaned = text.replace(/```json|```/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    throw new Error(`Failed to parse AI response JSON: ${error.message}. Response text: ${cleaned}`);
  }
};

const updateComplaintWithAI = async (complaintId, aiFields) => {
  const query = 'UPDATE complaints SET category = $1, priority = $2, department = $3, ai_summary = $4, updated_at = NOW() WHERE complaint_id = $5 RETURNING *';
  const values = [aiFields.category, aiFields.priority, aiFields.department, aiFields.ai_summary, complaintId];

  try {
    const result = await db.query(query, values);
    if (!result.rows.length) {
      throw new Error('Complaint update failed. Complaint not found.');
    }
    return result.rows[0];
  } catch (error) {
    console.error('Error updating complaint with AI data:', error);
    throw error;
  }
};

const deleteComplaintById = async (complaintId) => {
  const query = 'DELETE FROM complaints WHERE complaint_id = $1';
  try {
    await db.query(query, [complaintId]);
  } catch (error) {
    console.error('Error deleting incomplete complaint:', error);
    throw error;
  }
};

const init = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS complaints (
      complaint_id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      department VARCHAR(255),
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      category VARCHAR(100),
      priority VARCHAR(50),
      status VARCHAR(50) NOT NULL DEFAULT 'Pending',
      image_url VARCHAR(500),
      ai_summary TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.query(`
    ALTER TABLE complaints
    ADD COLUMN IF NOT EXISTS department VARCHAR(255);
  `);
};

module.exports = {
  init,
  createComplaint,
  getAllComplaints,
  ai_parser,
  updateComplaintWithAI,
  deleteComplaintById,
};
