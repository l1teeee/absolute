"use client";

import { useEffect, useRef } from "react";
import {
  PixelBurstEngine,
  TICKS_PER_SECOND,
} from "./engine/pixelBurstEngine";
import { CanvasRenderer, cellDevicePixels } from "./render/canvasRenderer";
import { GalaxyRenderer } from "./render/galaxyRenderer";
import { ChargeTracker } from "./interaction/chargeTracker";
import { ChargeOverlayRenderer } from "./render/chargeOverlay";
import { ScreenEffects } from "./render/screenEffects";
import type { EngineEvent } from "./engine/engineEvents";

const STEP_MS = 1000 / TICKS_PER_SECOND;
const MAX_FRAME_GAP_MS = 250;
const MAX_TICKS_PER_FRAME = 8;
const RESIZE_DEBOUNCE_MS = 150;
const INITIAL_SETTLE_TICKS = 20000;
const CLICK_SETTLE_TICKS = 5000;

export default function PixelBurst() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const galaxyRef = useRef<HTMLCanvasElement | null>(null);
  const effectsRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const flashRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const galaxyCanvas = galaxyRef.current;
    const effectsCanvas = effectsRef.current;
    const overlayCanvas = overlayRef.current;
    const stage = stageRef.current;
    const flash = flashRef.current;
    if (!container || !galaxyCanvas || !effectsCanvas || !overlayCanvas || !stage || !flash) {
      return;
    }

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let engine: PixelBurstEngine | null = null;
    let renderer: CanvasRenderer | null = null;
    let galaxy: GalaxyRenderer | null = null;
    let overlay: ChargeOverlayRenderer | null = null;
    const tracker = new ChargeTracker();
    const effects = new ScreenEffects(stage, flash);
    let activePointerId: number | null = null;
    let pressStart = 0;
    let currentCols = 0;
    let currentRows = 0;
    let currentCellPx = 0;
    let cssCell = 0;
    let tickCount = 0;

    const build = () => {
      const cssWidth = container.clientWidth;
      const cssHeight = container.clientHeight;
      if (cssWidth === 0 || cssHeight === 0) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cellPx = cellDevicePixels(dpr);
      cssCell = cellPx / dpr;
      const cols = Math.ceil(cssWidth / cssCell);
      const rows = Math.ceil(cssHeight / cssCell);

      if (
        cols === currentCols &&
        rows === currentRows &&
        cellPx === currentCellPx &&
        engine !== null &&
        renderer !== null &&
        galaxy !== null
      ) {
        return;
      }

      currentCols = cols;
      currentRows = rows;
      currentCellPx = cellPx;

      const seed = crypto.getRandomValues(new Uint32Array(1))[0];
      engine = new PixelBurstEngine(cols, rows, seed);
      renderer = new CanvasRenderer(effectsCanvas, cols, rows, cellPx);
      galaxy = new GalaxyRenderer(galaxyCanvas, cols, rows, cellPx, (seed ^ 0x9e3779b9) >>> 0);
      overlay = new ChargeOverlayRenderer(overlayCanvas, cols, rows, cellPx);
      tracker.cancel();
      activePointerId = null;
      effects.reset();
      for (const canvas of [galaxyCanvas, effectsCanvas, overlayCanvas]) {
        canvas.style.width = `${(cols * cellPx) / dpr}px`;
        canvas.style.height = `${(rows * cellPx) / dpr}px`;
      }
      tickCount = 0;

      if (reducedMotion) {
        engine.settle(INITIAL_SETTLE_TICKS);
      }

      galaxy.drawAll();
      renderer.drawAll(engine.grid);
    };

    const pointerTarget = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const col = Math.floor((event.clientX - rect.left) / cssCell);
      const row = Math.floor((event.clientY - rect.top) / cssCell);
      return { col, row };
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || !engine || !renderer || tracker.isActive) return;
      container.setPointerCapture(event.pointerId);
      activePointerId = event.pointerId;
      pressStart = performance.now();
      const { col, row } = pointerTarget(event);
      tracker.start(col, row);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerId !== activePointerId) return;
      if (!tracker.isActive) return;
      const { col, row } = pointerTarget(event);
      tracker.move(col, row);
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (event.pointerId !== activePointerId) return;
      if (!engine || !renderer) return;
      if (reducedMotion) {
        tracker.advance(Math.round((performance.now() - pressStart) / STEP_MS));
      }
      const release = tracker.release();
      activePointerId = null;
      if (!release) return;
      if (release.kind === "tap") {
        engine.click(release.col, release.row);
      } else {
        engine.launchCharged(release.col, release.row, release.charge);
      }
      if (reducedMotion) {
        engine.settle(CLICK_SETTLE_TICKS);
        renderer.drawDirty(engine.grid);
        engine.drainEvents();
      }
    };

    const handlePointerCancel = (event: PointerEvent) => {
      if (event.pointerId !== activePointerId) return;
      tracker.cancel();
      activePointerId = null;
      overlay?.clear();
    };

    const handleContextMenu = (event: MouseEvent) => event.preventDefault();

    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
    const resizeObserver = new ResizeObserver(() => {
      if (resizeTimeout !== null) {
        clearTimeout(resizeTimeout);
      }
      resizeTimeout = setTimeout(() => {
        resizeTimeout = null;
        build();
      }, RESIZE_DEBOUNCE_MS);
    });

    container.addEventListener("pointerdown", handlePointerDown);
    container.addEventListener("pointermove", handlePointerMove);
    container.addEventListener("pointerup", handlePointerUp);
    container.addEventListener("pointercancel", handlePointerCancel);
    container.addEventListener("lostpointercapture", handlePointerCancel);
    container.addEventListener("contextmenu", handleContextMenu);
    resizeObserver.observe(container);
    build();

    let rafId: number | null = null;
    if (!reducedMotion) {
      let lastTime: number | null = null;
      let accumulator = 0;

      const frame = (now: number) => {
        const dt =
          lastTime === null
            ? 0
            : Math.min(now - lastTime, MAX_FRAME_GAP_MS);
        lastTime = now;
        accumulator += dt;

        if (engine && renderer && galaxy) {
          let ticksThisFrame = 0;
          while (
            accumulator >= STEP_MS &&
            ticksThisFrame < MAX_TICKS_PER_FRAME
          ) {
            engine.tick();
            tickCount += 1;
            accumulator -= STEP_MS;
            ticksThisFrame += 1;
          }
          if (ticksThisFrame === MAX_TICKS_PER_FRAME) {
            accumulator = 0;
          }
          tracker.advance(ticksThisFrame);
          if (tracker.isCharging) {
            overlay?.draw({ ...tracker.target, level: tracker.level, tick: tickCount });
          } else {
            overlay?.clear();
          }
          for (const event of engine.drainEvents() as EngineEvent[]) {
            if (event.type === "heavyLaunch") effects.heavyLaunch();
            if (event.type === "heavyImpact") effects.heavyImpact(event.strength);
          }
          effects.update(ticksThisFrame, cssCell);
          renderer.drawDirty(engine.grid);
          galaxy.update(tickCount);
        }

        rafId = requestAnimationFrame(frame);
      };

      rafId = requestAnimationFrame(frame);
    }

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      if (resizeTimeout !== null) {
        clearTimeout(resizeTimeout);
      }
      resizeObserver.disconnect();
      container.removeEventListener("pointerdown", handlePointerDown);
      container.removeEventListener("pointermove", handlePointerMove);
      container.removeEventListener("pointerup", handlePointerUp);
      container.removeEventListener("pointercancel", handlePointerCancel);
      container.removeEventListener("lostpointercapture", handlePointerCancel);
      container.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={
        "Galaxia de píxeles. Haz clic para lanzar misiles; " +
        "mantén presionado para cargar un misil potente."
      }
      className="relative h-full w-full cursor-crosshair touch-none select-none overflow-hidden"
    >
      <div ref={stageRef} className="absolute inset-0">
        <canvas ref={galaxyRef} className="pointer-events-none absolute left-0 top-0 [image-rendering:pixelated]" />
        <canvas ref={effectsRef} className="pointer-events-none absolute left-0 top-0 [image-rendering:pixelated]" />
        <canvas ref={overlayRef} className="pointer-events-none absolute left-0 top-0 [image-rendering:pixelated]" />
      </div>
      <div ref={flashRef} className="pointer-events-none absolute inset-0 bg-white opacity-0" />
    </div>
  );
}
