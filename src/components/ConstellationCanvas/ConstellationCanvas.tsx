import { useMemo, useRef, useEffect } from 'react';
import type p5 from 'p5';
import { useP5, type Sketch } from '../../hooks/useP5';
import type { Star, ConstellationLine, OnStarClick } from '../../types';
import './ConstellationCanvas.css';

// ============================================
// 新しい星エフェクトの型
// ============================================
interface NewStarEffect {
  x: number;
  y: number;
  timestamp: number;
}

// ============================================
// パーティクル（星追加時のエフェクト用）
// ============================================
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: { r: number; g: number; b: number };
}

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
  /** カメラのX方向オフセット（スワイプ用） */
  cameraOffset?: number;
  /** 新しい星のエフェクト */
  newStarEffect?: NewStarEffect | null;
  /** デバッグモード（領域表示） */
  debugMode?: boolean;
  /** 星座の幅（デバッグ表示用） */
  constellationWidth?: number;
  /** 星座の数（デバッグ表示用） */
  constellationCount?: number;
}

/**
 * p5.js で星座を描画するコンポーネント（常駐背景版）
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
  cameraOffset = 0,
  newStarEffect = null,
  debugMode = false,
  constellationWidth = 400,
  constellationCount = 0,
}: ConstellationCanvasProps) {
  // 外部からの値を p5 スケッチ内で参照するための ref
  const starsRef = useRef(stars);
  const linesRef = useRef(lines);
  const cameraOffsetRef = useRef(cameraOffset);
  const newStarEffectRef = useRef(newStarEffect);
  const debugModeRef = useRef(debugMode);
  const constellationWidthRef = useRef(constellationWidth);
  const constellationCountRef = useRef(constellationCount);

  // ref を更新（再レンダリングせずに値を更新）
  useEffect(() => {
    starsRef.current = stars;
  }, [stars]);

  useEffect(() => {
    linesRef.current = lines;
  }, [lines]);

  useEffect(() => {
    cameraOffsetRef.current = cameraOffset;
  }, [cameraOffset]);

  useEffect(() => {
    newStarEffectRef.current = newStarEffect;
  }, [newStarEffect]);

  useEffect(() => {
    debugModeRef.current = debugMode;
  }, [debugMode]);

  useEffect(() => {
    constellationWidthRef.current = constellationWidth;
  }, [constellationWidth]);

  useEffect(() => {
    constellationCountRef.current = constellationCount;
  }, [constellationCount]);

  // スケッチ関数を生成（一度だけ）
  const sketch: Sketch = useMemo(() => {
    return (p: p5) => {
      // クリック判定用の星の半径
      const CLICK_RADIUS = 20;

      // 背景の小さな星（装飾用）
      const bgStars: { x: number; y: number; size: number; twinkle: number }[] = [];

      // パーティクルシステム
      const particles: Particle[] = [];

      // 新しい星のフラッシュ効果
      let flashAlpha = 0;
      let flashX = 0;
      let flashY = 0;
      let lastEffectTimestamp = 0;

      p.setup = () => {
        p.createCanvas(width, height);
        p.pixelDensity(Math.min(2, window.devicePixelRatio));

        // 背景の装飾用小星を生成（広範囲に配置）
        for (let i = 0; i < 200; i++) {
          bgStars.push({
            x: p.random(-500, width + 2000), // スクロール用に広範囲
            y: p.random(height),
            size: p.random(0.5, 2.5),
            twinkle: p.random(1000, 4000),
          });
        }
      };

      p.draw = () => {
        const currentCameraOffset = cameraOffsetRef.current;
        const currentStars = starsRef.current;
        const currentLines = linesRef.current;
        const currentEffect = newStarEffectRef.current;
        const isDebugMode = debugModeRef.current;
        const constWidth = constellationWidthRef.current;
        const constCount = constellationCountRef.current;

        // 背景
        p.background(backgroundColor);

        // カメラ変換を適用
        p.push();
        p.translate(currentCameraOffset, 0);

        // ===== デバッグモード: 星座領域を半透明の長方形で表示 =====
        if (isDebugMode) {
          const colors = [
            [255, 100, 100, 40],  // 赤
            [100, 255, 100, 40],  // 緑
            [100, 100, 255, 40],  // 青
            [255, 255, 100, 40],  // 黄
            [255, 100, 255, 40],  // マゼンタ
          ];

          // 星座ごとの領域を描画
          for (let i = 0; i < constCount + 1; i++) { // +1 for unassigned
            const color = colors[i % colors.length];
            const x = i * constWidth;
            
            // 半透明の背景
            p.noStroke();
            p.fill(color[0], color[1], color[2], color[3]);
            p.rect(x, 0, constWidth, height);

            // 境界線
            p.stroke(color[0], color[1], color[2], 150);
            p.strokeWeight(2);
            p.line(x, 0, x, height);
            p.line(x + constWidth, 0, x + constWidth, height);

            // ラベル
            p.fill(255, 255, 255, 200);
            p.noStroke();
            p.textSize(14);
            p.textAlign(p.LEFT, p.TOP);
            p.text(`星座 ${i + 1}`, x + 10, 10);
            p.textSize(10);
            p.text(`x: ${x} - ${x + constWidth}`, x + 10, 30);

            // 星の描画領域（padding考慮）
            const padding = 50;
            const starAreaWidth = 300;
            const starAreaHeight = 300;
            p.stroke(255, 255, 0, 100);
            p.strokeWeight(1);
            p.noFill();
            p.rect(x + padding, padding, starAreaWidth, starAreaHeight);
            p.fill(255, 255, 0, 150);
            p.textSize(10);
            p.text(`星描画領域 (${starAreaWidth}x${starAreaHeight})`, x + padding + 5, padding + 5);
          }
        }

        // 装飾用の小さな星を描画（瞬き効果）
        p.noStroke();
        for (const bgStar of bgStars) {
          const alpha = p.map(
            p.sin((p.millis() / bgStar.twinkle) * p.TWO_PI),
            -1,
            1,
            80,
            255
          );
          p.fill(255, 255, 255, alpha);
          p.ellipse(bgStar.x, bgStar.y, bgStar.size);
        }

        // 星座の線を描画
        p.stroke(lineColor);
        p.strokeWeight(1.5);
        for (const line of currentLines) {
          const from = currentStars[line.fromIndex];
          const to = currentStars[line.toIndex];
          if (from && to) {
            // グラデーション効果
            p.stroke(74, 111, 165, 180);
            p.line(from.x, from.y, to.x, to.y);
          }
        }

        // 星を描画
        for (const star of currentStars) {
          drawStar(p, star.x, star.y, star.size, star.brightness);
        }

        p.pop();

        // ---- 新しい星のエフェクト処理 ----
        if (currentEffect && currentEffect.timestamp !== lastEffectTimestamp) {
          lastEffectTimestamp = currentEffect.timestamp;
          flashX = currentEffect.x;
          flashY = currentEffect.y;
          flashAlpha = 255;

          // パーティクルを生成
          for (let i = 0; i < 30; i++) {
            const angle = p.random(p.TWO_PI);
            const speed = p.random(2, 8);
            particles.push({
              x: flashX,
              y: flashY,
              vx: p.cos(angle) * speed,
              vy: p.sin(angle) * speed,
              life: 60,
              maxLife: 60,
              size: p.random(2, 6),
              color: {
                r: p.random(200, 255),
                g: p.random(200, 255),
                b: p.random(100, 200),
              },
            });
          }
        }

        // フラッシュ効果を描画
        if (flashAlpha > 0) {
          p.noStroke();
          // 外側のグロー
          for (let r = 150; r > 0; r -= 10) {
            const a = p.map(r, 0, 150, flashAlpha * 0.8, 0);
            p.fill(255, 255, 200, a);
            p.ellipse(flashX, flashY, r);
          }
          flashAlpha -= 8;
        }

        // パーティクルを更新・描画
        for (let i = particles.length - 1; i >= 0; i--) {
          const particle = particles[i];
          particle.x += particle.vx;
          particle.y += particle.vy;
          particle.vy += 0.1; // 重力
          particle.life--;

          const alpha = p.map(particle.life, 0, particle.maxLife, 0, 255);
          p.noStroke();
          p.fill(particle.color.r, particle.color.g, particle.color.b, alpha);
          p.ellipse(particle.x, particle.y, particle.size);

          if (particle.life <= 0) {
            particles.splice(i, 1);
          }
        }

        // 星座名を描画（固定位置）
        if (name) {
          p.fill(255, 255, 255, 200);
          p.noStroke();
          p.textAlign(p.CENTER, p.BOTTOM);
          p.textSize(16);
          p.text(name, width / 2, height - 20);
        }
      };

      // 星を描画するヘルパー関数
      function drawStar(p: p5, x: number, y: number, size: number, brightness: number) {
        p.noStroke();
        // 外側のグロー
        for (let r = size * 4; r > 0; r -= 2) {
          const alpha = p.map(r, 0, size * 4, brightness, 0);
          p.fill(255, 255, 220, alpha);
          p.ellipse(x, y, r);
        }
        // 中心の明るい点
        p.fill(starColor);
        p.ellipse(x, y, size);
        // 十字のキラキラ
        p.stroke(255, 255, 255, brightness * 0.5);
        p.strokeWeight(1);
        const sparkleSize = size * 2;
        p.line(x - sparkleSize, y, x + sparkleSize, y);
        p.line(x, y - sparkleSize, x, y + sparkleSize);
      }

      // クリックイベント
      p.mousePressed = () => {
        if (!onStarClick) return;

        const currentCameraOffset = cameraOffsetRef.current;
        const currentStars = starsRef.current;

        // クリック位置が canvas 内かチェック
        if (p.mouseX < 0 || p.mouseX > width || p.mouseY < 0 || p.mouseY > height) {
          return;
        }

        // カメラオフセットを考慮したマウス位置
        const worldX = p.mouseX - currentCameraOffset;
        const worldY = p.mouseY;

        // クリックされた星を探す
        for (const star of currentStars) {
          const d = p.dist(worldX, worldY, star.x, star.y);
          if (d < CLICK_RADIUS) {
            onStarClick(star.entryId);
            break;
          }
        }
      };
    };
  }, [width, height, onStarClick, backgroundColor, starColor, lineColor, name]);

  // p5.js の ref を取得
  const containerRef = useP5(sketch, [sketch]);

  return (
    <div className="constellation-canvas-container">
      <div ref={containerRef} className="constellation-canvas" />
    </div>
  );
}

export default ConstellationCanvas;
