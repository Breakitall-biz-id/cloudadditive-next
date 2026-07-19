"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

export function AdminDashboardMotion({ children }: { children: React.ReactNode }) {
  const container = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });

      timeline.fromTo(
        "[data-admin-reveal]",
        { autoAlpha: 0, y: 14 },
        { autoAlpha: 1, y: 0, duration: 0.55, stagger: 0.055, clearProps: "transform,opacity,visibility" }
      );

      timeline.fromTo(
        "[data-slot=chart]",
        { autoAlpha: 0, scale: 0.985, transformOrigin: "center bottom" },
        { autoAlpha: 1, scale: 1, duration: 0.55, clearProps: "transform,opacity,visibility" },
        "-=0.35"
      );
    },
    { scope: container }
  );

  return <div ref={container}>{children}</div>;
}
