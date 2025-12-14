import { useState, useRef, type MouseEvent } from 'react';
import { addDiaryEntry } from '../../lib/db'; 

type Props = {
  photoUrl: string;
  note: string;
  onFinish: () => void;
};

export default function StarPlacer({ photoUrl, note, onFinish }: Props) {
  const [starPos, setStarPos] = useState<{x: number, y: number} | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleClick = (e: MouseEvent<HTMLImageElement>) => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setStarPos({ x, y });
  };

  const handleSave = async () => {
    if (!starPos) return;
    try {
      const response = await fetch(photoUrl);
      const photoBlob = await response.blob();
      
      await addDiaryEntry(
        new Date().toLocaleDateString(),
        photoBlob,
        note,
        starPos
      );
      alert("保存しました！🌟");
      onFinish(); 
    } catch (error) {
      console.error(error);
      alert("保存失敗...");
    }
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <h2>🌟 一番明るい星をタップ！</h2>
      <div style={{ position: 'relative', display: 'inline-block', margin: '20px 0' }}>
        <img 
          ref={imgRef} src={photoUrl} onClick={handleClick} alt="Selected"
          style={{ width: '100%', borderRadius: '8px', cursor: 'crosshair' }} 
        />
        {starPos && (
          <div style={{
            position: 'absolute',
            left: `${starPos.x * 100}%`, top: `${starPos.y * 100}%`,
            transform: 'translate(-50%, -50%)', fontSize: '30px', pointerEvents: 'none'
          }}>✨</div>
        )}
      </div>
      <div>
        <button 
          onClick={handleSave} disabled={!starPos} className="btn btn-primary"
          style={{ opacity: starPos ? 1 : 0.5, marginTop: '10px' }}
        >
          記録を保存する ✅
        </button>
      </div>
    </div>
  );
}