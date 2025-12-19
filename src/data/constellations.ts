// ============================================
// 正解の星座データ定義
// ============================================

/**
 * 2D座標点
 */
export interface Point2D {
    x: number;
    y: number;
}

/**
 * 正解の星座データ
 * ユーザーが描いた点群との比較に使用
 */
export interface ReferenceConstellation {
    /** 星座ID（SVGファイル名と一致） */
    id: string;
    /** 日本語名 */
    name: string;
    /** 正規化された点群 (0-1範囲) - 7点 */
    points: Point2D[];
    /** SVGファイルへのパス（assetsからの相対パス） */
    svgPath: string;
}

// ============================================
// 星座データ定義
// ============================================

/**
 * くらげ座の正解データ
 * SVGの主要な頂点から7点を抽出（触手の先端と傘の頂点）
 * 座標は0-1で正規化（元のSVG viewBoxは300x400）
 */
const kurageConstellation: ReferenceConstellation = {
    id: 'kurage',
    name: 'くらげ座',
    points: [
        // 傘の頂点付近（中央上部）
        { x: 0.55, y: 0.08 },
        // 傘の左側
        { x: 0.28, y: 0.15 },
        // 傘の右側
        { x: 0.78, y: 0.18 },
        // 触手の分岐点（中央）
        { x: 0.50, y: 0.45 },
        // 左の触手先端
        { x: 0.12, y: 0.85 },
        // 中央の触手先端
        { x: 0.31, y: 0.98 },
        // 右の触手先端
        { x: 0.71, y: 0.88 },
    ],
    svgPath: '/src/assets/constellations/kurage.svg',
};

// ============================================
// 星座データリスト
// ============================================

/**
 * 利用可能な全ての正解星座データ
 * 新しい星座を追加する場合はここに追加
 */
export const referenceConstellations: ReferenceConstellation[] = [
    kurageConstellation,
];

/**
 * IDで星座を検索
 */
export function getConstellationById(id: string): ReferenceConstellation | undefined {
    return referenceConstellations.find(c => c.id === id);
}

/**
 * 名前で星座を検索
 */
export function getConstellationByName(name: string): ReferenceConstellation | undefined {
    return referenceConstellations.find(c => c.name === name);
}
