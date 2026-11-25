
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  Heart,
  ShoppingBag,
  Menu,
  X,
  UserRound,
  ArrowUpRight,
  ArrowRight,
  ChevronDown,
  Layers,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../../app/StoreContext";
import {
  getPublishedProducts,
  getPublicCategories,
  type StoreProduct,
  type BackendCategory,
} from "../../lib/storeApi";
import { formatPrice } from "../../lib/currency";

type CategoryNode = BackendCategory & {
  parent_id?: string | null;
  parentId?: string | null;
  children: CategoryNode[];
};

export default function Header() {
  const { count, wishlist } = useStore();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [query, setQuery] = useState("");

  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [categories, setCategories] = useState<BackendCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [searchError, setSearchError] = useState("");

  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  const searchRef = useRef<HTMLDivElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const headerStyles = `
    .header-collection-trigger {
      border: none;
      padding: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      cursor: pointer;
      letter-spacing: inherit;
    }

    .collections-backdrop {
      position: fixed;
      inset: 0;
      z-index: 9998;
      width: 100%;
      height: 100%;
      border: none;
      background: rgba(0,0,0,.48);
      backdrop-filter: blur(3px);
    }

    .collections-drawer {
      position: fixed;
      top: 0;
      left: 0;
      z-index: 9999;
      width: min(440px, 90vw);
      height: 100vh;
      height: 100dvh;
      display: flex;
      flex-direction: column;
      background: #fbf9f6;
      color: #29231f;
      box-shadow: 12px 0 45px rgba(0,0,0,.15);
      overflow: hidden;
      text-align: left;
    }

    .collections-drawer-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 32px 28px 22px;
      border-bottom: 1px solid #e8e1d9;
    }

    .collections-eyebrow {
      display: block;
      margin-bottom: 12px;
      color: #927b65;
      font-size: 9px;
      letter-spacing: 2px;
    }

    .collections-drawer-header h2 {
      margin: 0;
      font-family: Georgia, serif;
      font-size: 30px;
      font-weight: 400;
      line-height: 1.3;
      color: #29231f;
    }

    .collections-drawer-header h2 em {
      font-weight: 400;
    }

    .collections-close {
      display: grid;
      place-items: center;
      flex-shrink: 0;
      width: 38px;
      height: 38px;
      border: 1px solid #e6ded5;
      border-radius: 50%;
      background: transparent;
      color: #29231f;
      cursor: pointer;
      transition: background .2s ease;
    }

    .collections-close:hover {
      background: #eee8e0;
    }

    .collections-drawer-intro {
      padding: 18px 28px;
      color: #85796e;
      font-family: Georgia, serif;
      font-size: 14px;
      line-height: 1.7;
    }

    .collections-all-link {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin: 0 28px 15px;
      padding: 15px 0;
      border: none;
      border-top: 1px solid #e8e1d9;
      border-bottom: 1px solid #e8e1d9;
      background: transparent;
      color: #4a3a2e;
      font-size: 11px;
      letter-spacing: 1.2px;
      cursor: pointer;
    }

    .collections-all-link span {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .collections-drawer-content {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: 5px 28px 25px;
      scrollbar-width: thin;
      scrollbar-color: #cbb9a7 transparent;
    }

    .collection-tree-item {
      border-bottom: 1px solid #eee8e1;
    }

    .collection-tree-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 49px;
    }

    .collection-tree-link {
      flex: 1;
      display: block;
      padding: 13px 0;
      border: none;
      background: transparent;
      color: #39312b;
      text-align: left;
      font-family: Georgia, serif;
      font-size: 15px;
      cursor: pointer;
      transition: color .2s ease;
    }

    .collection-tree-link:hover {
      color: #a17b59;
    }

    .collection-parent-link {
      font-size: 16px;
      font-weight: 500;
      color: #4a3028;
    }

    .collection-parent-link:hover {
      color: #a17b59;
    }

    .collection-tree-toggle {
      display: grid;
      place-items: center;
      flex-shrink: 0;
      width: 38px;
      height: 38px;
      border: none;
      background: transparent;
      color: #8d7b6b;
      cursor: pointer;
    }

    .tree-chevron {
      transition: transform .22s ease;
    }

    .tree-chevron.expanded {
      transform: rotate(180deg);
    }

    .collection-tree-children {
      overflow: hidden;
      padding-left: 17px;
      padding-bottom: 5px;
      border-left: 1px solid #e5d9cd;
      margin-left: 4px;
    }

    .collection-tree-children .collection-tree-link {
      font-family: Arial, sans-serif;
      font-size: 12px;
      color: #77695e;
      letter-spacing: .2px;
    }

    .collection-tree-children .collection-parent-link {
      font-family: Georgia, serif;
      font-size: 14px;
      font-weight: 500;
      color: #655044;
    }

    .collection-tree-children .collection-tree-link:hover {
      color: #a17b59;
    }

    .collections-loading {
      padding: 25px 0;
      color: #887b70;
      font-family: Georgia, serif;
      font-size: 14px;
    }

    .collections-error button {
      display: block;
      margin-top: 12px;
      padding: 9px 15px;
      border: 1px solid #cbb9a7;
      background: transparent;
      color: #594638;
      cursor: pointer;
    }

    .collections-drawer-footer {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      padding: 18px 28px;
      border-top: 1px solid #e8e1d9;
      color: #a18f7e;
      font-size: 8px;
      letter-spacing: 1.5px;
    }

    @media (max-width: 768px) {
      .collections-drawer {
        width: min(390px, 88vw);
      }

      .collections-drawer-header {
        padding: 25px 22px 20px;
      }

      .collections-drawer-intro {
        padding: 16px 22px;
      }

      .collections-all-link {
        margin-right: 22px;
        margin-left: 22px;
      }

      .collections-drawer-content {
        padding-right: 22px;
        padding-left: 22px;
      }

      .collections-drawer-footer {
        padding-right: 22px;
        padding-left: 22px;
      }
    }

    @media (max-width: 480px) {
      .collections-drawer-header h2 {
        font-size: 26px;
      }

      .collections-drawer-intro {
        font-size: 13px;
      }

      .collection-tree-link {
        font-size: 14px;
      }
    }
  `;

  // Load products and categories when search or Collections drawer opens.
  useEffect(() => {
    if ((!searchOpen && !collectionOpen) || loaded) return;

    let cancelled = false;

    async function loadSearchData() {
      try {
        setLoading(true);
        setSearchError("");

        const [productData, categoryData] = await Promise.all([
          getPublishedProducts(),
          getPublicCategories(),
        ]);

        if (!cancelled) {
          console.log("Loaded products:", productData);
          console.log("Loaded categories:", categoryData);

          setProducts(productData);
          setCategories(categoryData);
          setLoaded(true);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Header loading error:", error);

          setSearchError(
            error instanceof Error
              ? error.message
              : "Unable to load recommendations."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSearchData();

    return () => {
      cancelled = true;
    };
  }, [searchOpen, collectionOpen, loaded]);

  // Build category hierarchy using parent_id.
  const categoryTree = useMemo(() => {
    const nodes = new Map<string, CategoryNode>();

    categories.forEach((category) => {
      nodes.set(category.id, {
        ...category,
        children: [],
      } as CategoryNode);
    });

    const roots: CategoryNode[] = [];

    nodes.forEach((node) => {
      const parentId = node.parent_id ?? node.parentId ?? null;
      const parent = parentId ? nodes.get(parentId) : undefined;

      if (parent && parent.id !== node.id) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }, [categories]);

  // Search across product names, categories, tags and collections.
  const suggestions = useMemo(() => {
    const term = query.trim().toLowerCase();

    if (!term) {
      return {
        products: products.slice(0, 3),
        categories: categories.slice(0, 3),
      };
    }

    return {
      products: products
        .filter(
          (product) =>
            product.name.toLowerCase().includes(term) ||
            product.category.toLowerCase().includes(term) ||
            product.tag.toLowerCase().includes(term)
        )
        .slice(0, 5),

      categories: categories
        .filter(
          (category) =>
            category.name.toLowerCase().includes(term) ||
            category.slug.toLowerCase().includes(term) ||
            (category.description || "").toLowerCase().includes(term)
        )
        .slice(0, 4),
    };
  }, [query, products, categories]);

  // Close search when clicking outside.
  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node;

      if (
        searchRef.current &&
        !searchRef.current.contains(target) &&
        !searchButtonRef.current?.contains(target)
      ) {
        setSearchOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  // Escape closes open panels.
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSearchOpen(false);
        setCollectionOpen(false);
        setOpen(false);
        setQuery("");
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function toggleSearch() {
    setSearchOpen((current) => !current);
    setCollectionOpen(false);
    setOpen(false);
  }

  function closeSearch() {
    setSearchOpen(false);
    setQuery("");
  }

  function openCollections() {
    setCollectionOpen(true);
    setSearchOpen(false);
    setOpen(false);
  }

  function closeCollections() {
    setCollectionOpen(false);
    setExpandedCategories([]);
  }

  function submitSearch() {
    const value = query.trim();
    if (!value) return;

    closeSearch();
    navigate("/collection?q=" + encodeURIComponent(value));
  }

  function openCollection(slug: string) {
    closeSearch();
    closeCollections();

    if (!slug) {
      navigate("/collection");
      return;
    }

    navigate("/collection?category=" + encodeURIComponent(slug));
  }

  function toggleCategory(id: string) {
    setExpandedCategories((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  const hasSuggestions =
    suggestions.products.length > 0 ||
    suggestions.categories.length > 0;

  // Parent categories only expand. Leaf categories navigate.
  function renderCategoryNodes(nodes: CategoryNode[]) {
    return nodes.map((category) => {
      const hasChildren = category.children.length > 0;
      const isExpanded = expandedCategories.includes(category.id);

      return (
        <div className="collection-tree-item" key={category.id}>
          <div className="collection-tree-row">
            <button
              className={
                hasChildren
                  ? "collection-tree-link collection-parent-link"
                  : "collection-tree-link"
              }
              onClick={() => {
                if (hasChildren) {
                  toggleCategory(category.id);
                } else {
                  openCollection(category.slug);
                }
              }}
              aria-expanded={hasChildren ? isExpanded : undefined}
            >
              {category.name}
            </button>

            {hasChildren && (
              <button
                className="collection-tree-toggle"
                onClick={() => toggleCategory(category.id)}
                aria-label={
                  isExpanded
                    ? `Collapse ${category.name}`
                    : `Expand ${category.name}`
                }
                aria-expanded={isExpanded}
              >
                <ChevronDown
                  size={17}
                  className={
                    isExpanded ? "tree-chevron expanded" : "tree-chevron"
                  }
                />
              </button>
            )}
          </div>

          <AnimatePresence initial={false}>
            {hasChildren && isExpanded && (
              <motion.div
                className="collection-tree-children"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22 }}
              >
                {renderCategoryNodes(category.children)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    });
  }

  return (
    <>
      <style>{headerStyles}</style>

      <div className="announcement">
        USE WELCOME5 PROMO CODE FOR FIRST ORDER DISCOUNT{" "}
        <span>✦</span> THE NEW ATELIER COLLECTION
      </div>

      <header className="site-header">
        <button
          className="icon-btn mobile-menu"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X /> : <Menu />}
        </button>

        <nav className={"nav-links " + (open ? "nav-open" : "")}>
          <button
            className="header-collection-trigger"
            onClick={openCollections}
            aria-label="Open collections"
          >
            COLLECTIONS
          </button>

          <a href="/#atelier" onClick={() => setOpen(false)}>
            THE ATELIER
          </a>

          <a href="/#journal" onClick={() => setOpen(false)}>
            JOURNAL
          </a>
        </nav>

        <Link to="/" className="wordmark">
          MUSÉHRA<span>MAISON DE MODE</span>
        </Link>

        <div className="header-actions">
          <button
            ref={searchButtonRef}
            className="icon-btn"
            aria-label="Search"
            aria-expanded={searchOpen}
            onClick={toggleSearch}
          >
            {searchOpen ? <X /> : <Search />}
          </button>

          <Link
            className="icon-btn wish-link"
            to="/account"
            aria-label="Wishlist"
          >
            <Heart />
            <i>{wishlist.length}</i>
          </Link>

          <Link
            className="icon-btn"
            to="/account"
            aria-label="My account"
          >
            <UserRound />
          </Link>

          <Link
            className="icon-btn bag-link"
            to="/bag"
            aria-label="Shopping bag"
          >
            <ShoppingBag />
            <i>{count}</i>
          </Link>
        </div>

        {/* COLLECTIONS DRAWER */}
        <AnimatePresence>
          {collectionOpen && (
            <>
              <motion.button
                className="collections-backdrop"
                aria-label="Close collections menu"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeCollections}
              />

              <motion.aside
                className="collections-drawer"
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{
                  duration: 0.35,
                  ease: [0.22, 1, 0.36, 1],
                }}
                aria-label="Collections menu"
              >
                <div className="collections-drawer-header">
                  <div>
                    <span className="collections-eyebrow">
                      MUSEHRA· MAISON DE MODE
                    </span>
                    <h2>
                      Our <em>Collections</em>
                    </h2>
                  </div>

                  <button
                    className="collections-close"
                    onClick={closeCollections}
                    aria-label="Close collections"
                  >
                    <X size={21} />
                  </button>
                </div>

                <div className="collections-drawer-intro">
                  Discover pieces curated for every season and occasion.
                </div>

                <button
                  className="collections-all-link"
                  onClick={() => openCollection("")}
                >
                  <span>
                    <Layers size={17} />
                    View All Products
                  </span>
                  <ArrowUpRight size={17} />
                </button>

                <div className="collections-drawer-content">
                  {loading ? (
                    <div className="collections-loading">
                      Discovering collections...
                    </div>
                  ) : searchError ? (
                    <div className="collections-loading collections-error">
                      <p>{searchError}</p>
                      <button
                        onClick={() => {
                          setLoaded(false);
                          setSearchError("");
                        }}
                      >
                        Try again
                      </button>
                    </div>
                  ) : categoryTree.length > 0 ? (
                    <div className="collection-tree">
                      {renderCategoryNodes(categoryTree)}
                    </div>
                  ) : (
                    <div className="collections-loading">
                      No collections available yet.
                    </div>
                  )}
                </div>

                <div className="collections-drawer-footer">
                  <span>DISCOVER YOUR SIGNATURE STYLE</span>
                  <span>MUSEHRA</span>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* LUXURY SEARCH PANEL */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              ref={searchRef}
              className="luxury-search-panel"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <div className="luxury-search-inner">
                <div className="luxury-search-top">
                  <div>
                    <span className="search-eyebrow">
                      THE MUSEHRAEXPERIENCE
                    </span>
                    <h2>
                      Discover <em>something timeless.</em>
                    </h2>
                  </div>

                  <button
                    className="search-close"
                    onClick={closeSearch}
                    aria-label="Close search"
                  >
                    <X size={19} />
                  </button>
                </div>

                <form
                  className="luxury-search-input"
                  onSubmit={(event) => {
                    event.preventDefault();
                    submitSearch();
                  }}
                >
                  <Search size={20} strokeWidth={1.5} />

                  <input
                    ref={inputRef}
                    autoFocus
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="What are you looking for?"
                    aria-label="Search products and collections"
                  />

                  {query && (
                    <button
                      type="button"
                      className="search-clear"
                      onClick={() => {
                        setQuery("");
                        inputRef.current?.focus();
                      }}
                    >
                      CLEAR
                    </button>
                  )}

                  <button
                    type="submit"
                    className="search-submit"
                    disabled={!query.trim()}
                    aria-label="Submit search"
                  >
                    <ArrowRight size={18} />
                  </button>
                </form>

                {loading ? (
                  <div className="luxury-search-message">
                    Discovering the collection...
                  </div>
                ) : searchError ? (
                  <div className="luxury-search-message search-error">
                    {searchError}
                    <button
                      onClick={() => {
                        setLoaded(false);
                        setSearchError("");
                      }}
                    >
                      Try again
                    </button>
                  </div>
                ) : (
                  <>
                    {!query.trim() ? (
                      <div className="search-discovery">
                        <section className="search-discovery-section">
                          <div className="search-section-heading">
                            <span>01 / EXPLORE</span>
                            <h3>Collections</h3>
                          </div>

                          {categories.length > 0 ? (
                            <div className="search-collection-grid">
                              {suggestions.categories.map((category) => (
                                <button
                                  key={category.id}
                                  className="search-collection-tile"
                                  onClick={() =>
                                    openCollection(category.slug)
                                  }
                                >
                                  <div className="search-collection-image">
                                    {category.image_url ? (
                                      <img
                                        src={category.image_url}
                                        alt={category.name}
                                      />
                                    ) : (
                                      <div className="search-image-placeholder">
                                        A
                                      </div>
                                    )}
                                    <span>
                                      <ArrowUpRight size={17} />
                                    </span>
                                  </div>

                                  <div className="search-collection-name">
                                    {category.name}
                                  </div>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <p className="luxury-search-message">
                              No collections available yet.
                            </p>
                          )}
                        </section>

                        <section className="search-discovery-section">
                          <div className="search-section-heading">
                            <span>02 / THE EDIT</span>
                            <h3>Pieces to discover</h3>
                          </div>

                          {products.length > 0 ? (
                            <div className="search-product-grid">
                              {suggestions.products.map((product) => (
                                <Link
                                  key={product.id}
                                  to={"/product/" + product.id}
                                  className="search-product-tile"
                                  onClick={closeSearch}
                                >
                                  <div className="search-product-image">
                                    {product.image ? (
                                      <img
                                        src={product.image}
                                        alt={product.name}
                                      />
                                    ) : (
                                      <div className="search-image-placeholder">
                                        A
                                      </div>
                                    )}
                                    <span>
                                      <ArrowUpRight size={17} />
                                    </span>
                                  </div>

                                  <div className="search-product-name">
                                    {product.name}
                                  </div>
                                  <div className="search-product-category">
                                    {product.category}
                                  </div>
                                  <div className="search-product-price">
                                    {formatPrice(product.price)}
                                  </div>
                                </Link>
                              ))}
                            </div>
                          ) : (
                            <p className="luxury-search-message">
                              No products available yet.
                            </p>
                          )}
                        </section>
                      </div>
                    ) : (
                      <div className="live-search-results">
                        {hasSuggestions ? (
                          <>
                            {suggestions.categories.length > 0 && (
                              <section className="live-search-section">
                                <div className="search-section-heading">
                                  <span>01 / MATCHING</span>
                                  <h3>Collections</h3>
                                </div>

                                {suggestions.categories.map((category) => (
                                  <button
                                    key={category.id}
                                    className="live-search-row"
                                    onClick={() =>
                                      openCollection(category.slug)
                                    }
                                  >
                                    {category.image_url ? (
                                      <img
                                        src={category.image_url}
                                        alt={category.name}
                                      />
                                    ) : (
                                      <span className="live-search-placeholder">
                                        A
                                      </span>
                                    )}

                                    <span className="live-search-row-info">
                                      <strong>{category.name}</strong>
                                      <small>Explore collection</small>
                                    </span>

                                    <ArrowUpRight size={17} />
                                  </button>
                                ))}
                              </section>
                            )}

                            {suggestions.products.length > 0 && (
                              <section className="live-search-section">
                                <div className="search-section-heading">
                                  <span>02 / MATCHING</span>
                                  <h3>Products</h3>
                                </div>

                                {suggestions.products.map((product) => (
                                  <Link
                                    key={product.id}
                                    to={"/product/" + product.id}
                                    className="live-search-row"
                                    onClick={closeSearch}
                                  >
                                    {product.image ? (
                                      <img
                                        src={product.image}
                                        alt={product.name}
                                      />
                                    ) : (
                                      <span className="live-search-placeholder">
                                        A
                                      </span>
                                    )}

                                    <span className="live-search-row-info">
                                      <strong>{product.name}</strong>
                                      <small>
                                        {product.category} ·{" "}
                                        {formatPrice(product.price)}
                                      </small>
                                    </span>

                                    <ArrowUpRight size={17} />
                                  </Link>
                                ))}
                              </section>
                            )}

                            <button
                              className="search-view-all"
                              onClick={submitSearch}
                            >
                              VIEW ALL SEARCH RESULTS
                              <ArrowRight size={16} />
                            </button>
                          </>
                        ) : (
                          <div className="search-no-results">
                            <Search size={25} strokeWidth={1.3} />
                            <h3>No matching pieces found</h3>
                            <p>
                              Try another product name, category or collection.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                <div className="luxury-search-footer">
                  <span>MUSEHRA· MAISON DE MODE</span>
                  <span>DISCOVER YOUR SIGNATURE STYLE</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}
