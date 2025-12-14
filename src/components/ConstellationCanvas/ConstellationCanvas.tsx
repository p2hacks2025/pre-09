import { useMemo } from 'react';
import type p5 from 'p5';
import { useP5, type Sketch } from '../../hooks/useP5';
import type { Star, ConstellationLine, OnStarClick } from '../../types';
import './ConstellationCanvas.css';

interface ConstellationCanvasProps {
  /** 星の配列 */
  stars: Star[];
  /** 星をつなぐ線の配列 */
  lines: ConstellationLine[];
  /** 星座の名前（表示用） */
  name?: string;
  /** キャンバスの幅 */
  width?: number;
  /** キャンバスの高さ */
  height?: number;
  /** 星がクリックされたときのコールバック */
  onStarClick?: OnStarClick;
  /** 背景色 */
  backgroundColor?: string;
  /** 星の色 */
  starColor?: string;
  /** 線の色 */
  lineColor?: string;
}

/**
 * p5.js で星座を描画するコンポーネント
 */
export function ConstellationCanvas({
  stars,
  lines,
  name,
  width = 400,
  height = 400,
  onStarClick,
  backgroundColor = '#0a0a20',
  starColor = '#ffffff',
  lineColor = '#4a6fa5',
}: ConstellationCanvasProps) {
  // スケッチ関数を生成
  const sketch: Sketch = useMemo(() => {
    return (p: p5) => {
      // クリック判定用の星の半径
      const CLICK_RADIUS = 15;

      // 背景の小さな星（装飾用）
      const bgStars: { x: number; y: number; size: number; twinkle: number }[] = [];

      p.setup = () => {
        p.createCanvas(width, height);
        p.pixelDensity(2);

        // 背景の装飾用小星を生成
        for (let i = 0; i < 50; i++) {
          bgStars.push({
            x: p.random(width),
            y: p.random(height),
            size: p.random(0.5, 2),
            twinkle: p.random(1000, 3000),
          });
        }
      };

      p.draw = () => {
        // 背景
        p.background(backgroundColor);

        // 装飾用の小さな星を描画（瞬き効果）
        p.noStroke();
        for (const bgStar of bgStars) {
          const alpha = p.map(
            p.sin((p.millis() / bgStar.twinkle) * p.TWO_PI),
            -1,
            1,
            100,
            255
          );
          p.fill(255, 255, 255, alpha);
          p.ellipse(bgStar.x, bgStar.y, bgStar.size);
        }

        // 星座の線を描画
        p.stroke(lineColor);
        p.strokeWeight(1.5);
        for (const line of lines) {
          const from = stars[line.fromIndex];
          const to = stars[line.toIndex];
          if (from && to) {
            p.line(from.x, from.y, to.x, to.y);
          }
        }

        // 星を描画
        for (const star of stars) {
          // 星のグロー効果
          p.noStroke();
          for (let r = star.size * 3; r > 0; r -= 2) {
            const alpha = p.map(r, 0, star.size * 3, star.brightness, 0);
            p.fill(255, 255, 200, alpha);
            p.ellipse(star.x, star.y, r);
          }

          // 星の中心
          p.fill(starColor);
          p.ellipse(star.x, star.y, star.size);
        }

        // 星座名を描画
        if (name) {
          p.fill(255, 255, 255, 200);
          p.noStroke();
          p.textAlign(p.CENTER, p.BOTTOM);
          p.textSize(16);
          p.text(name, width / 2, height - 20);
        }
      };

      // クリックイベント
      p.mousePressed = () => {
        if (!onStarClick) return;

        // クリック位置が canvas 内かチェック
        if (p.mouseX < 0 || p.mouseX > width || p.mouseY < 0 || p.mouseY > height) {
          return;
        }

        // クリックされた星を探す
        for (const star of stars) {
          const d = p.dist(p.mouseX, p.mouseY, star.x, star.y);
          if (d < CLICK_RADIUS) {
            onStarClick(star.entryId);
            break;
          }
        }
      };
    };
  }, [stars, lines, name, width, height, onStarClick, backgroundColor, starColor, lineColor]);

  // p5.js の ref を取得
  const containerRef = useP5(sketch, [sketch]);

  return (
    <div className="constellation-canvas-container">
      <div ref={containerRef} className="constellation-canvas" />
    </div>
  );
}

export default ConstellationCanvas;
