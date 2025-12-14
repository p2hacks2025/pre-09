import { useState, useEffect } from 'react';
import type { AppView, DiaryEntry, Constellation } from './types';
import { getAllDiaryEntries, getUnassignedEntries, getAllConstellations } from './lib/db';
import './App.css';

// 作成したコンポーネントをインポート
import DiaryEntryComponent from './components/DiaryEntry/DiaryEntry';
import ConstellationCanvas from './components/ConstellationCanvas/ConstellationCanvas';

function App() {
  const [view, setView] = useState<AppView>('home');
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [unassignedEntries, setUnassignedEntries] = useState<DiaryEntry[]>([]);
  const [constellations, setConstellations] = useState<Constellation[]>([]);
  const [selectedConstellationId, setSelectedConstellationId] = useState<number | null>(null);

  const loadData = async () => {
    const [allEntries, unassigned, allConstellations] = await Promise.all([
      getAllDiaryEntries(),
      getUnassignedEntries(),
      getAllConstellations(),
    ]);
    setEntries(allEntries);
    setUnassignedEntries(unassigned);
    setConstellations(allConstellations);
  };

  useEffect(() => {
    loadData();
  }, []);

  // 🧪 テスト用に「1つ以上」あれば作成ボタンを押せるようにしています
  // 本番では `>= 7` に戻してください
  const canCreateConstellation = unassignedEntries.length >= 7;

  // ホーム画面
  const renderHome = () => (
    <div className="home">
      <h1 className="app-title">✨ 星座日記 ✨</h1>
      <p className="app-subtitle">1週間の思い出を星座にしよう</p>

      <div className="home-stats">
        <div className="stat-card">
          <span className="stat-number">{unassignedEntries.length}</span>
          <span className="stat-label">/ 7 日分</span>
        </div>
        <p className="stat-description">
          {canCreateConstellation
            ? '星座を作成できます！'
            : `あと ${7 - unassignedEntries.length} 日で星座が完成します`}
        </p>
      </div>

      <div className="home-actions">
        <button
          className="btn btn-primary"
          onClick={() => setView('entry')}
        >
          📷 今日の記録をつける
        </button>

        {canCreateConstellation && (
          <button
            className="btn btn-secondary"
            onClick={() => setView('constellation')}
          >
            ⭐ 星座を作成する
          </button>
        )}

        {constellations.length > 0 && (
          <button
            className="btn btn-outline"
            onClick={() => setView('gallery')}
          >
            🌌 過去の星座を見る
          </button>
        )}
      </div>

      {unassignedEntries.length > 0 && (
        <div className="recent-entries">
          <h2>最近の記録</h2>
          <div className="entries-preview">
            {unassignedEntries.map((entry) => (
              <div key={entry.id} className="entry-dot" title={entry.date}>
                ⭐
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // 日記入力画面
  const renderEntry = () => (
    <div className="entry-page">
      <header className="page-header">
        <button className="btn-back" onClick={() => setView('home')}>
          ← 戻る
        </button>
        <h1>今日の記録</h1>
      </header>
      <div className="entry-form">
        <DiaryEntryComponent 
          onComplete={() => {
            loadData();
            setView('home');
          }}
        />
      </div>
    </div>
  );

  // 星座作成画面
  const renderConstellation = () => {
    // キャンバスのサイズ設定
    const canvasSize = 340;

    // DBのデータ(0.0-1.0)をキャンバス座標(px)に変換
    const starsForCanvas = unassignedEntries.map(entry => ({
      entryId: entry.id!,
      x: entry.starPosition.x * canvasSize,
      y: entry.starPosition.y * canvasSize,
      size: 8,          // 星の大きさ
      brightness: 255   // 明るさ
    }));

    return (
      <div className="constellation-page">
        <header className="page-header">
          <button className="btn-back" onClick={() => setView('home')}>
            ← 戻る
          </button>
          <h1>星座を作成</h1>
        </header>
        
        <div className="constellation-canvas-container" style={{ padding: '20px' }}>
          <p style={{marginBottom: '10px'}}>⭐ 星をつないでみよう</p>
          
          {/* 👇 あなたが作ったキャンバスコンポーネントを表示！ */}
          <ConstellationCanvas 
            width={canvasSize}
            height={canvasSize}
            stars={starsForCanvas}
            lines={[]} // まだ線は空っぽ
            backgroundColor="#1a1a2e"
            onStarClick={(id) => console.log('星をクリック:', id)}
          />

          <p className="placeholder-text" style={{marginTop: '15px', fontSize: '0.8rem', opacity: 0.7}}>
            （タップして線をつなぐ機能は次のステップで実装）
          </p>
        </div>
      </div>
    );
  };

  // ギャラリー画面
  const renderGallery = () => (
    <div className="gallery-page">
      <header className="page-header">
        <button className="btn-back" onClick={() => setView('home')}>
          ← 戻る
        </button>
        <h1>過去の星座</h1>
      </header>
      <div className="gallery-list">
        {constellations.length === 0 ? (
          <p>まだ星座がありません</p>
        ) : (
          constellations.map((constellation) => (
            <div
              key={constellation.id}
              className="constellation-card"
              onClick={() => {
                setSelectedConstellationId(constellation.id ?? null);
                setView('constellation');
              }}
            >
              <h3>{constellation.name}</h3>
              <p>{constellation.createdAt.toLocaleDateString()}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );

  // 画面の描画切り替え
  return (
    <div className="app">
      {view === 'home' && renderHome()}
      {view === 'entry' && renderEntry()}
      {view === 'constellation' && renderConstellation()}
      {view === 'gallery' && renderGallery()}
    </div>
  );
}

export default App;