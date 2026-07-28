const app = require('./app');
const env = require('./config/env');

const PORT = env.port || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${env.nodeEnv} mode on port ${PORT}`);
});
