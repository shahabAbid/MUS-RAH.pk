import { FormEvent, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, Clock3, Mail, MapPin, MessageCircle, Phone, Send } from 'lucide-react';

const reveal = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } };

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', subject: 'Order enquiry', order: '', message: '' });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setForm({ name: '', email: '', subject: 'Order enquiry', order: '', message: '' });
  }

  return (
    <div className="contact-page">
      <motion.section className="contact-hero" initial="hidden" animate="visible" variants={reveal} transition={{ duration: .7 }}>
        <span className="eyebrow">WE ARE HERE FOR YOU</span>
        <h1>A little note can<br /><em>go a long way.</em></h1>
        <p>Whether you need help with an order, a thoughtful styling suggestion, or simply want to say hello, our client care team would love to hear from you.</p>
        <div className="contact-hero-mark">A<span>✳</span></div>
        <div className="contact-hero-caption">THE MUSEHRACLIENT EXPERIENCE · EST. WITH CARE</div>
      </motion.section>

      <section className="contact-main page-wrap">
        <motion.div className="contact-form-column" initial="hidden" whileInView="visible" viewport={{ once: true, amount: .15 }} variants={reveal} transition={{ duration: .65 }}>
          <p className="eyebrow">SEND US A MESSAGE</p>
          <h2>How may we <em>assist you?</em></h2>
          <p className="contact-intro">Share a few details below and a member of our team will be in touch. We aim to respond within one business day.</p>
          {submitted ? (
            <motion.div className="contact-success" initial={{ opacity: 0, scale: .97 }} animate={{ opacity: 1, scale: 1 }}>
              <span>✦</span><h3>Thank you for reaching out.</h3><p>Your message has been received in this demo. Connect the form to the store backend to deliver enquiries to your team.</p>
              <button className="btn btn-outline" onClick={() => setSubmitted(false)}>SEND ANOTHER MESSAGE</button>
            </motion.div>
          ) : (
            <form className="contact-form" onSubmit={handleSubmit}>
              <div className="contact-fields-two">
                <label>Your name<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Full name" /></label>
                <label>Email address<input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" /></label>
              </div>
              <div className="contact-fields-two">
                <label>How can we help?<select value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}><option>Order enquiry</option><option>Product information</option><option>Shipping & returns</option><option>Size & fit advice</option><option>Press & collaborations</option><option>Something else</option></select></label>
                <label>Order number <span className="optional-label">(optional)</span><input value={form.order} onChange={e => setForm({ ...form, order: e.target.value })} placeholder="e.g. AUR-1024" /></label>
              </div>
              <label className="message-label">Your message<textarea required rows={5} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="Tell us how we can help…" /></label>
              <div className="contact-submit-row"><span>Fields marked with * are required.</span><button className="btn btn-dark" type="submit">SEND MESSAGE <Send size={14} /></button></div>
            </form>
          )}
        </motion.div>

        <motion.aside className="contact-details" initial="hidden" whileInView="visible" viewport={{ once: true, amount: .15 }} variants={reveal} transition={{ duration: .7, delay: .12 }}>
          <div className="contact-details-inner">
            <p className="eyebrow">THE CLIENT CARE DESK</p>
            <h3>Considered service,<br /><em>always.</em></h3>
            <p className="contact-aside-copy">A personal experience is at the heart of everything we do. Find us through the details below.</p>
            <a className="contact-detail-item" href="mailto:care@MUSEHRA.example"><span className="contact-detail-icon"><Mail /></span><span><small>EMAIL OUR TEAM</small><strong>care@MUSEHRA.example</strong></span><ArrowUpRight /></a>
            <a className="contact-detail-item" href="tel:+923001234567"><span className="contact-detail-icon"><Phone /></span><span><small>CALL CLIENT CARE</small><strong>+92 300 123 4567</strong></span><ArrowUpRight /></a>
            <div className="contact-detail-item"><span className="contact-detail-icon"><Clock3 /></span><span><small>OPENING HOURS</small><strong>Monday – Saturday</strong><small>10:00 AM – 6:00 PM (PKT)</small></span></div>
            <div className="contact-detail-item"><span className="contact-detail-icon"><MapPin /></span><span><small>OUR MAISON</small><strong>Karachi, Pakistan</strong><small>By appointment, with pleasure</small></span></div>
            <div className="contact-social-note"><MessageCircle size={17} /><span>Prefer a conversation? Our team is happy to help you find the right piece.</span></div>
          </div>
          <div className="contact-aside-bottom">MUSEHRA· MADE TO BE KEPT</div>
        </motion.aside>
      </section>

      <motion.section className="contact-bottom-note" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: .6 }}>
        <span className="eyebrow">A NOTE FROM OUR ATELIER</span>
        <h2>Every detail deserves<br /><em>a personal touch.</em></h2>
        <p>Thank you for choosing MUSEHRA. We look forward to making your experience exceptional.</p>
      </motion.section>
    </div>
  );
}
