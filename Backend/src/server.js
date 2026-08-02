const app = require('./app');
const env = require('./config/env');
const db = require('./config/db');

const PORT = env.PORT || 5000;

async function startServer() {
  try {
    // Initialize database connection
    await db.connect();
    console.log('Database connected successfully');

    // Initialize module tables
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
