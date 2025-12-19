import Dexie, { type Table } from 'dexie';
import type { DiaryEntry, Constellation, StarPosition, ConstellationLine } from '../types';

// ============================================
// Dexie データベースクラス
// ============================================

class SeizaNikkiDB extends Dexie {
  diaryEntries!: Table<DiaryEntry, number>;
  constellations!: Table<Constellation, number>;

  constructor() {
    super('SeizaNikkiDB');

    this.version(1).stores({
      // id は自動インクリメント、date にインデックス
      diaryEntries: '++id, date, createdAt',
      // id は自動インクリメント
      constellations: '++id, createdAt',
    });
  }
}

// シングルトンインスタンス
export const db = new SeizaNikkiDB();

// ============================================
// DiaryEntry 操作関数
// ============================================

/**
 * 日記エントリを追加する
 */
export async function addDiaryEntry(
  date: string,
  photoBlob: Blob,
  memo: string,
  starPosition: StarPosition
): Promise<number> {
  return await db.diaryEntries.add({
    date,
    photoBlob,
    memo,
    starPosition,
    createdAt: new Date(),
  });
}

/**
 * 指定した日付の日記エントリを取得する
 */
export async function getDiaryEntryByDate(date: string): Promise<DiaryEntry | undefined> {
  return await db.diaryEntries.where('date').equals(date).first();
}

/**
 * 指定したIDの日記エントリを取得する
 */
export async function getDiaryEntryById(id: number): Promise<DiaryEntry | undefined> {
  return await db.diaryEntries.get(id);
}

/**
 * すべての日記エントリを取得する（日付順）
 */
export async function getAllDiaryEntries(): Promise<DiaryEntry[]> {
  return await db.diaryEntries.orderBy('date').toArray();
}

/**
 * 星座に紐づいていない直近の日記エントリを取得する（最大7件）
 */
export async function getUnassignedEntries(limit: number = 7): Promise<DiaryEntry[]> {
  // すでに星座に使われているエントリIDを取得
  const constellations = await db.constellations.toArray();
  const usedIds = new Set(constellations.flatMap((c) => c.entryIds));

  // 全エントリから未使用のものをフィルタ
  const allEntries = await db.diaryEntries.orderBy('date').toArray();
  const unassigned = allEntries.filter((entry) => entry.id && !usedIds.has(entry.id));

  return unassigned.slice(0, limit);
}

/**
 * 今日すでに日記を書いたかどうかを確認する
 */
export async function hasTodayEntry(): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];
  const entry = await getDiaryEntryByDate(today);
  return entry !== undefined;
}

/**
 * 日記エントリを更新する
 */
export async function updateDiaryEntry(
  id: number,
  updates: Partial<Omit<DiaryEntry, 'id' | 'createdAt'>>
): Promise<void> {
  await db.diaryEntries.update(id, updates);
}

/**
 * 日記エントリを削除する
 */
export async function deleteDiaryEntry(id: number): Promise<void> {
  await db.diaryEntries.delete(id);
}

// ============================================
// Constellation 操作関数
// ============================================

/**
 * 星座を作成する
 */
export async function createConstellation(
  name: string,
  entryIds: number[],
  lines: ConstellationLine[],
  matchedConstellationId?: string
): Promise<number> {
  return await db.constellations.add({
    name,
    entryIds,
    lines,
    matchedConstellationId,
    createdAt: new Date(),
  });
}

/**
 * すべての星座を取得する
 */
export async function getAllConstellations(): Promise<Constellation[]> {
  return await db.constellations.orderBy('createdAt').toArray();
}

/**
 * 指定したIDの星座を取得する
 */
export async function getConstellationById(id: number): Promise<Constellation | undefined> {
  return await db.constellations.get(id);
}

/**
 * 星座に紐づく日記エントリをすべて取得する
 */
export async function getEntriesForConstellation(
  constellationId: number
): Promise<DiaryEntry[]> {
  const constellation = await db.constellations.get(constellationId);
  if (!constellation) return [];

  const entries = await Promise.all(
    constellation.entryIds.map((id) => db.diaryEntries.get(id))
  );

  return entries.filter((entry): entry is DiaryEntry => entry !== undefined);
}

/**
 * 星座の名前を更新する
 */
export async function updateConstellationName(
  id: number,
  name: string
): Promise<void> {
  await db.constellations.update(id, { name });
}

/**
 * 星座を削除する
 */
export async function deleteConstellation(id: number): Promise<void> {
  await db.constellations.delete(id);
}

// ============================================
// デバッグ・テスト用関数
// ============================================

/**
 * 全データを削除してリセットする
 */
export async function resetAllData(): Promise<void> {
  await db.diaryEntries.clear();
  await db.constellations.clear();
  console.log('✅ All data has been reset');
}

/**
 * テスト用の仮データを生成する（3つの星座 + 未割り当て星）
 */
