import type { DiaryEntry } from '../../types';

type Props = {
  entry: DiaryEntry;      // 表示したい日記データ
  onClose: () => void;    // 閉じるボタンの処理
};

export default function StarDetail({ entry, onClose }: Props) {//引数はpropsのデータと閉じるボタン
  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();//親がおされない、ターゲットがカレントターゲットと同じな閉じる
  };

  return (
    <div 
      onClick={handleBackgroundClick}
      // 背景の黒い幕のスタイル
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',//した二つのための宣言
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2000,
      }}
    >
      {/* 黒い幕の上の白いボード */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '24px',
        maxWidth: '350px',
        width: '90%',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        position: 'relative',//白いボード上が基準となる
        textAlign: 'left'//文字が左寄せ
      }}>
        {/* 閉じるボタン */}
        <button 
          onClick={onClose}
          style={{
            position: 'absolute', top: '10px', right: '10px',//基準から10px話してボタンを打つ。
            background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer'
          }}
        >✖</button>

        {/* 日付表示 */}
        <h3 style={{ marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
           📅 {new Date(entry.date).toLocaleDateString()}{/*日付データをわかりやすく変換 */}
        </h3>

        {entry.photoBlob && (
          <img 
            src={URL.createObjectURL(entry.photoBlob)} 
            alt="記録" 
            style={{ width: '100%', borderRadius: '8px', marginTop: '10px' }} 
          />
        )}

        <p style={{ marginTop: '15px', color: '#444', lineHeight: '1.6' }}>
            {entry.memo || "（メモはありません）"}{/*メモがなければ表示される文章*/}
        </p>
      </div>
    </div>
  );
}