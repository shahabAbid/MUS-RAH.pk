import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Shell from "../components/layout/Shell";
import HomePage from "../features/home/pages/HomePage";
import CollectionPage from "../features/catalog/pages/CollectionPage";
import ProductPage from "../features/product/pages/ProductPage";
import BagPage from "../features/checkout/pages/BagPage";
import AccountPage from "../features/account/pages/AccountPage";
import ContactPage from "../features/contact/pages/ContactPage";
import AboutPage from "../features/about/pages/AboutPage";
import AuthPage from "../features/account/pages/AuthPage";
import PrivacyPage from "../features/legal/pages/PrivacyPage";
function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.28 }}
      >
        <Routes location={location}>
          <Route path="/" element={<HomePage />} />
          <Route path="/collection" element={<CollectionPage />} />
          <Route path="/product/:id" element={<ProductPage />} />
          <Route path="/bag" element={<BagPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/signup" element={<AuthPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/policies" element={<PrivacyPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}
export default function App() {
  return (
    <Shell>
      <AnimatedRoutes />
    </Shell>
  );
}
