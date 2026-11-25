
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Heart,
  Plus,
  Minus,
  Truck,
  ShieldCheck,
  Star,
} from "lucide-react";
import {
  getProductBySlug,
  getPublishedProducts,
  apiRequest,
  type StoreProduct,
} from "../../../lib/storeApi";
import { useStore } from "../../../app/StoreContext";
import { formatPrice } from "../../../lib/currency";
import ProductCard from "../../../components/ui/ProductCard";
import { motion } from "framer-motion";

type ProductReview = {
  id: string;
  rating: number;
  title?: string;
  body: string;
  is_verified_purchase?: number | boolean;
  created_at: string;
  customer_name: string;
};

type ReviewsResponse = {
  success: boolean;
  summary: {
    totalReviews: number;
    averageRating: number;
  };
  reviews: ProductReview[];
};

export default function ProductPage() {
  const { id } = useParams();

  const [p, setProduct] = useState<StoreProduct | null>(null);
  const [related, setRelated] = useState<StoreProduct[]>([]);
  const [size, setSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Review states
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [rating, setRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewBody, setReviewBody] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState("");

  const { add, toggleWish, wishlist } = useStore();

  async function loadReviews(productId: string) {
    try {
      setReviewLoading(true);
      setReviewError("");

      const data = await apiRequest<ReviewsResponse>(
        `/reviews/product/${encodeURIComponent(productId)}`,
      );

      setReviews(data.reviews || []);
      setAverageRating(Number(data.summary?.averageRating || 0));
      setTotalReviews(Number(data.summary?.totalReviews || 0));
    } catch (err) {
      setReviewError(
        err instanceof Error ? err.message : "Unable to load reviews.",
      );
    } finally {
      setReviewLoading(false);
    }
  }

  useEffect(() => {
    async function loadProduct() {
      if (!id) return;

      try {
        setLoading(true);
        setError("");

        const [productData, allProducts] = await Promise.all([
          getProductBySlug(id),
          getPublishedProducts(),
        ]);

        if (!productData) {
          setProduct(null);
          return;
        }

        setProduct(productData);
        setRelated(
          allProducts
            .filter((product) => product.id !== productData.id)
            .slice(0, 3),
        );
        setSize(productData.sizes[0] || "");
        setSelectedColor(productData.colors[0] || "");
        setQty(1);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to load product.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, [id]);

  useEffect(() => {
    if (p?.id) {
      loadReviews(p.id);
    }
  }, [p?.id]);

  async function handleReviewSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!p) return;

    if (reviewBody.trim().length < 5) {
      setReviewError("Your review must contain at least 5 characters.");
      return;
    }

    try {
      setSubmittingReview(true);
      setReviewError("");
      setReviewMessage("");

      const data = await apiRequest<{
        success: boolean;
        message: string;
      }>(`/reviews/product/${encodeURIComponent(p.id)}`, {
        method: "POST",
        body: JSON.stringify({
          rating,
          title: reviewTitle.trim(),
          body: reviewBody.trim(),
        }),
      });

      setReviewMessage(
        data.message || "Your review has been submitted for approval.",
      );

      setRating(5);
      setReviewTitle("");
      setReviewBody("");
    } catch (err) {
      setReviewError(
        err instanceof Error ? err.message : "Unable to submit your review.",
      );
    } finally {
      setSubmittingReview(false);
    }
  }

  if (loading) {
    return (
      <div className="page-wrap product-page">
        <p className="empty-state">Loading product...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-wrap product-page">
        <p className="empty-state">{error}</p>
        <Link to="/collection">BACK TO COLLECTION</Link>
      </div>
    );
  }

  if (!p) {
    return (
      <div className="page-wrap product-page">
        <p className="empty-state">Product not found.</p>
        <Link to="/collection">BACK TO COLLECTION</Link>
      </div>
    );
  }

  return (
    <div className="page-wrap product-page">
      <style>{`
        .product-reviews {
          margin: 85px 0;
          padding: 55px 0;
          border-top: 1px solid #e8e3e0;
          border-bottom: 1px solid #e8e3e0;
        }

        .reviews-heading {
          text-align: center;
          margin-bottom: 40px;
        }

        .reviews-heading .eyebrow {
          letter-spacing: 2px;
          font-size: 11px;
          color: #987b7b;
        }

        .reviews-heading h2 {
          font-family: inherit;
          font-size: clamp(27px, 4vw, 38px);
          font-weight: 400;
          margin: 12px 0;
        }

        .review-summary {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 12px;
          margin-top: 18px;
          color: #666;
          font-size: 13px;
        }

        .review-average {
          font-size: 27px;
          color: #292323;
          font-weight: 500;
        }

        .review-stars {
          display: flex;
          gap: 3px;
          color: #b58b55;
        }

        .reviews-layout {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 55px;
          align-items: start;
        }

        .reviews-list h3,
        .review-form h3 {
          font-size: 17px;
          font-weight: 500;
          margin: 0 0 22px;
        }

        .review-item {
          padding: 22px 0;
          border-bottom: 1px solid #eee9e6;
        }

        .review-item:first-of-type {
          border-top: 1px solid #eee9e6;
        }

        .review-item-top {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
        }

        .review-customer {
          font-size: 14px;
          font-weight: 500;
          color: #302828;
        }

        .review-date {
          font-size: 11px;
          color: #999;
          margin-top: 5px;
        }

        .review-item h4 {
          font-size: 14px;
          margin: 13px 0 7px;
          font-weight: 500;
        }

        .review-item p {
          font-size: 13px;
          line-height: 1.8;
          color: #777;
          margin: 0;
          white-space: pre-wrap;
        }

        .review-form {
          background: #faf7f5;
          padding: 30px;
        }

        .review-form > p {
          font-size: 12px;
          color: #888;
          line-height: 1.7;
          margin: -12px 0 22px;
        }

        .review-field {
          margin-bottom: 17px;
        }

        .review-field label {
          display: block;
          font-size: 11px;
          letter-spacing: 1px;
          margin-bottom: 9px;
          color: #554848;
        }

        .review-field input,
        .review-field textarea {
          width: 100%;
          box-sizing: border-box;
          padding: 13px 14px;
          border: 1px solid #e5ddda;
          background: white;
          color: #302828;
          font: inherit;
          font-size: 13px;
          outline: none;
        }

        .review-field input:focus,
        .review-field textarea:focus {
          border-color: #a98787;
        }

        .review-field textarea {
          min-height: 120px;
          resize: vertical;
        }

        .review-rating-select {
          display: flex;
          gap: 7px;
        }

        .review-rating-select button {
          border: 0;
          background: transparent;
          padding: 3px;
          cursor: pointer;
          color: #d7cec8;
        }

        .review-rating-select button.active {
          color: #b58b55;
        }

        .review-submit {
          width: 100%;
          border: 0;
          background: #292323;
          color: white;
          padding: 15px;
          font-size: 11px;
          letter-spacing: 1.5px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .review-submit:hover {
          background: #594747;
        }

        .review-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .review-notice {
          padding: 12px;
          font-size: 12px;
          line-height: 1.6;
          margin-bottom: 15px;
          background: #f0ebe6;
          color: #554848;
        }

        .review-error {
          color: #a33b3b;
          font-size: 12px;
          margin: 12px 0;
        }

        .review-empty {
          color: #888;
          font-size: 13px;
          padding: 20px 0;
          line-height: 1.7;
        }

        @media (max-width: 750px) {
          .product-reviews {
            margin: 55px 0;
            padding: 40px 0;
          }

          .reviews-layout {
            grid-template-columns: 1fr;
            gap: 35px;
          }

          .review-form {
            padding: 22px;
          }
        }
      `}</style>

      <Link className="back-link" to="/collection">
        <ArrowLeft size={15} /> BACK TO COLLECTION
      </Link>

      <div className="product-detail">
        <div className="detail-gallery">
          <motion.img
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            src={p.image}
            alt={p.name}
          />

          {p.image && <img src={p.image} alt={`${p.name} detail`} />}
        </div>

        <div className="detail-info">
          <p className="eyebrow">
            {p.category} · ATELIER COLLECTION
          </p>

          <h1>{p.name}</h1>

          <p className="detail-price">{formatPrice(p.price)}</p>

          <p className="detail-description">{p.description}</p>

          {p.colors.length > 0 && (
            <div className="detail-option">
              <div className="option-label">COLOUR</div>
              <div className="swatches">
                {p.colors.map((swatch) => (
                  <button
                    key={swatch}
                    style={{ background: swatch }}
                    aria-label={`Select colour ${swatch}`}
                    className={selectedColor === swatch ? "selected" : ""}
                    onClick={() => setSelectedColor(swatch)}
                  />
                ))}
              </div>
            </div>
          )}

          {p.sizes.length > 0 && (
            <div className="detail-option">
              <div className="option-label">
                SELECT SIZE
                <button className="text-link">SIZE GUIDE</button>
              </div>

              <div className="sizes">
                {p.sizes.map((s) => (
                  <button
                    key={s}
                    className={size === s ? "selected" : ""}
                    onClick={() => setSize(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="detail-option">
            <div className="option-label">QUANTITY</div>
            <div className="quantity">
              <button onClick={() => setQty(Math.max(1, qty - 1))}>
                <Minus size={14} />
              </button>

              <span>{qty}</span>

              <button onClick={() => setQty(qty + 1)}>
                <Plus size={14} />
              </button>
            </div>
          </div>

          <button
            className="btn btn-dark add-bag"
            disabled={!p.variants?.length || (p.sizes.length > 0 && !size)}
            onClick={() => {
              const selectedVariant =
                p.variants?.find(
                  (v) =>
                    v.size === (size || null) &&
                    (!v.colorHex || v.colorHex === selectedColor) &&
                    v.isActive &&
                    v.stockQuantity > 0,
                ) ||
                p.variants?.find(
                  (v) =>
                    v.size === (size || null) &&
                    v.isActive &&
                    v.stockQuantity > 0,
                );

              if (!selectedVariant) return;

              for (let i = 0; i < qty; i++) {
                add(p, size, selectedVariant.id);
              }

              setAdded(true);
              window.setTimeout(() => setAdded(false), 1800);
            }}
          >
            {added
              ? "ADDED TO YOUR BAG ✓"
              : p.variants?.length
                ? "ADD TO BAG"
                : "CURRENTLY UNAVAILABLE"}
          </button>

          <button
            className="btn btn-outline wish-detail"
            onClick={() => toggleWish(p.id)}
          >
            <Heart size={16} />
            {wishlist.includes(p.id)
              ? "SAVED TO WISHLIST"
              : "ADD TO WISHLIST"}
          </button>

          <div className="service-notes">
            <p>
              <Truck size={17} /> Complimentary delivery on orders over PKR
              25,000
            </p>
            <p>
              <ShieldCheck size={17} /> Thoughtful packaging · Easy returns
              within 7 days
            </p>
          </div>

          <details>
            <summary>THE DETAILS</summary>
            <p>
              Crafted with care, designed for movement. Please refer to the
              size guide for your best fit.
            </p>
          </details>

          <details>
            <summary>CARE & COMPOSITION</summary>
            <p>
              Professional dry clean recommended. Store in a cool, dry place.
            </p>
          </details>
        </div>
      </div>

      {/* CUSTOMER REVIEWS */}
      <section className="product-reviews">
        <div className="reviews-heading">
          <p className="eyebrow">CUSTOMER EXPERIENCES</p>
          <h2>Reviews & <em>Ratings</em></h2>

          <div className="review-summary">
            <span className="review-average">
              {averageRating.toFixed(1)}
            </span>

            <div>
              <div className="review-stars">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={15}
                    fill={star <= Math.round(averageRating) ? "currentColor" : "none"}
                  />
                ))}
              </div>
              <span>
                {totalReviews} {totalReviews === 1 ? "review" : "reviews"}
              </span>
            </div>
          </div>
        </div>

        <div className="reviews-layout">
          <div className="reviews-list">
            <h3>What our customers say</h3>

            {reviewLoading ? (
              <p className="review-empty">Loading reviews...</p>
            ) : reviews.length === 0 ? (
              <p className="review-empty">
                No published reviews yet. Be the first to share your
                experience with this product.
              </p>
            ) : (
              reviews.map((review) => (
                <article className="review-item" key={review.id}>
                  <div className="review-item-top">
                    <div>
                      <div className="review-customer">
                        {review.customer_name || "Customer"}
                      </div>
                      <div className="review-date">
                        {new Date(review.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="review-stars">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={13}
                          fill={star <= review.rating ? "currentColor" : "none"}
                        />
                      ))}
                    </div>
                  </div>

                  {review.title && <h4>{review.title}</h4>}
                  <p>{review.body}</p>
                </article>
              ))
            )}
          </div>

          <form className="review-form" onSubmit={handleReviewSubmit}>
            <h3>Write a review</h3>
            <p>
              Share your experience with this product. Your review will be
              checked before it appears publicly.
            </p>

            {reviewMessage && (
              <div className="review-notice">{reviewMessage}</div>
            )}

            {reviewError && (
              <div className="review-error">{reviewError}</div>
            )}

            <div className="review-field">
              <label>YOUR RATING</label>

              <div className="review-rating-select">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    className={star <= rating ? "active" : ""}
                    onClick={() => setRating(star)}
                    aria-label={`Rate ${star} out of 5`}
                  >
                    <Star
                      size={24}
                      fill={star <= rating ? "currentColor" : "none"}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="review-field">
              <label htmlFor="review-title">REVIEW TITLE (OPTIONAL)</label>
              <input
                id="review-title"
                type="text"
                maxLength={100}
                value={reviewTitle}
                onChange={(event) => setReviewTitle(event.target.value)}
                placeholder="Give your review a title"
              />
            </div>

            <div className="review-field">
              <label htmlFor="review-body">YOUR REVIEW</label>
              <textarea
                id="review-body"
                required
                minLength={5}
                value={reviewBody}
                onChange={(event) => setReviewBody(event.target.value)}
                placeholder="Tell us about your experience..."
              />
            </div>

            <button
              className="review-submit"
              type="submit"
              disabled={submittingReview}
            >
              {submittingReview ? "SUBMITTING..." : "SUBMIT REVIEW"}
            </button>
          </form>
        </div>
      </section>

      {related.length > 0 && (
        <section className="related">
          <p className="eyebrow">COMPLETE THE ENSEMBLE</p>
          <h2>
            Pieces to <em>consider.</em>
          </h2>

          <div className="product-grid">
            {related.map((product, i) => (
              <ProductCard
                key={product.id}
                product={product}
                index={i}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
