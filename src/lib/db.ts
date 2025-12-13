import Dexie, { type Table } from 'dexie';
import type { DiaryEntry, Constellation, StarPosition } from '../types';

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
  entryIds: number[]
): Promise<number> {
  return await db.constellations.add({
    name,
    entryIds,
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
