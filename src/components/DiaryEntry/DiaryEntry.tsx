import { useState, type ChangeEvent } from 'react';
import StarPlacer from '../StarPlacer/StarPlacer';

type Props = {
  onComplete: () => void;
};

export default function DiaryEntry({ onComplete }: Props) {
  const [note, setNote] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [step, setStep] = useState<'input' | 'star'>('input');

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPreviewUrl(URL.createObjectURL(file));
  };

  if (step === 'star' && previewUrl) {
    return <StarPlacer photoUrl={previewUrl} note={note} onFinish={onComplete} />;
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
        <label style={{ display: 'block', padding: '20px', border: '2px dashed #ccc', cursor: 'pointer' }}>
          {previewUrl ? <img src={previewUrl} style={{ maxWidth: '100%' }} /> : "📷 タップして写真を選ぶ"}
          <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
        </label>
      </div>
      <textarea
        style={{ width: '100%', height: '100px', padding: '10px', marginBottom: '20px' }}
        placeholder="ひとことメモ..."
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <button 
        className="btn btn-primary" disabled={!previewUrl} onClick={() => setStep('star')}
        style={{ width: '100%' }}
      >
        次へ（星を決める） 👉
      </button>
    </div>
  );
}