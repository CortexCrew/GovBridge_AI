import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const appDirectory = path.dirname(fileURLToPath(import.meta.url));
const distDirectory = path.join(appDirectory, 'dist');
const port = Number(process.env.PORT) || 3000;

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use(express.static(distDirectory, { index: false }));

app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  res.sendFile(path.join(distDirectory, 'index.html'), (error) => {
    if (error) next(error);
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Frontend server listening on port ${port}`);
});