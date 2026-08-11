const app = require('./app');
const env = require('./config/env');
const db = require('./config/db');

const PORT = env.PORT || 5000;

async function startServer() {
  try {
    // Initialize database connection
    await db.connect();
    console.log('Database connected successfully');

    // Initialize Auth module tables (USERS & CITIZENS)
    const userRepository = require('./modules/auth/user.repository');
    await userRepository.init();
    console.log('Auth module tables (USERS, CITIZENS) initialized');

    // Initialize department / officer tables
    const officerRepository = require('./modules/officers/officer.repository');
    await officerRepository.init();
    console.log('Officer module tables (DEPARTMENTS, OFFICERS) initialized');

    // Initialize Complaint module table
    const complaintRepository = require('./modules/complaints/complaint_repository');
    await complaintRepository.init();
    console.log('Complaint module table (COMPLAINTS) initialized');

    // Initialize Certificate module tables
    const certificateService = require('./modules/certificates/certificate.service');
    await certificateService.init();
    console.log('Certificate module tables initialized');

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
