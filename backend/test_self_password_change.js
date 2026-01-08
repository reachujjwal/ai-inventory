const axios = require('axios');


const BASE_URL = 'http://localhost:5000/api';
let adminToken = '';
let userId = '';
let userToken = '';

async function runTest() {
    try {
        console.log('1. Login as temp admin...');
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'temp_admin@example.com',
            password: 'password123'
        });
        adminToken = loginRes.data.token;
        const adminUserId = loginRes.data.user.id;
        console.log(`   Temp Admin logged in (ID: ${adminUserId}).`);

        console.log('2. Create temporary user...');
        const createRes = await axios.post(`${BASE_URL}/users`, {
            username: 'test_self_pwd_user',
            email: 'test_self_pwd_user@example.com',
            password: 'initial_password',
            role: 'user'
        }, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        userId = createRes.data.id;
        console.log(`   User created with ID: ${userId}`);

        console.log('3. Login as new user...');
        const userLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'test_self_pwd_user@example.com',
            password: 'initial_password'
        });
        userToken = userLoginRes.data.token;
        console.log('   User logged in.');

        console.log('4. Try to change password with WRONG current password...');
        try {
            await axios.post(`${BASE_URL}/auth/change-password`, {
                currentPassword: 'wrong_password',
                newPassword: 'new_password'
            }, {
                headers: { Authorization: `Bearer ${userToken}` }
            });
            throw new Error('Should have failed with wrong current password');
        } catch (error) {
            if (error.response && error.response.status === 400) {
                console.log('   Failed as expected (wrong current password).');
            } else {
                throw error;
            }
        }

        console.log('5. Change password with CORRECT current password...');
        await axios.post(`${BASE_URL}/auth/change-password`, {
            currentPassword: 'initial_password',
            newPassword: 'new_password'
        }, {
            headers: { Authorization: `Bearer ${userToken}` }
        });
        console.log('   Password updated successfully.');

        console.log('6. Verify login with NEW password...');
        await axios.post(`${BASE_URL}/auth/login`, {
            email: 'test_self_pwd_user@example.com',
            password: 'new_password'
        });
        console.log('   Login successful with new password.');

        console.log('7. Cleanup...');
        await axios.delete(`${BASE_URL}/users/${userId}`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log('   User deleted.');

        console.log('   Deleting temp admin...');
        // We need to delete ourselves (admin), so we can't use our own token if the backend forbids deleting self?
        // Usually admins can delete other admins or self. Let's try.
        // If fail, we leave it.
        try {
            await axios.delete(`${BASE_URL}/users/${loginRes.data.user.id}`, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            console.log('   Temp admin deleted.');
        } catch (e) {
            console.log('   Could not delete temp admin (maybe self-delete restricted):', e.message);
        }

        console.log('\nSUCCESS: Self-service password change verification passed!');

    } catch (error) {
        console.error('TEST FAILED:', error.response ? error.response.data : error.message);
        if (userId && adminToken) {
            try {
                await axios.delete(`${BASE_URL}/users/${userId}`, {
                    headers: { Authorization: `Bearer ${adminToken}` }
                });
            } catch (cleanupAuthError) { }
        }
        process.exit(1);
    }
}

runTest();
