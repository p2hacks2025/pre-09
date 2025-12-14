import { useState, useEffect } from 'react';
import type { AppView, DiaryEntry, Constellation } from './types';
import { getAllDiaryEntries, getUnassignedEntries, getAllConstellations } from './lib/db';
import './App.css';

// 👇【重要】ここが変わっています！作った部品を読み込む行です
import DiaryEntryComponent from './components/DiaryEntry/DiaryEntry';

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
        
        {/* 👇【重要】ここが変わっています！文字ではなく部品を表示します */}
        <DiaryEntryComponent 
          onComplete={() => {
            loadData(); // データを再読込して
            setView('home'); // ホームに戻る
          }}
        />

      </div>
    </div>
  );

  // 星座作成画面（プレースホルダー）
  const renderConstellation = () => (
    <div className="constellation-page">
      <header className="page-header">
        <button className="btn-back" onClick={() => setView('home')}>
          ← 戻る
        </button>
        <h1>星座を作成</h1>
      </header>
      <div className="constellation-canvas">
        <p>⭐ 7つの星をつないで星座を作りましょう</p>
        <p className="placeholder-text">
          （ConstellationCanvas コンポーネント実装予定）
        </p>
      </div>
    </div>
  );

  // ギャラリー画面（プレースホルダー）
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

  // 画面の描画
  const renderView = () => {
    switch (view) {
      case 'home':
        return renderHome();
      case 'entry':
        return renderEntry();
      case 'constellation':
        return renderConstellation();
      case 'gallery':
        return renderGallery();
      default:
        return renderHome();
    }
  };

  return (
    <div className="app">
      {renderView()}
    </div>
  );
}

export default App;