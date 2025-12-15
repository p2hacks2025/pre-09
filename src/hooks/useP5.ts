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
 * @returns コンテナ要素に設定する ref
 * 
 * 注意: このフックは sketch を一度だけ使用してp5インスタンスを作成します。
 * sketch 内で変化する値を参照する場合は、useRef を使用してください。
 * 
 * @example
 * ```tsx
 * const MyCanvas = () => {
 *   const valueRef = useRef(someValue);
 *   useEffect(() => { valueRef.current = someValue; }, [someValue]);
 * 
 *   const sketch: Sketch = useMemo(() => (p) => {
 *     p.setup = () => {
 *       p.createCanvas(400, 400);
 *     };
 *     p.draw = () => {
 *       p.background(0);
 *       p.fill(255);
 *       // valueRef.current で最新の値を参照
 *       p.ellipse(p.mouseX, p.mouseY, valueRef.current, valueRef.current);
 *     };
 *   }, []); // 依存配列は空にする
 * 
 *   const containerRef = useP5(sketch);
 * 
 *   return <div ref={containerRef} />;
 * };
 * ```
 */
export function useP5(sketch: Sketch): React.RefObject<HTMLDivElement | null> {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const p5InstanceRef = useRef<p5 | null>(null);
  const sketchRef = useRef(sketch);
  const isInitializedRef = useRef(false);

  // sketch を常に最新に保つ（ただし再作成はしない）
  sketchRef.current = sketch;

  useEffect(() => {
    // コンテナが存在しない場合は何もしない
    if (!containerRef.current) return;
    
    // 既に初期化済みの場合はスキップ（StrictMode対策）
    if (isInitializedRef.current && p5InstanceRef.current) {
      return;
    }

    // 既存のインスタンスがあれば削除
    if (p5InstanceRef.current) {
      p5InstanceRef.current.remove();
      p5InstanceRef.current = null;
    }

    // 新しい p5 インスタンスを作成
    p5InstanceRef.current = new p5(sketchRef.current, containerRef.current);
    isInitializedRef.current = true;

    // クリーンアップ
    return () => {
      if (p5InstanceRef.current) {
        p5InstanceRef.current.remove();
        p5InstanceRef.current = null;
      }
      isInitializedRef.current = false;
    };
  }, []); // 依存配列を空にして、マウント時に一度だけ実行

  return containerRef;
}

export default useP5;
