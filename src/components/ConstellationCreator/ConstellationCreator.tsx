import { useState, useEffect, useMemo, useRef } from 'react';
import type p5 from 'p5';
import { useP5, type Sketch } from '../../hooks/useP5';
import type { Star, ConstellationLine, DiaryEntry } from '../../types';
import './ConstellationCreator.css';

interface ConstellationCreatorProps {
  /** 星座に使用する日記エントリ（7件） */
  entries: DiaryEntry[];
  /** 星座作成完了時のコールバック */
  onComplete: (name: string, lines: ConstellationLine[]) => void;
  /** キャンセル時のコールバック */
  onCancel: () => void;
  /** キャンバスの幅 */
  width?: number;
  /** キャンバスの高さ */
  height?: number;
}

/**
 * 最近傍法で星を結ぶ線を自動生成する
 */
function generateNearestNeighborLines(stars: Star[]): ConstellationLine[] {
  if (stars.length < 2) return [];

  const lines: ConstellationLine[] = [];
  const visited = new Set<number>();
  
  // 最初の星から開始
  let currentIndex = 0;
  visited.add(currentIndex);

  while (visited.size < stars.length) {
    const current = stars[currentIndex];
    let nearestIndex = -1;
    let nearestDist = Infinity;

    // 未訪問の星の中から最も近いものを探す
    for (let i = 0; i < stars.length; i++) {
      if (visited.has(i)) continue;
      
      const star = stars[i];
      const dist = Math.sqrt(
        Math.pow(star.x - current.x, 2) + Math.pow(star.y - current.y, 2)
      );

      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIndex = i;
      }
    }

    if (nearestIndex !== -1) {
      lines.push({ fromIndex: currentIndex, toIndex: nearestIndex });
      visited.add(nearestIndex);
      currentIndex = nearestIndex;
    }
  }

  return lines;
}

/**
 * 星座作成コンポーネント
 * 7つの星を最近傍法で自動的に線で結び、ユーザーが名前をつける
 */
