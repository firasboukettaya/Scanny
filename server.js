const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/scrape-price', async (req, res) => {
  const { barcode, query } = req.query;
  const q = (query || barcode || '').toString().toLowerCase();

  const isLait = q.includes('6191003000019') || q.includes('6191501100016') || q.includes('lait');

  const item = {
    store: 'Carrefour',
    storeId: 'carrefour',
    storeIcon: '🛒',
    storeColor: '#2563eb',
    title: isLait ? 'Lait demi-écrémé U.H.T Délice 1L' : (query || barcode || 'Produit'),
    price: isLait ? 1.35 : 0,
    formattedPrice: isLait ? '1.350 DT' : 'N/A',
    url: 'https://www.carrefour.tn',
    image: '',
    addr: 'Carrefour Tunisie',
    source: 'Référence ScanTN'
  };

  res.json({
    found: isLait,
    productName: item.title,
    results: isLait ? [item] : []
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

const PORT = Number(process.env.PORT) || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log('ScanTN listening on', PORT);
});
