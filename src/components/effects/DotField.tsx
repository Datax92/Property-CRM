"use client";

import React, { useEffect, useRef } from "react";

const hexToRgb = (hex: string) => {
  const h = hex.replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const num = parseInt(v.slice(0, 6), 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
};

interface DotFieldProps {
  /** Distance between dots, in px. */
  gap?: number;
  /** Colour of the resting dots. */
  color?: string;
  /** Colour the dots take near the cursor. */
  accent?: string;
  /** How far from the cursor dots react, in px. */
  radius?: number;
  dotOpacity?: number;
  className?: string;
}

/** A fine dot grid that fills its positioned parent; dots near the cursor swell and take
    the accent colour, and a click sends a ring outwards. Pointer events pass through. */
export default function DotField({
  gap = 14,
  color = "#111827",
  accent = "#1F2456",
  radius = 150,
  dotOpacity = 0.055,
  className = "",
}: DotFieldProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    const canvas = canvasRef.current;
    if (!box || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const [br, bg, bb] = hexToRgb(color);
    const [ar, ag, ab] = hexToRgb(accent);
    const HOLD = 120, FADE = 700, RING_SPEED = 520, REST = 0.9;

    let w = 0, h = 0, cols = 0, rows = 0;
    let energy = new Float32Array(0);
    let touched = new Float64Array(0);
    let base: HTMLCanvasElement | null = null;
    const rings: { x: number; y: number; t0: number }[] = [];
    let raf = 0, running = false, last = 0;

    const rebuild = () => {
      w = box.offsetWidth;
      h = box.offsetHeight;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / gap) + 1;
      rows = Math.ceil(h / gap) + 1;
      energy = new Float32Array(cols * rows);
      touched = new Float64Array(cols * rows);

      // The resting grid never changes, so it is painted once and reused every frame.
      base = document.createElement("canvas");
      base.width = canvas.width;
      base.height = canvas.height;
      const b = base.getContext("2d");
      if (!b) return;
      b.setTransform(dpr, 0, 0, dpr, 0, 0);
      b.fillStyle = `rgba(${br}, ${bg}, ${bb}, ${dotOpacity})`;
      b.beginPath();
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * gap + gap / 2, y = r * gap + gap / 2;
          b.moveTo(x + REST, y);
          b.arc(x, y, REST, 0, Math.PI * 2);
        }
      }
      b.fill();
    };

    /** Raise the dots around a point; `ring` limits it to a band at that distance. */
    const excite = (px: number, py: number, reach: number, now: number, ring?: number) => {
      const c0 = Math.max(0, Math.floor((px - reach) / gap)), c1 = Math.min(cols - 1, Math.ceil((px + reach) / gap));
      const r0 = Math.max(0, Math.floor((py - reach) / gap)), r1 = Math.min(rows - 1, Math.ceil((py + reach) / gap));
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          const d = Math.hypot(c * gap + gap / 2 - px, r * gap + gap / 2 - py);
          let level: number;
          if (ring == null) {
            if (d > reach) continue;
            const t = 1 - d / reach;
            level = t * t * (3 - 2 * t);
          } else {
            const off = Math.abs(d - ring);
            if (off > gap * 1.5) continue;
            level = 0.75 * (1 - off / (gap * 1.5));
          }
          const i = r * cols + c;
          if (level > energy[i]) energy[i] = level;
          touched[i] = now;
        }
      }
    };

    const draw = (now: number) => {
      const dt = Math.min(now - last, 50);
      last = now;
      ctx.clearRect(0, 0, w, h);
      if (base) ctx.drawImage(base, 0, 0, w, h);

      for (let i = rings.length - 1; i >= 0; i--) {
        const reach = ((now - rings[i].t0) / 1000) * RING_SPEED;
        if (reach > 460) rings.splice(i, 1);
        else excite(rings[i].x, rings[i].y, reach + gap * 2, now, reach);
      }

      let alive = rings.length > 0;
      const step = dt / FADE;
      for (let i = 0; i < energy.length; i++) {
        let e = energy[i];
        if (e <= 0) continue;
        if (now - touched[i] > HOLD) {
          e = Math.max(0, e - step);
          energy[i] = e;
          if (e <= 0) continue;
        }
        alive = true;
        const x = (i % cols) * gap + gap / 2, y = Math.floor(i / cols) * gap + gap / 2;
        ctx.fillStyle = `rgba(${ar}, ${ag}, ${ab}, ${0.07 + e * 0.28})`;
        ctx.beginPath();
        ctx.arc(x, y, REST + e * 2.1, 0, Math.PI * 2);
        ctx.fill();
      }

      if (alive) raf = requestAnimationFrame(draw);
      else running = false;
    };

    const wake = () => {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(draw);
    };

    const local = (e: PointerEvent): [number, number] => {
      const r = canvas.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    };
    const onMove = (e: PointerEvent) => {
      const [x, y] = local(e);
      excite(x, y, radius, performance.now());
      wake();
    };
    const onDown = (e: PointerEvent) => {
      const [x, y] = local(e);
      rings.push({ x, y, t0: performance.now() });
      wake();
    };

    const ro = new ResizeObserver(() => {
      rebuild();
      wake();
    });
    ro.observe(box);
    rebuild();
    wake();

    if (!still) {
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerdown", onDown);
    }
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [gap, color, accent, radius, dotOpacity]);

  return (
    <div ref={boxRef} className={`dotfield${className ? ` ${className}` : ""}`} aria-hidden="true" data-noprint="1">
      <canvas ref={canvasRef} />
    </div>
  );
}
