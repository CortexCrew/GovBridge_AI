const express = require('express');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(express.json());

// Routes placeholder

app.use(errorHandler);

module.exports = app;
