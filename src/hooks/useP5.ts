import { useEffect, useRef } from 'react';
import P5 from 'p5';

/**
 * p5.js Instance Mode を管理するカスタムフック
 * @param sketch - p5 スケッチ関数
 * @param containerRef - 描画対象のコンテナ要素参照
 */
export const useP5 = (
  sketch: (p: P5) => void,
  containerRef: React.RefObject<HTMLDivElement>
): React.RefObject<P5 | null> => {
  const p5InstanceRef = useRef<P5 | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // p5 インスタンス生成
    p5InstanceRef.current = new P5(sketch, containerRef.current);

    // クリーンアップ: コンポーネントアンマウント時
    return () => {
      if (p5InstanceRef.current) {
        p5InstanceRef.current.remove();
        p5InstanceRef.current = null;
      }
    };
  }, [sketch, containerRef]);

  return p5InstanceRef;
};
