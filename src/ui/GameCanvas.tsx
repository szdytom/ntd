import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GameEngine } from '../game/engine';
import { GameRenderer } from '../game/renderer';
import styles from './GameCanvas.module.css';

export function GameCanvas({ engine, backgroundEngine, suspended = false }: {
  engine: GameEngine;
  backgroundEngine?: GameEngine | undefined;
  suspended?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendererError, setRendererError] = useState<string | null>(null);

  useEffect(() => {
    if (suspended) return undefined;
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
      backgroundEngine?.update(delta);
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
  }, [backgroundEngine, engine, i18n.resolvedLanguage, suspended]);

  if (rendererError) {
    return <div className={styles.error} role="alert">{t('canvas.error', { error: rendererError })}</div>;
  }
  return <canvas ref={canvasRef} className={styles.canvas} id="game-canvas" role="img" aria-label={t('canvas.aria')} />;
}
