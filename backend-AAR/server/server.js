// server/server.js
require('dotenv').config(); // ← load .env at the very top
require('./config/db');

const app = require('../app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
});