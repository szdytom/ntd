import { useEffect, useRef, useState } from 'react';
import type { GameEngine } from '../game/engine';
import { GameRenderer } from '../game/renderer';

export function GameCanvas({ engine }: { engine: GameEngine }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendererError, setRendererError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: GameRenderer;
    try {
      renderer = new GameRenderer(canvas, engine);
    } catch (error) {
      setRendererError(error instanceof Error ? error.message : 'Renderer initialization failed');
      return;
    }
    const pointerMove = (event: PointerEvent) => engine.setPointer(renderer.toWorld(event.clientX, event.clientY));
    const pointerLeave = () => engine.setPointer(null);
    const click = (event: MouseEvent) => engine.handleWorldClick(renderer.toWorld(event.clientX, event.clientY));
    canvas.addEventListener('pointermove', pointerMove);
    canvas.addEventListener('pointerleave', pointerLeave);
    canvas.addEventListener('click', click);

    let frameId = 0;
    let previous = performance.now();
    const frame = (now: number): void => {
      const delta = (now - previous) / 1000;
      previous = now;
      engine.update(delta);
      renderer.render();
      frameId = requestAnimationFrame(frame);
    };
    frameId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(frameId);
      canvas.removeEventListener('pointermove', pointerMove);
      canvas.removeEventListener('pointerleave', pointerLeave);
      canvas.removeEventListener('click', click);
      renderer.dispose();
    };
  }, [engine]);

  if (rendererError) {
    return <div className="renderer-error" role="alert">图形渲染器无法启动：{rendererError}</div>;
  }
  return <canvas ref={canvasRef} id="game-canvas" aria-label="塔防游戏战场" />;
}
