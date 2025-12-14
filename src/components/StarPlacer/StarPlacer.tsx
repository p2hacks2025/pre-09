import { useState, useRef, type MouseEvent } from 'react';

// 👇 ここが重要！ note（メモ）を受け取るのをやめました。
//    保存処理もここには書きません。
type Props = {
  photoUrl: string;
  onComplete: (x: number, y: number) => void; // 座標を親に返す
  onBack: () => void; // 戻るボタン用
};

export default function StarPlacer({ photoUrl, onComplete, onBack }: Props) {
  const [starPos, setStarPos] = useState<{x: number, y: number} | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleClick = (e: MouseEvent<HTMLImageElement>) => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setStarPos({ x, y });
  };

  const handleConfirm = () => {
    if (!starPos) return;
    // ここでは保存せず、座標データだけを親（DiaryEntry）に渡します
    onComplete(starPos.x, starPos.y);
  };

  return (
    <div style={{ textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h2 style={{fontSize: '1.2rem', margin: '10px 0'}}>🌟 一番明るい星をタップ！</h2>
      
      <div style={{ position: 'relative', display: 'inline-block', margin: '0 auto' }}>
        <img 
          ref={imgRef} src={photoUrl} onClick={handleClick} alt="Selected"
          style={{ maxWidth: '100%', borderRadius: '8px', cursor: 'crosshair', display: 'block' }} 
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
          戻る
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