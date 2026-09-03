import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GameRenderer } from '../game/renderer';
import type { ThoughtSceneDirector } from '../thoughts';
import styles from './ThoughtCanvas.module.css';

const THOUGHT_RENDERER_OPTIONS = {
  showDecorations: false,
  showTowerPads: true,
  showSelection: false,
  showTowerLabels: false,
  showCore: false,
} as const;

export function ThoughtCanvas({ director }: { director: ThoughtSceneDirector }) {
  const { t, i18n } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let renderer: GameRenderer;
    try {
      renderer = new GameRenderer(canvas, director.runtime.world, {
        ...THOUGHT_RENDERER_OPTIONS,
        camera: director.definition.scene?.camera ?? { center: { x: 465, y: 530 }, height: 240 },
        towerColor: director.definition.accent,
        getPresentation: director.getRenderPresentation,
        showPathMarkers: false,
        showFloatingText: false,
        groundPattern: 'grid',
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Renderer initialization failed');
      return undefined;
    }
    let frame = 0;
    let previous = performance.now();
    const draw = (now: number): void => {
      const delta = Math.min(0.1, Math.max(0, (now - previous) / 1000));
      previous = now;
      director.update(delta);
      renderer.render();
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      renderer.dispose();
    };
  }, [director, i18n.resolvedLanguage]);

  if (error) return <div className={styles.error} role="alert">{t('canvas.error', { error })}</div>;
  return <canvas ref={canvasRef} className={styles.canvas} role="img" aria-label={t('thoughtIndex.canvasAria')} />;
}
