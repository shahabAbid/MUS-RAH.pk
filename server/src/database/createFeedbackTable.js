
const db = require("./db");

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS product_feedback (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),

      product_id TEXT NOT NULL,
      user_id TEXT NOT NULL,

      feedback_type TEXT NOT NULL
        CHECK (
          feedback_type IN ('rating', 'complaint', 'compliment')
        ),

      rating INTEGER
        CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),

      comment TEXT NOT NULL,

      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CHECK (
        (feedback_type = 'rating' AND rating IS NOT NULL)
        OR
        (feedback_type IN ('complaint', 'compliment') AND rating IS NULL)
      ),

      FOREIGN KEY (product_id)
        REFERENCES products(id) ON DELETE CASCADE,

      FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_feedback_product
    ON product_feedback(product_id);

    CREATE INDEX IF NOT EXISTS idx_feedback_type
    ON product_feedback(feedback_type);
  `);

  console.log("Product feedback table created successfully.");

} catch (error) {
  console.error("Table creation failed:", error);
  process.exitCode = 1;
} finally {
  db.close();
}
