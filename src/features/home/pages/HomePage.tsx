
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import ProductCard from "../../../components/ui/ProductCard";
import { products } from "../../catalog/data/products";

/* ================= HERO SLIDES ================= */

const slides = [
  {
    title: "The Poetry",
    italic: "of Winter.",
    eyebrow: "THE NEW WINTER COLLECTION",
    description:
      "Discover refined layers, timeless silhouettes and the beauty of winter dressing.",
    image: "/images/winter.jpg",
    caption: "MUSÉHRA· WINTER COLLECTION",
    position: "center 15%",
  },
  {
    title: "The Art",
    italic: "of Summer.",
    eyebrow: "THE SUMMER COLLECTION",
    description:
      "Light fabrics, effortless elegance and beautiful pieces made for warmer days.",
    image: "/images/summer.jpg",
    caption: "MUSÉHRA· SUMMER COLLECTION",
    position: "center 15%",
  },
  {
    title: "Everyday",
    italic: "Elegance.",
    eyebrow: "READY-TO-WEAR COLLECTION",
    description:
      "Discover versatile designs that bring sophistication to every moment.",
    image: "/images/ready-to-wear.jpg",
    caption: "MUSÉHRA· READY-TO-WEAR",
    position: "center 15%",
  },
  {
    title: "The Art",
    italic: "of Luxury.",
    eyebrow: "THE LUXURY COLLECTION",
    description:
      "Exceptional craftsmanship and considered details for unforgettable occasions.",
    image: "/images/luxury.jpg",
    caption: "MUSÉHRA· LUXURY COLLECTION",
    position: "center 15%",
  },
];

