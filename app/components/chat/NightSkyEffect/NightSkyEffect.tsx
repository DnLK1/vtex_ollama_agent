"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface NightSkyEffectProps {
  enabled: boolean;
}

interface Star {
  angle: number;
  distance: number;
  size: number;
  brightness: number;
  speed: number;
  twinkleOffset: number;
}

interface Tree {
  x: number;
  height: number;
}

/**
 * Night sky effect with rotating stars and landscape silhouette.
 * Simulates Earth's rotation with stars circling around the celestial pole.
 * Respects prefers-reduced-motion accessibility setting.
 */
export function NightSkyEffect({ enabled }: NightSkyEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!enabled || prefersReducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    let width = 0;
    let height = 0;

    const resize = () => {
      width = parent.clientWidth;
      height = parent.clientHeight;
      canvas.width = width;
      canvas.height = height;
    };
    resize();
    window.addEventListener("resize", resize);

    const stars: Star[] = [];
    const maxStars = 650;
    const rotationSpeed = 0.00008;
    const globalOpacity = 0.5;

    for (let i = 0; i < maxStars; i++) {
      stars.push({
        angle: Math.random() * Math.PI * 2,
        distance: Math.random() * Math.max(width, height) * 1.2 + 30,
        size: Math.random() * 1.5 + 0.5,
        brightness: Math.random() * 0.6 + 0.4,
        speed: 1 + Math.random() * 0.1 - 0.05,
        twinkleOffset: Math.random() * Math.PI * 2,
      });
    }

    const trees: Tree[] = [
      { x: 0.03, height: 0.07 },
      { x: 0.08, height: 0.09 },
      { x: 0.14, height: 0.065 },
      { x: 0.38, height: 0.08 },
      { x: 0.44, height: 0.06 },
      { x: 0.5, height: 0.075 },
      { x: 0.78, height: 0.085 },
      { x: 0.85, height: 0.065 },
      { x: 0.92, height: 0.08 },
      { x: 0.97, height: 0.055 },
    ];

    const getPolePosition = () => ({
      x: width * 0.5,
      y: height * 0.88,
    });

    const drawSkyGradient = () => {
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, "#0a0a1a");
      gradient.addColorStop(0.3, "#0d1025");
      gradient.addColorStop(0.6, "#111428");
      gradient.addColorStop(1, "#151830");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    };

    const drawLandscape = () => {
      const landscapeHeight = height * 0.08;
      const baseY = height - landscapeHeight;

      ctx.fillStyle = "#0a0c12";
      ctx.beginPath();
      ctx.moveTo(0, height);

      const points = [
        { x: 0, y: baseY + landscapeHeight * 0.2 },
        { x: width * 0.1, y: baseY + landscapeHeight * 0.15 },
        { x: width * 0.2, y: baseY + landscapeHeight * 0.25 },
        { x: width * 0.3, y: baseY + landscapeHeight * 0.1 },
        { x: width * 0.4, y: baseY + landscapeHeight * 0.2 },
        { x: width * 0.5, y: baseY + landscapeHeight * 0.15 },
        { x: width * 0.6, y: baseY + landscapeHeight * 0.25 },
        { x: width * 0.7, y: baseY + landscapeHeight * 0.1 },
        { x: width * 0.8, y: baseY + landscapeHeight * 0.2 },
        { x: width * 0.9, y: baseY + landscapeHeight * 0.15 },
        { x: width, y: baseY + landscapeHeight * 0.2 },
      ];

      for (const point of points) {
        ctx.lineTo(point.x, point.y);
      }

      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();

      for (const tree of trees) {
        drawTree(width * tree.x, height, height * tree.height);
      }
    };

    const drawTree = (x: number, baseY: number, treeHeight: number) => {
      ctx.fillStyle = "#050608";

      ctx.beginPath();
      ctx.moveTo(x, baseY);
      ctx.lineTo(x - treeHeight * 0.25, baseY);
      ctx.lineTo(x, baseY - treeHeight);
      ctx.lineTo(x + treeHeight * 0.25, baseY);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(x, baseY - treeHeight * 0.3);
      ctx.lineTo(x - treeHeight * 0.2, baseY - treeHeight * 0.3);
      ctx.lineTo(x, baseY - treeHeight * 1.15);
      ctx.lineTo(x + treeHeight * 0.2, baseY - treeHeight * 0.3);
      ctx.closePath();
      ctx.fill();
    };

    const drawStars = () => {
      const pole = getPolePosition();
      const now = Date.now();

      for (const star of stars) {
        star.angle += rotationSpeed * star.speed;

        const x = pole.x + Math.cos(star.angle) * star.distance;
        const y = pole.y + Math.sin(star.angle) * star.distance;

        if (y > height * 0.92) continue;

        const distFromPole = star.distance / (Math.max(width, height) * 1.2);
        const alpha =
          star.brightness * globalOpacity * (0.5 + distFromPole * 0.5);

        const twinkle =
          Math.sin(now * 0.0015 + star.twinkleOffset) * 0.18 + 0.82;
        const finalAlpha = alpha * twinkle;

        const hue = 200 + star.twinkleOffset * 6;
        const sat = 10 + distFromPole * 20;
        const light = 80 + distFromPole * 15;

        ctx.beginPath();
        ctx.arc(x, y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, ${sat}%, ${light}%, ${finalAlpha})`;
        ctx.fill();

        if (star.size > 1.2 && finalAlpha > 0.3) {
          ctx.beginPath();
          ctx.arc(x, y, star.size * 2, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${hue}, ${sat}%, ${light}%, ${
            finalAlpha * 0.1
          })`;
          ctx.fill();
        }
      }
    };

    const draw = () => {
      drawSkyGradient();
      drawStars();
      drawLandscape();
    };

    let animationId: number;
    const animate = () => {
      draw();
      animationId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, [enabled, prefersReducedMotion]);

  if (prefersReducedMotion && enabled) {
    return (
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background:
            "linear-gradient(to bottom, #0a0a1a 0%, #0d1025 30%, #111428 60%, #151830 100%)",
        }}
      />
    );
  }

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-0"
    />
  );
}
