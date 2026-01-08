const db = require('./config/db');

async function updatePlaceholders() {
    try {
        console.log('Starting image placeholder update...');

        // 1. Update Users
        console.log('Fetching users with missing images...');
        const [users] = await db.query('SELECT id, username FROM users WHERE image_url IS NULL');
        console.log(`Found ${users.length} users to update.`);

        for (const user of users) {
            const imageUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=random`;
            await db.query('UPDATE users SET image_url = ? WHERE id = ?', [imageUrl, user.id]);
        }
        console.log('Users updated.');

        // 2. Update Products
        console.log('Fetching products with missing images...');
        const [products] = await db.query('SELECT id, name FROM products WHERE image_url IS NULL');
        console.log(`Found ${products.length} products to update.`);

        for (const product of products) {
            // Using a darker background for better visibility on white pages
            // placehold.co format: https://placehold.co/600x400/2a2a2a/FFF?text=Product+Name
            const imageUrl = `https://placehold.co/600x400/e2e8f0/1e293b?text=${encodeURIComponent(product.name)}`;
            await db.query('UPDATE products SET image_url = ? WHERE id = ?', [imageUrl, product.id]);
        }
        console.log('Products updated.');

        console.log('All updates complete.');
        process.exit(0);

    } catch (error) {
        console.error('Update failed:', error);
        process.exit(1);
    }
}

updatePlaceholders();
