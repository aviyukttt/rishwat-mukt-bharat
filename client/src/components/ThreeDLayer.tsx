import { useEffect } from "react";
import gsap from "gsap";

const SELECTOR = ".hero-panel, .form-card, .officer-card, .officer-result, .info-card, .agency-card, .aside-card, .education-card";

export default function ThreeDLayer() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const surfaces = Array.from(document.querySelectorAll<HTMLElement>(SELECTOR));
    const cleanups = surfaces.map(surface => {
      surface.classList.add("three-d-surface");
      const move = (event: PointerEvent) => {
        const rect = surface.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        gsap.to(surface, { rotateY: x * 5, rotateX: y * -5, z: 14, duration: .35, ease: "power2.out", overwrite: "auto" });
      };
      const leave = () => gsap.to(surface, { rotateY: 0, rotateX: 0, z: 0, duration: .65, ease: "elastic.out(1, .65)", overwrite: "auto" });
      surface.addEventListener("pointermove", move);
      surface.addEventListener("pointerleave", leave);
      return () => { surface.removeEventListener("pointermove", move); surface.removeEventListener("pointerleave", leave); gsap.killTweensOf(surface); };
    });
    return () => cleanups.forEach(cleanup => cleanup());
  }, []);

  return null;
}
