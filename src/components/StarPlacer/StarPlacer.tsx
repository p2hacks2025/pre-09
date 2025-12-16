import { useState, useRef, type MouseEvent } from 'react';
import { CANVAS_CONSTANTS } from '../../types';

// 👇 ここが重要！ note（メモ）を受け取るのをやめました。
//    保存処理もここには書きません。
type Props = {
  photoUrl: string;
  onComplete: (x: number, y: number) => void; // 座標を親に返す
  onBack: () => void; // 戻るボタン用
};

export default function StarPlacer({ photoUrl, onComplete, onBack }: Props) {
  const [starPos, setStarPos] = useState<{x: number, y: number} | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    // 0〜1の範囲にクランプ
    setStarPos({ 
      x: Math.max(0, Math.min(1, x)), 
      y: Math.max(0, Math.min(1, y)) 
    });
  };

  const handleConfirm = () => {
    if (!starPos) return;
    // ここでは保存せず、座標データだけを親（DiaryEntry）に渡します
    onComplete(starPos.x, starPos.y);
  };

  return (
    <div style={{ textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', padding: '20px' }}>
      <h2 style={{fontSize: '1.2rem', margin: '10px 0'}}>🌟 一番明るい星をタップ！</h2>
      
      {/* 星座描画領域と同じサイズの固定コンテナ */}
      <div style={{ 
        position: 'relative', 
        width: `${CANVAS_CONSTANTS.STAR_AREA_WIDTH}px`,
        height: `${CANVAS_CONSTANTS.STAR_AREA_HEIGHT}px`,
        margin: '0 auto',
        cursor: 'crosshair',
        overflow: 'hidden',
        borderRadius: '8px',
        border: '2px solid #333'
      }}
        ref={containerRef}
        onClick={handleClick}
      >
        <img 
          src={photoUrl} 
          alt="Selected"
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: 'cover',
            display: 'block',
            pointerEvents: 'none'
          }} 
        />
        {starPos && (
          <div style={{
            position: 'absolute',
            left: `${starPos.x * 100}%`, top: `${starPos.y * 100}%`,
            transform: 'translate(-50%, -50%)', fontSize: '30px', pointerEvents: 'none',
            textShadow: '0 0 10px yellow'
          }}>✨</div>
        )}
      </div>

      <div style={{ marginTop: 'auto', paddingTop: '20px', display: 'flex', gap: '10px' }}>
        <button 
          onClick={onBack} 
          className="btn btn-outline"
          style={{ flex: 1 }}
        >
          もどる
        </button>
        <button 
          onClick={handleConfirm} disabled={!starPos} className="btn btn-primary"
          style={{ opacity: starPos ? 1 : 0.5, flex: 1 }}
        >
          決定する ✅
        </button>
      </div>
    </div>
  );
}