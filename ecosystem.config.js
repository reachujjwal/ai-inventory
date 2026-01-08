module.exports = {
    apps: [
        {
            name: 'ai-inventory-backend',
            script: 'server.js',
            cwd: './backend',
            watch: true,
            env: {
                NODE_ENV: 'development',
                PORT: 5000
            }
        },
        {
            name: 'ai-inventory-frontend',
            script: 'npm',
            args: 'run dev',
            cwd: './frontend',
            watch: false,
            env: {
                NODE_ENV: 'development',
                PORT: 3000
            }
        }
    ]
};
