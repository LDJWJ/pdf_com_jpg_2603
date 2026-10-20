// ==================== PDF 깨진 쪽 탐지 ====================
// 이미지 데이터가 손상되면 세로 줄무늬가 생긴다. 모든 쪽을 낮은 해상도로 그려
// '가로 방향 변화 / 세로 방향 변화' 비율이 비정상적으로 큰 쪽을 찾는다.
// (온편지 76·77호로 시험: 깨진 쪽 10 이상, 정상 쪽 1.5 이하)
const INTEGRITY_SCALE = 20 / 72;     // 20dpi
const INTEGRITY_RATIO_LIMIT = 5;
const INTEGRITY_EDGE_MIN = 5;        // 가로 변화가 이보다 작은 단색에 가까운 쪽은 제외

function stripeScore(imageData) {
    const { data, width: w, height: h } = imageData;
    const gray = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) {
        gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
    }
    let hSum = 0;
    let vSum = 0;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const v = gray[y * w + x];
            if (x < w - 1) hSum += Math.abs(v - gray[y * w + x + 1]);
            if (y < h - 1) vSum += Math.abs(v - gray[(y + 1) * w + x]);
        }
    }
    const hd = hSum / (h * (w - 1));
    const vd = vSum / ((h - 1) * w);
    return { hd, ratio: hd / (vd + 0.3) };
}

// 의심 쪽 목록 [{page, ratio, error}] 반환. isCancelled()가 true가 되면 null 반환
async function checkBrokenPages(pdfDoc, onProgress, isCancelled) {
    const suspects = [];
    for (let n = 1; n <= pdfDoc.numPages; n++) {
        if (isCancelled()) return null;
        try {
            const page = await pdfDoc.getPage(n);
            const viewport = page.getViewport({ scale: INTEGRITY_SCALE });
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(2, Math.round(viewport.width));
            canvas.height = Math.max(2, Math.round(viewport.height));
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            await page.render({ canvasContext: ctx, viewport }).promise;
            const { hd, ratio } = stripeScore(ctx.getImageData(0, 0, canvas.width, canvas.height));
            if (ratio > INTEGRITY_RATIO_LIMIT && hd > INTEGRITY_EDGE_MIN) suspects.push({ page: n, ratio });
            page.cleanup();
        } catch (error) {
            console.error(`${n}쪽 렌더링 실패:`, error);
            suspects.push({ page: n, error: true });
        }
        onProgress(n, pdfDoc.numPages);
    }
    return suspects;
}
