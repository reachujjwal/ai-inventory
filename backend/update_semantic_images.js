const db = require('./config/db');

// Common product keywords to look for
const KEYWORDS = [
    'chair', 'table', 'lamp', 'keyboard', 'mouse', 'monitor',
    'desk', 'shelf', 'laptop', 'computer', 'phone', 'headphone',
    'watch', 'camera', 'shoe', 'shirt', 'pants', 'sofa', 'bed'
];

async function updateProductImages() {
    try {
        console.log('Starting semantic image update...');

        // Fetch products that have the placeholder text image (or NULL to be safe/thorough)
        // We only want to auto-update ones we likely set, or ones that are empty.
        // We look for 'placehold.co' OR NULL.
        const [products] = await db.query(`
            SELECT id, name 
            FROM products 
            WHERE image_url LIKE '%placehold.co%' OR image_url IS NULL
        `);

        console.log(`Found ${products.length} products to update.`);

        for (const product of products) {
            const lowerName = product.name.toLowerCase();
            let matchedKeyword = 'technology'; // Default fallback

            // Find matching keyword
            for (const keyword of KEYWORDS) {
                if (lowerName.includes(keyword)) {
                    matchedKeyword = keyword;
                    break;
                }
            }

            // Construct semantic image URL
            // Adding a lock parameter avoids all images looking the same if they have the same keyword
            // lock=id helps consistency per product
            const imageUrl = `https://loremflickr.com/600/400/${matchedKeyword}?lock=${product.id}`;

            await db.query('UPDATE products SET image_url = ? WHERE id = ?', [imageUrl, product.id]);
        }

        console.log('Products updated with semantic images.');
        process.exit(0);

    } catch (error) {
        console.error('Update failed:', error);
        process.exit(1);
    }
}

updateProductImages();
