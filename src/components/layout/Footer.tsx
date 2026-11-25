import { Link } from "react-router-dom";
export default function Footer() {
  return (
    <footer className="footer">
      <div>
        <h3>THE MAISON</h3>
        <p>
          <Link to="/about">Our story</Link>
          <br />
          Craftsmanship
          <br />
          Sustainability
        </p>
      </div>
      <div>
        <h3>CLIENT SERVICES</h3>
        <p>
          <Link to="/contact">Contact us</Link>
          <br />
          <Link to="/privacy">Shipping & returns</Link>
          <br />
          <Link to="/privacy">Care guide</Link>
        </p>
      </div>
      <div>
        <h3>LEGAL & POLICIES</h3>
        <p>
          <Link to="/privacy">Privacy & shopping policy</Link>
          <br />
          <Link to="/privacy">Returns & refunds</Link>
          <br />
          <Link to="/privacy">Delivery policy</Link>
        </p>
      </div>
      <div className="newsletter">
        <h3>THE MUSEHRALETTER</h3>
        <p>
          Notes from the atelier, new collections and considered inspiration.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            alert("Thank you for joining the MUSEHRAletter.");
          }}
        >
          <input type="email" placeholder="Your email address" required />
          <button>JOIN</button>
        </form>
      </div>
      <div className="footer-bottom">
        © 2025 MUSEHRAMAISON DE MODE{" "}
        <span>CRAFTED WITH INTENTION · WORN WITH FEELING</span>
      </div>
    </footer>
  );
}
