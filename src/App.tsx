import { useState, useEffect, useCallback, useRef } from 'react';
import type { AppView, DiaryEntry as DiaryEntryType, Constellation, Star, ConstellationLine } from './types';
import { CANVAS_CONSTANTS } from './types';
import { getAllDiaryEntries, getUnassignedEntries, getAllConstellations, addDiaryEntry, createConstellation, resetAllData, createTestData } from './lib/db';
import { findBestMatch, type MatchResult } from './lib/constellationMatcher';
import { referenceConstellations } from './data/constellations';
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
  const [debugMode, setDebugMode] = useState(false);

  // 星座1つあたりの幅（px）- 共通定数を使用
  const CONSTELLATION_WIDTH = CANVAS_CONSTANTS.CONSTELLATION_WIDTH;

  // ----- カメラオフセット（イージング付き） -----
  const [cameraOffset, setCameraOffset] = useState(() => {
    const initialCenterOffset = windowWidth / 2 - CONSTELLATION_WIDTH / 2;
    return initialCenterOffset;
  });
  const cameraOffsetRef = useRef(cameraOffset);
  const animationFrameRef = useRef<number | null>(null);

  // ----- 新しい星エフェクト -----
  const [newStarEffect, setNewStarEffect] = useState<NewStarEffect | null>(null);

  //-----選択中の星野データがここに入る-----
  const [selectedEntry, setSelectedEntry] = useState<DiaryEntryType | null>(null);

  // ----- Canvas用の星データ -----
  const [canvasStars, setCanvasStars] = useState<Star[]>([]);

  // ----- 星座の線データ -----
  const [canvasLines, setCanvasLines] = useState<ConstellationLine[]>([]);

  // ----- 星座判定結果（星座インデックス → 判定結果）-----
  const [matchResults, setMatchResults] = useState<Map<number, MatchResult>>(new Map());

  // Note: entryById was removed as it was unused

  // 星座の総数（未割り当てエントリも1グループとしてカウント）
  const totalConstellationGroups = constellations.length + (unassignedEntries.length > 0 ? 1 : 0);

  // 現在のカメラオフセットを計算（星座を画面中央に配置）
  // 星座の中心を画面中央に合わせる: 画面幅の半分 - 星座の中心位置
  const centerOffset = windowWidth / 2 - CONSTELLATION_WIDTH / 2;
  const targetCameraOffset = -currentConstellationIndex * CONSTELLATION_WIDTH + centerOffset;

  // カメラオフセットをなめらかに補間
  const cancelCameraAnimation = () => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  useEffect(() => {
    cameraOffsetRef.current = cameraOffset;
  }, [cameraOffset]);

  useEffect(() => {
    const target = isDragging ? targetCameraOffset + dragDelta : targetCameraOffset;

    if (isDragging) {
      cancelCameraAnimation();
      setCameraOffset(target);
      return;
    }

    if (Math.abs(target - cameraOffsetRef.current) < 0.5) {
      cancelCameraAnimation();
      setCameraOffset(target);
      return;
    }

    const from = cameraOffsetRef.current;
    const duration = 500;
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    let start: number | null = null;

    const step = (timestamp: number) => {
      if (start === null) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = easeOutCubic(progress);
      const nextOffset = from + (target - from) * eased;
      setCameraOffset(nextOffset);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(step);
      } else {
        animationFrameRef.current = null;
      }
    };

    cancelCameraAnimation();
    animationFrameRef.current = requestAnimationFrame(step);

    return cancelCameraAnimation;
  }, [dragDelta, isDragging, targetCameraOffset]);

  useEffect(() => () => cancelCameraAnimation(), []);

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

    // グループごとのエントリを集計して最古/最新を「作成順（IDの昇順）」で特定
    const groupEntries = new Map<number, DiaryEntryType[]>();
    allEntries.forEach((entry) => {
      const groupIndex = entryIdToGroupIndex.get(entry.id!) ?? unassignedGroupIndex;
      const list = groupEntries.get(groupIndex) ?? [];
      list.push(entry);
      groupEntries.set(groupIndex, list);
    });

    const groupExtrema = new Map<number, { oldestId: number; newestId: number }>();
    groupEntries.forEach((entries, groupIndex) => {
      const ids = entries
        .map((e) => e.id)
        .filter((id): id is number => typeof id === 'number');
      if (ids.length === 0) return;
      groupExtrema.set(groupIndex, {
        oldestId: Math.min(...ids),
        newestId: Math.max(...ids),
      });
    });

    const toMonthDay = (dateStr: string) => {
      const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!match) return dateStr;
      return `${match[2]}/${match[3]}`;
    };

    // 既存のエントリから星データを生成
    const stars: Star[] = allEntries.map((entry) => {
      const groupIndex = entryIdToGroupIndex.get(entry.id!) ?? unassignedGroupIndex;
      const clampedMemoLength = Math.max(0, Math.min(entry.memo?.length ?? 0, 100));
      const extrema = groupExtrema.get(groupIndex);

      const isOldest = extrema ? entry.id === extrema.oldestId : false;
      const isNewest = extrema ? entry.id === extrema.newestId : false;
      const dateLabel = toMonthDay(entry.date);

      return {
        entryId: entry.id!,
        // 星座グループに基づいてX座標をオフセット
        x: (entry.starPosition.x * CANVAS_CONSTANTS.STAR_AREA_WIDTH) + groupIndex * CONSTELLATION_WIDTH + CANVAS_CONSTANTS.PADDING_X,
        y: entry.starPosition.y * CANVAS_CONSTANTS.STAR_AREA_HEIGHT + CANVAS_CONSTANTS.PADDING_Y_TOP,
        brightness: 200,
        size: clampedMemoLength,
        isOldest,
        isNewest,
        dateLabel,
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

    const unassignedIds = new Set(unassigned.map(u => u.id));

    // allEntriesを走査して、隣り合う星が両方「未割り当て」なら線を引く
    for (let i = 1; i < allEntries.length; i++) {
      const prev = allEntries[i - 1];
      const curr = allEntries[i];

      if (unassignedIds.has(prev.id) && unassignedIds.has(curr.id)) {
        const prevGroup = Math.floor((i - 1) / 7);
        const currGroup = Math.floor(i / 7);
        if (prevGroup === currGroup) {
          // 両方のIDが entryIdToGlobalIndex に存在することを確認して push
          const fromIdx = entryIdToGlobalIndex.get(prev.id!) ?? -1;
          const toIdx = entryIdToGlobalIndex.get(curr.id!) ?? -1;
          // p5アニメーション完了まで待機（約1.7秒かかるので2秒の猶予を設定）
          const isVeryNew = new Date().getTime() - new Date(curr.createdAt).getTime() < 2000; // 2秒以内
          const isLastEdge = (i === allEntries.length - 1);

          if (isLastEdge && isVeryNew) {//一番最新の線が1秒以内につくられたならスキップ
            // 新しく作った直後だけは React 側で線を引かない！
            // これにより、p5側のアニメーションが優先される
            continue;
          }

          if (fromIdx !== -1 && toIdx !== -1) {
            lines.push({ fromIndex: fromIdx, toIndex: toIdx });
          }
        }
      }
    }
    setCanvasLines(lines);

    // DBに保存された判定結果からmatchResultsを復元
    const restoredMatchResults = new Map<number, MatchResult>();
    allConstellations.forEach((constellation, index) => {
      if (constellation.matchedConstellationId) {
        // constellations.tsから該当の星座データを取得
        const refConstellation = referenceConstellations.find(
          c => c.id === constellation.matchedConstellationId
        );
        if (refConstellation) {
          restoredMatchResults.set(index, {
            constellationId: refConstellation.id,
            constellationName: refConstellation.name,
            similarity: 1, // 保存済みなので類似度は1とする
            svgPath: refConstellation.svgPath,
          });
        }
      }
    });
    setMatchResults(restoredMatchResults);

    // リロード時は作成中の星座（未割り当てエントリのグループ）から表示開始
    setCurrentConstellationIndex(allConstellations.length);
  }, []);

  //星座アニメーション完了時のハンドラー
  const handleAnimationComplete = useCallback((fromGlobalIdx: number, toGlobalIdx: number) => {
    // すでに同じ線が存在するかチェック（重複防止）
    setCanvasLines(prev => {
      const exists = prev.some(
        line => (line.fromIndex === fromGlobalIdx && line.toIndex === toGlobalIdx) ||
          (line.fromIndex === toGlobalIdx && line.toIndex === fromGlobalIdx)
      );
      if (!exists) {
        // Canvas上の線データに正式に追加
        // これにより、p5の animatingLine が null になっても、通常の線として描画され続ける
        console.log("Animation complete: Line added to canvas.");
        return [...prev, { fromIndex: fromGlobalIdx, toIndex: toGlobalIdx }];
      }
      return prev;
    });
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

    // 2. 新しい星のキャンバス座標を計算（星と同じ計算方式）
    // 未割り当てグループは constellations.length 番目
    const groupIndex = constellations.length;
    const canvasX = (data.starPosition.x * CANVAS_CONSTANTS.STAR_AREA_WIDTH) + groupIndex * CONSTELLATION_WIDTH + CANVAS_CONSTANTS.PADDING_X;
    const canvasY = data.starPosition.y * CANVAS_CONSTANTS.STAR_AREA_HEIGHT + CANVAS_CONSTANTS.PADDING_Y_TOP;

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
    console.log('handleStarClick called with entryId:', entryId);
    console.log('探しているID:', entryId, typeof entryId);
    console.log('持っているリストのIDたち:', entries.map(e => ({ id: e.id, type: typeof e.id })));
    const entry = entries.find(e => e.id === entryId);
    console.log('handleStarClick found entry:', entry);
    if (entry) {
      setSelectedEntry(entry);
      console.log('handleStarClick: setSelectedEntry called for', entryId);
    } else {
      console.log('handleStarClick: no entry found for', entryId);
    }
  };

  // デバッグ: selectedEntry が更新されたタイミングをログ出力
  useEffect(() => {
    console.log('selectedEntry changed:', selectedEntry);
  }, [selectedEntry]);

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

    const currentGroupEntries = (() => {
      if (currentConstellationIndex < constellations.length) {
        const ids = constellations[currentConstellationIndex]?.entryIds ?? [];
        return entries.filter((e) => e.id !== undefined && ids.includes(e.id));
      }
      if (currentConstellationIndex === constellations.length) {
        return unassignedEntries;
      }
      return [];
    })();

    const oldestEntry = currentGroupEntries.reduce<DiaryEntryType | null>((oldest, entry) => {
      if (!oldest) return entry;
      return entry.date < oldest.date ? entry : oldest;
    }, null);

    const oldestYear = oldestEntry ? oldestEntry.date.slice(0, 4) : '';
    const oldestMonthName = (() => {
      if (!oldestEntry) return '';
      const monthIndex = parseInt(oldestEntry.date.slice(5, 7), 10) - 1;
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June', 'July',
        'August', 'September', 'October', 'November', 'December',
      ];
      return monthNames[monthIndex] ?? '';
    })();

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
      setMatchResults(new Map());
    };

    // 星座判定（デバッグ用：未割り当て星を判定）
    const handleConstellationMatch = () => {
      // 未割り当てエントリの点群を取得
      const userPoints = unassignedEntries.map(e => e.starPosition);
      if (userPoints.length === 0) {
        alert('判定する星がありません');
        return;
      }
      const result = findBestMatch(userPoints, 0.1);
      if (result) {
        // 未割り当て星は最後のインデックス（constellations.length）に表示
        setMatchResults(prev => new Map(prev).set(constellations.length, result));
        console.log(`星座判定結果: ${result.constellationName} (${(result.similarity * 100).toFixed(1)}%)`);
      } else {
        console.log('マッチする星座が見つかりませんでした');
      }
    };

    return (
      <div className="ui-home">
        {/* 上部: タイトルと星座インジケーター */}
        <div className="home-header">
          <div className="constellation-date-hero">
            {oldestYear && <span className="constellation-year">{oldestYear}</span>}
            {oldestMonthName && <span className="constellation-month">{oldestMonthName}</span>}
          </div>
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
          <button className="btn " onClick={() => setView('entry')}>
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
              <p>カメラOffset: {cameraOffset.toFixed(1)}px</p>
            </div>
            <div className="debug-buttons">
              <button onClick={handleCreateTestData}>🧪 テストデータ作成</button>
              <button onClick={handleResetData}>🗑️ リセット</button>
              <button onClick={handleConstellationMatch}>🔍 星座判定</button>
              <button onClick={() => setDebugMode(false)}>❌ デバッグ非表示</button>
            </div>
            {matchResults.size > 0 && (
              <div className="debug-match-result">
                <p>判定結果: {Array.from(matchResults.entries()).map(([idx, r]) =>
                  `[${idx}] ${r.constellationName} (${(r.similarity * 100).toFixed(1)}%)`
                ).join(', ')}</p>
              </div>
            )}
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
  //switsh文で呼び出し
  // ----- CONSTELLATION CREATOR -----
  const renderConstellationCreator = () => {
    // 7件のエントリを使って星座作成
    const entriesToUse = unassignedEntries.slice(0, 7);

    const handleConstellationComplete = async (name: string, lines: ConstellationLine[]) => {
      const userPoints = entriesToUse.map(e => e.starPosition);

      // 星座判定を実行
      const result = findBestMatch(userPoints, 0.1);
      const matchedId = result?.constellationId;

      // DBに星座を保存
      const entryIds = entriesToUse.map(e => e.id!);
      await createConstellation(name, entryIds, lines, matchedId);

      if (result) {
        const newConstellationIndex = constellations.length;
        setMatchResults(prev => new Map(prev).set(newConstellationIndex, result));
      }

      // データを再読み込みしてホームへ
      await loadData();
      setView('home');
    };

    const canvasWidth = CANVAS_CONSTANTS.CONSTELLATION_WIDTH;
    const canvasHeight = CANVAS_CONSTANTS.CONSTELLATION_HEIGHT;

    return (
      <ConstellationCreator
        entries={entriesToUse} // 修正：targetEntries から entriesToUse へ
        width={canvasWidth}
        height={canvasHeight}
        onComplete={handleConstellationComplete}
        onCancel={() => setView('home')} // 修正：setIsCreatorOpen(false) から setView('home') へ
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
          cameraOffset={cameraOffset}
          newStarEffect={newStarEffect}
          onStarClick={handleStarClick}
          onAnimationComplete={handleAnimationComplete}
          width={window.innerWidth}
          height={window.innerHeight}
          debugMode={debugMode}
          constellationWidth={CONSTELLATION_WIDTH}
          constellationCount={constellations.length}
        />
        {/* 星座判定結果のSVGオーバーレイ（各星座に対応） */}
        {Array.from(matchResults.entries()).map(([constellationIndex, result]) => (
          <div
            key={constellationIndex}
            className="constellation-svg-overlay"
            style={{
              position: 'absolute',
              left: `${constellationIndex * CONSTELLATION_WIDTH + cameraOffset + CANVAS_CONSTANTS.PADDING_X}px`,
              top: `${CANVAS_CONSTANTS.PADDING_Y_TOP}px`,
              width: `${CANVAS_CONSTANTS.STAR_AREA_WIDTH}px`,
              height: `${CANVAS_CONSTANTS.STAR_AREA_HEIGHT}px`,
              opacity: 0.3,
              pointerEvents: 'none',
            }}
          >
            <img
              src={result.svgPath}
              alt={result.constellationName}
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        ))}
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

      {/* デバッグモード切り替えボタン（右下・透明） */}
      <button
        className="debug-toggle-button"
        onClick={() => setDebugMode(prev => !prev)}
        aria-label="デバッグモード切り替え"
      />
    </div>
  );
}

export default App;