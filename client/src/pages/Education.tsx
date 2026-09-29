import { useEffect } from "react";
import { ArrowLeft, BookOpen, ExternalLink, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import { EDUCATION_DOCUMENT } from "@/educationContent";
import { translatePage } from "@/i18n";

export default function Education() {
  useEffect(() => {
    translatePage(window.localStorage.getItem("rmb-language") ?? "en");
  }, []);

  return (
    <div className="portal-shell education-page">
      <div className="tri-rule" />
      <header className="brand-header">
        <div className="portal-wrap brand-inner">
          <Link className="brand-lockup" href="/">
            <img src="/logo.png" alt="" className="brand-mark" />
            <span><strong>Rishwat Mukt Bharat</strong><small className="tagline">Know your Rights, Know where to report</small><small>Anti-corruption education · prototype</small></span>
          </Link>
          <Link className="btn btn-outline-light" href="/"><ArrowLeft size={16} /> Back to portal</Link>
        </div>
      </header>
      <main>
        <section className="hero-section education-hero">
          <div className="portal-wrap hero-copy">
            <span className="eyebrow"><ShieldCheck size={16} /> Learn before you act</span>
            <h1>Education: Anti-Corruption Laws in India</h1>
            <p>Read the supplied overview of India’s anti-corruption laws, institutions, complaint forums, protections, and practical filing checklist.</p>
          </div>
        </section>
        <section className="section section-paper">
          <div className="portal-wrap education-layout">
            <article className="education-card">
              <div className="education-card-heading"><BookOpen size={22} /><div><span className="eyebrow eyebrow-dark">Reference document</span><h2>Anti-Corruption Laws in India: A Comprehensive Overview</h2></div></div>
              <p className="education-note">This educational copy is reproduced from the document supplied with the portal. Laws and procedures can change; verify current provisions with official government portals or a qualified legal professional.</p>
              <pre className="education-document">{EDUCATION_DOCUMENT}</pre>
            </article>
            <aside className="aside-stack education-aside">
              <div className="aside-card aside-accent"><div className="aside-icon"><BookOpen size={18} /></div><h3>Use this as a guide</h3><p>Start with the law, identify the correct forum, prepare facts and evidence, and verify the official destination before submitting.</p><Link href="/#report">Start a complaint <ExternalLink size={15} /></Link></div>
              <div className="aside-card"><div className="aside-title"><ShieldCheck size={17} /> Safety reminder</div><p>Do not share passwords, OTPs, PINs, or unnecessary identity details. This prototype is educational and is not an official government portal or legal advice.</p></div>
            </aside>
          </div>
        </section>
      </main>
    </div>
  );
}
