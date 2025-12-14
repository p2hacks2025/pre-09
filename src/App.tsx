import { useState, useEffect, useCallback, useRef } from 'react';
import type { AppView, DiaryEntry, Constellation, Star, StarPosition, ConstellationLine } from './types';
import { getAllDiaryEntries, getUnassignedEntries, getAllConstellations, addDiaryEntry, createConstellation } from './lib/db';
import ConstellationCanvas from './components/ConstellationCanvas/ConstellationCanvas';
import ConstellationCreator from './components/ConstellationCreator/ConstellationCreator';
import './App.css';

// ============================================
// 新しい星が追加されたときのエフェクト情報
// ============================================
interface NewStarEffect {
  x: number;
  y: number;
  timestamp: number;
}

// ============================================
// メインアプリケーション
// ============================================
function App() {
  // ----- 画面状態 -----
  const [view, setView] = useState<AppView>('home');

  // ----- データ状態 -----
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [unassignedEntries, setUnassignedEntries] = useState<DiaryEntry[]>([]);
  const [constellations, setConstellations] = useState<Constellation[]>([]);

  // ----- カメラ（スワイプ）状態 -----
  const [currentConstellationIndex, setCurrentConstellationIndex] = useState(0);
  const [cameraOffset, setCameraOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragDelta, setDragDelta] = useState(0);
  const dragStartX = useRef(0);

  // 星座1つあたりの幅（px）
  const CONSTELLATION_WIDTH = 400;

  // ----- Layer 2: PhotoOverlay 状態 -----
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [isPhotoFading, setIsPhotoFading] = useState(false);

  // ----- Entry入力状態 -----
  const [entryMemo, setEntryMemo] = useState('');

  // ----- 新しい星エフェクト -----
  const [newStarEffect, setNewStarEffect] = useState<NewStarEffect | null>(null);

  // ----- Canvas用の星データ -----
  const [canvasStars, setCanvasStars] = useState<Star[]>([]);

  // ----- 星座の線データ -----
  const [canvasLines, setCanvasLines] = useState<ConstellationLine[]>([]);

  // 星座の総数（未割り当てエントリも1グループとしてカウント）
  const totalConstellationGroups = constellations.length + (unassignedEntries.length > 0 ? 1 : 0);

  // 現在のカメラオフセットを計算（星座インデックス + ドラッグ中のデルタ）
  const currentCameraOffset = -currentConstellationIndex * CONSTELLATION_WIDTH + dragDelta;

  // データの読み込み
  const loadData = useCallback(async () => {
    const [allEntries, unassigned, allConstellations] = await Promise.all([
      getAllDiaryEntries(),
      getUnassignedEntries(),
      getAllConstellations(),
    ]);
    setEntries(allEntries);
    setUnassignedEntries(unassigned);
    setConstellations(allConstellations);

    // エントリIDからインデックスへのマッピングを作成
    const entryIdToIndex = new Map<number, number>();
    allEntries.forEach((entry, index) => {
      if (entry.id) entryIdToIndex.set(entry.id, index);
    });

    // 既存のエントリから星データを生成
    const stars: Star[] = allEntries.map((entry, index) => ({
      entryId: entry.id!,
      // 星座ごとにX座標をオフセット（7日分ごとにグループ化）
      x: (entry.starPosition.x * 300) + Math.floor(index / 7) * CONSTELLATION_WIDTH + 50,
      y: entry.starPosition.y * 300 + 50,
      brightness: 200,
      size: 8,
    }));
    setCanvasStars(stars);

    // 星座の線データを生成（星座ごとのローカルインデックスをグローバルインデックスに変換）
    const lines: ConstellationLine[] = [];
    allConstellations.forEach((constellation) => {
      if (!constellation.lines) return;
      
      // この星座のエントリIDをグローバルインデックスに変換
      const globalIndices = constellation.entryIds.map(id => entryIdToIndex.get(id) ?? -1);
      
      constellation.lines.forEach((line) => {
        const fromGlobal = globalIndices[line.fromIndex];
        const toGlobal = globalIndices[line.toIndex];
        if (fromGlobal !== -1 && toGlobal !== -1) {
          lines.push({ fromIndex: fromGlobal, toIndex: toGlobal });
        }
      });
    });
    setCanvasLines(lines);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ============================================
  // スワイプハンドラー (星座切り替え)
  // ============================================
  const handlePointerDown = (e: React.PointerEvent) => {
    if (view !== 'home') return;
    setIsDragging(true);
    dragStartX.current = e.clientX;
    setDragDelta(0);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || view !== 'home') return;
    const delta = e.clientX - dragStartX.current;
    setDragDelta(delta);
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    // スワイプの閾値（この値以上スワイプしたら次/前の星座へ）
    const SWIPE_THRESHOLD = 50;

    if (dragDelta < -SWIPE_THRESHOLD && currentConstellationIndex < totalConstellationGroups - 1) {
      // 左スワイプ → 次の星座へ
      setCurrentConstellationIndex(prev => prev + 1);
    } else if (dragDelta > SWIPE_THRESHOLD && currentConstellationIndex > 0) {
      // 右スワイプ → 前の星座へ
      setCurrentConstellationIndex(prev => prev - 1);
    }

    setDragDelta(0);
  };

  // ============================================
  // 写真選択ハンドラー
  // ============================================
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const url = URL.createObjectURL(file);
    setPhotoPreviewUrl(url);
    setPhotoBlob(file);
  };

  // ============================================
  // Entry完了 → StarPlacer画面へ
  // ============================================
  const handleEntryComplete = () => {
    if (!photoBlob || !entryMemo.trim()) {
      alert('写真とメモを入力してください');
      return;
    }
    setView('star-placer');
  };

  // ============================================
  // 星配置決定 → 魔法の遷移
  // ============================================
  const handleStarPlace = async (position: StarPosition) => {
    if (!photoBlob) return;

    // 1. DBに保存
    const today = new Date().toISOString().split('T')[0];
    await addDiaryEntry(today, photoBlob, entryMemo, position);

    // 2. 新しい星のキャンバス座標を計算
    const canvasX = position.x * window.innerWidth;
    const canvasY = position.y * window.innerHeight;

    // 3. 新しい星をCanvasに追加（エフェクト付き）
    setNewStarEffect({
      x: canvasX,
      y: canvasY,
      timestamp: Date.now(),
    });

    // 4. Layer 2 をフェードアウト開始
    setIsPhotoFading(true);

    // 5. フェードアウト完了後にHOMEへ遷移
    setTimeout(() => {
      setIsPhotoFading(false);
      setPhotoPreviewUrl(null);
      setPhotoBlob(null);
      setEntryMemo('');
      setView('home');
      loadData(); // データ再読み込み
    }, 1500); // フェードアウトアニメーション時間
  };

  // ============================================
  // 星クリック時のハンドラー
  // ============================================
  const handleStarClick = (entryId: number) => {
    const entry = entries.find(e => e.id === entryId);
    if (entry) {
      // TODO: StarDetailモーダルを表示
      console.log('Star clicked:', entry);
    }
  };

  // ============================================
  // Layer 3: UIOverlay のレンダリング
  // ============================================
  const renderUIOverlay = () => {
    switch (view) {
      case 'home':
        return renderHomeUI();
      case 'entry':
        return renderEntryUI();
      case 'star-placer':
        return renderStarPlacerUI();
      case 'constellation':
        return renderConstellationCreator();
      default:
        return renderHomeUI();
    }
  };

  // ----- HOME UI -----
  const renderHomeUI = () => {
    const canCreateConstellation = unassignedEntries.length >= 7;

    // 現在表示中の星座名を取得
    const currentConstellationName = constellations[currentConstellationIndex]?.name 
      || (currentConstellationIndex === constellations.length && unassignedEntries.length > 0 
          ? `作成中 (${unassignedEntries.length}/7)` 
          : '');

    return (
      <div className="ui-home">
        {/* 上部: タイトルと星座インジケーター */}
        <div className="home-header">
          <h1>Home</h1>
          {totalConstellationGroups > 0 && (
            <div className="constellation-indicator">
              <span className="constellation-name">{currentConstellationName}</span>
              <div className="constellation-dots">
                {Array.from({ length: totalConstellationGroups }).map((_, i) => (
                  <span
                    key={i}
                    className={`dot ${i === currentConstellationIndex ? 'active' : ''}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 中央: 星座表示エリア（空白） */}
        <div className="home-center" />

        {/* 下部: アクションボタン */}
        <div className="home-actions">
          <button className="btn btn-primary" onClick={() => setView('entry')}>
            記録する
          </button>

          {canCreateConstellation && (
            <button className="btn btn-secondary" onClick={() => setView('constellation')}>
              星座を作成
            </button>
          )}
        </div>
      </div>
    );
  };

  // ----- ENTRY UI -----
  const renderEntryUI = () => (
    <div className="ui-entry">
      <header className="page-header">
        <button className="btn-back" onClick={() => setView('home')}>
          ← 戻る
        </button>
        <h1>今日の記録</h1>
      </header>
<<<<<<< HEAD

      <div className="entry-form-container">
        {/* 写真選択 */}
        <div className="photo-input-area">
          {photoPreviewUrl ? (
            <img src={photoPreviewUrl} alt="Preview" className="photo-preview-thumb" />
          ) : (
            <label className="photo-select-label">
              <span>📷 写真を選択</span>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="photo-input-hidden"
              />
            </label>
          )}
        </div>

        {/* メモ入力 */}
        <textarea
          className="memo-input"
          placeholder="今日のひとこと..."
          value={entryMemo}
          onChange={(e) => setEntryMemo(e.target.value)}
          rows={3}
        />

        {/* 完了ボタン */}
        <button
          className="btn btn-primary"
          onClick={handleEntryComplete}
          disabled={!photoBlob || !entryMemo.trim()}
        >
          次へ → 星を配置する
        </button>
      </div>
    </div>
  );

  // ----- STAR PLACER UI -----
  const renderStarPlacerUI = () => (
    <div className="ui-star-placer">
      <div className="star-placer-instruction">
        <p>✨ 写真の上をタップして、星を置く場所を選んでください</p>
      </div>
    </div>
  );

  // ----- CONSTELLATION CREATOR -----
  const renderConstellationCreator = () => {
    // 7件以上の未割り当てエントリが必要
    if (unassignedEntries.length < 7) {
      return (
        <div className="ui-entry">
          <header className="page-header">
            <button className="btn-back" onClick={() => setView('home')}>
              ← 戻る
            </button>
            <h1>星座を作成</h1>
          </header>
          <div className="entry-form-container">
            <p>星座を作成するには7日分の記録が必要です。</p>
            <p>あと {7 - unassignedEntries.length} 日分記録してください。</p>
          </div>
        </div>
      );
    }

    // 7件のエントリを使って星座作成
    const entriesToUse = unassignedEntries.slice(0, 7);

    const handleConstellationComplete = async (name: string, lines: ConstellationLine[]) => {
      // DBに星座を保存（線データも含む）
      const entryIds = entriesToUse.map(e => e.id!);
      await createConstellation(name, entryIds, lines);
      
      // データを再読み込みしてホームへ
      await loadData();
      setView('home');
    };

    return (
      <ConstellationCreator
        entries={entriesToUse}
        onComplete={handleConstellationComplete}
        onCancel={() => setView('home')}
        width={Math.min(window.innerWidth - 32, 400)}
        height={Math.min(window.innerHeight - 300, 400)}
      />
    );
  };

  // ============================================
  // Layer 2: PhotoOverlay のレンダリング
  // ============================================
  const renderPhotoOverlay = () => {
    if (view !== 'star-placer' || !photoPreviewUrl) return null;

    return (
      <div
        className={`photo-overlay ${isPhotoFading ? 'fading' : ''}`}
        onClick={(e) => {
          if (isPhotoFading) return;
          // クリック位置を正規化座標に変換
          const rect = e.currentTarget.getBoundingClientRect();
          const x = (e.clientX - rect.left) / rect.width;
          const y = (e.clientY - rect.top) / rect.height;
          handleStarPlace({ x, y });
        }}
      >
        <img src={photoPreviewUrl} alt="Your photo" className="photo-overlay-image" />
        {/* タップ位置に星のプレビューを表示することも可能 */}
      </div>
    );
  };

  // ============================================
  // メインレンダリング（3層構造）
  // ============================================
  return (
    <div
      className="app-container"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* Layer 1: ConstellationCanvas (常駐背景) */}
      <div className={`layer-canvas ${isDragging ? 'dragging' : ''}`}>
        <ConstellationCanvas
          stars={canvasStars}
          lines={canvasLines}
          cameraOffset={currentCameraOffset}
          newStarEffect={newStarEffect}
          onStarClick={handleStarClick}
          width={window.innerWidth}
          height={window.innerHeight}
        />
      </div>

      {/* Layer 2: PhotoOverlay */}
      {renderPhotoOverlay()}

      {/* Layer 3: UIOverlay */}
      <div className="layer-ui">
        {renderUIOverlay()}
      </div>
    </div>
  );
}

export default App;