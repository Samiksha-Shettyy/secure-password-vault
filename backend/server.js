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

app.listen(process.env.PORT, () => {
  console.log('Server running on port ' + process.env.PORT);
});