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

  // アニメーション完了フラグをrefで管理（不要な再レンダリングを防ぐ）
  const hasAnimationCompletedRef = useRef(false);

  // p5.js スケッチ
  const sketch: Sketch = useMemo(() => {
    return (p: p5) => {
      // 背景の装飾用小星
      const bgStars: { x: number; y: number; size: number; twinkle: number }[] = [];
      
      // 背景をオフスクリーンバッファにキャッシュ
      let bgBuffer: p5.Graphics | null = null;
      let lastBgUpdateTime = 0;
      const BG_UPDATE_INTERVAL = 50; // 背景更新間隔（ms）
      
      // 線描画アニメーション用
      let lineAnimProgress = 0;
      const LINE_ANIM_SPEED = 0.02;

      // 星の描画順をキャッシュ
      const starDrawOrderCache = new Map<number, number>();

      // クリーンアップ用にバッファを追跡
      p.remove = ((originalRemove) => {
        return function(this: p5) {
          // p5.Graphicsバッファを明示的に解放
          if (bgBuffer) {
            bgBuffer.remove();
            bgBuffer = null;
          }
          // 元のremoveを呼び出し
          originalRemove.call(this);
        };
      })(p.remove.bind(p));

      p.setup = () => {
        p.createCanvas(width, height);
        // 高DPIディスプレイでの最適化（必要に応じて調整）
        const dpr = Math.min(2, window.devicePixelRatio);
        p.pixelDensity(dpr);

        // 背景バッファを作成
        bgBuffer = p.createGraphics(width, height);
        bgBuffer.pixelDensity(dpr);

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

      // 背景バッファを更新
      const updateBackgroundBuffer = (time: number) => {
        if (!bgBuffer) return;
        
        bgBuffer.background('#0a0a20');
        bgBuffer.noStroke();
        
        for (let i = 0; i < bgStars.length; i++) {
          const bgStar = bgStars[i];
          const alpha = p.map(
            Math.sin((time / bgStar.twinkle) * p.TWO_PI),
            -1,
            1,
            60,
            200
          );
          bgBuffer.fill(255, 255, 255, alpha);
          bgBuffer.ellipse(bgStar.x, bgStar.y, bgStar.size);
        }
      };

      // 星の描画順を取得（キャッシュ付き）
      const getStarDrawOrder = (starIndex: number, lines: ConstellationLine[]): number => {
        if (starDrawOrderCache.has(starIndex)) {
          return starDrawOrderCache.get(starIndex)!;
        }
        
        let order: number;
        if (starIndex === lines[0]?.fromIndex) {
          order = 0;
        } else {
          order = lines.length + 1;
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].toIndex === starIndex) {
              order = i + 1;
              break;
            }
          }
        }
        
        starDrawOrderCache.set(starIndex, order);
        return order;
      };

      p.draw = () => {
        const currentStars = starsRef.current;
        const currentLines = linesRef.current;
        const currentTime = p.millis();

        // 背景バッファを一定間隔で更新（毎フレームではなく）
        if (currentTime - lastBgUpdateTime > BG_UPDATE_INTERVAL) {
          updateBackgroundBuffer(currentTime);
          lastBgUpdateTime = currentTime;
        }

        // キャッシュした背景を描画
        if (bgBuffer) {
          p.image(bgBuffer, 0, 0);
        } else {
          p.background('#0a0a20');
        }

        // 線のアニメーション進行
        const isStillAnimating = lineAnimProgress < currentLines.length;
        if (isStillAnimating) {
          lineAnimProgress += LINE_ANIM_SPEED;
        } else if (!hasAnimationCompletedRef.current) {
          // アニメーション完了を一度だけ通知
          hasAnimationCompletedRef.current = true;
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

            // グロー効果のある線（ループ回数を削減: 3回 → 2回）
            p.stroke(100, 150, 255, 60);
            p.strokeWeight(5);
            p.line(from.x, from.y, currentX, currentY);
            
            p.stroke(100, 150, 255, 120);
            p.strokeWeight(2.5);
            p.line(from.x, from.y, currentX, currentY);

            // メインの線
            p.stroke(150, 200, 255, 220);
            p.strokeWeight(1.5);
            p.line(from.x, from.y, currentX, currentY);
          }
        }

        // 星を描画
        p.noStroke();
        for (let i = 0; i < currentStars.length; i++) {
          const star = currentStars[i];
          
          // 星番号（描画順）- キャッシュを使用
          const starOrder = getStarDrawOrder(i, currentLines);
          const starAlpha = starOrder <= lineAnimProgress + 1 ? 255 : 100;

          // 外側のグロー（ループ回数を削減: 段階的に描画）
          const glowSize = star.size * 4;
          p.fill(255, 255, 220, starAlpha * 0.05);
          p.ellipse(star.x, star.y, glowSize);
          p.fill(255, 255, 220, starAlpha * 0.15);
          p.ellipse(star.x, star.y, glowSize * 0.6);
          p.fill(255, 255, 220, starAlpha * 0.4);
          p.ellipse(star.x, star.y, glowSize * 0.3);

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
            p.noStroke();
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
