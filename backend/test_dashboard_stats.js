const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
let adminToken = '';
let branchManagerToken = '';
let userToken = '';

async function runTest() {
    try {
        // 1. Login Admin
        console.log('1. Login Admin...');
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'temp_admin@example.com',
            password: 'password123'
        });
        adminToken = loginRes.data.token;

        // 2. Fetch Admin Stats (No filters)
        console.log('2. Fetch Admin Stats (Default)...');
        const adminStats = await axios.get(`${BASE_URL}/dashboard/stats`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log('   Admin Stats:', JSON.stringify(adminStats.data, null, 2));

        // 3. Login User
        console.log('3. Login Standard User...');
        // Using existing user from previous steps if available, or create one?
        // Let's create a temp user for this test to be self-contained
        const createRes = await axios.post(`${BASE_URL}/users`, {
            username: 'dashboard_test_user',
            email: 'dashboard_test@example.com',
            password: 'password',
            role: 'user'
        }, { headers: { Authorization: `Bearer ${adminToken}` } });
        const userId = createRes.data.id;

        const userLogin = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'dashboard_test@example.com',
            password: 'password'
        });
        userToken = userLogin.data.token;

        // 4. Fetch User Stats
        console.log('4. Fetch User Stats...');
        const userStats = await axios.get(`${BASE_URL}/dashboard/stats`, {
            headers: { Authorization: `Bearer ${userToken}` }
        });
        console.log('   User Stats:', JSON.stringify(userStats.data, null, 2));

        // Cleanup
        await axios.delete(`${BASE_URL}/users/${userId}`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });

    } catch (e) {
        console.error('TEST FAILED:', e.response ? e.response.data : e.message);
    }
}

runTest();
