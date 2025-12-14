import { useRef, useEffect } from 'react';
import p5 from 'p5';

/**
 * p5.js スケッチ関数の型
 * インスタンスモードで使用
 */
export type Sketch = (p: p5) => void;

/**
 * p5.js を React で使うためのカスタムフック
 * 
 * @param sketch - p5.js のスケッチ関数（インスタンスモード）
 * @param deps - スケッチを再生成するための依存配列
 * @returns コンテナ要素に設定する ref
 * 
 * @example
 * ```tsx
 * const MyCanvas = () => {
 *   const sketch: Sketch = (p) => {
 *     p.setup = () => {
 *       p.createCanvas(400, 400);
 *     };
 *     p.draw = () => {
 *       p.background(0);
 *       p.fill(255);
 *       p.ellipse(p.mouseX, p.mouseY, 50, 50);
 *     };
 *   };
 * 
 *   const containerRef = useP5(sketch);
 * 
 *   return <div ref={containerRef} />;
 * };
 * ```
 */
export function useP5(sketch: Sketch, deps: React.DependencyList = []): React.RefObject<HTMLDivElement | null> {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const p5InstanceRef = useRef<p5 | null>(null);

  useEffect(() => {
    // コンテナが存在しない場合は何もしない
    if (!containerRef.current) return;

    // 既存のインスタンスがあれば削除
    if (p5InstanceRef.current) {
      p5InstanceRef.current.remove();
      p5InstanceRef.current = null;
    }

    // 新しい p5 インスタンスを作成
    p5InstanceRef.current = new p5(sketch, containerRef.current);

    // クリーンアップ
    return () => {
      if (p5InstanceRef.current) {
        p5InstanceRef.current.remove();
        p5InstanceRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return containerRef;
}

export default useP5;
