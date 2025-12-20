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
  const [starPos, setStarPos] = useState<{ x: number, y: number } | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number, y: number } | null>(null);
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

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setCursorPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseLeave = () => {
    setCursorPos(null);
  };

  const handleConfirm = () => {
    if (!starPos) return;
    // ここでは保存せず、座標データだけを親（DiaryEntry）に渡します
    onComplete(starPos.x, starPos.y);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(8, 11, 24, 0.85)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      overflowY: 'auto',
      paddingBottom: '40px'
    }}>
      <div style={{ width: '100%', height: '100%', position: 'relative', overflowY: 'auto' }}>
        <h2 style={{
          position: 'absolute',
          top: '40px',
          width: '100%',
          textAlign: 'center',
          fontSize: '1.2rem',
          margin: 0,
          zIndex: 10,
          pointerEvents: 'none'
        }}>🌟 一番明るい星をタップ！</h2>

        {/* 星座描画領域と同じサイズの固定コンテナ */}
        <div style={{
          position: 'relative',
          width: `${CANVAS_CONSTANTS.STAR_AREA_WIDTH}px`,
          height: `${CANVAS_CONSTANTS.STAR_AREA_HEIGHT}px`,
          margin: `${CANVAS_CONSTANTS.PADDING_Y_TOP}px auto 20px auto`,
          cursor: 'none', // デフォルトカーソルを非表示
          overflow: 'hidden',
          borderRadius: '8px',
          border: '2px solid rgba(100, 115, 160, 0.4)'
        }}
          ref={containerRef}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
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

          {/* カスタム十字カーソル（背景反転） */}
          {cursorPos && (
            <div style={{
              position: 'absolute',
              left: cursorPos.x,
              top: cursorPos.y,
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              mixBlendMode: 'difference',
              zIndex: 5
            }}>
              {/* 縦線 */}
              <div style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: '2px',
                height: '24px',
                background: 'white'
              }} />
              {/* 横線 */}
              <div style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: '24px',
                height: '2px',
                background: 'white'
              }} />
            </div>
          )}

          {starPos && (
            <div style={{
              position: 'absolute',
              left: `${starPos.x * 100}%`, top: `${starPos.y * 100}%`,
              transform: 'translate(-50%, -50%)', fontSize: '30px', pointerEvents: 'none',
              textShadow: '0 0 10px yellow',
              zIndex: 6
            }}>✨</div>
          )}
        </div>

        <div style={{
          width: '100%',
          maxWidth: '500px',
          margin: '0 auto',
          padding: '0 20px 50px 20px',
          display: 'flex',
          gap: '10px'
        }}>
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
            決定する
          </button>
        </div>
      </div>
    </div>
  );
}
