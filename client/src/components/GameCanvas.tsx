/**
 * Noir Emerald Arena — host React minimale.
 * Il canvas è full-screen; motore, scena e gameplay vengono creati una sola volta
 * e distrutti con listener e render loop quando il componente viene smontato.
 */

import { useEffect, useRef, useState } from "react";
import { Engine } from "@babylonjs/core/Engines/engine";
import { createGameScene, type GameHandle } from "@/game/scene";

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startedRef = useRef(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || startedRef.current) return;
    startedRef.current = true;
    const engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      adaptToDeviceRatio: true,
    });
    let handle: GameHandle | null = null;
    let cancelled = false;
    createGameScene(engine, canvas).then(game => {
      if (cancelled) {
        game.dispose();
        return;
      }
      handle = game;
      engine.runRenderLoop(() => game.scene.render());
      setLoading(false);
    });
    let resizeFrame = 0;
    const onResize = () => {
      const viewport = window.visualViewport;
      const visibleHeight = Math.round(viewport?.height ?? window.innerHeight);
      const visibleWidth = Math.round(viewport?.width ?? window.innerWidth);
      document.documentElement.style.setProperty(
        "--sanzy-viewport-height",
        `${visibleHeight}px`
      );
      document.documentElement.style.setProperty(
        "--sanzy-viewport-width",
        `${visibleWidth}px`
      );
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => engine.resize());
    };
    onResize();
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    return () => {
      cancelled = true;
      cancelAnimationFrame(resizeFrame);
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
      document.documentElement.style.removeProperty("--sanzy-viewport-height");
      document.documentElement.style.removeProperty("--sanzy-viewport-width");
      engine.stopRenderLoop();
      handle?.dispose();
      engine.dispose();
      startedRef.current = false;
    };
  }, []);

  return (
    <main className="sanzy-game-shell">
      <canvas ref={canvasRef} className="sanzy-game-canvas" />
      {loading && (
        <div className="sanzy-loader" role="status" aria-live="polite">
          <span className="sanzy-loader-mark" />
          <strong>SANZY POKER</strong>
          <small>Preparazione del tavolo…</small>
        </div>
      )}
    </main>
  );
}
