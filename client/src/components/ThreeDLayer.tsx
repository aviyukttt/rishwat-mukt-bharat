import { useEffect } from "react";
import gsap from "gsap";

const SELECTOR = ".hero-panel, .form-card, .officer-card, .officer-result, .info-card, .agency-card, .aside-card, .education-card";
const INTERACTIVE_SELECTOR = "button, a, input, select, textarea, summary, [role='button'], [tabindex]";

export default function ThreeDLayer() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const surfaces = Array.from(document.querySelectorAll<HTMLElement>(SELECTOR));
    const cleanups = surfaces.flatMap(surface => {
      // A transformed card can move the pointer target beneath the cursor while a
      // control is hovered. Keep interactive cards geometrically stable so every
      // button has a reliable hit area and no hover flicker.
      if (surface.querySelector(INTERACTIVE_SELECTOR)) return [];

      surface.classList.add("three-d-surface");
      gsap.set(surface, { transformPerspective: 1200, transformOrigin: "center center" });

      const rotateXTo = gsap.quickTo(surface, "rotateX", { duration: 0.22, ease: "power2.out" });
      const rotateYTo = gsap.quickTo(surface, "rotateY", { duration: 0.22, ease: "power2.out" });
      const zTo = gsap.quickTo(surface, "z", { duration: 0.22, ease: "power2.out" });
      const reset = () => {
        rotateXTo(0);
        rotateYTo(0);
        zTo(0);
      };
      const move = (event: PointerEvent) => {
        const rect = surface.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        rotateYTo(x * 4);
        rotateXTo(y * -4);
        zTo(10);
      };

      surface.addEventListener("pointermove", move, { passive: true });
      surface.addEventListener("pointerleave", reset, { passive: true });
      return () => {
        surface.removeEventListener("pointermove", move);
        surface.removeEventListener("pointerleave", reset);
        gsap.killTweensOf(surface);
        surface.classList.remove("three-d-surface");
        gsap.set(surface, { clearProps: "transform,transformPerspective,transformOrigin" });
      };
    });

    return () => cleanups.forEach(cleanup => cleanup());
  }, []);

  return null;
}
