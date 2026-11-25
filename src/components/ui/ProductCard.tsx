
import { motion } from "framer-motion";
import { Heart, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { StoreProduct } from "../../lib/storeApi";
import { useStore } from "../../app/StoreContext";
import { formatPrice } from "../../lib/currency";

export default function ProductCard({
  product,
  index = 0,
}: {
  product: StoreProduct;
  index?: number;
}) {
  const { wishlist, toggleWish } = useStore();

  return (
    <motion.article
      className="product-card"
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.65, delay: (index % 4) * 0.07 }}
    >
      <div className="product-media">
        <Link to={"/product/" + product.id}>
          <img
            src={product.image || "/placeholder.png"}
            alt={product.name}
            loading="lazy"
          />

          <span className="product-tag">{product.tag}</span>
        </Link>

        <button
          className={
            "wish-float " +
            (wishlist.includes(product.id) ? "is-wished" : "")
          }
          onClick={() => toggleWish(product.id)}
          aria-label="Toggle wishlist"
        >
          <Heart size={17} />
        </button>

        <Link className="quick-add" to={"/product/" + product.id}>
          DISCOVER <ArrowUpRight size={15} />
        </Link>
      </div>

      <div className="product-meta">
        <span>{product.category}</span>

        <Link to={"/product/" + product.id}>
          {product.name}
        </Link>

        <strong>{formatPrice(product.price)}</strong>
      </div>
    </motion.article>
  );
}
