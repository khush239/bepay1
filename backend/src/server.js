"use strict";
require('dotenv').config();
const app = require("./app");
const sequelize = require("./config/database");

// Import models to ensure they are registered
require('./models/User');
require('./models/Organization');
require('./models/Beneficiary');
require('./models/Payout');

const PORT = process.env.PORT || 5000;

// Database initialization
const initDb = async () => {
    try {
        await sequelize.authenticate();
        console.log('Connected to database');

        // Sync models (only in development or if explicitly requested)
        if (process.env.SYNC_DB === 'true' || process.env.NODE_ENV !== 'production') {
            await sequelize.sync({ alter: true });
            console.log('Database synced');
        }
    } catch (error) {
        console.error('Database connection error:', error);
    }
};

// Handle serverless vs local dev
if (process.env.VERCEL) {
    // In Vercel, we initialize the DB logic but export the app
    initDb();
} else {
    // Local dev: start server immediately
    initDb().then(() => {
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server is running on port ${PORT}`);
        });
    });
}

module.exports = app;

