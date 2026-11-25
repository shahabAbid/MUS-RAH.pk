
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../../../components/ui/ProductCard";
import {
  getPublishedProducts,
  getPublicCategories,
} from "../../../lib/storeApi";
import type { StoreProduct } from "../../../lib/storeApi";
import { SlidersHorizontal, X, RefreshCw } from "lucide-react";

type Category = {
  id: string;
  name: string;
  slug: string;
};

export default function CollectionPage() {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sort, setSort] = useState("featured");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [params, setParams] = useSearchParams();

  const selectedCategorySlug = params.get("category") || "";
  const searchQuery = params.get("q")?.toLowerCase().trim() || "";

  // Convert category names into URL-friendly slugs
  function createSlug(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  // Fetch products and categories from backend
  const loadProducts = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError("");

      const [productData, categoryData] = await Promise.all([
        getPublishedProducts(),
        getPublicCategories(),
      ]);

      console.log("Products received from backend:", productData);

      setProducts(productData);
      setCategories(categoryData);

    } catch (err) {
      console.error("Collection loading error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load products. Please try again.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load and refresh when visitor returns to the page
  useEffect(() => {
    loadProducts();

    const handleFocus = () => {
      loadProducts(false);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadProducts(false);
      }
    };

    window.addEventListener("focus", handleFocus);

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    return () => {
      window.removeEventListener("focus", handleFocus);

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
    };
  }, [loadProducts]);

  // Find selected category using URL slug
  const selectedCategory = useMemo(() => {
    return categories.find(
      (category) =>
        category.slug.toLowerCase() ===
        selectedCategorySlug.toLowerCase(),
    );
  }, [categories, selectedCategorySlug]);

  // Filter and sort products
  const filtered = useMemo(() => {
    let result = products.filter((product) => {
      const productCategory = String(product.category || "")
        .toLowerCase()
        .trim();

      const productCategorySlug = createSlug(productCategory);

      const categoryMatches =
        !selectedCategorySlug ||
        productCategorySlug === selectedCategorySlug.toLowerCase() ||
        productCategory ===
          selectedCategory?.name.toLowerCase().trim() ||
        productCategory ===
          selectedCategory?.slug.toLowerCase().trim();

      const searchMatches =
        !searchQuery ||
        product.name.toLowerCase().includes(searchQuery);

      return categoryMatches && searchMatches;
    });

    if (sort === "low") {
      result = [...result].sort(
        (a, b) => a.price - b.price,
      );
    }

    if (sort === "high") {
      result = [...result].sort(
        (a, b) => b.price - a.price,
      );
    }

    return result;
  }, [
    products,
    selectedCategorySlug,
    selectedCategory,
    searchQuery,
    sort,
  ]);

  // Clear selected category
  function clearCategory() {
    const nextParams = new URLSearchParams(params);

    nextParams.delete("category");

    setParams(nextParams);
  }

  const styles = `
    .collection-page {
      color: #352a27;
    }

    .collection-page .collection-intro {
      text-align: center;
      padding: 85px 20px 52px;
    }

    .collection-page .collection-intro .eyebrow {
      margin-bottom: 22px;
      color: #967b68;
      font-size: 9px;
      letter-spacing: 2px;
    }

    .collection-page .collection-intro h1 {
      margin: 0;
      color: #501b2d;
      font-family: Georgia, serif;
      font-size: clamp(42px, 6vw, 68px);
      font-weight: 400;
      line-height: 1.02;
    }

    .collection-page .collection-intro h1 em {
      font-weight: 400;
    }

    .collection-page .collection-intro > p:last-child {
      max-width: 490px;
      margin: 22px auto 0;
      color: #8a7c73;
      font-size: 12px;
      line-height: 1.8;
    }

    .collection-page .collection-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      min-height: 65px;
      padding: 14px 0;
      border-top: 1px solid #e8dfd7;
      border-bottom: 1px solid #e8dfd7;
    }

    .collection-page .selected-collection {
      display: flex;
      align-items: center;
      gap: 18px;
      flex-wrap: wrap;
    }

    .collection-page .selected-collection > span {
      color: #806c5c;
      font-size: 10px;
      letter-spacing: 1.5px;
    }

    .collection-page .clear-category-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 11px;
      border: 1px solid #e5dcd2;
      background: transparent;
      color: #725d4c;
      font-size: 11px;
      cursor: pointer;
      transition: background .2s ease;
    }

    .collection-page .clear-category-btn:hover {
      background: #f0eae3;
    }

    .collection-page .collection-toolbar label {
      display: flex;
      align-items: center;
      gap: 9px;
      color: #654c40;
    }

    .collection-page .collection-toolbar select {
      padding: 8px 25px 8px 5px;
      border: none;
      outline: none;
      background: transparent;
      color: #501b2d;
      font-size: 11px;
      cursor: pointer;
    }

    .collection-page .result-count {
      margin: 25px 0;
      color: #947f70;
      font-size: 9px;
      letter-spacing: 1.7px;
    }

    .collection-page .empty-state {
      padding: 55px 15px;
      color: #8a7c73;
      text-align: center;
      font-family: Georgia, serif;
      font-size: 16px;
    }

    .collection-page .collection-grid {
      margin-bottom: 60px;
    }

    .collection-page .refresh-btn {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 8px 12px;
      border: 1px solid #e5dcd2;
      background: transparent;
      color: #725d4c;
      font-size: 11px;
      cursor: pointer;
    }

    .collection-page .refresh-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    @media (max-width: 768px) {
      .collection-page .collection-intro {
        padding: 60px 15px 38px;
      }

      .collection-page .collection-intro h1 {
        font-size: clamp(37px, 10vw, 52px);
      }

      .collection-page .collection-toolbar {
        align-items: flex-start;
        flex-direction: column;
        gap: 12px;
        padding: 16px 0;
      }

      .collection-page .selected-collection {
        width: 100%;
        justify-content: space-between;
      }

      .collection-page .collection-toolbar label {
        align-self: flex-end;
      }
    }

    @media (max-width: 480px) {
      .collection-page .collection-intro {
        padding-top: 45px;
      }

      .collection-page .collection-intro > p:last-child {
        font-size: 11px;
      }

      .collection-page .selected-collection > span {
        font-size: 9px;
      }
    }
  `;

  return (
    <>
      <style>{styles}</style>

      <div className="page-wrap collection-page">

        <div className="collection-intro">
          <p className="eyebrow">
            THE MUSEHRACOLLECTION · VOL. 01
          </p>

          <h1>
            {selectedCategory ? (
              <>
                {selectedCategory.name}
                <br />
                <em>Atelier Collection.</em>
              </>
            ) : (
              <>
                The Ready-to-Wear
                <br />
                <em>Atelier Collection.</em>
              </>
            )}
          </h1>

          <p>
            Tailored silhouettes, fluid textures and architectural
            draping. A wardrobe of enduring expressions.
          </p>
        </div>

        <div className="collection-toolbar">

          <div className="selected-collection">
            {selectedCategory ? (
              <>
                <span>
                  COLLECTION / {selectedCategory.name.toUpperCase()}
                </span>

                <button
                  className="clear-category-btn"
                  onClick={clearCategory}
                >
                  <X size={13} />
                  Clear filter
                </button>
              </>
            ) : (
              <span>EXPLORE ALL PIECES</span>
            )}
          </div>

          <label>
            <SlidersHorizontal size={15} />

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="featured">Featured</option>
              <option value="low">Price: low to high</option>
              <option value="high">Price: high to low</option>
            </select>
          </label>

        </div>

        {loading ? (
          <p className="empty-state">
            Loading collection...
          </p>
        ) : error ? (
          <div className="empty-state">
            <p>{error}</p>

            <button
              className="refresh-btn"
              onClick={() => loadProducts()}
            >
              <RefreshCw size={13} />
              Try again
            </button>
          </div>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <p className="result-count">
                {filtered.length} CURATED PIECES
              </p>

              <button
                className="refresh-btn"
                onClick={() => loadProducts(false)}
                disabled={refreshing}
              >
                <RefreshCw size={13} />
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            <div className="product-grid collection-grid">
              {filtered.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={index}
                />
              ))}
            </div>

            {!filtered.length && (
              <p className="empty-state">
                {selectedCategorySlug
                  ? `No products found in ${
                      selectedCategory?.name || selectedCategorySlug
                    }.`
                  : "No pieces found in this edit."}
              </p>
            )}
          </>
        )}

      </div>
    </>
  );
}
