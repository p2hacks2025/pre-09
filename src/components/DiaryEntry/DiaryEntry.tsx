'use client';

import { useState, useCallback, useEffect, useRef, type ChangeEvent } from 'react';
import StarPlacer from '../StarPlacer/StarPlacer';
import Cropper, { type Area } from 'react-easy-crop';
import { CANVAS_CONSTANTS } from '../../types';


// TypeScriptに「これはReactコンポーネントとして扱ってOK」と明示的に伝えます。
const EasyCropper = Cropper as unknown as React.ComponentType<any>;

// =================================================================
// ユーティリティ関数
// =================================================================

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous'); 
    image.src = url;
  });

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area
): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) return '';

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(URL.createObjectURL(blob));
    }, 'image/jpeg');
  });
}

// =================================================================
// メインコンポーネント
// =================================================================

//onCompleteとonCancelの引数を定義
type Props = {
  onComplete: (data: { photoUrl: string; memo: string; starPosition: { x: number; y: number } }) => void;
  onCancel: () => void;
};

export default function DiaryEntry({ onComplete, onCancel }: Props) {
  // noteをSetnoteで管理
  const [note, setNote] = useState("");
  // 画像のプレビューurl
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [step, setStep] = useState<'input' | 'cropping' | 'star'>('input');
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  // Object URLを追跡してクリーンアップ
  const objectUrlsRef = useRef<string[]>([]);

  // コンポーネントのアンマウント時にすべてのObject URLを解放
  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      objectUrlsRef.current = [];
    };
  }, []);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 古いimageSrcがあれば解放
      if (imageSrc) {
        URL.revokeObjectURL(imageSrc);
      }
      const imageDataUrl = URL.createObjectURL(file);
      objectUrlsRef.current.push(imageDataUrl);
      setImageSrc(imageDataUrl);
      setStep('cropping');
    }
  };

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCropConfirm = async () => {
    if (imageSrc && croppedAreaPixels) {
      try {
        // 古いpreviewUrlがあれば解放
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }
        const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
        objectUrlsRef.current.push(croppedImage);
        setPreviewUrl(croppedImage);
        setStep('input');
      } catch (e) {
        console.error(e);
      }
    }
  };

  // 星の位置が決まったらデータを親に返す
  const handleStarComplete = (x: number, y: number) => {
    if (previewUrl) {
      onComplete({
        photoUrl: previewUrl,
        memo: note,
        starPosition: { x, y }
      });
    }
  };

  if (step === 'star' && previewUrl) {
    return (
      <StarPlacer 
        photoUrl={previewUrl} 
        onComplete={handleStarComplete} 
        onBack={() => setStep('input')} 
      />
    );
  }

  if (step === 'cropping' && imageSrc) {
    return (
      <div style={{ 
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
        background: '#333', zIndex: 1000, display: 'flex', flexDirection: 'column' 
      }}>
        <div style={{ position: 'relative', flex: 1, width: '100%' }}>
          {/* ここで再定義した EasyCropper を使います */}
          <EasyCropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={CANVAS_CONSTANTS.CROP_ASPECT}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
          />
        </div>
        
        <div style={{ 
          height: '100px', background: 'white', display: 'flex', 
          alignItems: 'center', justifyContent: 'center', gap: '20px', padding: '0 20px' 
        }}>
          <div style={{ position: 'absolute', bottom: '110px', width: '80%', display: 'flex', justifyContent: 'center' }}>
             <input
               type="range"
               value={zoom}
               min={1}
               max={3}
               step={0.1}
               onChange={(e) => setZoom(Number(e.target.value))}
               style={{ width: '100%', maxWidth: '300px' }}
             />
          </div>

          <button 
            onClick={() => { setStep('input'); setImageSrc(null); }} 
            className="btn"
            style={{ padding: '10px 20px', background: '#f0f0f0', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            キャンセル
          </button>
          <button 
            onClick={handleCropConfirm} 
            className="btn btn-primary"
            style={{ padding: '10px 20px', background: '#007bff', color: 'white', borderRadius: '4px', border: 'none' }}
          >
            決定する
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', overflowY: 'auto', position: 'relative' }}>
      {/* 戻るボタン */}
      <button
        onClick={onCancel}
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          background: 'none', border: 'none', fontSize: '1rem',
          cursor: 'pointer', color: '#666', zIndex: 10
        }}
      >
        ← もどる
      </button>
      
      <div style={{ 
        width: `${CANVAS_CONSTANTS.STAR_AREA_WIDTH}px`,
        margin: `${CANVAS_CONSTANTS.PADDING_Y_TOP}px auto 50px auto`
      }}>
        <label style={{ 
          display: 'block', 
          width: '100%',
          height: `${CANVAS_CONSTANTS.STAR_AREA_HEIGHT}px`,
          border: '2px dashed #ccc', 
          cursor: 'pointer', 
          borderRadius: '8px',
          background: '#fafafa', 
          position: 'relative',
          overflow: 'hidden',
          marginBottom: '20px'
        }}>
          {previewUrl ? (
            <img src={previewUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} alt="Preview" />
          ) : (
             <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#888' }}>
              タップして写真を選ぶ
            </div>
          )}
          <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
        </label>

        <textarea
          style={{ width: '100%', height: '100px', padding: '10px', marginBottom: '20px', borderRadius: '4px', border: '1px solid #ccc' }}
          placeholder="ひとことメモ..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <button 
          className="btn btn-primary" 
          disabled={!previewUrl} 
          onClick={() => setStep('star')}
          style={{ 
            width: '100%', padding: '12px', borderRadius: '4px', border: 'none',
            background: previewUrl ? '#007bff' : '#ccc', color: 'white'
          }}
        >
          次へ
        </button>
      </div>
    </div>
  );
}