export default function HomePage() {
  const [activeSlide, setActiveSlide] = useState(0);

  const currentSlide = slides[activeSlide];

  /* ================= AUTOMATIC SLIDER ================= */

  useEffect(() => {
    const sliderInterval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 6000);

    return () => clearInterval(sliderInterval);
  }, []);

  /* ================= MANUAL NAVIGATION ================= */

  const nextSlide = () => {
    setActiveSlide((prev) => (prev + 1) % slides.length);
  };

  const previousSlide = () => {
    setActiveSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <div className="home-page">
      <style>{`
        /* ================= HERO SLIDER ================= */

        .home-page .hero {
          position: relative;
          width: 100%;
          height: 900px;
          min-height: 700px;
          overflow: hidden;
          isolation: isolate;
          background: #e9e1d8;
        }

        /* ================= SHARP BACKGROUND IMAGE ================= */

        .home-page .hero-image {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
          overflow: hidden;
          will-change: opacity;
          filter: none !important;
          backdrop-filter: none !important;
          -webkit-filter: none !important;
        }

        .home-page .hero-image img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          object-position: var(--image-position, center 15%);
          filter: none !important;
          backdrop-filter: none !important;
          -webkit-filter: none !important;
          image-rendering: auto;
          opacity: 1;
          transform: none;
        }

        /* ================= IMAGE OVERLAY ================= */

        .home-page .hero-overlay {
          position: absolute;
          inset: 0;
          z-index: 1;
          pointer-events: none;
          background: linear-gradient(
            90deg,
            rgba(250, 247, 242, 0.48) 0%,
            rgba(250, 247, 242, 0.25) 30%,
            rgba(250, 247, 242, 0.08) 60%,
            rgba(250, 247, 242, 0) 100%
          );
        }

        /* ================= HERO CONTENT ================= */

        .home-page .hero-copy {
          position: relative;
          z-index: 2;
          width: 70%;
          height: 100%;
          padding: 80px 0 70px 9%;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
        }

        .home-page .hero-copy .eyebrow {
          font-size: 12px;
          letter-spacing: 2px;
          line-height: 1.5;
          margin: 0 0 30px;
          max-width: 400px;
        }

        .home-page .hero-copy h1 {
          width: max-content;
          max-width: 100%;
          margin: 0 0 25px;
          font-size: clamp(58px, 6.5vw, 88px);
          line-height: 0.98;
          letter-spacing: -2px;
          font-weight: 400;
        }

        .home-page .hero-copy h1 em {
          font-style: italic;
        }

        .home-page .hero-copy .hero-desc {
          max-width: 420px;
          font-size: 16px;
          line-height: 1.8;
          margin: 0 0 28px;
        }

        .home-page .hero-copy .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }

        .home-page .hero-index {
          display: block;
          margin-top: 35px;
          font-size: 11px;
          letter-spacing: 2px;
        }

        /* ================= SIDE TEXT ================= */

        .home-page .hero-side {
          position: absolute;
          right: 25px;
          top: 50%;
          transform: translateY(-50%);
          writing-mode: vertical-rl;
          z-index: 2;
          font-size: 10px;
          letter-spacing: 3px;
        }

        /* ================= IMAGE CAPTION ================= */

        .home-page .image-caption {
          position: absolute;
          left: 9%;
          bottom: 35px;
          z-index: 2;
          font-size: 10px;
          letter-spacing: 2px;
        }

        /* ================= SLIDER CONTROLS ================= */

        .home-page .hero-controls {
          position: absolute;
          right: 8%;
          bottom: 30px;
          z-index: 5;
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .home-page .hero-arrow {
          width: 42px;
          height: 42px;
          border: 1px solid rgba(43, 37, 38, 0.45);
          background: rgba(250, 247, 242, 0.65);
          color: #2b2526;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: 0.3s ease;
        }

        .home-page .hero-arrow:hover {
          background: #2b2526;
          color: white;
        }

        .home-page .hero-dots {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .home-page .hero-dot {
          width: 8px;
          height: 8px;
          border: none;
          border-radius: 50%;
          background: rgba(43, 37, 38, 0.35);
          cursor: pointer;
          padding: 0;
          transition: 0.3s ease;
        }

        .home-page .hero-dot.active {
          width: 25px;
          border-radius: 10px;
          background: #2b2526;
        }

        /* ================= CATEGORY IMAGE FIX ================= */

        .home-page .category-grid {
          width: 100%;
          overflow: hidden;
        }

        .home-page .category-tile {
          position: relative;
          display: block;
          width: 100%;
          min-width: 0;
          overflow: hidden;
        }

        .home-page .category-tile img {
          display: block;
          width: 100%;
          max-width: 100%;
          height: auto;
          aspect-ratio: 3 / 4;
          object-fit: cover;
          object-position: center;
        }

        /* ================= TABLET ================= */

        @media (max-width: 1024px) {
          .home-page .hero {
            height: 800px;
          }

          .home-page .hero-copy {
            width: 75%;
            padding-left: 7%;
          }

          .home-page .hero-copy h1 {
            font-size: clamp(58px, 7vw, 78px);
          }
        }

        /* ================= MOBILE ================= */

        @media (max-width: 768px) {
          .home-page .hero {
            height: 750px;
            min-height: 650px;
          }

          .home-page .hero-image img {
            object-position: var(--mobile-image-position, center 15%);
          }

          .home-page .hero-overlay {
            background: linear-gradient(
              90deg,
              rgba(250, 247, 242, 0.55) 0%,
              rgba(250, 247, 242, 0.25) 55%,
              rgba(250, 247, 242, 0.08) 100%
            );
          }

          .home-page .hero-copy {
            width: 100%;
            padding: 70px 25px 100px;
          }

          .home-page .hero-copy .eyebrow {
            font-size: 10px;
            margin-bottom: 25px;
          }

          .home-page .hero-copy h1 {
            width: auto;
            font-size: clamp(48px, 11vw, 70px);
            letter-spacing: -1.5px;
            line-height: 1;
          }

          .home-page .hero-copy .hero-desc {
            max-width: 330px;
            font-size: 14px;
          }

          .home-page .hero-index {
            margin-top: 35px;
          }

          .home-page .hero-side {
            display: none;
          }

          .home-page .image-caption {
            left: 25px;
            bottom: 35px;
            font-size: 9px;
          }

          .home-page .hero-controls {
            right: 20px;
            bottom: 25px;
            gap: 10px;
          }

          .home-page .hero-arrow {
            width: 35px;
            height: 35px;
          }
        }

        /* ================= SMALL MOBILE ================= */

        @media (max-width: 400px) {
          .home-page .hero-copy {
            padding-left: 20px;
            padding-right: 20px;
          }

          .home-page .hero-copy h1 {
            font-size: 46px;
          }
        }
      `}</style>

      {/* ================= HERO SLIDER ================= */}

      <section className="hero">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSlide}
            className="hero-image"
            style={{
              "--image-position": currentSlide.position,
              "--mobile-image-position": "60% 15%",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          >
            <img
              src={currentSlide.image}
              alt={currentSlide.caption}
              loading="eager"
              decoding="async"
            />
          </motion.div>
        </AnimatePresence>

        <div className="hero-overlay"></div>

        {/* ================= HERO CONTENT ================= */}

        <div className="hero-copy">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSlide}
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.6 }}
            >
              <p className="eyebrow">{currentSlide.eyebrow}</p>

              <h1>
                {currentSlide.title}
                <br />
                <em>{currentSlide.italic}</em>
              </h1>

              <p className="hero-desc">
                {currentSlide.description}
              </p>

              <Link className="btn btn-dark" to="/collection">
                EXPLORE THE COLLECTION
                <ArrowRight size={15} />
              </Link>
            </motion.div>
          </AnimatePresence>

          <span className="hero-index">
            0{activeSlide + 1} — 0{slides.length}
          </span>
        </div>

        {/* Side text */}

        <div className="hero-side">
          MUSÉHRA— AN EXPRESSION OF MODERN FEMININITY
        </div>

        {/* Image caption */}

        <div className="image-caption">
          {currentSlide.caption}
        </div>

        {/* Slider navigation */}

        <div className="hero-controls">
          <div className="hero-dots">
            {slides.map((slide, index) => (
              <button
                key={slide.eyebrow}
                className={`hero-dot ${
                  activeSlide === index ? "active" : ""
                }`}
                onClick={() => setActiveSlide(index)}
                aria-label={`Go to ${slide.eyebrow}`}
                aria-current={activeSlide === index ? "true" : undefined}
              />
              
            ))}
          </div>

          <button
            className="hero-arrow"
            onClick={previousSlide}
            aria-label="Previous slide"
          >
            <ChevronLeft size={18} />
          </button>

          <button
            className="hero-arrow"
            onClick={nextSlide}
            aria-label="Next slide"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </section>

      {/* ================= INTRODUCTION ================= */}

      <section className="intro section-wrap" id="atelier">
        <p className="eyebrow">THE MUSÉHRA SIGNATURE</p>

        <h2>
          Where form becomes
          <br />
          <em>emotional resonance.</em>
        </h2>

        <p>
          We believe in the quiet power of a considered silhouette.
          Each piece is an invitation to express yourself, crafted
          with intention and made to be treasured.
        </p>
      </section>

      {/* ================= CATEGORIES ================= */}

      <section className="category-section section-wrap">
        <div className="section-heading">
          <div>
            <p className="eyebrow">A WORLD OF MUSÉHRA</p>

            <h2>
              The Haute <em>Prêt-à-Porter</em>
            </h2>
          </div>

          <Link className="text-link" to="/collection">
            VIEW ALL CATEGORIES <ArrowUpRight size={15} />
          </Link>
        </div>

        <div className="category-grid">
          {[
            ["Silk Evening Gowns & Formal", "/images/summer-small.jpg"],
            ["Tailored Ready-to-Wear", "/images/winter-small.jpg"],
            ["Eastern Embroidered Organza", "/images/ready-to-wear-small.jpg"],
          ].map(([name, img], i) => (
            <Link
              to="/collection"
              className="category-tile"
              key={name}
            >
              <img src={img} alt={name} />
              <span>0{i + 1} / COLLECTION</span>
              <h3>{name}</h3>
              <b>DISCOVER →</b>
            </Link>
          ))}
        </div>
      </section>

      {/* ================= FEATURED PRODUCTS ================= */}

      <section className="featured section-wrap">
        <div className="section-heading">
          <div>
            <p className="eyebrow">NOUVEAUTÉS ATELIER</p>

            <h2>
              Considered <em>essentials.</em>
            </h2>
          </div>

          <Link className="text-link" to="/collection">
            DISCOVER ALL <ArrowUpRight size={15} />
          </Link>
        </div>

        <div className="product-grid">
          {products.slice(0, 4).map((p, i) => (
            <ProductCard
              key={p.id}
              product={p}
              index={i}
            />
          ))}
        </div>
      </section>

      {/* ================= BRAND QUOTE ================= */}

      <section className="quote-band" id="journal">
        <p className="eyebrow">THE MUSÉHRA PHILOSOPHY</p>

        <h2>
          “Elegance is not being noticed,
          <br />
          <em>it is being remembered.”</em>
        </h2>

        <span>THE MAISON · EST. 2026</span>
      </section>

      {/* ================= NEWSLETTER ================= */}

      <section className="salon section-wrap">
        <div>
          <p className="eyebrow">A MORE PERSONAL CONNECTION</p>

          <h2>
            Join the <em>MUSÉHRA Salon.</em>
          </h2>

          <p>
            Receive intimate notes from the atelier, early access
            to new collections and invitations to our private edits.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            alert("Welcome to the MUSÉHRA Salon.");
          }}
        >
          <input
            type="email"
            placeholder="Your email address"
            required
          />

          <button className="btn btn-dark">
            SUBSCRIBE <ArrowRight size={15} />
          </button>
        </form>
      </section>
    </div>
  );
}
