const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const HTTP_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
};

const TIMEOUT = 8000;

// ================================================================
// UTILITAIRE: PARSER DE PRIX MULTI-FORMATS
// ================================================================
function parsePrice(text) {
    if (!text) return 0;
    const cleaned = text.replace(/\s+/g, ' ').trim();
    
    // Format tunisien "1 DT 350" ou "1,350 DT" ou "1.350"
    let m = cleaned.match(/(\d+)\s*DT\s*(\d+)/i);
    if (m) {
        const millimes = m[2].padEnd(3, '0').slice(0, 3);
        return parseFloat(`${m[1]}.${millimes}`);
    }
    m = cleaned.match(/(\d+)[,\.](\d+)/);
    if (m) return parseFloat(`${m[1]}.${m[2].padEnd(3, '0').slice(0, 3)}`);
    m = cleaned.match(/(\d+)/);
    return m ? parseFloat(m[1]) : 0;
}

// ================================================================
// AGENT 1: CARREFOUR TUNISIE
// ================================================================
async function scrapeCarrefour(query) {
    try {
        const url = `https://www.carrefour.tn/default/catalogsearch/result/?q=${encodeURIComponent(query)}`;
        const { data } = await axios.get(url, { headers: HTTP_HEADERS, timeout: TIMEOUT });
        const $ = cheerio.load(data);

        const items = [];
        $('.product-item, li.item.product').each((i, el) => {
            if (i >= 3) return false;
            const title = $(el).find('.product-item-link, .product-name a').first().text().trim();
            const priceText = $(el).find('.price, .special-price .price').first().text().trim();
            const productUrl = $(el).find('.product-item-link, .product-name a').first().attr('href');
            const imageUrl = $(el).find('.product-image-photo, img').first().attr('src') || $(el).find('img').first().attr('data-src');
            const price = parsePrice(priceText);

            if (title && price > 0) {
                items.push({
                    store: 'Carrefour',
                    storeId: 'carrefour',
                    storeIcon: '🛒',
                    storeColor: '#2563eb',
                    title, price,
                    formattedPrice: `${price.toFixed(3)} DT`,
                    url: productUrl,
                    image: imageUrl,
                    addr: 'Carrefour Tunisie',
                    source: 'Carrefour.tn (Direct)',
                    timestamp: new Date().toISOString()
                });
            }
        });
        return items[0] || null;
    } catch (e) {
        console.error('❌ Carrefour:', e.message);
        return null;
    }
}

// ================================================================
// AGENT 2: MONOPRIX TUNISIE
// ================================================================
async function scrapeMonoprix(query) {
    try {
        const url = `https://www.monoprix.tn/catalogsearch/result/?q=${encodeURIComponent(query)}`;
        const { data } = await axios.get(url, { headers: HTTP_HEADERS, timeout: TIMEOUT });
        const $ = cheerio.load(data);

        const items = [];
        $('.product-item, .item.product-item, li.item').each((i, el) => {
            if (i >= 3) return false;
            const title = $(el).find('.product-item-link, .product-name, a.name').first().text().trim();
            const priceText = $(el).find('.price, .price-wrapper').first().text().trim();
            const productUrl = $(el).find('a').first().attr('href');
            const imageUrl = $(el).find('img').first().attr('src') || $(el).find('img').first().attr('data-src');
            const price = parsePrice(priceText);

            if (title && price > 0) {
                items.push({
                    store: 'Monoprix',
                    storeId: 'monoprix',
                    storeIcon: '🏬',
                    storeColor: '#e11d48',
                    title, price,
                    formattedPrice: `${price.toFixed(3)} DT`,
                    url: productUrl,
                    image: imageUrl,
                    addr: 'Monoprix Tunisie',
                    source: 'Monoprix.tn (Direct)',
                    timestamp: new Date().toISOString()
                });
            }
        });
        return items[0] || null;
    } catch (e) {
        console.error('❌ Monoprix:', e.message);
        return null;
    }
}

// ================================================================
// AGENT 3: MAGASIN GÉNÉRAL (MG.TN)
// ================================================================
async function scrapeMG(query) {
    try {
        const url = `https://www.mg.tn/?s=${encodeURIComponent(query)}&post_type=product`;
        const { data } = await axios.get(url, { headers: HTTP_HEADERS, timeout: TIMEOUT });
        const $ = cheerio.load(data);

        const items = [];
        $('.product, li.product, .type-product').each((i, el) => {
            if (i >= 3) return false;
            const title = $(el).find('.woocommerce-loop-product__title, h2, .product-title').first().text().trim();
            const priceText = $(el).find('.price, .amount').first().text().trim();
            const productUrl = $(el).find('a').first().attr('href');
            const imageUrl = $(el).find('img').first().attr('src') || $(el).find('img').first().attr('data-src');
            const price = parsePrice(priceText);

            if (title && price > 0) {
                items.push({
                    store: 'Magasin Général',
                    storeId: 'mg',
                    storeIcon: '🏬',
                    storeColor: '#ea580c',
                    title, price,
                    formattedPrice: `${price.toFixed(3)} DT`,
                    url: productUrl,
                    image: imageUrl,
                    addr: 'MG Tunisie',
                    source: 'MG.tn (Direct)',
                    timestamp: new Date().toISOString()
                });
            }
        });
        return items[0] || null;
    } catch (e) {
        console.error('❌ MG:', e.message);
        return null;
    }
}

