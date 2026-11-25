
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const db = require('./database/db');

// Existing routes
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const variantRoutes = require('./routes/variantRoutes');
const customerRoutes = require('./routes/customerRoutes');

// Additional routes
const wishlistRoutes = require('./routes/wishlistRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const couponRoutes = require('./routes/couponRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const storeRoutes = require('./routes/storeRoutes');

// Notification route
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// ==========================================
// PRODUCTION PROXY CONFIGURATION
// ==========================================

if (process.env.TRUST_PROXY === '1') {
  app.set('trust proxy', 1);
}

// ==========================================
// DATABASE SCHEMA + MIGRATIONS
// ==========================================

const schemaPath = path.join(__dirname, 'database', 'schema.sql');
const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
db.exec(schemaSQL);
console.log('Database schema is ready.');

const migrationPath = path.join(__dirname, 'database', 'cartMigration.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
db.exec(migrationSQL);
console.log('Cart database migration completed successfully.');

// ==========================================
// SECURITY MIDDLEWARE
// ==========================================

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'img-src': [
          "'self'",
          'data:',
          'http://localhost:5000',
          'http://localhost:5173',
        ],
      },
    },
    crossOriginResourcePolicy: {
      policy: 'cross-origin',
    },
  })
);

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// ==========================================
// REQUEST PARSING
// ==========================================

app.use(express.json({
  limit: '1mb',
}));

app.use(express.urlencoded({
  extended: true,
  limit: '1mb',
}));

app.use(cookieParser());

// ==========================================
// STATIC PRODUCT IMAGE STORAGE
// ==========================================

const uploadDirectory = path.join(__dirname, '../uploads');

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, {
    recursive: true,
  });
}

app.use(
  '/uploads',
  express.static(uploadDirectory, {
    index: false,
    dotfiles: 'deny',
    fallthrough: true,
    maxAge: process.env.NODE_ENV === 'production'
      ? '7d'
      : 0,
  })
);

// ==========================================
// API ROUTES
// ==========================================

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/variants', variantRoutes);
app.use('/api/customer', customerRoutes);

app.use('/api/wishlist', wishlistRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/store', storeRoutes);

// Notification API
app.use('/api/notifications', notificationRoutes);

// ==========================================
// WELCOME ROUTE
// ==========================================

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to MUSEHRA API',
  });
});

// ==========================================
// HEALTH CHECK
// ==========================================

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'MUSEHRA backend is running',
  });
});

// ==========================================
// UNKNOWN ROUTES
// ==========================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API route not found',
  });
});

// ==========================================
// GLOBAL ERROR HANDLER
// ==========================================

app.use((err, req, res, next) => {
  console.error('Server error:', err);

  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof multer.MulterError) {
    let message = 'Image upload failed.';

    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'Each image must be 5 MB or smaller.';
    }

    if (err.code === 'LIMIT_FILE_COUNT') {
      message = 'You can upload a maximum of 8 images.';
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'Unexpected image field. Use the images field.';
    }

    return res.status(400).json({
      success: false,
      message,
    });
  }

  if (err.status && err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({
      success: false,
      message: err.message || 'Invalid request.',
    });
  }

  return res.status(500).json({
    success: false,
    message: 'Internal server error.',
  });
});

// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, () => {
  console.log(`MUSEHRA API running at http://localhost:${PORT}`);
});
