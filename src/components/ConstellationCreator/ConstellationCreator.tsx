import { useState, useEffect, useCallback } from 'react';
import type { ConstellationLine, DiaryEntry } from '../../types';
import { findBestMatch, type MatchResult } from '../../lib/constellationMatcher';
import './ConstellationCreator.css';

interface ConstellationCreatorProps {
  entries: DiaryEntry[];
  onComplete: (name: string, lines: ConstellationLine[], matchResult: MatchResult | null) => void;
  onCancel: () => void;
}

// アニメーションフェーズの定義
// reveal を廃止し、"この星座は…" の後に結果テキストと SVG を同時フェードインさせる
type Phase = 'initial' | 'fadeout' | 'suspense' | 'svg-fadein' | 'naming';

// 順番に星をつなぐシンプルな線生成
function generateDateOrderLines(entries: DiaryEntry[]): ConstellationLine[] {
  const lines: ConstellationLine[] = [];
  for (let i = 0; i < entries.length - 1; i++) {
    lines.push({
      fromIndex: i,
      toIndex: i + 1,
    });
  }
  return lines;
}

export function ConstellationCreator({
  entries,
  onComplete,
  onCancel,
}: ConstellationCreatorProps) {
  // アニメーションフェーズ管理
  const [phase, setPhase] = useState<Phase>('initial');
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [constellationName, setConstellationName] = useState('');

  const lines = generateDateOrderLines(entries);

  // 星座判定を実行
  const performMatch = useCallback(() => {
    const userPoints = entries.map(e => e.starPosition);
    const result = findBestMatch(userPoints, 0.1);
    setMatchResult(result);
    return result;
  }, [entries]);

  // ボタン押下時に即座にアニメーション開始
  useEffect(() => {
    // 初期フェーズから自動的にフェードアウト開始
    const timer = setTimeout(() => {
      setPhase('fadeout');

      // フェードアウト完了後 → suspense
      setTimeout(() => {
        setPhase('suspense');

        // 「この星座は……」表示後 → 判定実行 & テキスト+SVGを同時フェードイン
        setTimeout(() => {
          performMatch();
          setPhase('svg-fadein');

          // SVGフェードイン後 → 名前入力（少し長めの余韻）
          setTimeout(() => {
            setPhase('naming');
          }, 2400);
        }, 1500);
      }, 800);
    }, 100);

    return () => clearTimeout(timer);
  }, [performMatch]);

  // 完了ハンドラー
  const handleComplete = () => {
    const name = constellationName.trim();
    if (!name) {
      alert('星座の名前を入力してください');
      return;
    }
    onComplete(name, lines, matchResult);
  };

  // フェーズに応じたUIをレンダリング（透明オーバーレイ）
  // initialフェーズ以降は暗いオーバーレイを維持
  const showDarkOverlay = phase !== 'initial';
  const resultName = matchResult?.constellationName || '不思議な星座';
  const showResult = phase === 'svg-fadein' || phase === 'naming';

  return (
    <div className="constellation-creator-overlay">
      {/* 暗いオーバーレイ（initial以外で表示） */}
      {showDarkOverlay && (
        <div className="dark-overlay" />
      )}

      {/* 溜め演出：「この星座は……」 */}
      {phase === 'suspense' && (
        <div className="reveal-overlay">
          <p className="suspense-text">この星座は……</p>
        </div>
      )}

      {/* 結果発表：「○○座！」 ＋ SVG 同時フェードイン */}
      {showResult && (
        <>
          <div className="reveal-overlay">
            <p className="constellation-result">
              {resultName}！
            </p>
          </div>
          {matchResult && (
            <div className={`svg-reveal-container ${phase === 'naming' ? 'visible' : ''}`}>
              <img
                src={matchResult.svgPath}
                alt={matchResult.constellationName}
                className="constellation-svg-reveal"
              />
            </div>
          )}
        </>
      )}

      {/* 名前入力フェーズ */}
      {phase === 'naming' && (
        <>
          <div className="naming-overlay">
            <div className="naming-card">
              <p className="naming-hint">あなたの星座に名前をつけましょう</p>
              <input
                type="text"
                className="constellation-name-input"
                placeholder={`${resultName}...`}
                value={constellationName}
                onChange={(e) => setConstellationName(e.target.value)}
                maxLength={20}
                autoFocus
              />
              <button
                className="btn btn-primary"
                onClick={handleComplete}
                disabled={!constellationName.trim()}
              >
                この名前で決定
              </button>
            </div>
          </div>
        </>
      )}

      {/* キャンセルボタン（常に左上に表示） */}
      {phase === 'initial' && (
        <button className="cancel-btn" onClick={onCancel}>
          ← 戻る
        </button>
      )}
    </div>
  );
}

export default ConstellationCreator;