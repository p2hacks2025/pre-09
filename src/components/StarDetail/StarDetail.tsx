import type { DiaryEntry } from '../../types';

type Props = {
  entry: DiaryEntry;      // 表示したい日記データ
  onClose: () => void;    // 閉じるボタンの処理
};

export default function StarDetail({ entry, onClose }: Props) {
  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div 
      onClick={handleBackgroundClick}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2000,
      }}
    >
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '24px',
        maxWidth: '350px',
        width: '90%',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        position: 'relative',
        textAlign: 'left'
      }}>
        <button 
          onClick={onClose}
          style={{
            position: 'absolute', top: '10px', right: '10px',
            background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer'
          }}
        >✖</button>

        <h3 style={{ marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
           📅 {new Date(entry.date).toLocaleDateString()}
        </h3>

        {entry.photoBlob && (
          <img 
            src={URL.createObjectURL(entry.photoBlob)} 
            alt="記録" 
            style={{ width: '100%', borderRadius: '8px', marginTop: '10px' }} 
          />
        )}

        <p style={{ marginTop: '15px', color: '#444', lineHeight: '1.6' }}>
            {entry.memo || "（メモはありません）"}
        </p>
      </div>
    </div>
  );
}