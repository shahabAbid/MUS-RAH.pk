
import { Link, useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2, ArrowRight, LockKeyhole } from "lucide-react";
import { useStore } from "../../../app/StoreContext";
import { formatPrice } from "../../../lib/currency";
import { useEffect, useState } from "react";
import { apiRequest } from "../../../lib/storeApi";

type AddressResponse = {
  address: { id: string };
};

type OrderResponse = {
  success: boolean;
  message: string;
  order: {
    id: string;
    order_number: string;
    total: number;
  };
};

type CouponValidationResponse = {
  success: boolean;
  message: string;
  coupon: {
    code: string;
    discountType: "percentage" | "fixed";
    discountValue: number;
  };
  subtotal: number;
  discount: number;
  finalSubtotal: number;
};

type AppliedCoupon = {
  code: string;
  discount: number;
};

export default function BagPage() {
  const { cart, remove, qty, subtotal, clear } = useStore();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [payment] = useState("cod");

  const [done, setDone] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Promo code states
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] =
    useState<AppliedCoupon | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [couponMessage, setCouponMessage] = useState("");
  const [validatedSubtotal, setValidatedSubtotal] =
    useState<number | null>(null);

  const delivery =
    subtotal >= 25000 || subtotal === 0 ? 0 : 200;

  const discount = appliedCoupon?.discount || 0;
  const total = subtotal - discount + delivery;

  const navigate = useNavigate();

  // If the cart changes, the previous coupon preview is no longer valid.
  useEffect(() => {
    if (
      validatedSubtotal !== null &&
      validatedSubtotal !== subtotal
    ) {
      setAppliedCoupon(null);
      setValidatedSubtotal(null);
      setCouponMessage("");
      setCouponError("Your bag changed. Please apply the promo code again.");
    }
  }, [subtotal, validatedSubtotal]);

  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();

    setCouponError("");
    setCouponMessage("");

    if (!code) {
      setCouponError("Please enter a promo code.");
      return;
    }

    if (subtotal <= 0) {
      setCouponError("Your bag is empty.");
      return;
    }

    if (couponBusy) return;

    setCouponBusy(true);

    try {
      // Coupon validation requires a logged-in customer.
      try {
        await apiRequest("/auth/me");
      } catch {
        navigate("/login", { state: { from: "/bag" } });
        return;
      }

      const result =
        await apiRequest<CouponValidationResponse>(
          "/coupons/validate",
          {
            method: "POST",
            body: JSON.stringify({
              code,
              subtotal,
            }),
          },
        );

      if (!result.success) {
        throw new Error(result.message || "Invalid promo code.");
      }

      setAppliedCoupon({
        code: result.coupon.code,
        discount: Number(result.discount),
      });

      setValidatedSubtotal(subtotal);
      setCouponInput(result.coupon.code);
      setCouponMessage(
        `${result.coupon.code} applied successfully!`,
      );
    } catch (err) {
      setAppliedCoupon(null);
      setValidatedSubtotal(null);
      setCouponError(
        err instanceof Error
          ? err.message
          : "Unable to validate this promo code.",
      );
    } finally {
      setCouponBusy(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setValidatedSubtotal(null);
    setCouponInput("");
    setCouponError("");
    setCouponMessage("");
  };

  const checkout = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cart.length || busy) return;

    setBusy(true);
    setError("");

    try {
      try {
        await apiRequest("/auth/me");
      } catch {
        navigate("/login", { state: { from: "/bag" } });
        return;
      }

      if (cart.some((item) => !item.variantId)) {
        throw new Error(
          "One or more bag items have an outdated selection. Please remove them and add the product again from its product page.",
        );
      }

      const addressResult =
        await apiRequest<AddressResponse>(
          "/customer/addresses",
          {
            method: "POST",
            body: JSON.stringify({
              recipientName: name.trim(),
              phone: phone.trim(),
              line1: address.trim(),
              city: city.trim(),
              isDefault: true,
            }),
          },
        );

      // Replace the server cart to make retries safe.
      await apiRequest("/cart", {
        method: "DELETE",
      });

      for (const item of cart) {
        await apiRequest("/cart/items", {
          method: "POST",
          body: JSON.stringify({
            productId: item.product.id,
            variantId: item.variantId,
            quantity: item.qty,
          }),
        });
      }

      const result = await apiRequest<OrderResponse>(
        "/orders/checkout",
        {
          method: "POST",
          body: JSON.stringify({
            addressId: addressResult.address.id,
            couponCode: appliedCoupon?.code || undefined,
            notes: `Customer email: ${email.trim()}`,
            paymentMethod: payment,
          }),
        },
      );

      setOrderNumber(result.order.order_number);
      clear();
      setAppliedCoupon(null);
      setValidatedSubtotal(null);
      setDone(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to place your order. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-wrap bag-page">
      <div className="checkout-steps">
        <span className="step-active">01 · YOUR BAG</span>
        <span>02 · DELIVERY</span>
        <span>03 · CONFIRMATION</span>
      </div>

      <div className="bag-heading">
        <div>
          <p className="eyebrow">THE MUSEHRAEXPERIENCE</p>
          <h1>
            Your <em>shopping bag.</em>
          </h1>
        </div>
        <span>{cart.length} PIECES</span>
      </div>

      {done ? (
        <div className="order-success">
          <p className="eyebrow">ORDER CONFIRMED</p>
          <h2>
            Thank you for choosing <em>MUSEHRA.</em>
          </h2>
          <p>
            Your order <strong>{orderNumber}</strong> has been
            placed successfully. You can follow its progress
            from your account.
          </p>
          <Link className="btn btn-dark" to="/account">
            VIEW MY ORDERS
          </Link>
          <p>
            <Link className="text-link" to="/collection">
              CONTINUE EXPLORING →
            </Link>
          </p>
        </div>
      ) : !cart.length ? (
        <div className="empty-bag">
          <h2>
            Your bag is awaiting <em>something beautiful.</em>
          </h2>
          <p>
            Discover considered pieces from the MUSEHRAatelier.
          </p>
          <Link className="btn btn-dark" to="/collection">
            EXPLORE THE COLLECTION
          </Link>
        </div>
      ) : (
        <div className="checkout-layout">
          <section className="bag-items">
            {cart.map(
              ({
                product,
                size,
                qty: quantity,
                variantId,
              }) => (
                <article
                  className="bag-line"
                  key={
                    product.id + size + (variantId || "")
                  }
                >
                  <img src={product.image} alt={product.name} />

                  <div className="bag-line-info">
                    <span>{product.category}</span>
                    <h3>{product.name}</h3>
                    <p>SIZE: {size || "ONE SIZE"}</p>
                    <strong>{formatPrice(product.price)}</strong>

                    <div className="quantity">
                      <button
                        type="button"
                        onClick={() =>
                          qty(
                            product.id,
                            size,
                            quantity - 1,
                            variantId,
                          )
                        }
                      >
                        <Minus size={13} />
                      </button>

                      <span>{quantity}</span>

                      <button
                        type="button"
                        onClick={() =>
                          qty(
                            product.id,
                            size,
                            quantity + 1,
                            variantId,
                          )
                        }
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="remove-btn"
                    onClick={() =>
                      remove(product.id, size, variantId)
                    }
                    aria-label="Remove item"
                  >
                    <Trash2 size={16} />
                  </button>
                </article>
              ),
            )}
          </section>

          <aside className="order-summary">
            <p className="eyebrow">
              ARCHIVAL ORDER SUMMARY
            </p>

            <div className="summary-row">
              <span>Subtotal</span>
              <strong>{formatPrice(subtotal)}</strong>
            </div>

            <div className="summary-row">
              <span>Delivery</span>
              <strong>
                {delivery
                  ? formatPrice(delivery)
                  : "Complimentary"}
              </strong>
            </div>

            {/* Promo code section */}
            <div
              className="promo-section"
              style={{ margin: "18px 0" }}
            >
              <p className="eyebrow">PROMO CODE</p>

              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  marginTop: "10px",
                }}
              >
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => {
                    setCouponInput(
                      e.target.value.toUpperCase(),
                    );
                    setCouponError("");
                    setCouponMessage("");
                  }}
                  placeholder="Enter promo code"
                  disabled={!!appliedCoupon || couponBusy}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    textTransform: "uppercase",
                  }}
                />

                {appliedCoupon ? (
                  <button
                    type="button"
                    className="btn btn-dark"
                    onClick={removeCoupon}
                  >
                    REMOVE
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-dark"
                    onClick={applyCoupon}
                    disabled={couponBusy}
                  >
                    {couponBusy ? "CHECKING..." : "APPLY"}
                  </button>
                )}
              </div>

              {couponError && (
                <p
                  className="auth-error"
                  role="alert"
                  style={{ marginTop: "8px" }}
                >
                  {couponError}
                </p>
              )}

              {couponMessage && appliedCoupon && (
                <p
                  role="status"
                  style={{
                    color: "green",
                    marginTop: "8px",
                    fontSize: "13px",
                  }}
                >
                  {couponMessage}
                </p>
              )}
            </div>

            {appliedCoupon && (
              <div className="summary-row">
                <span>
                  Promo discount ({appliedCoupon.code})
                </span>
                <strong>
                  -{formatPrice(discount)}
                </strong>
              </div>
            )}

            <div className="summary-total">
              <span>TOTAL</span>
              <strong>{formatPrice(total)}</strong>
            </div>

            <p className="delivery-note">
              Complimentary delivery on orders above PKR 25,000.
            </p>

            <form
              className="checkout-form"
              onSubmit={checkout}
            >
              <p className="eyebrow">
                CLIENT CONTACT & DESTINATION
              </p>

              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                autoComplete="name"
                required
              />

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                autoComplete="email"
                required
              />

              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone number"
                autoComplete="tel"
                required
              />

              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Delivery address"
                autoComplete="street-address"
                required
              />

              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                autoComplete="address-level2"
                required
              />

              <p className="eyebrow">SETTLEMENT METHOD</p>

              <label className="payment-choice">
                <input type="radio" checked readOnly />
                Cash on Delivery
              </label>

              {error && (
                <p className="auth-error" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="btn btn-dark checkout-btn"
              >
                {busy ? "PLACING ORDER…" : "PLACE ORDER"}
                <ArrowRight size={15} />
              </button>

              <p className="secure-note">
                <LockKeyhole size={13} />
                CUSTOMER SIGN IN REQUIRED TO PLACE YOUR ORDER
              </p>

              <p className="secure-note">
                By ordering, you agree to our{" "}
                <Link to="/privacy">
                  Privacy, Delivery & Returns Policy
                </Link>.
              </p>
            </form>
          </aside>
        </div>
      )}
    </div>
  );
}
