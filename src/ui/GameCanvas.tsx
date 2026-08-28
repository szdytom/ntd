import { useEffect, useRef } from 'react';
import type { GameEngine } from '../game/engine';
import { GameRenderer } from '../game/renderer';

export function GameCanvas({ engine }: { engine: GameEngine }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new GameRenderer(canvas, engine);
    const pointerMove = (event: PointerEvent) => engine.setPointer(renderer.toWorld(event.clientX, event.clientY));
    const pointerLeave = () => engine.setPointer(null);
    const click = (event: MouseEvent) => engine.handleWorldClick(renderer.toWorld(event.clientX, event.clientY));
    canvas.addEventListener('pointermove', pointerMove);
    canvas.addEventListener('pointerleave', pointerLeave);
    canvas.addEventListener('click', click);

    let frameId = 0;
    let previous = performance.now();
    const frame = (now: number): void => {
      const delta = Math.min((now - previous) / 1000, 0.05);
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

  return <canvas ref={canvasRef} id="game-canvas" aria-label="塔防游戏战场" />;
}
