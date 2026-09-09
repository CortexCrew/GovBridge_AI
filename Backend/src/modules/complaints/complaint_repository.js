const db = require('../../config/db');
const env = require('../../config/env');

const createComplaint = async (complaint) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      'INSERT INTO complaints (title, description, status, user_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [complaint.title, complaint.description, complaint.status, complaint.user_id]
    );
    await client.query(
      `INSERT INTO complaint_history (complaint_id, status, new_status, remarks, changed_by)
       VALUES ($1, $2, $2, $3, $4)`,
      [result.rows[0].complaint_id, complaint.status, 'Complaint submitted', complaint.user_id]
    );
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating complaint:', error);
    throw error;
  } finally {
    client.release();
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

const getComplaintByIdForCitizen = async (complaintId, userId) => {
  const query = `
    SELECT c.*, d.department_name
    FROM complaints c
    LEFT JOIN departments d ON d.department_id = c.department_id
    WHERE c.complaint_id = $1 AND c.user_id = $2;
  `;
  const result = await db.query(query, [complaintId, userId]);
  return result.rows[0] || null;
};

const complaintExists = async (complaintId) => {
  const result = await db.query('SELECT complaint_id FROM complaints WHERE complaint_id = $1', [complaintId]);
  return result.rows.length > 0;
};

const getOfficerDepartmentId = async (officerId) => {
  const result = await db.query(
    'SELECT department_id FROM officers WHERE officer_id = $1 AND is_active = TRUE',
    [officerId]
  );
  return result.rows[0]?.department_id ?? null;
};

const getComplaintByIdForOfficer = async (complaintId, officerId) => {
  const query = `
    SELECT c.*, d.department_name, u.name AS citizen_name
    FROM complaints c
    JOIN officers o ON o.department_id = c.department_id AND o.officer_id = $2 AND o.is_active = TRUE
    LEFT JOIN departments d ON d.department_id = c.department_id
    LEFT JOIN users u ON u.user_id = c.user_id
    WHERE c.complaint_id = $1;
  `;
  const result = await db.query(query, [complaintId, officerId]);
  return result.rows[0] || null;
};

const getComplaintHistory = async (complaintId) => {
  const result = await db.query(
    `SELECT history_id, complaint_id, status, new_status, remarks, changed_by, created_at
     FROM complaint_history
     WHERE complaint_id = $1
     ORDER BY created_at ASC, history_id ASC`,
    [complaintId]
  );
  return result.rows;
};

const getAssignment = async (complaintId) => {
  const result = await db.query(
    `SELECT ca.assignment_id, ca.complaint_id, ca.officer_id, ca.assigned_at, ca.status,
            o.name AS officer_name, o.email AS officer_email, o.role,
            d.department_name
     FROM complaint_assignment ca
     JOIN officers o ON o.officer_id = ca.officer_id
     LEFT JOIN departments d ON d.department_id = o.department_id
     WHERE ca.complaint_id = $1 AND ca.status = 'ACTIVE'
     ORDER BY ca.assigned_at DESC
     LIMIT 1`,
    [complaintId]
  );
  return result.rows[0] || null;
};

const assignComplaint = async (complaintId, officerId, assigningOfficerId) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const complaintResult = await client.query(
      'SELECT department_id FROM complaints WHERE complaint_id = $1 FOR UPDATE',
      [complaintId]
    );
    if (!complaintResult.rows.length) {
      await client.query('ROLLBACK');
      return { kind: 'NOT_FOUND' };
    }

    const officerResult = await client.query(
      'SELECT officer_id, department_id, is_active FROM officers WHERE officer_id = $1',
      [officerId]
    );
    if (!officerResult.rows.length || !officerResult.rows[0].is_active) {
      await client.query('ROLLBACK');
      return { kind: 'OFFICER_NOT_FOUND' };
    }
    if (officerResult.rows[0].department_id !== complaintResult.rows[0].department_id) {
      await client.query('ROLLBACK');
      return { kind: 'DEPARTMENT_MISMATCH' };
    }

    const assigningResult = await client.query(
      'SELECT department_id FROM officers WHERE officer_id = $1 AND is_active = TRUE',
      [assigningOfficerId]
    );
    if (!assigningResult.rows.length || assigningResult.rows[0].department_id !== complaintResult.rows[0].department_id) {
      await client.query('ROLLBACK');
      return { kind: 'FORBIDDEN' };
    }

    await client.query(
      "UPDATE complaint_assignment SET status = 'REASSIGNED' WHERE complaint_id = $1 AND status = 'ACTIVE'",
      [complaintId]
    );
    const result = await client.query(
      `INSERT INTO complaint_assignment (complaint_id, officer_id, status)
       VALUES ($1, $2, 'ACTIVE')
       RETURNING assignment_id, complaint_id, officer_id, assigned_at, status`,
      [complaintId, officerId]
    );
    await client.query('COMMIT');
    return { kind: 'OK', assignment: result.rows[0] };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const updateComplaintStatus = async (complaintId, status, remarks, officerId) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `SELECT c.status, c.department_id
       FROM complaints c
       JOIN officers o ON o.department_id = c.department_id AND o.officer_id = $2 AND o.is_active = TRUE
       WHERE c.complaint_id = $1 FOR UPDATE`,
      [complaintId, officerId]
    );
    if (!result.rows.length) {
      const exists = await client.query('SELECT complaint_id FROM complaints WHERE complaint_id = $1', [complaintId]);
      await client.query('ROLLBACK');
      return { kind: exists.rows.length ? 'FORBIDDEN' : 'NOT_FOUND' };
    }

    const oldStatus = result.rows[0].status;
    const updated = await client.query(
      'UPDATE complaints SET status = $1, updated_at = NOW() WHERE complaint_id = $2 RETURNING *',
      [status, complaintId]
    );
    await client.query(
      `INSERT INTO complaint_history (complaint_id, status, new_status, remarks, changed_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [complaintId, oldStatus, status, remarks || null, officerId]
    );
    await client.query('COMMIT');
    return { kind: 'OK', complaint: updated.rows[0] };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
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

  await db.query(`
    CREATE TABLE IF NOT EXISTS complaint_history (
      history_id SERIAL PRIMARY KEY,
      complaint_id INTEGER NOT NULL REFERENCES complaints(complaint_id) ON DELETE CASCADE,
      status VARCHAR(50) NOT NULL,
      new_status VARCHAR(50) NOT NULL,
      remarks TEXT,
      changed_by INTEGER,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_complaint_history_complaint_id
      ON complaint_history (complaint_id, created_at);
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS complaint_assignment (
      assignment_id SERIAL PRIMARY KEY,
      complaint_id INTEGER NOT NULL REFERENCES complaints(complaint_id) ON DELETE CASCADE,
      officer_id INTEGER NOT NULL REFERENCES officers(officer_id) ON DELETE CASCADE,
      assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE'
    );
    CREATE INDEX IF NOT EXISTS idx_complaint_assignment_complaint_id
      ON complaint_assignment (complaint_id, status);
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
  getComplaintByIdForCitizen,
  complaintExists,
  getOfficerDepartmentId,
  getComplaintByIdForOfficer,
  getComplaintHistory,
  getAssignment,
  assignComplaint,
  updateComplaintStatus,
};
