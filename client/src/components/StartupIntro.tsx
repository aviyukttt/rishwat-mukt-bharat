import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { translatePage } from "@/i18n";

const INTRO_SEEN_KEY = "rmb-intro-seen";

export default function StartupIntro() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.sessionStorage.getItem(INTRO_SEEN_KEY) !== "true";
  });
  const [leaving, setLeaving] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const documentImage = useRef<HTMLImageElement>(null);
  const eyebrow = useRef<HTMLSpanElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const preamble = useRef<HTMLParagraphElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    if (!visible || !root.current) return;
    translatePage(window.localStorage.getItem("rmb-language") ?? "en");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;
    const ctx = gsap.context(() => {
      gsap.set([documentImage.current, eyebrow.current, title.current, preamble.current, button.current], { opacity: 0, y: 18 });
      gsap.set(documentImage.current, { scale: 0.92, rotationY: -12, rotationX: 5, transformPerspective: 900 });
      gsap.timeline({ defaults: { ease: "power3.out" } })
        .to(documentImage.current, { opacity: 1, y: 0, scale: 1, rotationY: 0, rotationX: 0, duration: 1.05 })
        .to(eyebrow.current, { opacity: 1, y: 0, duration: 0.42 }, "-=0.32")
        .to(title.current, { opacity: 1, y: 0, duration: 0.62 }, "-=0.2")
        .to(preamble.current, { opacity: 1, y: 0, duration: 0.5 }, "-=0.3")
        .to(button.current, { opacity: 1, y: 0, duration: 0.48 }, "-=0.2");
    }, root);
    return () => ctx.revert();
  }, [visible]);

  if (!visible) return null;

  const enterSite = () => {
    window.sessionStorage.setItem(INTRO_SEEN_KEY, "true");
    setLeaving(true);
    if (!root.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(false);
      return;
    }
    gsap.to(root.current, { opacity: 0, scale: 1.03, duration: 0.55, ease: "power2.inOut", onComplete: () => setVisible(false) });
  };

  return <div ref={root} className={`startup-intro${leaving ? " is-leaving" : ""}`} role="dialog" aria-modal="true" aria-labelledby="startup-title">
    <div className="startup-glow startup-glow-one" />
    <div className="startup-glow startup-glow-two" />
    <div className="startup-card">
      <div className="startup-document-wrap"><img ref={documentImage} src="/constitution-preamble.png" alt="The Preamble to the Constitution of India" className="startup-document" /></div>
      <span ref={eyebrow} className="startup-eyebrow"><ShieldCheck size={15} /> A guided path to the right authority</span>
      <h1 ref={title} id="startup-title">Rishwat Mukt Bharat</h1>
      <p ref={preamble} className="startup-preamble">Know your Rights, Know where to report</p>
      <button ref={button} className="startup-button" type="button" onClick={enterSite}>Start a complaint <ArrowRight size={18} /></button>
      <small className="startup-footnote">Prototype portal for civic education and guided reporting</small>
    </div>
  </div>;
}
