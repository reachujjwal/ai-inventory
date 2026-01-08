const dashboardController = require('./controllers/dashboardController');
const db = require('./config/db');

// Mock Request and Response
const req = {
    user: {
        id: 11,
        role: 'user'
    },
    query: {
        period: 'all_time'
    }
};

const res = {
    json: (data) => {
        console.log('RESPONSE:', JSON.stringify(data, null, 2));
    },
    status: (code) => {
        console.log('STATUS:', code);
        return {
            json: (data) => console.log('ERROR RESPONSE:', data)
        };
    }
};

// Run the controller function
(async () => {
    try {
        console.log('Running debug script...');
        await dashboardController.getStats(req, res);
        process.exit(0);
    } catch (err) {
        console.error('Script Error:', err);
    }
})();
