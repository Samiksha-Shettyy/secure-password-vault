require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_ORIGIN, credentials: true }));
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/vault', require('./routes/vault'));

// Error handler: never send stack traces or internal details to the client
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error(err); // full detail stays in the server log only
  const message =
    status === 413 ? 'Payload too large' :
    status < 500 ? 'Invalid request' :
    'Server error';
  res.status(status).json({ error: message });
});

app.listen(process.env.PORT, () => {
  console.log('Server running on port ' + process.env.PORT);
});