import { motion } from 'framer-motion';
import { ArrowDown, ArrowUpRight, Feather, Flower2, Heart, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

const rise = { hidden: { opacity: 0, y: 32 }, visible: { opacity: 1, y: 0 } };

export default function AboutPage() {
  return <main className="about-page">
    <motion.section className="about-hero" initial="hidden" animate="visible" variants={rise} transition={{ duration: .8 }}>
      <div className="about-hero-image" role="img" aria-label="Fashion editorial with an elegant neutral-toned outfit" />
      <div className="about-hero-shade" />
      <div className="about-hero-copy"><span className="about-kicker">THE STORY OF MUSEHRA</span><h1>Elegance, with<br/><em>intention.</em></h1><p>A thoughtful approach to getting dressed — shaped by feeling, detail, and the beauty of everyday moments.</p><a href="#our-story" className="about-discover">DISCOVER OUR STORY <ArrowDown size={14}/></a></div>
      <span className="about-hero-index">01 / THE MAISON</span>
    </motion.section>
    <section className="about-intro page-wrap" id="our-story">
      <motion.div className="about-intro-label" initial="hidden" whileInView="visible" viewport={{once:true}} variants={rise}><span className="eyebrow">A NOTE FROM OUR MAISON</span><span className="about-asterisk">✳</span></motion.div>
      <motion.div className="about-intro-copy" initial="hidden" whileInView="visible" viewport={{once:true}} variants={rise} transition={{delay:.12}}><h2>Fashion should feel like <em>you.</em></h2><p>MUSEHRAbegan with a simple thought: the pieces we reach for most are the ones that make us feel entirely ourselves. We bring together graceful silhouettes, considered details, and a softer point of view on modern dressing.</p><p>From the first look to the final finishing touch, our intention is to make choosing what to wear feel personal, effortless, and full of possibility.</p></motion.div>
    </section>
    <section className="about-editorial"><motion.div className="about-editorial-image" initial={{opacity:0,scale:.97}} whileInView={{opacity:1,scale:1}} viewport={{once:true}} transition={{duration:.8}}/><motion.div className="about-editorial-copy" initial="hidden" whileInView="visible" viewport={{once:true}} variants={rise}><span className="eyebrow">OUR POINT OF VIEW · 01</span><h2>Less, but<br/><em>more meaningful.</em></h2><p>We believe personal style is not about having more. It is about finding pieces that work beautifully with the life you live — pieces that feel considered today and remain special tomorrow.</p><Link to="/collection" className="text-link">EXPLORE THE COLLECTION <ArrowUpRight size={13}/></Link></motion.div></section>
    <section className="about-values page-wrap"><div className="about-values-heading"><span className="eyebrow">WHAT GUIDES US</span><h2>Our little <em>philosophy.</em></h2></div><div className="about-value-grid">
      <motion.article whileHover={{y:-7}} transition={{duration:.25}}><span><Feather/></span><small>01 · THOUGHTFUL DESIGN</small><h3>Details that matter.</h3><p>We look to thoughtful shapes, considered finishing, and the small details that give a piece its character.</p></motion.article>
      <motion.article whileHover={{y:-7}} transition={{duration:.25}}><span><Heart/></span><small>02 · PERSONAL STYLE</small><h3>Made to feel like you.</h3><p>Our collections are an invitation to express your own point of view, with confidence and ease.</p></motion.article>
      <motion.article whileHover={{y:-7}} transition={{duration:.25}}><span><Flower2/></span><small>03 · EVERYDAY BEAUTY</small><h3>Beauty in the everyday.</h3><p>We celebrate the everyday rituals, occasions, and moments that make getting dressed meaningful.</p></motion.article>
    </div></section>
    <section className="about-quote"><Sparkles size={19}/><span className="eyebrow">THE MUSEHRASENTIMENT</span><h2>“Wear what makes<br/><em>you feel wonderful.”</em></h2><p>A little confidence. A little romance. Entirely your own.</p></section>
    <section className="about-visit page-wrap"><div><span className="eyebrow">YOUR STORY, YOUR STYLE</span><h2>Find the pieces<br/>that feel like <em>you.</em></h2><p>Discover the latest edit from MUSEHRAand make it your own.</p><Link to="/collection" className="btn btn-dark">DISCOVER THE COLLECTION <ArrowUpRight size={14}/></Link></div><div className="about-visit-image" role="img" aria-label="Elegant fashion editorial detail"/></section>
  </main>;
}