export function ConstellationCreator({
  entries,
  onComplete,
  onCancel,
  width = 400,
  height = 400,
}: ConstellationCreatorProps) {
  const [constellationName, setConstellationName] = useState('');
  const [isAnimating, setIsAnimating] = useState(true);

  // エントリから星データを生成（キャンバス内に収まるように配置）
  const stars: Star[] = useMemo(() => {
    const padding = 60;
    const availableWidth = width - padding * 2;
    const availableHeight = height - padding * 2;

    return entries.map((entry, index) => ({
      entryId: entry.id!,
      x: entry.starPosition.x * availableWidth + padding,
      y: entry.starPosition.y * availableHeight + padding,
      brightness: 200,
      size: 10,
    }));
  }, [entries, width, height]);

  // 最近傍法で線を自動生成
  const lines = useMemo(() => generateNearestNeighborLines(stars), [stars]);

  // アニメーション状態
  const animationProgressRef = useRef(0);
  const linesRef = useRef(lines);
  const starsRef = useRef(stars);

  useEffect(() => {
    linesRef.current = lines;
    starsRef.current = stars;
  }, [lines, stars]);

  // p5.js スケッチ
  const sketch: Sketch = useMemo(() => {
    return (p: p5) => {
      // 背景の装飾用小星
      const bgStars: { x: number; y: number; size: number; twinkle: number }[] = [];
      
      // 線描画アニメーション用
      let lineAnimProgress = 0;
      const LINE_ANIM_SPEED = 0.02;

      p.setup = () => {
        p.createCanvas(width, height);
        p.pixelDensity(Math.min(2, window.devicePixelRatio));

        // 背景の装飾用小星を生成
        for (let i = 0; i < 100; i++) {
          bgStars.push({
            x: p.random(width),
            y: p.random(height),
            size: p.random(0.5, 2),
            twinkle: p.random(1000, 3000),
          });
        }
      };

      p.draw = () => {
        const currentStars = starsRef.current;
        const currentLines = linesRef.current;

        // 背景
        p.background('#0a0a20');

        // 装飾用の小さな星を描画（瞬き効果）
        p.noStroke();
        for (const bgStar of bgStars) {
          const alpha = p.map(
            p.sin((p.millis() / bgStar.twinkle) * p.TWO_PI),
            -1,
            1,
            60,
            200
          );
          p.fill(255, 255, 255, alpha);
          p.ellipse(bgStar.x, bgStar.y, bgStar.size);
        }

        // 線のアニメーション進行
        if (lineAnimProgress < currentLines.length) {
          lineAnimProgress += LINE_ANIM_SPEED;
        } else {
          setIsAnimating(false);
        }
        animationProgressRef.current = lineAnimProgress;

        // 星座の線を描画（アニメーション付き）
        for (let i = 0; i < currentLines.length; i++) {
          const line = currentLines[i];
          const from = currentStars[line.fromIndex];
          const to = currentStars[line.toIndex];
          
          if (!from || !to) continue;

          // この線のアニメーション進行度
          const lineProgress = Math.min(1, Math.max(0, lineAnimProgress - i));

          if (lineProgress > 0) {
            // 線の現在位置を計算
            const currentX = p.lerp(from.x, to.x, lineProgress);
            const currentY = p.lerp(from.y, to.y, lineProgress);

            // グロー効果のある線
            for (let w = 6; w > 0; w -= 2) {
              const alpha = p.map(w, 0, 6, 180, 30);
              p.stroke(100, 150, 255, alpha);
              p.strokeWeight(w);
              p.line(from.x, from.y, currentX, currentY);
            }

            // メインの線
            p.stroke(150, 200, 255, 220);
            p.strokeWeight(1.5);
            p.line(from.x, from.y, currentX, currentY);
          }
        }

        // 星を描画
        for (let i = 0; i < currentStars.length; i++) {
          const star = currentStars[i];
          
          // 星番号（描画順）
          const starOrder = getStarDrawOrder(i, currentLines, lineAnimProgress);
          const starAlpha = starOrder <= lineAnimProgress + 1 ? 255 : 100;

          // 外側のグロー
          p.noStroke();
          for (let r = star.size * 4; r > 0; r -= 2) {
            const alpha = p.map(r, 0, star.size * 4, starAlpha * 0.8, 0);
            p.fill(255, 255, 220, alpha);
            p.ellipse(star.x, star.y, r);
          }

          // 中心の明るい点
          p.fill(255, 255, 255, starAlpha);
          p.ellipse(star.x, star.y, star.size);

          // 十字のキラキラ
          if (starAlpha > 200) {
            p.stroke(255, 255, 255, starAlpha * 0.6);
            p.strokeWeight(1);
            const sparkleSize = star.size * 2;
            p.line(star.x - sparkleSize, star.y, star.x + sparkleSize, star.y);
            p.line(star.x, star.y - sparkleSize, star.x, star.y + sparkleSize);
          }
        }

        // 星座名（アニメーション完了後に表示）
        if (!isAnimating && constellationName) {
          p.fill(255, 255, 255, 200);
          p.noStroke();
          p.textAlign(p.CENTER, p.BOTTOM);
          p.textSize(20);
          p.textFont('serif');
          p.text(constellationName, width / 2, height - 30);
        }
      };

      // 星の描画順を取得（アニメーション用）
      function getStarDrawOrder(starIndex: number, lines: ConstellationLine[], progress: number): number {
        if (starIndex === lines[0]?.fromIndex) return 0;
        
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].toIndex === starIndex) {
            return i + 1;
          }
        }
        return lines.length + 1;
      }
    };
  }, [width, height, isAnimating, constellationName]);

  const containerRef = useP5(sketch, [sketch]);

  // 完了ハンドラー
  const handleComplete = () => {
    if (!constellationName.trim()) {
      alert('星座の名前を入力してください');
      return;
    }
    onComplete(constellationName.trim(), lines);
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
        {!isAnimating && (
          <>
            <p className="creator-hint">✨ 星座に名前をつけましょう</p>
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
              ⭐ この星座で決定
            </button>
          </>
        )}
        {isAnimating && (
          <p className="creator-animating">星を結んでいます...</p>
        )}
      </div>
    </div>
  );
}

export default ConstellationCreator;
