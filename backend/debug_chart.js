const dashboardController = require('./controllers/dashboardController');
const db = require('./config/db');

// Mock Request and Response for Chart Data
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
        console.log('CHART DATA RESPONSE:', JSON.stringify(data, null, 2));
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
        console.log('Running chart debug script...');
        await dashboardController.getChartData(req, res);
        process.exit(0);
    } catch (err) {
        console.error('Script Error:', err);
    }
})();
