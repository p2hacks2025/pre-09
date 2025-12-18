// ============================================
// 星座判定ロジック
// ユーザーの点群と正解データを比較して最も近い星座を返す
// ============================================

import { type Point2D, referenceConstellations, type ReferenceConstellation } from '../data/constellations';

/**
 * マッチング結果
 */
export interface MatchResult {
    /** マッチした星座ID */
    constellationId: string;
    /** マッチした星座名 */
    constellationName: string;
    /** 類似度 (0-1、1が完全一致) */
    similarity: number;
    /** SVGファイルパス */
    svgPath: string;
}

// ============================================
// 点群の正規化
// ============================================

/**
 * 点群の重心を計算
 */
function getCentroid(points: Point2D[]): Point2D {
    const n = points.length;
    if (n === 0) return { x: 0, y: 0 };

    const sum = points.reduce(
        (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
        { x: 0, y: 0 }
    );

    return { x: sum.x / n, y: sum.y / n };
}

/**
 * 点群を重心が原点になるように平行移動
 */
function centerPoints(points: Point2D[]): Point2D[] {
    const centroid = getCentroid(points);
    return points.map(p => ({
        x: p.x - centroid.x,
        y: p.y - centroid.y,
    }));
}

/**
 * 点群のスケール（原点からの平均距離）を計算
 */
function getScale(points: Point2D[]): number {
    const n = points.length;
    if (n === 0) return 1;

    const totalDist = points.reduce((sum, p) => {
        return sum + Math.sqrt(p.x * p.x + p.y * p.y);
    }, 0);

    return totalDist / n || 1;
}

/**
 * 点群を正規化（重心を原点に、スケールを1に）
 */
function normalizePoints(points: Point2D[]): Point2D[] {
    const centered = centerPoints(points);
    const scale = getScale(centered);

    return centered.map(p => ({
        x: p.x / scale,
        y: p.y / scale,
    }));
}

// ============================================
// 点群のマッチング（最適な対応を見つける）
// ============================================

/**
 * 2点間の距離の二乗
 */
function distanceSquared(a: Point2D, b: Point2D): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
}

/**
 * 貪欲法で点群同士の最適な対応を見つける
 * 各ユーザー点に最も近い参照点を割り当て
 */
function findBestCorrespondence(userPoints: Point2D[], refPoints: Point2D[]): number[] {
    const n = userPoints.length;
    const correspondence: number[] = new Array(n).fill(-1);
    const usedRefIndices = new Set<number>();

    // 各ユーザー点について、最も近い未使用の参照点を見つける
    for (let i = 0; i < n; i++) {
        let bestRefIdx = -1;
        let bestDist = Infinity;

        for (let j = 0; j < refPoints.length; j++) {
            if (usedRefIndices.has(j)) continue;

            const dist = distanceSquared(userPoints[i], refPoints[j]);
            if (dist < bestDist) {
                bestDist = dist;
                bestRefIdx = j;
            }
        }

        if (bestRefIdx !== -1) {
            correspondence[i] = bestRefIdx;
            usedRefIndices.add(bestRefIdx);
        }
    }

    return correspondence;
}

/**
 * 対応付けられた点群間の平均二乗誤差を計算
 */
function calculateMSE(
    userPoints: Point2D[],
    refPoints: Point2D[],
    correspondence: number[]
): number {
    let totalError = 0;
    let count = 0;

    for (let i = 0; i < userPoints.length; i++) {
        const refIdx = correspondence[i];
        if (refIdx >= 0 && refIdx < refPoints.length) {
            totalError += distanceSquared(userPoints[i], refPoints[refIdx]);
            count++;
        }
    }

    return count > 0 ? totalError / count : Infinity;
}

// ============================================
// 類似度計算
// ============================================

/**
 * 2つの点群間の類似度を計算 (0-1)
 * 両方の点群を正規化してから比較
 */
function calculateSimilarity(userPoints: Point2D[], refConstellation: ReferenceConstellation): number {
    // 点数が不一致の場合は類似度を下げる（完全不一致ではない）
    const pointCountDiff = Math.abs(userPoints.length - refConstellation.points.length);
    const pointCountPenalty = Math.max(0, 1 - pointCountDiff * 0.1);

    // 正規化
    const normalizedUser = normalizePoints(userPoints);
    const normalizedRef = normalizePoints(refConstellation.points);

    // 最適な対応を見つける
    const correspondence = findBestCorrespondence(normalizedUser, normalizedRef);

    // 平均二乗誤差を計算
    const mse = calculateMSE(normalizedUser, normalizedRef, correspondence);

    // MSEを類似度に変換（指数関数で0-1の範囲に）
    // MSEが0なら類似度1、MSEが大きいほど類似度は0に近づく
    const rawSimilarity = Math.exp(-mse * 2);

    // 点数ペナルティを適用
    return rawSimilarity * pointCountPenalty;
}

// ============================================
// メインAPI
// ============================================

/**
 * ユーザーの点群に最も類似する星座を見つける
 * @param userPoints ユーザーが描いた点群（StarPosition形式、0-1正規化済み）
 * @param threshold 最低類似度閾値（これ未満ならnullを返す）デフォルト0.3
 * @returns マッチング結果、または閾値未満ならnull
 */
export function findBestMatch(
    userPoints: Point2D[],
    threshold: number = 0.3
): MatchResult | null {
    if (userPoints.length === 0) {
        return null;
    }

    let bestMatch: MatchResult | null = null;
    let bestSimilarity = -1;

    for (const refConstellation of referenceConstellations) {
        const similarity = calculateSimilarity(userPoints, refConstellation);

        if (similarity > bestSimilarity) {
            bestSimilarity = similarity;
            bestMatch = {
                constellationId: refConstellation.id,
                constellationName: refConstellation.name,
                similarity,
                svgPath: refConstellation.svgPath,
            };
        }
    }

    // 閾値チェック
    if (bestMatch && bestMatch.similarity < threshold) {
        return null;
    }

    return bestMatch;
}

/**
 * 全ての星座との類似度を計算（デバッグ・UI表示用）
 */
export function calculateAllSimilarities(userPoints: Point2D[]): MatchResult[] {
    if (userPoints.length === 0) {
        return [];
    }

    return referenceConstellations.map(refConstellation => {
        const similarity = calculateSimilarity(userPoints, refConstellation);
        return {
            constellationId: refConstellation.id,
            constellationName: refConstellation.name,
            similarity,
            svgPath: refConstellation.svgPath,
        };
    }).sort((a, b) => b.similarity - a.similarity);
}

// Re-export types for convenience
export type { Point2D, ReferenceConstellation } from '../data/constellations';
