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

//順番に星をつなぐシンプルな線生成
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
      x: entry.starPosition.x * CANVAS_CONSTANTS.STAR_AREA_WIDTH + CANVAS_CONSTANTS.PADDING_X,
      y: entry.starPosition.y * CANVAS_CONSTANTS.STAR_AREA_HEIGHT + CANVAS_CONSTANTS.PADDING_Y_TOP,
      brightness: 200,
      size: 10,
    }));
  }, [entries]);

  const lines = useMemo(() => generateDateOrderLines(stars), [stars]);

  const sketch: Sketch = useMemo(() => {
    return (p: p5) => {
      p.setup = () => {
        p.createCanvas(width, height);
        const dpr = Math.min(2, window.devicePixelRatio);
        p.pixelDensity(dpr);
        p.background('#0b1021');
      };

      let lineProgress = 0; //アニメーションの時間管理

const drawAnimatedLines = () => {
  lineProgress += 0.02;
  lineProgress = Math.min(lineProgress, lines.length);

  const completed = Math.floor(lineProgress);
  const t = lineProgress - completed;

  p.stroke(120, 170, 255);
  p.strokeWeight(2);

  // 完全に描き終わった線
  for (let i = 0; i < completed; i++) {
    const { fromIndex, toIndex } = lines[i];
    const from = stars[fromIndex];
    const to = stars[toIndex];
    p.line(from.x, from.y, to.x, to.y);
  }

  // 今まさに伸びている線（1本だけ）
  if (completed < lines.length) {
    const { fromIndex, toIndex } = lines[completed];
    const from = stars[fromIndex];
    const to = stars[toIndex];

    p.line(
      from.x,
      from.y,
      p.lerp(from.x, to.x, t),
      p.lerp(from.y, to.y, t)
    );
  }
};



      p.draw = () => {
        p.background('#0b1021');
        //星の描画
        drawAnimatedLines();

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
