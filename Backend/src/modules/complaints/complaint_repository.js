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

const getComplaintsByDepartment = async (departmentId) => {
  const query = `
    SELECT *
    FROM complaints
    WHERE department_id = $1
    ORDER BY created_at DESC;
  `;

  try {
    const result = await db.query(query, [departmentId]);
    return result.rows;
  } catch (error) {
    console.error('Error retrieving complaints by department:', error);
    throw error;
  }
};

const getAllComplaints = async (userId, role = 'CITIZEN', officerId = null) => {
  if (role === 'OFFICER') {
    if (!officerId) {
      throw new Error('Officer authentication required');
    }

    const officerQuery = `
      SELECT department_id
      FROM officers
      WHERE officer_id = $1 AND is_active = TRUE;
    `;

    try {
      const officerResult = await db.query(officerQuery, [officerId]);
      if (!officerResult.rows.length) {
        return [];
      }

      const departmentId = officerResult.rows[0].department_id;
      return await getComplaintsByDepartment(departmentId);
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
  const query = 'UPDATE complaints SET category = $1, priority = $2, department = $3, department_id = $4, ai_summary = $5, updated_at = NOW() WHERE complaint_id = $6 RETURNING *';
  const values = [aiFields.category, aiFields.priority, aiFields.department, aiFields.department_id, aiFields.ai_summary, complaintId];

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

const getDepartmentIdByName = async (departmentName) => {
  const query = `
    SELECT department_id
    FROM departments
    WHERE LOWER(TRIM(department_name)) = LOWER(TRIM($1))
    AND is_active = TRUE
    LIMIT 1
  `;

  try {
    const result = await db.query(query, [departmentName]);
    if (!result.rows.length) {
      throw new Error(
        `Department lookup failed. AI returned "${departmentName}" but no matching department found in database.`
      );
    }
    return result.rows[0].department_id;
  } catch (error) {
    if (error.message.startsWith('Department lookup failed')) {
      throw error;
    }
    console.error('Error looking up department by name:', error);
    throw new Error(`Database error during department lookup: ${error.message}`);
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
      department_id INTEGER REFERENCES departments(department_id) ON DELETE SET NULL,
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

  // Ensure department_id column exists with proper foreign key constraint
  // This handles cases where the table was created before the department_id column was added
  await db.query(`
    ALTER TABLE complaints
    ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(department_id) ON DELETE SET NULL;
  `);
};

module.exports = {
  init,
  createComplaint,
  getAllComplaints,
  getComplaintsByDepartment,
  ai_parser,
  updateComplaintWithAI,
  getDepartmentIdByName,
  deleteComplaintById,
};
