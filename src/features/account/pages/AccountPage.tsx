import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Package, Heart, UserRound, MapPin, LogOut, RefreshCw } from "lucide-react";
import { useStore } from "../../../app/StoreContext";
import ProductCard from "../../../components/ui/ProductCard";
import { products } from "../../catalog/data/products";
import { apiRequest, getPublishedProducts } from "../../../lib/storeApi";
import { formatPrice } from "../../../lib/currency";

type Profile = { id: string; full_name: string; email: string; phone: string | null; created_at: string };
type Order = { id: string; order_number: string; status: string; payment_method: string; payment_status: string; subtotal: number; delivery_fee: number; discount_total: number; total: number; created_at: string };
type Address = { id: string; recipient_name: string; phone: string; line1: string; line2: string | null; city: string; postal_code: string | null; is_default: number };

export default function AccountPage() {
  const [tab, setTab] = useState("orders");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<typeof products>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [orderItems, setOrderItems] = useState<Record<string, Array<{ product_name: string; size: string | null; color_name: string | null; quantity: number; line_total: number }>>>({});
  const { wishlist } = useStore();
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setBusy(true); setError("");
    try {
      const [profileData, orderData, addressData] = await Promise.all([
        apiRequest<{ profile: Profile }>("/customer/profile"),
        apiRequest<{ orders: Order[] }>("/orders/my"),
        apiRequest<{ addresses: Address[] }>("/customer/addresses"),
      ]);
      setProfile(profileData.profile); setFullName(profileData.profile.full_name); setPhone(profileData.profile.phone || "");
      setOrders(orderData.orders || []); setAddresses(addressData.addresses || []);
      try { setCatalogProducts(await getPublishedProducts()); } catch { setCatalogProducts([]); }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load your account.";
      if (message.toLowerCase().includes("log in") || message.toLowerCase().includes("session")) navigate("/login", { replace: true, state: { from: "/account" } });
      else setError(message);
    } finally { setBusy(false); }
  }, [navigate]);

  useEffect(() => { void load(); }, [load]);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      const result = await apiRequest<{ profile: Profile; message: string }>("/customer/profile", { method: "PATCH", body: JSON.stringify({ fullName, phone: phone || null }) });
      setProfile(result.profile); setNotice(result.message || "Profile updated.");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to save profile."); }
    finally { setSaving(false); }
  }

  async function toggleOrder(orderId: string) {
    if (expandedOrder === orderId) { setExpandedOrder(null); return; }
    setExpandedOrder(orderId);
    if (orderItems[orderId]) return;
    try {
      const result = await apiRequest<{ order: { items: Array<{ product_name: string; size: string | null; color_name: string | null; quantity: number; line_total: number }> } }>(`/orders/my/${orderId}`);
      setOrderItems(current => ({ ...current, [orderId]: result.order.items || [] }));
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to load order details."); }
  }

  async function logout() {
    try { await apiRequest("/auth/logout", { method: "POST" }); }
    finally { navigate("/login", { replace: true }); }
  }

  return (
    <div className="page-wrap account-page">
      <div className="account-heading-row"><div><p className="eyebrow">YOUR PRIVATE SALON</p><h1>Welcome back, <em>{profile?.full_name?.split(" ")[0] || "Client"}.</em></h1><p className="account-sub">A considered space for your MUSEHRAexperience.</p></div><button className="btn btn-outline" onClick={logout}><LogOut size={14}/> SIGN OUT</button></div>
      <div className="account-tabs">
        {[ ["orders", "My orders", Package], ["wishlist", "Saved curations", Heart], ["profile", "Personal details", UserRound], ["addresses", "Addresses", MapPin] ].map(([id, label, Icon]: any) => <button className={tab === id ? "active" : ""} onClick={() => setTab(id)} key={id}><Icon size={15}/>{label}</button>)}
      </div>
      {error && <p className="auth-error" role="alert">{error}</p>}{notice && <p className="auth-message" role="status">{notice}</p>}
      {busy ? <div className="no-orders">Loading your account…</div> : <>
        {tab === "orders" && <div className="account-panel"><div className="account-panel-heading"><div><p className="eyebrow">ATELIER ACQUISITIONS</p><h2>Your order history</h2></div><button className="text-link" onClick={() => void load()}><RefreshCw size={14}/> REFRESH</button></div>{orders.length ? <div className="account-orders">{orders.map(order => <article className="account-order" key={order.id}><button className="account-order-summary" onClick={() => void toggleOrder(order.id)}><span><small>ORDER {order.order_number}</small><strong>{new Date(order.created_at).toLocaleDateString()}</strong></span><span><small>STATUS</small><strong className="order-status">{order.status}</strong></span><span><small>TOTAL</small><strong>{formatPrice(order.total)}</strong></span><span className="order-open">{expandedOrder === order.id ? "−" : "+"}</span></button>{expandedOrder === order.id && <div className="account-order-details">{orderItems[order.id] ? orderItems[order.id].map((item, index) => <div className="account-order-item" key={index}><span>{item.product_name} · {item.size || "One size"}{item.color_name ? ` · ${item.color_name}` : ""} × {item.quantity}</span><strong>{formatPrice(item.line_total)}</strong></div>) : <p>Loading items…</p>}<div className="account-order-item"><span>Payment · {order.payment_method} ({order.payment_status})</span><strong>{formatPrice(order.total)}</strong></div></div>}</article>)}</div> : <div className="no-orders">Your next favourite piece is waiting to be discovered.<p><Link className="text-link" to="/collection">EXPLORE THE COLLECTION →</Link></p></div>}</div>}
        {tab === "wishlist" && <div className="account-panel"><p className="eyebrow">SAVED CURATIONS ({wishlist.length})</p><h2>Your personal edit</h2><div className="product-grid">{catalogProducts.filter(p => wishlist.includes(p.id)).map((p, i) => <ProductCard product={p} index={i} key={p.id}/>)}</div>{!wishlist.length && <p className="no-orders">Save pieces you love and they will appear here.</p>}</div>}
        {tab === "profile" && <div className="account-panel"><p className="eyebrow">YOUR DETAILS</p><h2>Personal details</h2><form className="account-profile-form" onSubmit={saveProfile}><label>FULL NAME<input value={fullName} onChange={e => setFullName(e.target.value)} minLength={2} required/></label><label>EMAIL ADDRESS<input value={profile?.email || ""} disabled/></label><label>PHONE NUMBER<input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Add your phone number"/></label><button className="btn btn-dark" disabled={saving}>{saving ? "SAVING…" : "SAVE DETAILS"}</button></form></div>}
        {tab === "addresses" && <div className="account-panel"><p className="eyebrow">DELIVERY DESTINATIONS</p><h2>Your addresses</h2>{addresses.length ? addresses.map(address => <div className="saved-address" key={address.id}><strong>{address.recipient_name} {address.is_default ? "· DEFAULT" : ""}</strong><p>{address.line1}{address.line2 ? `, ${address.line2}` : ""}, {address.city}</p><small>{address.phone}{address.postal_code ? ` · ${address.postal_code}` : ""}</small></div>) : <p className="no-orders">Your saved delivery addresses will appear here after your first checkout.</p>}</div>}
      </>}
    </div>
  );
}
