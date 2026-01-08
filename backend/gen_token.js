const jwt = require('jsonwebtoken');
const token = jwt.sign({ id: 9, role: 'admin' }, 'default_secret', { expiresIn: '1h' });
console.log(token);
