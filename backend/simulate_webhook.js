const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function runSimulation() {
    try {
        console.log('--- Starting Webhook Simulation ---');

        // 1. Register
        const email = `sim_${Date.now()}@example.com`;
        console.log(`1. Registering user: ${email}`);
        const regRes = await axios.post(`${API_URL}/auth/register`, {
            name: 'Webhook Sim User',
            email: email,
            password: 'password123',
            organizationName: 'Sim Org'
        });
        const token = regRes.data.token;
        const headers = { Authorization: `Bearer ${token}` };
        console.log('   Registration successful.');

        // 2. Deposit Funds
        console.log('2. Depositing 1000 USD...');
        await axios.post(`${API_URL}/internal/deposit`, { amount: 1000 }, { headers });
        console.log('   Deposit successful.');

        // 3. Add Beneficiary
        console.log('3. Adding Beneficiary...');
        const benRes = await axios.post(`${API_URL}/payouts/beneficiaries`, {
            name: 'Sim Ben',
            email: 'ben@example.com',
            currency: 'USD',
            accountDetails: { accountNumber: '1234567890' }
        }, { headers });
        const benId = benRes.data.id;
        console.log(`   Beneficiary added: ${benId}`);

        // 4. Create Payout
        console.log('4. Creating Payout of 100 USD...');
        const payoutRes = await axios.post(`${API_URL}/payouts`, {
            beneficiaryId: benId,
            amount: 100,
            currency: 'USD',
            description: 'Webhook Test Payout'
        }, { headers });
        const payoutId = payoutRes.data.id;
        const mestaPayoutId = payoutRes.data.mestaPayoutId;
        console.log(`   Payout created: ${payoutId} (Mesta ID: ${mestaPayoutId})`);
        console.log(`   Initial Status: ${payoutRes.data.status}`);

        // 5. Simulate Webhook
        console.log('5. Triggering Webhook (Simulating Mesta)...');
        // Wait a bit to ensure timestamps differ if needed
        await new Promise(r => setTimeout(r, 1000));

        await axios.post(`${API_URL}/webhooks`, {
            type: 'payout.updated',
            data: {
                id: mestaPayoutId,
                status: 'COMPLETED'
            }
        });
        console.log('   Webhook sent.');

        // 6. Verify Status
        console.log('6. Verifying Payout Status...');
        // We can fetch all payouts and find ours
        const payoutsRes = await axios.get(`${API_URL}/payouts`, { headers });
        const updatedPayout = payoutsRes.data.find(p => p.id === payoutId);

        console.log(`   Final Status: ${updatedPayout.status}`);


        if (updatedPayout.status === 'COMPLETED') {
            console.log(' SUCCESS: Webhook updated payout status!');
        } else {
            console.error(' FAILURE: Status did not update.');
        }

    } catch (error) {
        console.error('Simulation Failed:', error.response ? error.response.data : error.message);
    }
}

runSimulation();
