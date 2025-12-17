// ============================================
// 星座日記 型定義
// ============================================

// ============================================
// 共通定数（座標系を統一するため）
// ============================================

/**
 * 星座キャンバスと写真クロッピングで共通のサイズ定数
 * これにより、星座描画領域・クロッピング枠・星タップ領域が一致する
 */
export const CANVAS_CONSTANTS = {
  /** 星座1つあたりの全体幅 */
  CONSTELLATION_WIDTH: 400,
  /** 星座1つあたりの全体高さ（PADDING_Y_TOP + PADDING_Y_BOTTOM + STAR_AREA_HEIGHT） */
  CONSTELLATION_HEIGHT: 610,
  /** 左右のパディング */
  PADDING_X: 50,
  /** 上側パディング（星エリア上の余白を多めに確保） */
  PADDING_Y_TOP: 160,
  /** 下側パディング */
  PADDING_Y_BOTTOM: 50,
  /** 星描画領域の幅（写真と一致） */
  STAR_AREA_WIDTH: 300,
  /** 星描画領域の高さ（写真と一致）- 3:4比率 */
  STAR_AREA_HEIGHT: 400,
  /** クロッピングのアスペクト比 */
  CROP_ASPECT: 3 / 4,
} as const;

/**
 * 星の位置情報（写真上の相対座標）
 * x, y は 0〜1 の範囲で正規化された値
 */
export interface StarPosition {
  x: number;
  y: number;
}

/**
 * 1日分の日記エントリ
 */
export interface DiaryEntry {
  id?: number;
  /** 日付（YYYY-MM-DD 形式） */
  date: string;
  /** 写真データ */
  photoBlob: Blob;
  /** ひとことメモ */
  memo: string;
  /** 写真上の星の位置 */
  starPosition: StarPosition;
  /** 作成日時 */
  createdAt: Date;
}

/**
 * 完成した星座
 */
export interface Constellation {
  id?: number;
  /** ユーザーがつけた星座の名前 */
  name: string;
  /** 紐づく DiaryEntry の ID（7件） */
  entryIds: number[];
  /** 星をつなぐ線の配列 */
  lines: ConstellationLine[];
  /** 作成日時 */
  createdAt: Date;
}

/**
 * 星座キャンバス上の星（描画用）
 */
export interface Star {
  /** 対応する DiaryEntry の ID */
  entryId: number;
  /** キャンバス上の X 座標 */
  x: number;
  /** キャンバス上の Y 座標 */
  y: number;
  /** 星の明るさ（0〜255） */
  brightness: number;
  /** 星のサイズ */
  size: number;
  /** グループ内で最も古い星かどうか */
  isOldest?: boolean;
  /** グループ内で最も新しい星かどうか */
  isNewest?: boolean;
  /** ラベル表示用の日付 (MM/DD) */
  dateLabel?: string;
}

/**
 * 星座の線（星同士をつなぐ）
 */
export interface ConstellationLine {
  /** 始点の Star インデックス */
  fromIndex: number;
  /** 終点の Star インデックス */
  toIndex: number;
}

/**
 * 星座描画用のデータ
 */
export interface ConstellationData {
  /** 星座の名前 */
  name: string;
  /** 星の配列 */
  stars: Star[];
  /** 星をつなぐ線の配列 */
  lines: ConstellationLine[];
}

// ============================================
// アプリケーション状態の型
// ============================================

/**
 * アプリの画面状態
 */
export type AppView =
  | 'home'           // ホーム画面
  | 'entry'          // 日記入力画面
  | 'star-placer'    // 星配置画面
  | 'constellation'  // 星座表示画面
  | 'gallery';       // 過去の星座一覧

/**
 * 日記入力フォームの状態
 */
export interface DiaryFormState {
  /** 選択した写真のプレビューURL */
  photoPreviewUrl: string | null;
  /** 写真の Blob データ */
  photoBlob: Blob | null;
  /** メモの内容 */
  memo: string;
  /** 星の位置（配置済みの場合） */
  starPosition: StarPosition | null;
}

/**
 * 星詳細モーダルの状態
 */
export interface StarDetailState {
  /** 表示中かどうか */
  isOpen: boolean;
  /** 表示する DiaryEntry */
  entry: DiaryEntry | null;
}

// ============================================
// イベント・コールバックの型
// ============================================

/**
 * 星がクリックされたときのコールバック
 */
export type OnStarClick = (entryId: number) => void;

/**
 * 星の位置が決定されたときのコールバック
 */
export type OnStarPositionSelect = (position: StarPosition) => void;

/**
 * 写真が選択されたときのコールバック
 */
export type OnPhotoSelect = (blob: Blob, previewUrl: string) => void;
