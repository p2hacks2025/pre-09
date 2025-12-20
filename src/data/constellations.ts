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
    svgPath: '/constellations/kurage.svg',
};

/**
 * イルカ座の正解データ
 * SVGの主要な頂点から7点を抽出
 * 座標は0-1で正規化（元のSVG viewBoxは300x400）
 */
const irukaConstellation: ReferenceConstellation = {
    id: 'iruka',
    name: 'いるか座',
    points: [
        // 頭部（左上）
        { x: 0.12, y: 0.09 },
        // 口先
        { x: 0.28, y: 0.16 },
        // 体の中央上部
        { x: 0.51, y: 0.42 },
        // 背びれ付近
        { x: 0.91, y: 0.31 },
        // 尾の付け根
        { x: 0.67, y: 0.79 },
        // 尾の先端上
        { x: 0.83, y: 0.93 },
        // 尾の先端下
        { x: 0.57, y: 0.94 },
    ],
    svgPath: '/constellations/iruka.svg',
};

/**
 * さそり座の正解データ
 * SVGの主要な頂点から7点を抽出
 * 座標は0-1で正規化（元のSVG viewBoxは300x400）
 */
const sasoriConstellation: ReferenceConstellation = {
    id: 'sasori',
    name: 'さそり座',
    points: [
        // 右の爪
        { x: 0.37, y: 0.20 },
        // 左の爪
        { x: 0.15, y: 0.40 },
        // 頭部（星マーク）
        { x: 0.52, y: 0.39 },
        // 体の左側
        { x: 0.24, y: 0.50 },
        // 体の中央
        { x: 0.37, y: 0.74 },
        // 尾の先端付近（右上）
        { x: 0.90, y: 0.46 },
        // 尾の先端（下）
        { x: 0.70, y: 0.99 },
    ],
    svgPath: '/constellations/sasori.svg',
};

/**
 * ピ座（ピザ）の正解データ
 * SVGの主要な頂点から7点を抽出
 * 座標は0-1で正規化（元のSVG viewBoxは300x400）
 */
const pizzaConstellation: ReferenceConstellation = {
    id: 'pizza',
    name: 'ピ座',
    points: [
        // ピザの先端（左下）
        { x: 0.20, y: 0.90 },
        // ピザの左端（上部）
        { x: 0.30, y: 0.48 },
        // ピザの上端（クラスト左）
        { x: 0.55, y: 0.42 },
        // ピザの上端（クラスト右）
        { x: 0.80, y: 0.50 },
        // トッピング1
        { x: 0.35, y: 0.60 },
        // トッピング2
        { x: 0.50, y: 0.55 },
        // トッピング3
        { x: 0.65, y: 0.65 },
    ],
    svgPath: '/constellations/pizza.svg',
};

/**
 * 座・ソード（剣）の正解データ
 * SVGの主要な頂点から7点を抽出
 * 座標は0-1で正規化（元のSVG viewBoxは300x400）
 */
const swordConstellation: ReferenceConstellation = {
    id: 'sword',
    name: '座・ソード',
    points: [
        // 剣の先端（上部）
        { x: 0.25, y: 0.10 },
        // 刃の左側
        { x: 0.15, y: 0.35 },
        // 刃の右側
        { x: 0.35, y: 0.40 },
        // 鍔（つば）の左
        { x: 0.10, y: 0.60 },
        // 鍔（つば）の右
        { x: 0.45, y: 0.65 },
        // 柄（つか）
        { x: 0.25, y: 0.75 },
        // 柄頭（ポンメル）
        { x: 0.25, y: 0.90 },
    ],
    svgPath: '/constellations/sword.svg',
};

/**
 * えい座（エイ）の正解データ
 * SVGの主要な頂点から7点を抽出
 * 座標は0-1で正規化（元のSVG viewBoxは72x96）
 */
const eiConstellation: ReferenceConstellation = {
    id: 'ei',
    name: 'えい座',
    points: [
        // 体の中央上部
        { x: 0.55, y: 0.22 },
        // 左の翼先端
        { x: 0.08, y: 0.38 },
        // 右の翼先端
        { x: 0.92, y: 0.55 },
        // 体の中央
        { x: 0.50, y: 0.55 },
        // 尾の付け根
        { x: 0.37, y: 0.65 },
        // 尾の中間
        { x: 0.20, y: 0.80 },
        // 尾の先端
        { x: 0.05, y: 0.95 },
    ],
    svgPath: '/constellations/ei.svg',
};

/**
 * ぎょう座（餃子）の正解データ
 * SVGの主要な頂点から7点を抽出
 * 座標は0-1で正規化（元のSVG viewBoxは300x400）
 */
const gyozaConstellation: ReferenceConstellation = {
    id: 'gyoza',
    name: 'ぎょう座',
    points: [
        // 左端（ひだ部分）
        { x: 0.05, y: 0.72 },
        // 上部のひだ（左）
        { x: 0.25, y: 0.58 },
        // 上部のひだ（中央）
        { x: 0.50, y: 0.52 },
        // 上部のひだ（右）
        { x: 0.75, y: 0.58 },
        // 右端
        { x: 0.87, y: 0.65 },
        // 底部（中央）
        { x: 0.45, y: 0.78 },
        // 底部（右）
        { x: 0.65, y: 0.75 },
    ],
    svgPath: '/constellations/gyoza.svg',
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
    irukaConstellation,
    sasoriConstellation,
    pizzaConstellation,
    swordConstellation,
    eiConstellation,
    gyozaConstellation,
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
