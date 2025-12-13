"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface SynthwaveEffectProps {
  enabled: boolean;
}

/**
 * Synthwave/retrowave effect with neon grid and horizon sun.
 * Subtle 80s aesthetic with slow-moving perspective grid.
 * Respects prefers-reduced-motion accessibility setting.
 */
export function SynthwaveEffect({ enabled }: SynthwaveEffectProps) {
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

    let gridOffset = 0;
    const gridSpeed = 0.01;
    const globalOpacity = 0.4;

    const drawSkyGradient = () => {
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, "#0a0010");
      gradient.addColorStop(0.4, "#1a0a2e");
      gradient.addColorStop(0.6, "#2d1b4e");
      gradient.addColorStop(0.75, "#1a0a2e");
      gradient.addColorStop(1, "#0a0010");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    };

    const drawSun = () => {
      const horizonY = height * 0.65;
      const sunRadius = Math.min(width, height) * 0.1;
      const sunX = width * 0.5;
      const sunY = horizonY - sunRadius - sunRadius * 0.15;

      const glowGradient = ctx.createRadialGradient(
        sunX,
        sunY,
        sunRadius * 0.5,
        sunX,
        sunY,
        sunRadius * 3
      );
      glowGradient.addColorStop(
        0,
        `rgba(255, 100, 150, ${0.2 * globalOpacity})`
      );
      glowGradient.addColorStop(
        0.4,
        `rgba(255, 50, 100, ${0.1 * globalOpacity})`
      );
      glowGradient.addColorStop(1, "transparent");
      ctx.fillStyle = glowGradient;
      ctx.fillRect(0, 0, width, height);

      const sunGradient = ctx.createLinearGradient(
        sunX,
        sunY - sunRadius,
        sunX,
        sunY + sunRadius
      );
      sunGradient.addColorStop(
        0,
        `rgba(255, 220, 100, ${0.8 * globalOpacity})`
      );
      sunGradient.addColorStop(
        0.5,
        `rgba(255, 120, 80, ${0.7 * globalOpacity})`
      );
      sunGradient.addColorStop(1, `rgba(255, 50, 120, ${0.6 * globalOpacity})`);

      ctx.beginPath();
      ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
      ctx.fillStyle = sunGradient;
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
      ctx.clip();

      ctx.fillStyle = "#0a0010";
      const stripeCount = 5;
      const stripeSpacing = sunRadius * 0.22;
      const stripeHeight = sunRadius * 0.08;

      for (let i = 0; i < stripeCount; i++) {
        const y = sunY + sunRadius * 0.1 + i * stripeSpacing;
        ctx.fillRect(sunX - sunRadius, y, sunRadius * 2, stripeHeight + i * 2);
      }

      ctx.restore();
    };

    const drawGrid = () => {
      const horizonY = height * 0.65;
      const gridHeight = height - horizonY;
      const sunRadius = Math.min(width, height) * 0.12;
      const sunX = width * 0.5;
      const gridStartWidth = sunRadius;
      const sunLeftEdge = sunX - gridStartWidth / 2;
      const sunRightEdge = sunX + gridStartWidth / 2;
      const screenOverflow = width * 0.15;

      ctx.save();

      const fadeGradient = ctx.createLinearGradient(0, horizonY, 0, height);
      fadeGradient.addColorStop(
        0,
        `rgba(255, 0, 200, ${0.02 * globalOpacity})`
      );
      fadeGradient.addColorStop(
        0.3,
        `rgba(255, 0, 200, ${0.15 * globalOpacity})`
      );
      fadeGradient.addColorStop(
        1,
        `rgba(100, 0, 255, ${0.25 * globalOpacity})`
      );
      ctx.fillStyle = fadeGradient;
      ctx.fillRect(0, horizonY, width, gridHeight);

      ctx.strokeStyle = `rgba(255, 0, 200, ${0.3 * globalOpacity})`;
      ctx.lineWidth = 1;

      const verticalLines = 20;

      for (let i = -verticalLines; i <= verticalLines; i++) {
        const t = (i + verticalLines) / (verticalLines * 2);
        const startX = sunLeftEdge + t * (sunRightEdge - sunLeftEdge);
        const endX = -screenOverflow + t * (width + screenOverflow * 2);

        ctx.beginPath();
        ctx.moveTo(startX, horizonY);
        ctx.lineTo(endX, height);
        ctx.stroke();
      }

      const horizontalLines = 15;
      gridOffset = (gridOffset + gridSpeed) % 100;

      for (let i = 0; i <= horizontalLines; i++) {
        const progress = (i / horizontalLines + gridOffset / 100) % 1;
        const perspectiveY = horizonY + Math.pow(progress, 2) * gridHeight;

        if (perspectiveY > horizonY) {
          const alpha = Math.pow(progress, 1.5) * 0.3 * globalOpacity;
          ctx.strokeStyle = `rgba(0, 255, 255, ${alpha})`;
          ctx.lineWidth = 1 + progress * 1.5;

          ctx.beginPath();
          ctx.moveTo(0, perspectiveY);
          ctx.lineTo(width, perspectiveY);
          ctx.stroke();
        }
      }

      ctx.restore();
    };

    const drawStars = () => {
      const horizonY = height * 0.65;

      ctx.fillStyle = `rgba(255, 255, 255, ${0.4 * globalOpacity})`;
      const starPositions = [
        { x: 0.1, y: 0.1 },
        { x: 0.25, y: 0.2 },
        { x: 0.4, y: 0.08 },
        { x: 0.55, y: 0.15 },
        { x: 0.7, y: 0.05 },
        { x: 0.85, y: 0.18 },
        { x: 0.15, y: 0.35 },
        { x: 0.3, y: 0.45 },
        { x: 0.6, y: 0.4 },
        { x: 0.8, y: 0.3 },
        { x: 0.05, y: 0.5 },
        { x: 0.95, y: 0.55 },
      ];

      for (const star of starPositions) {
        const y = star.y * horizonY;
        ctx.beginPath();
        ctx.arc(star.x * width, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const draw = () => {
      drawSkyGradient();
      drawStars();
      drawSun();
      drawGrid();
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
            "linear-gradient(to bottom, " +
            "#0a0010 0%, #1a0a2e 40%, #2d1b4e 60%, " +
            "rgba(255, 100, 150, 0.1) 75%, #0a0010 100%)",
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