// ================================================================
// AGENT 4: AZIZA TUNISIE
// ================================================================
async function scrapeAziza(query) {
    try {
        const url = `https://azizaonline.com.tn/index.php?route=product/search&search=${encodeURIComponent(query)}`;
        const { data } = await axios.get(url, { headers: HTTP_HEADERS, timeout: TIMEOUT });
        const $ = cheerio.load(data);

        const items = [];
        $('.product-layout, .product-thumb').each((i, el) => {
            if (i >= 3) return false;
            const title = $(el).find('.caption h4 a, .name a, h4').first().text().trim();
            const priceText = $(el).find('.price, .price-new').first().text().trim();
            const productUrl = $(el).find('a').first().attr('href');
            const imageUrl = $(el).find('img').first().attr('src');
            const price = parsePrice(priceText);

            if (title && price > 0) {
                items.push({
                    store: 'Aziza',
                    storeId: 'aziza',
                    storeIcon: '🛍️',
                    storeColor: '#16a34a',
                    title, price,
                    formattedPrice: `${price.toFixed(3)} DT`,
                    url: productUrl,
                    image: imageUrl,
                    addr: 'Aziza Tunisie',
                    source: 'Aziza.tn (Direct)',
                    timestamp: new Date().toISOString()
                });
            }
        });
        return items[0] || null;
    } catch (e) {
        console.error('❌ Aziza:', e.message);
        return null;
    }
}

// ================================================================
// AGENT 5: JUMIA TUNISIE
// ================================================================
async function scrapeJumia(query) {
    try {
        const url = `https://www.jumia.com.tn/catalog/?q=${encodeURIComponent(query)}`;
        const { data } = await axios.get(url, { headers: HTTP_HEADERS, timeout: TIMEOUT });
        const $ = cheerio.load(data);

        const items = [];
        $('article.prd, .prd').each((i, el) => {
            if (i >= 3) return false;
            const title = $(el).find('.name, h3.name').first().text().trim();
            const priceText = $(el).find('.prc').first().text().trim();
            const productUrl = $(el).find('a').first().attr('href');
            const imageUrl = $(el).find('img').first().attr('data-src') || $(el).find('img').first().attr('src');
            const price = parsePrice(priceText);

            if (title && price > 0) {
                items.push({
                    store: 'Jumia',
                    storeId: 'jumia',
                    storeIcon: '🛒',
                    storeColor: '#f68b1e',
                    title, price,
                    formattedPrice: `${price.toFixed(3)} DT`,
                    url: productUrl && productUrl.startsWith('http') ? productUrl : `https://www.jumia.com.tn${productUrl}`,
                    image: imageUrl,
                    addr: 'Jumia Tunisie',
                    source: 'Jumia.com.tn (Direct)',
                    timestamp: new Date().toISOString()
                });
            }
        });
        return items[0] || null;
    } catch (e) {
        console.error('❌ Jumia:', e.message);
        return null;
    }
}

