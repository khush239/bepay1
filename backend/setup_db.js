const { Client } = require('pg');
require('dotenv').config();

const attempts = [
    "postgres://postgres:postgres@localhost:5432/postgres",
    "postgres://postgres@localhost:5432/postgres",
    "postgres://postgres:password@localhost:5432/postgres",
    "postgres://postgres:root@localhost:5432/postgres",
    "postgres://postgres:admin@localhost:5432/postgres",
    "postgres://postgres:123456@localhost:5432/postgres",
    "postgres://@localhost:5432/postgres"
];

async function setup() {
    let connected = false;
    let successfulConnString = "";

    for (const conn of attempts) {
        const client = new Client({ connectionString: conn });
        try {
            await client.connect();
            console.log(`Connected successfully using: ${conn}`);
            connected = true;
            successfulConnString = conn;

            // Check if bepay database exists
            const res = await client.query("SELECT 1 FROM pg_database WHERE datname='bepay'");
            if (res.rowCount === 0) {
                console.log('Creating database bepay...');
                await client.query('CREATE DATABASE bepay');
                console.log('Database bepay created successfully.');
            } else {
                console.log('Database bepay already exists.');
            }

            await client.end();
            break;
        } catch (err) {
            console.log(`Failed with ${conn}: ${err.message}`);
            try { await client.end(); } catch (e) { }
        }
    }

    if (connected) {
        const fs = require('fs');
        const path = require('path');
        const envPath = path.join(__dirname, '.env');
        let content = fs.readFileSync(envPath, 'utf8');
        const dbUrl = successfulConnString.replace('/postgres', '/bepay');
        content = content.replace(/DATABASE_URL=.*/, `DATABASE_URL="${dbUrl}"`);
        fs.writeFileSync(envPath, content);
        console.log('Updated .env with working DATABASE_URL');
        console.log('--- DATABASE READY ---');
    } else {
        console.error('CRITICAL: Could not connect to PostgreSQL with any common credentials.');
        console.log('TIP: Please check your pgAdmin or PostgreSQL installer to find your password.');
    }
}

setup();
