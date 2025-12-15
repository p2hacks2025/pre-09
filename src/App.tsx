import { useState, useEffect, useCallback, useRef } from 'react';
import type { AppView, DiaryEntry as DiaryEntryType, Constellation, Star, StarPosition, ConstellationLine } from './types';
import { CANVAS_CONSTANTS } from './types';
import { getAllDiaryEntries, getUnassignedEntries, getAllConstellations, addDiaryEntry, createConstellation, resetAllData, createTestData } from './lib/db';
import ConstellationCanvas from './components/ConstellationCanvas/ConstellationCanvas';
import ConstellationCreator from './components/ConstellationCreator/ConstellationCreator';
import DiaryEntryComponent from './components/DiaryEntry/DiaryEntry';
import StarDetail from './components/StarDetail/StarDetail';

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
  const [entries, setEntries] = useState<DiaryEntryType[]>([]);
  const [unassignedEntries, setUnassignedEntries] = useState<DiaryEntryType[]>([]);
  const [constellations, setConstellations] = useState<Constellation[]>([]);

  // ----- カメラ（スワイプ）状態 -----
  const [currentConstellationIndex, setCurrentConstellationIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragDelta, setDragDelta] = useState(0);
  const dragStartX = useRef(0);

  // ----- 画面サイズ（中央配置用） -----
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 400);

  // ----- デバッグモード -----
  const [debugMode, setDebugMode] = useState(true);

  // 星座1つあたりの幅（px）- 共通定数を使用
  const CONSTELLATION_WIDTH = CANVAS_CONSTANTS.CONSTELLATION_WIDTH;

  // ----- 新しい星エフェクト -----
  const [newStarEffect, setNewStarEffect] = useState<NewStarEffect | null>(null);

  //-----選択中の星野データがここに入る-----
  const [selectedEntry, setSelectedEntry] = useState<DiaryEntryType | null>(null);

  // ----- Canvas用の星データ -----
  const [canvasStars, setCanvasStars] = useState<Star[]>([]);

  // ----- 星座の線データ -----
  const [canvasLines, setCanvasLines] = useState<ConstellationLine[]>([]);

  // 星座の総数（未割り当てエントリも1グループとしてカウント）
  const totalConstellationGroups = constellations.length + (unassignedEntries.length > 0 ? 1 : 0);

  // 現在のカメラオフセットを計算（星座を画面中央に配置）
  // 星座の中心を画面中央に合わせる: 画面幅の半分 - 星座の中心位置
  const centerOffset = windowWidth / 2 - CONSTELLATION_WIDTH / 2;
  const currentCameraOffset = -currentConstellationIndex * CONSTELLATION_WIDTH + dragDelta + centerOffset;

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

    // エントリIDから星座グループインデックスへのマッピングを作成
    const entryIdToGroupIndex = new Map<number, number>();
    
    // 完成した星座に属するエントリをマッピング
    allConstellations.forEach((constellation, constellationIndex) => {
      constellation.entryIds.forEach((entryId) => {
        entryIdToGroupIndex.set(entryId, constellationIndex);
      });
    });
    
    // 未割り当てエントリは最後のグループ（作成中の星座）に配置
    const unassignedGroupIndex = allConstellations.length;
    unassigned.forEach((entry) => {
      if (entry.id) {
        entryIdToGroupIndex.set(entry.id, unassignedGroupIndex);
      }
    });

    // エントリIDからグローバルインデックスへのマッピング（線描画用）
    const entryIdToGlobalIndex = new Map<number, number>();
    allEntries.forEach((entry, index) => {
      if (entry.id) entryIdToGlobalIndex.set(entry.id, index);
    });

    // 既存のエントリから星データを生成
    const stars: Star[] = allEntries.map((entry) => {
      const groupIndex = entryIdToGroupIndex.get(entry.id!) ?? unassignedGroupIndex;
      return {
        entryId: entry.id!,
        // 星座グループに基づいてX座標をオフセット
        x: (entry.starPosition.x * CANVAS_CONSTANTS.STAR_AREA_WIDTH) + groupIndex * CONSTELLATION_WIDTH + CANVAS_CONSTANTS.PADDING,
        y: entry.starPosition.y * CANVAS_CONSTANTS.STAR_AREA_HEIGHT + CANVAS_CONSTANTS.PADDING,
        brightness: 200,
        size: 8,
      };
    });
    setCanvasStars(stars);

    // 星座の線データを生成（星座ごとのローカルインデックスをグローバルインデックスに変換）
    const lines: ConstellationLine[] = [];
    allConstellations.forEach((constellation) => {
      if (!constellation.lines) return;
      
      // この星座のエントリIDをグローバルインデックスに変換
      const globalIndices = constellation.entryIds.map(id => entryIdToGlobalIndex.get(id) ?? -1);
      
      constellation.lines.forEach((line) => {
        const fromGlobal = globalIndices[line.fromIndex];
        const toGlobal = globalIndices[line.toIndex];
        if (fromGlobal !== -1 && toGlobal !== -1) {
          lines.push({ fromIndex: fromGlobal, toIndex: toGlobal });
        }
      });
    });
    setCanvasLines(lines);

    // リロード時は作成中の星座（未割り当てエントリのグループ）から表示開始
    setCurrentConstellationIndex(allConstellations.length);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ウィンドウサイズ変更時に更新
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
  // DiaryEntryからのデータ受け取り → DB保存
  // ============================================
  const handleDiaryEntryComplete = async (data: { 
    photoUrl: string; 
    memo: string; 
    starPosition: { x: number; y: number } 
  }) => {
    // photoUrlからBlobを取得
    const response = await fetch(data.photoUrl);
    const blob = await response.blob();

    // 1. DBに保存
    const today = new Date().toISOString().split('T')[0];
    await addDiaryEntry(today, blob, data.memo, data.starPosition);

    // 2. 新しい星のキャンバス座標を計算
    const canvasX = data.starPosition.x * window.innerWidth;
    const canvasY = data.starPosition.y * window.innerHeight;

    // 3. 新しい星をCanvasに追加（エフェクト付き）
    setNewStarEffect({
      x: canvasX,
      y: canvasY,
      timestamp: Date.now(),
    });

    // 4. データを再読み込みしてホームへ
    await loadData();
    setView('home');
  };

  // ============================================
  // 星クリック時のハンドラー
  // ============================================
  const handleStarClick = (entryId: number) => {
    const entry = entries.find(e => e.id === entryId);
    if (entry) {
      setSelectedEntry(entry);
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

    // テストデータ作成
    const handleCreateTestData = async () => {
      await createTestData();
      await loadData();
      setCurrentConstellationIndex(0);
    };

    // データリセット
    const handleResetData = async () => {
      await resetAllData();
      await loadData();
      setCurrentConstellationIndex(0);
    };

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

        {/* デバッグパネル */}
        {debugMode && (
          <div className="debug-panel">
            <div className="debug-info">
              <p>星座数: {constellations.length} | 未割当: {unassignedEntries.length}</p>
              <p>現在Index: {currentConstellationIndex} | 幅: {CONSTELLATION_WIDTH}px</p>
              <p>カメラOffset: {currentCameraOffset}px</p>
            </div>
            <div className="debug-buttons">
              <button onClick={handleCreateTestData}>🧪 テストデータ作成</button>
              <button onClick={handleResetData}>🗑️ リセット</button>
              <button onClick={() => setDebugMode(false)}>❌ デバッグ非表示</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ----- ENTRY UI -----
  const renderEntryUI = () => (
    <DiaryEntryComponent
      onComplete={handleDiaryEntryComplete}
      onCancel={() => setView('home')}
    />
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
        width={CANVAS_CONSTANTS.CONSTELLATION_WIDTH}
        height={CANVAS_CONSTANTS.CONSTELLATION_HEIGHT}
      />
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
          debugMode={debugMode}
          constellationWidth={CONSTELLATION_WIDTH}
          constellationCount={constellations.length}
        />
      </div>

      {/* Layer 2: UIOverlay */}
      <div className="layer-ui">
        {renderUIOverlay()}
        {selectedEntry && (
          <StarDetail 
            entry={selectedEntry} 
            onClose={() => setSelectedEntry(null)} 
          />
        )}
      </div>
    </div>
  );
}

export default App;