export async function createTestData(): Promise<void> {
  // まずリセット
  await resetAllData();

  // ダミーの写真Blob（1x1ピクセルの透明PNG）
  const dummyBlob = new Blob(
    [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 10, 73, 68, 65, 84, 120, 156, 99, 0, 1, 0, 0, 5, 0, 1, 13, 10, 45, 180, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130])],
    { type: 'image/png' }
  );

  const formatDate = (year: number, month: number, day: number) => {
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  };

  const randomLength = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  const makeMemo = (label: string) => {
    const base = `テストメモ ${label}`;
    const targetLength = randomLength(0, 100);
    if (base.length >= targetLength) return base.slice(0, targetLength);

    const filler = 'abcdefghijklmnopqrstuvwxyz ';
    let memo = base;
    while (memo.length < targetLength) {
      memo += filler;
    }
    return memo.slice(0, targetLength);
  };

  // 星座1: 「希望の星」（7つの星）
  const constellation1Entries: number[] = [];
  const positions1 = [
    { x: 0.2, y: 0.3 },
    { x: 0.4, y: 0.15 },
    { x: 0.6, y: 0.25 },
    { x: 0.8, y: 0.2 },
    { x: 0.3, y: 0.6 },
    { x: 0.5, y: 0.7 },
    { x: 0.7, y: 0.55 },
  ];
  for (let i = 0; i < 7; i++) {
    const id = await addDiaryEntry(
      formatDate(2025, 11, i + 1),
      dummyBlob,
      makeMemo(`星座1-${i + 1}`),
      positions1[i]
    );
    constellation1Entries.push(id);
  }
  await createConstellation('星のカービィ', constellation1Entries, [
    { fromIndex: 0, toIndex: 1 },
    { fromIndex: 1, toIndex: 2 },
    { fromIndex: 2, toIndex: 3 },
    { fromIndex: 1, toIndex: 4 },
    { fromIndex: 4, toIndex: 5 },
    { fromIndex: 5, toIndex: 6 },
  ]);

  // 星座2: 「夢の軌跡」（7つの星）
  const constellation2Entries: number[] = [];
  const positions2 = [
    { x: 0.15, y: 0.2 },
    { x: 0.35, y: 0.35 },
    { x: 0.5, y: 0.15 },
    { x: 0.65, y: 0.4 },
    { x: 0.8, y: 0.25 },
    { x: 0.4, y: 0.65 },
    { x: 0.6, y: 0.75 },
  ];
  for (let i = 0; i < 7; i++) {
    const id = await addDiaryEntry(
      formatDate(2025, 11, i + 8),
      dummyBlob,
      makeMemo(`星座2-${i + 1}`),
      positions2[i]
    );
    constellation2Entries.push(id);
  }
  await createConstellation('おうし座', constellation2Entries, [
    { fromIndex: 0, toIndex: 1 },
    { fromIndex: 1, toIndex: 2 },
    { fromIndex: 2, toIndex: 3 },
    { fromIndex: 3, toIndex: 4 },
    { fromIndex: 1, toIndex: 5 },
    { fromIndex: 5, toIndex: 6 },
  ]);

  // 星座3: 「キラキラ」（7つの星）
  const constellation3Entries: number[] = [];
  const positions3 = [
    { x: 0.5, y: 0.1 },
    { x: 0.3, y: 0.3 },
    { x: 0.7, y: 0.3 },
    { x: 0.2, y: 0.5 },
    { x: 0.8, y: 0.5 },
    { x: 0.4, y: 0.7 },
    { x: 0.6, y: 0.7 },
  ];
  for (let i = 0; i < 7; i++) {
    const id = await addDiaryEntry(
      formatDate(2025, 11, 15 + i),
      dummyBlob,
      makeMemo(`星座3-${i + 1}`),
      positions3[i]
    );
    constellation3Entries.push(id);
  }
  await createConstellation('星野リゾート', constellation3Entries, [
    { fromIndex: 0, toIndex: 1 },
    { fromIndex: 0, toIndex: 2 },
    { fromIndex: 1, toIndex: 3 },
    { fromIndex: 2, toIndex: 4 },
    { fromIndex: 1, toIndex: 5 },
    { fromIndex: 2, toIndex: 6 },
  ]);

  // 未割り当ての星（6つ）
  const unassignedPositions = [
    { x: 0.25, y: 0.4 },
    { x: 0.5, y: 0.3 },
    { x: 0.75, y: 0.45 },
    { x: 0.4, y: 0.6 },
    { x: 0.6, y: 0.5 },
    { x: 0.3, y: 0.7 },
  ];
  for (let i = 0; i < 6; i++) {
    await addDiaryEntry(
      formatDate(2025, 11, 22 + i),
      dummyBlob,
      makeMemo(`未割り当て-${i + 1}`),
      unassignedPositions[i]
    );
  }

  console.log('✅ Test data created: 3 constellations + 6 unassigned entries');
}
