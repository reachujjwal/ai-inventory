const jwt = require('jsonwebtoken');
const http = require('http');
const dotenv = require('dotenv');

dotenv.config();

const SECRET = process.env.JWT_SECRET || 'default_secret'; // Match backend fallback
const token = jwt.sign({ id: 9, role: 'admin' }, SECRET, { expiresIn: '1h' });

console.log('Generated Token:', token);

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/permissions',
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${token}`
    }
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    res.setEncoding('utf8');
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        console.log('BODY:', data.substring(0, 500)); // Print first 500 chars
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.end();
