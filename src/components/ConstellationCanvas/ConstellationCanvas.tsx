import { useRef, useCallback } from 'react';
import type P5 from 'p5';
import { useP5 } from '../../hooks/useP5';
import type { DiaryEntry } from '../../types/index';

interface ConstellationCanvasProps {
  entries: DiaryEntry[];
  onStarClick?: (entryId: number | undefined) => void;
}

export const ConstellationCanvas: React.FC<ConstellationCanvasProps> = ({
  entries,
  onStarClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const sketch = useCallback(
    (p: P5) => {
      // =====================
      // ローカル状態変数
      // =====================
      let mode: 0 | 1 | 2 = 0;
      let visibleStars = 0;
      let lastFrame = 0;
      let allStarsFrame = -1;
      let currentLine = 0;
      let lineProgress = 0;

      // タイミング定数
      const APPEAR_INTERVAL = 78;
      const DISAPPEAR_INTERVAL = 15;
      const BASE_SIZE = 6;
      const MAX_SIZE = 24;
      const ANIM_DURATION = 30;
      const LINE_DELAY = 24;
      const LINE_SPEED = 0.03;
      const LINE_GAP = 6;

      // 星座座標と接続順序
      let starX: number[] = [];
      let starY: number[] = [];
      let appearFrame: number[] = [];
      let connectOrder: number[] = [];
      let used: boolean[] = [];
      const starCount = entries.length;

      const initializeCoordinates = () => {
        starX = entries.map((entry) => entry.starPosition.x * window.innerWidth);
        starY = entries.map((entry) => entry.starPosition.y * window.innerHeight);
        appearFrame = new Array(starCount).fill(0);
        connectOrder = new Array(starCount).fill(0);
        used = new Array(starCount).fill(false);
      };

      const animateAppear = () => {
        if (p.frameCount - lastFrame >= APPEAR_INTERVAL && visibleStars < starCount) {
          appearFrame[visibleStars] = p.frameCount;
          visibleStars++;
          lastFrame = p.frameCount;
          if (visibleStars === starCount) {
            allStarsFrame = p.frameCount;
          }
        }
      };

      const animateDisappear = () => {
        if (p.frameCount - lastFrame >= DISAPPEAR_INTERVAL && visibleStars > 0) {
          visibleStars--;
          lastFrame = p.frameCount;
          if (visibleStars === 0) {
            startAnimation();
            mode = 1;
          }
        }
      };

      const drawStars = () => {
        p.noStroke();
        p.textAlign(p.CENTER);
        p.textSize(14);

        for (let i = 0; i < visibleStars; i++) {
          const elapsed = p.frameCount - appearFrame[i];
          let size: number;

          if (elapsed < ANIM_DURATION / 2) {
            size = p.map(elapsed, 0, ANIM_DURATION / 2, BASE_SIZE, MAX_SIZE);
          } else if (elapsed < ANIM_DURATION) {
            size = p.map(elapsed, ANIM_DURATION / 2, ANIM_DURATION, MAX_SIZE, BASE_SIZE);
          } else {
            size = BASE_SIZE;
          }

          const d = p.dist(p.mouseX, p.mouseY, starX[i], starY[i]);
          const hover = d < size / 2;
          const drawSize = hover ? size * 1.6 : size;

          p.fill(255);
          p.ellipse(starX[i], starY[i], drawSize, drawSize);

          if (hover) {
            p.text(String(i + 1), starX[i], starY[i] - drawSize - 8);
          }
        }
      };

      const drawLineWithGap = (i: number, progressRatio: number) => {
        if (i >= starCount - 1) return;

        const a = connectOrder[i];
        const b = connectOrder[i + 1];

        const dx = starX[b] - starX[a];
        const dy = starY[b] - starY[a];
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) return;

        const nx = dx / distance;
        const ny = dy / distance;

        const sx = starX[a] + nx * LINE_GAP;
        const sy = starY[a] + ny * LINE_GAP;
        const ex = starX[b] - nx * LINE_GAP;
        const ey = starY[b] - ny * LINE_GAP;

        const x = p.lerp(sx, ex, progressRatio);
        const y = p.lerp(sy, ey, progressRatio);

        p.line(sx, sy, x, y);
      };

      const drawAnimatedLines = () => {
        p.stroke(255);
        p.strokeWeight(1);

        for (let i = 0; i < currentLine; i++) {
          drawLineWithGap(i, 1);
        }

        if (currentLine < starCount - 1) {
          lineProgress += LINE_SPEED;
          lineProgress = p.constrain(lineProgress, 0, 1);
          drawLineWithGap(currentLine, lineProgress);

          if (lineProgress >= 1) {
            currentLine++;
            lineProgress = 0;
          }
        }
      };

      const startAnimation = () => {
        visibleStars = 0;
        currentLine = 0;
        lineProgress = 0;
        allStarsFrame = -1;
        lastFrame = p.frameCount;
        createConnectOrder();
      };

      const createConnectOrder = () => {
        for (let i = 0; i < starCount; i++) {
          used[i] = false;
        }

        let current = findStartStar();
        connectOrder[0] = current;
        used[current] = true;

        for (let i = 1; i < starCount; i++) {
          const next = findNearestStar(current);
          connectOrder[i] = next;
          used[next] = true;
          current = next;
        }
      };

      const findStartStar = (): number => {
        let start = 0;
        for (let i = 1; i < starCount; i++) {
          if (
            starY[i] < starY[start] ||
            (starY[i] === starY[start] && starX[i] < starX[start])
          ) {
            start = i;
          }
        }
        return start;
      };

      const findNearestStar = (current: number): number => {
        let nearest = -1;
        let minDist = Number.MAX_VALUE;

        for (let i = 0; i < starCount; i++) {
          if (!used[i]) {
            const d = Math.hypot(starX[i] - starX[current], starY[i] - starY[current]);
            if (d < minDist) {
              minDist = d;
              nearest = i;
            }
          }
        }
        return nearest;
      };

      // =====================
      // p5.js ライフサイクル
      // =====================

      p.setup = () => {
        if (containerRef.current) {
          const width = containerRef.current.clientWidth;
          const height = containerRef.current.clientHeight;
          p.createCanvas(width, height);
        }
        p.smooth();
        p.frameRate(60);
        initializeCoordinates();
        startAnimation();
      };

      p.draw = () => {
        p.background(0);

        if (mode === 1) {
          animateAppear();
        } else if (mode === 2) {
          animateDisappear();
        }

        drawStars();

        if (
          mode === 1 &&
          visibleStars >= 2 &&
          allStarsFrame !== -1 &&
          p.frameCount - allStarsFrame >= LINE_DELAY
        ) {
          drawAnimatedLines();
        }
      };

      p.windowResized = () => {
        if (containerRef.current) {
          const width = containerRef.current.clientWidth;
          const height = containerRef.current.clientHeight;
          p.resizeCanvas(width, height);
        }
      };

      p.keyPressed = () => {
        if (p.keyCode === p.ENTER) {
          if (mode === 0) {
            startAnimation();
            mode = 1;
          } else if (mode === 1 && visibleStars < starCount) {
            startAnimation();
            mode = 1;
          } else if (mode === 1 && visibleStars === starCount) {
            mode = 2;
            lastFrame = p.frameCount;
          }
        }
        return false;
      };

      p.mousePressed = () => {
        for (let i = 0; i < visibleStars; i++) {
          const d = p.dist(p.mouseX, p.mouseY, starX[i], starY[i]);
          if (d < BASE_SIZE) {
            console.log(`星${i + 1}をクリックした！`);
            const entry = entries[i];
            if (onStarClick && entry.id !== undefined) {
              onStarClick(entry.id);
            }
            return false;
          }
        }
        return false;
      };
    },
    [entries, onStarClick]
  );

  useP5(sketch, containerRef);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
};
