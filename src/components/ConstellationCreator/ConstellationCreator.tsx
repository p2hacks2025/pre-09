import { useMemo, useState } from 'react';
import type p5 from 'p5';
import { useP5, type Sketch } from '../../hooks/useP5';
import type { Star, ConstellationLine, DiaryEntry } from '../../types';
import { CANVAS_CONSTANTS } from '../../types';
import './ConstellationCreator.css';

interface ConstellationCreatorProps {
  entries: DiaryEntry[];
  onComplete: (name: string, lines: ConstellationLine[]) => void;
  onCancel: () => void;
  width?: number;
  height?: number;
}

// 順番に星をつなぐシンプルな線生成
function generateDateOrderLines(stars: Star[]): ConstellationLine[] {
  const lines: ConstellationLine[] = [];
  for (let i = 0; i < stars.length - 1; i++) {
    lines.push({
      fromIndex: i,
      toIndex: i + 1,
    });
  }
  return lines;
}

export function ConstellationCreator({
  entries,
  onComplete,
  onCancel,
  width = CANVAS_CONSTANTS.CONSTELLATION_WIDTH,
  height = CANVAS_CONSTANTS.CONSTELLATION_HEIGHT,
}: ConstellationCreatorProps) {
  const [constellationName, setConstellationName] = useState('');

  const stars: Star[] = useMemo(() => {
  return entries.map((entry) => ({
    entryId: entry.id!,
    // App.tsx の背景キャンバスと全く同じ計算式を使う
    x: entry.starPosition.x * CANVAS_CONSTANTS.STAR_AREA_WIDTH + CANVAS_CONSTANTS.PADDING_X,
    y: entry.starPosition.y * CANVAS_CONSTANTS.STAR_AREA_HEIGHT + CANVAS_CONSTANTS.PADDING_Y_TOP, // -80を消してAppと合わせる
    brightness: 200,
    size: 10,
  }));
  }, [entries]);

  const lines = useMemo(() => generateDateOrderLines(stars), [stars]);

  // p5 スケッチの定義
  const sketch: Sketch = useMemo(() => {
    return (p: p5) => {
      
      const drawLines = () => {
        // --- アニメーションさせず一気に描く ---
        p.stroke(120, 170, 255);
        p.strokeWeight(2);
        for (const line of lines) {
          const from = stars[line.fromIndex];
          const to = stars[line.toIndex];
          if (from && to) {
            p.line(from.x, from.y, to.x, to.y);
          }
        }
      };

      p.setup = () => {
        p.createCanvas(width, height);
        const dpr = Math.min(2, window.devicePixelRatio);
        p.pixelDensity(dpr);
      };

      p.draw = () => {
        p.background('#0b1021');
        
        // 線の描画
        drawLines();

        // 星本体の描画
        p.noStroke();
        p.fill(255);
        for (const star of stars) {
          p.ellipse(star.x, star.y, Math.max(6, star.size));
        }
      };
    };
  }, [width, height, lines, stars]);

  const containerRef = useP5(sketch);
  const handleComplete = () => {
    const name = constellationName.trim();
    if (!name) {
      alert('星座の名前を入力してください');
      return;
    }
    onComplete(name, lines);
  };

  return (
    <div className="constellation-creator">
      <header className="creator-header">
        <button className="btn-back" onClick={onCancel}>
          ← 戻る
        </button>
        <h1>星座を作成</h1>
      </header>

      <div className="creator-canvas-container">
        <div ref={containerRef} className="creator-canvas" />
      </div>

      <div className="creator-controls">
        <p className="creator-hint">星座に名前をつけましょう</p>
        <input
          type="text"
          className="constellation-name-input"
          placeholder="星座の名前..."
          value={constellationName}
          onChange={(e) => setConstellationName(e.target.value)}
          maxLength={20}
        />
        <button
          className="btn btn-primary"
          onClick={handleComplete}
          disabled={!constellationName.trim()}
        >
          この星座で決定
        </button>
      </div>
    </div>
  );
}

export default ConstellationCreator;