"use client";

import { useEffect, useRef } from "react";

interface SpaceEffectProps {
  enabled: boolean;
}

interface Star {
  x: number;
  y: number;
  z: number;
  prevZ: number;
  size: number;
  brightness: number;
}

/**
 * Immersive space traversal effect with parallax star layers.
 * Stars move toward the viewer creating a warp-like sensation.
 */
export function SpaceEffect({ enabled }: SpaceEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!enabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    let width = 0;
    let height = 0;
    let centerX = 0;
    let centerY = 0;

    const resize = () => {
      width = parent.clientWidth;
      height = parent.clientHeight;
      centerX = width / 2;
      centerY = height / 2;
      canvas.width = width;
      canvas.height = height;
    };
    resize();
    window.addEventListener("resize", resize);

    const stars: Star[] = [];
    const maxStars = 300;
    const maxDepth = 2000;
    const speed = 0.1;
    const spread = 2000;
    const globalOpacity = 0.4;

    const resetStar = (star: Star, initialZ?: number) => {
      star.x = (Math.random() - 0.5) * spread;
      star.y = (Math.random() - 0.5) * spread;
      star.z = initialZ ?? maxDepth;
      star.prevZ = star.z;
      star.size = Math.random() * 2 + 0.5;
      star.brightness = Math.random() * 0.5 + 0.5;
    };

    for (let i = 0; i < maxStars; i++) {
      const star: Star = {
        x: 0,
        y: 0,
        z: 0,
        prevZ: 0,
        size: 0,
        brightness: 0,
      };
      resetStar(star, Math.random() * maxDepth);
      stars.push(star);
    }

    const drawNebula = () => {
      const gradient1 = ctx.createRadialGradient(
        width * 0.2,
        height * 0.3,
        0,
        width * 0.2,
        height * 0.3,
        width * 0.5
      );
      gradient1.addColorStop(0, "rgba(88, 28, 135, 0.04)");
      gradient1.addColorStop(0.5, "rgba(59, 7, 100, 0.02)");
      gradient1.addColorStop(1, "transparent");
      ctx.fillStyle = gradient1;
      ctx.fillRect(0, 0, width, height);

      const gradient2 = ctx.createRadialGradient(
        width * 0.8,
        height * 0.7,
        0,
        width * 0.8,
        height * 0.7,
        width * 0.4
      );
      gradient2.addColorStop(0, "rgba(30, 58, 138, 0.03)");
      gradient2.addColorStop(0.5, "rgba(23, 37, 84, 0.015)");
      gradient2.addColorStop(1, "transparent");
      ctx.fillStyle = gradient2;
      ctx.fillRect(0, 0, width, height);
    };

    const draw = () => {
      ctx.fillStyle = "rgba(3, 7, 18, 1)";
      ctx.fillRect(0, 0, width, height);

      drawNebula();

      for (const star of stars) {
        star.prevZ = star.z;
        star.z -= speed;

        if (star.z <= 1) {
          resetStar(star);
          continue;
        }

        const k = 200;
        const screenX = (star.x / star.z) * k + centerX;
        const screenY = (star.y / star.z) * k + centerY;
        const prevScreenX = (star.x / star.prevZ) * k + centerX;
        const prevScreenY = (star.y / star.prevZ) * k + centerY;

        const depth = 1 - star.z / maxDepth;
        const radius = Math.max(0.5, star.size * depth * 3);

        const fadeIn = Math.min(1, (maxDepth - star.z) / 200);
        const fadeOut = Math.min(1, star.z / 100);
        const alpha =
          depth * star.brightness * fadeIn * fadeOut * globalOpacity;

        if (alpha <= 0.01) continue;

        const hue = 200 + depth * 60;
        const saturation = 15 + depth * 40;
        const lightness = 60 + depth * 35;

        ctx.beginPath();
        ctx.moveTo(prevScreenX, prevScreenY);
        ctx.lineTo(screenX, screenY);

        const gradient = ctx.createLinearGradient(
          prevScreenX,
          prevScreenY,
          screenX,
          screenY
        );
        gradient.addColorStop(
          0,
          `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha * 0.1})`
        );
        gradient.addColorStop(
          1,
          `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`
        );

        ctx.strokeStyle = gradient;
        ctx.lineWidth = radius;
        ctx.lineCap = "round";
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(screenX, screenY, radius * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
        ctx.fill();

        if (depth > 0.7) {
          ctx.beginPath();
          ctx.arc(screenX, screenY, radius * 2, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${
            alpha * 0.08
          })`;
          ctx.fill();
        }
      }
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
  }, [enabled]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-0"
    />
  );
}
