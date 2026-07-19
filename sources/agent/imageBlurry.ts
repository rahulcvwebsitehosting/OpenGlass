// Local blur detection using variance of the Laplacian on the raw image bytes.
// Free heuristic — no API call. Returns 'YES' if the image is likely blurry/broken,
// 'NO' otherwise. Operates on the byte stream as a grayscale approximation, so it
// is intentionally simple and does not decode the actual image pixels.
export async function imageBlurry(src: Uint8Array): Promise<string> {
    if (!src || src.length < 256) {
        return 'YES';
    }

    let sum = 0;
    let sumSq = 0;
    const n = src.length;
    for (let i = 0; i < n; i++) {
        const v = src[i];
        sum += v;
        sumSq += v * v;
    }
    const mean = sum / n;
    const variance = sumSq / n - mean * mean;

    // Apply a cheap 1D Laplacian along the byte array and measure its variance.
    let lapSum = 0;
    let lapSumSq = 0;
    let lapCount = 0;
    for (let i = 1; i < n - 1; i++) {
        const lap = src[i - 1] - 2 * src[i] + src[i + 1];
        lapSum += lap;
        lapSumSq += lap * lap;
        lapCount++;
    }
    const lapMean = lapSum / lapCount;
    const lapVariance = lapSumSq / lapCount - lapMean * lapMean;

    // Low Laplacian variance => few sharp edges => likely blurry.
    const threshold = 10;
    return lapVariance < threshold ? 'YES' : 'NO';
}
