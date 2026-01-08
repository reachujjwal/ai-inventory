const axios = require('axios');
const { expect } = require('chai');

const BASE_URL = 'http://localhost:5000/api';
let adminToken = '';
let userId = '';

async function runTest() {
    try {
        console.log('1. Login as admin...');
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'admin@example.com',
            password: 'admin'
        });
        adminToken = loginRes.data.token;
        console.log('   Admin logged in.');

        console.log('2. Create temporary user...');
        const createRes = await axios.post(`${BASE_URL}/users`, {
            username: 'test_pwd_user',
            email: 'test_pwd_user@example.com',
            password: 'initial_password',
            role: 'user'
        }, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        userId = createRes.data.id;
        console.log(`   User created with ID: ${userId}`);

        console.log('3. Update password...');
        await axios.put(`${BASE_URL}/users/${userId}`, {
            username: 'test_pwd_user',
            role: 'user',
            password: 'new_password'
        }, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log('   Password updated.');

        console.log('4. Attempt login with NEW password...');
        const newLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'test_pwd_user@example.com',
            password: 'new_password'
        });
        if (newLoginRes.data.token) {
            console.log('   Login successful with new password.');
        } else {
            console.error('   Login failed!');
            process.exit(1);
        }

        console.log('5. Attempt login with OLD password (should fail)...');
        try {
            await axios.post(`${BASE_URL}/auth/login`, {
                email: 'test_pwd_user@example.com',
                password: 'initial_password'
            });
            console.error('   Login suceeded with old password (unexpected)!');
            process.exit(1);
        } catch (error) {
            if (error.response && error.response.status === 400) {
                console.log('   Login failed as expected with old password.');
            } else {
                throw error;
            }
        }

        console.log('6. Cleanup...');
        await axios.delete(`${BASE_URL}/users/${userId}`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log('   User deleted.');

        console.log('\nSUCCESS: Password change verification passed!');

    } catch (error) {
        console.error('TEST FAILED:', error.response ? error.response.data : error.message);
        // Try to cleanup if user was created
        if (userId && adminToken) {
            try {
                await axios.delete(`${BASE_URL}/users/${userId}`, {
                    headers: { Authorization: `Bearer ${adminToken}` }
                });
                console.log('   Cleanup performed after failure.');
            } catch (cleanupAuthError) {
                // ignore
            }
        }
    }
}

runTest();
