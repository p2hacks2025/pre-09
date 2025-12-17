import { useMemo, useRef, useEffect } from 'react';
import type p5 from 'p5';
import { useP5, type Sketch } from '../../hooks/useP5';
import type { Star, ConstellationLine, OnStarClick } from '../../types';
import { CANVAS_CONSTANTS } from '../../types';
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
  width = CANVAS_CONSTANTS.CONSTELLATION_WIDTH,
  height = CANVAS_CONSTANTS.CONSTELLATION_HEIGHT,
  onStarClick,
  backgroundColor = '#0a0a20',
  starColor = '#ffffff',
  lineColor = '#4a6fa5',
  cameraOffset = 0,
  newStarEffect = null,
  debugMode = false,
  constellationWidth = CANVAS_CONSTANTS.CONSTELLATION_WIDTH,
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
  //追加したよ
  const latestOnStarClick = useRef(onStarClick);
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

  //追加した２
  useEffect(() => {
    latestOnStarClick.current = onStarClick;
  }, [onStarClick]);

  useEffect(() => {
    constellationCountRef.current = constellationCount;
  }, [constellationCount]);

  // スケッチ関数を生成（一度だけ）
  const sketch: Sketch = useMemo(() => {
    return (p: p5) => {
      // クリック判定用の星の半径
      const CLICK_RADIUS = 20;

      // 背景の小さな星（装飾用）: 点滅する星としない星を分離
      const twinkleStars: { x: number; y: number; size: number; twinkle: number; phase: number }[] = [];
      const staticStars: { x: number; y: number; size: number; alpha: number }[] = [];

      // 流れ星（シンプルなライン）
      const shootingStars: { x: number; y: number; vx: number; vy: number; life: number; length: number }[] = [];

      // デバッグモード用のキャッシュ文字列
      const debugTextCache: Map<string, string> = new Map();

      // パーティクルシステム
      const particles: Particle[] = [];

      // 新しい星のフラッシュ効果
      let flashAlpha = 0;
      let flashX = 0;
      let flashY = 0;
      let lastEffectTimestamp = 0;
      let backgroundGradient: CanvasGradient | null = null;

      p.setup = () => {
        p.createCanvas(width, height);
        p.pixelDensity(Math.min(2, window.devicePixelRatio));

        // 背景グラデーションを生成（上から下へ）
        const ctx = p.drawingContext as CanvasRenderingContext2D;
        backgroundGradient = ctx.createLinearGradient(0, 0, 0, height);
        backgroundGradient.addColorStop(0, '#0b0044ff');
        backgroundGradient.addColorStop(0.4, '#1e0042ff');
        backgroundGradient.addColorStop(0.7, '#351a54ff');
        backgroundGradient.addColorStop(1, '#5a3766');

        // 点滅する星（サイズ3を100個に固定）
        for (let i = 0; i < 100; i++) {
          twinkleStars.push({
            x: p.random(-500, width + 2000), // スクロール用に広範囲
            y: p.random(height),
            size: 3,
            twinkle: p.random(1000, 4000),
            phase: p.random(p.TWO_PI),
          });
        }

        // 点滅しない星（小さめ＆低透明度）
        for (let i = 0; i < 600; i++) {
          staticStars.push({
            x: p.random(-500, width + 2000),
            y: p.random(height),
            size: p.random(1.5, 2.8),
            alpha: p.random(40, 80),
          });
        }

        // 流れ星の初期バッファ（空で開始）
        shootingStars.length = 0;
      };

      p.draw = () => {
        const currentCameraOffset = cameraOffsetRef.current;
        const currentStars = starsRef.current;
        const currentLines = linesRef.current;
        const currentEffect = newStarEffectRef.current;
        const isDebugMode = debugModeRef.current;
        const constWidth = constellationWidthRef.current;
        const constCount = constellationCountRef.current;

        // 背景（紫系のグラデーション）
        const ctx = p.drawingContext as CanvasRenderingContext2D;
        ctx.save();
        ctx.fillStyle = backgroundGradient ?? backgroundColor;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();

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

          // 星の描画領域（padding考慮）- 共通定数から取得
          const paddingX = CANVAS_CONSTANTS.PADDING_X;
          const paddingTop = CANVAS_CONSTANTS.PADDING_Y_TOP;
          const starAreaWidth = CANVAS_CONSTANTS.STAR_AREA_WIDTH;
          const starAreaHeight = CANVAS_CONSTANTS.STAR_AREA_HEIGHT;

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

            // ラベル（キャッシュを使用）
            p.fill(255, 255, 255, 200);
            p.noStroke();
            p.textSize(14);
            p.textAlign(p.LEFT, p.TOP);
            
            // キャッシュキーを使って文字列を取得/作成
            const labelKey = `label_${i}`;
            if (!debugTextCache.has(labelKey)) {
              debugTextCache.set(labelKey, `星座 ${i + 1}`);
            }
            p.text(debugTextCache.get(labelKey)!, x + 10, 10);
            
            p.textSize(10);
            const rangeKey = `range_${i}_${constWidth}`;
            if (!debugTextCache.has(rangeKey)) {
              debugTextCache.set(rangeKey, `x: ${x} - ${x + constWidth}`);
            }
            p.text(debugTextCache.get(rangeKey)!, x + 10, 30);

            p.stroke(255, 255, 0, 100);
            p.strokeWeight(1);
            p.noFill();
            p.rect(x + paddingX, paddingTop, starAreaWidth, starAreaHeight);
            p.fill(255, 255, 0, 150);
            p.textSize(10);
            const areaKey = `area_${starAreaWidth}_${starAreaHeight}`;
            if (!debugTextCache.has(areaKey)) {
              debugTextCache.set(areaKey, `星描画領域 (${starAreaWidth}x${starAreaHeight})`);
            }
            p.text(debugTextCache.get(areaKey)!, x + paddingX + 5, paddingTop + 5);
          }
        }

        // 装飾用の小さな星を描画
        p.noStroke();
        const frameCount = p.frameCount;

        // 点滅しない星（常時薄め）
        for (let i = 0; i < staticStars.length; i++) {
          const star = staticStars[i];
          p.fill(200, 190, 255, star.alpha);
          p.ellipse(star.x, star.y, star.size);
        }

        // 点滅する星（サイズ固定3）
        for (let i = 0; i < twinkleStars.length; i++) {
          const bgStar = twinkleStars[i];
          // frameCountを使用して計算（millis()より軽量）
          const alpha = 40 + 70 * (1 + Math.sin(bgStar.phase + frameCount * 0.05 / (bgStar.twinkle / 1000)));
          p.fill(200, 190, 255, alpha);
          p.ellipse(bgStar.x, bgStar.y, bgStar.size);
        }

        // 流れ星を更新・描画（右上→左下方向）
        if (p.random() < 0.01 && shootingStars.length < 4) {
          const startX = p.random(width * 0.3, width + 800);
          const startY = 0;
          const speedX = p.random(-7, -6);
          const speedY = p.random(5, 7);
          shootingStars.push({
            x: startX,
            y: startY,
            vx: speedX,
            vy: speedY,
            life: 80,
            length: 90,
          });
        }

        for (let i = shootingStars.length - 1; i >= 0; i--) {
          const s = shootingStars[i];
          s.x += s.vx;
          s.y += s.vy;
          s.life -= 1;

          const mag = Math.sqrt(s.vx * s.vx + s.vy * s.vy) || 1;
          const tailX = s.x - (s.vx / mag) * s.length;
          const tailY = s.y - (s.vy / mag) * s.length;
          const alpha = p.map(s.life, 0, 50, 0, 220);

          p.stroke(190, 170, 240, alpha);
          p.strokeWeight(2);
          p.line(s.x, s.y, tailX, tailY);

          // 画面外 or 寿命で除去
          if (s.life <= 0 || s.x < -200 || s.y > height + 200) {
            shootingStars.splice(i, 1);
          }
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
          drawStar(p, star.x, star.y, star.size, star.brightness, star.isNewest, star.isOldest, star.dateLabel);
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

      };

      // 星を描画するヘルパー関数
      function drawStar(
        p: p5,
        x: number,
        y: number,
        textLength: number,
        brightness: number,
        isNewest = false,
        isOldest = false,
        dateLabel?: string,
      ) {
        const clampedLength = p.constrain(textLength, 0, 100);
        const diameter = p.map(clampedLength, 0, 100, 10, 20); // 小さなメモでも見えるよう最小サイズを確保

        const fillColor = p.color(starColor);
        fillColor.setAlpha(p.map(brightness, 0, 255, 120, 255));

        p.noStroke();
        p.fill(fillColor);
        p.circle(x, y, diameter);

        // 最古/最新はベースより一回り大きい白いアウトラインを描画（色統一）
        if (isOldest || isNewest) {
          const outlineAlpha = p.map(brightness, 0, 255, 140, 235);
          const outlineBase = diameter * 1.2;

          p.noFill();
          p.stroke(200, 190, 255, outlineAlpha);
          p.strokeWeight(1.5);

          if (isOldest) {
            p.circle(x, y, outlineBase + 6);
          }

          if (isNewest) {
            p.circle(x, y, outlineBase + 6);
          }

          if (dateLabel) {
            p.noStroke();
            p.fill(255, 255, 255, 200);
            p.textAlign(p.CENTER, p.TOP);
            p.textSize(15);
            p.text(dateLabel, x, y + outlineBase);
          }
        }
      }

      // クリックイベント
      p.mousePressed = () => {
        //変更を加えたよ３
        const handleStarClick = latestOnStarClick.current;
        if (!handleStarClick) return;

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
            //変更を加えた４
            handleStarClick(star.entryId);
            console.log(`star ${star.entryId} 番目の星が選ばれました`);
            break;
          }
        }
      };
    };
  }, [width, height, onStarClick, backgroundColor, starColor, lineColor]);

  // p5.js の ref を取得
  const containerRef = useP5(sketch);

  return (
    <div className="constellation-canvas-container">
      <div ref={containerRef} className="constellation-canvas" />
    </div>
  );
}

export default ConstellationCanvas;