// ================================================================
// AGENT 6: OPEN FOOD FACTS (Métadonnées produit)
// ================================================================
async function fetchOFF(barcode) {
    try {
        const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`;
        const { data } = await axios.get(url, { timeout: TIMEOUT });
        if (data.status === 1 && data.product) {
            return {
                name: data.product.product_name_fr || data.product.product_name || null,
                brand: data.product.brands || null,
                image: data.product.image_front_url || data.product.image_url || null,
                categories: data.product.categories || null
            };
        }
        return null;
    } catch (e) {
        return null;
    }
}

// ================================================================
// FALLBACK BASE PRIX LOCALE (si tous les scrapers échouent)
// ================================================================
const FALLBACK_PRICES = {
    '6191003000019': { name: 'Lait demi-écrémé U.H.T Délice 1L', brand: 'Délice', prices: [
        { store: 'Carrefour', storeId: 'carrefour', storeIcon: '🛒', storeColor: '#2563eb', price: 1.350, addr: 'Carrefour La Marsa', source: 'Prix référencé Carrefour.tn' },
        { store: 'Monoprix', storeId: 'monoprix', storeIcon: '🏬', storeColor: '#e11d48', price: 1.350, addr: 'Monoprix Lac 2', source: 'Prix réglementé' },
        { store: 'Magasin Général', storeId: 'mg', storeIcon: '🏬', storeColor: '#ea580c', price: 1.350, addr: 'MG Lafayette', source: 'Prix réglementé' },
        { store: 'Aziza', storeId: 'aziza', storeIcon: '🛍️', storeColor: '#16a34a', price: 1.350, addr: 'Aziza Ariana', source: 'Prix réglementé' }
    ]},
    '6191501100016': { name: 'Lait demi-écrémé U.H.T Délice 1L', brand: 'Délice', prices: [
        { store: 'Carrefour', storeId: 'carrefour', storeIcon: '🛒', storeColor: '#2563eb', price: 1.350, addr: 'Carrefour La Marsa', source: 'Carrefour.tn' },
        { store: 'Monoprix', storeId: 'monoprix', storeIcon: '🏬', storeColor: '#e11d48', price: 1.350, addr: 'Monoprix Lac 2', source: 'Monoprix.tn' }
    ]}
};

function getFallback(barcode) {
    const item = FALLBACK_PRICES[barcode];
    if (!item) return null;
    return item.prices.map(p => ({
        ...p,
        title: item.name,
        formattedPrice: `${p.price.toFixed(3)} DT`,
        image: 'https://images.openfoodfacts.org/images/products/619/100/300/0019/front_fr.8.400.jpg',
        timestamp: new Date().toISOString()
    }));
}

// ================================================================
// ROUTE PRINCIPALE: MULTI-SCRAPING PARALLÈLE
// ================================================================
app.get('/api/scrape-price', async (req, res) => {
    const { barcode, query } = req.query;
    const searchTerm = query || barcode;

    if (!searchTerm) {
        return res.status(400).json({ error: 'Paramètre "barcode" ou "query" requis' });
    }

    console.log(`\n🤖 [Multi-Agent IA] Recherche: "${searchTerm}"`);
    const startTime = Date.now();

    // Récupération des infos produit via OFF (nom, image)
    const offData = barcode ? await fetchOFF(barcode) : null;
    const finalSearchTerm = offData?.name || searchTerm;
    
    console.log(`📦 OFF: ${offData ? offData.name : 'Non trouvé'}`);
    console.log(`🔍 Terme de recherche final: "${finalSearchTerm}"`);

    // LANCEMENT PARALLÈLE DE TOUS LES AGENTS
    const [carrefour, monoprix, mg, aziza, jumia] = await Promise.allSettled([
        scrapeCarrefour(finalSearchTerm),
        scrapeMonoprix(finalSearchTerm),
        scrapeMG(finalSearchTerm),
        scrapeAziza(finalSearchTerm),
        scrapeJumia(finalSearchTerm)
    ]);

    let results = [];
    if (carrefour.status === 'fulfilled' && carrefour.value) results.push(carrefour.value);
    if (monoprix.status === 'fulfilled' && monoprix.value) results.push(monoprix.value);
    if (mg.status === 'fulfilled' && mg.value) results.push(mg.value);
    if (aziza.status === 'fulfilled' && aziza.value) results.push(aziza.value);
    if (jumia.status === 'fulfilled' && jumia.value) results.push(jumia.value);

    // Si aucune source ne répond, utiliser le fallback
    if (results.length === 0 && barcode) {
        const fallback = getFallback(barcode);
        if (fallback) results = fallback;
    }

    // Tri par prix croissant
    results.sort((a, b) => a.price - b.price);
    
    // Marquage du meilleur prix
    if (results.length > 0) results[0].isBest = true;

    const duration = Date.now() - startTime;
    console.log(`✅ Terminé en ${duration}ms - ${results.length} enseignes trouvées\n`);

    return res.json({
        query: searchTerm,
        productName: offData?.name || (results[0]?.title) || null,
        productImage: offData?.image || (results[0]?.image) || null,
        brand: offData?.brand || null,
        found: results.length > 0,
        count: results.length,
        duration: `${duration}ms`,
        results: results
    });
});

// ================================================================
// ROUTE HEALTHCHECK
// ================================================================
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        agents: ['Carrefour', 'Monoprix', 'Magasin Général', 'Aziza', 'Jumia', 'OpenFoodFacts'],
        version: '2.0.0'
    });
});

// SPA Fallback
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n╔══════════════════════════════════════════╗`);
    console.log(`║   🇹🇳 ScanTN Multi-Agent IA Actif          ║`);
    console.log(`║   Port : ${PORT}                              ║`);
    console.log(`║   Enseignes : Carrefour, Monoprix, MG,   ║`);
    console.log(`║              Aziza, Jumia, OFF           ║`);
    console.log(`╚══════════════════════════════════════════╝\n`);
});
