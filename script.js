// PDF.js worker 설정
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// jsPDF 참조
const { jsPDF } = window.jspdf;

// ==================== 전역 변수 ====================
// Image Converter
let pdfDocument = null;
let convertedImages = [];
let pdfFileName = '';

// PDF Compressor
let compressPdfDocument = null;
let compressPdfFileName = '';
let compressPdfOriginalSize = 0;
let compressedPdfBlob = null;

// ==================== DOM 요소 - 공통 ====================
const hamburgerBtn = document.getElementById('hamburgerBtn');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const navItems = document.querySelectorAll('.nav-item');
const converterTool = document.getElementById('converterTool');
const compressorTool = document.getElementById('compressorTool');

// ==================== DOM 요소 - 이미지 변환 ====================
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const selectFileBtn = document.getElementById('selectFileBtn');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const pageCount = document.getElementById('pageCount');
const removeFileBtn = document.getElementById('removeFileBtn');
const settingsPanel = document.getElementById('settingsPanel');
const qualitySlider = document.getElementById('qualitySlider');
const qualityValue = document.getElementById('qualityValue');
const qualityGroup = document.getElementById('qualityGroup');
const scaleSlider = document.getElementById('scaleSlider');
const scaleValue = document.getElementById('scaleValue');
const customRangeInput = document.getElementById('customRangeInput');
const pageRangeInput = document.getElementById('pageRangeInput');
const convertBtn = document.getElementById('convertBtn');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const previewArea = document.getElementById('previewArea');
const firstPagePreview = document.getElementById('firstPagePreview');
const lastPagePreview = document.getElementById('lastPagePreview');
const downloadSection = document.getElementById('downloadSection');
const downloadZipBtn = document.getElementById('downloadZipBtn');
const downloadIndividualBtn = document.getElementById('downloadIndividualBtn');
const individualLinks = document.getElementById('individualLinks');
const linksList = document.getElementById('linksList');

// ==================== DOM 요소 - PDF 압축 ====================
const compressDropZone = document.getElementById('compressDropZone');
const compressFileInput = document.getElementById('compressFileInput');
const compressSelectFileBtn = document.getElementById('compressSelectFileBtn');
const compressFileInfo = document.getElementById('compressFileInfo');
const compressFileName = document.getElementById('compressFileName');
const compressFileSize = document.getElementById('compressFileSize');
const compressPageCount = document.getElementById('compressPageCount');
const compressRemoveFileBtn = document.getElementById('compressRemoveFileBtn');
const compressSettingsPanel = document.getElementById('compressSettingsPanel');
const compressScaleSlider = document.getElementById('compressScaleSlider');
const compressScaleValue = document.getElementById('compressScaleValue');
const compressBtn = document.getElementById('compressBtn');
const compressProgressContainer = document.getElementById('compressProgressContainer');
const compressProgressFill = document.getElementById('compressProgressFill');
const compressProgressText = document.getElementById('compressProgressText');
const compressResultSection = document.getElementById('compressResultSection');
const originalSizeEl = document.getElementById('originalSize');
const compressedSizeEl = document.getElementById('compressedSize');
const savingsPercentEl = document.getElementById('savingsPercent');
const downloadCompressedBtn = document.getElementById('downloadCompressedBtn');

// ==================== 유틸리티 함수 ====================
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ==================== 메뉴 전환 로직 ====================
function switchTool(toolName) {
    // 모든 도구 숨기기
    converterTool.classList.add('hidden');
    compressorTool.classList.add('hidden');

    // 선택한 도구 표시
    if (toolName === 'converter') {
        converterTool.classList.remove('hidden');
    } else if (toolName === 'compressor') {
        compressorTool.classList.remove('hidden');
    }

    // 네비게이션 활성화 상태 업데이트
    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.dataset.tool === toolName) {
            item.classList.add('active');
        }
    });

    // 모바일: 메뉴 닫기
    closeMobileMenu();
}

// ==================== 모바일 메뉴 ====================
function openMobileMenu() {
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('active');
    hamburgerBtn.classList.add('active');
}

function closeMobileMenu() {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('active');
    hamburgerBtn.classList.remove('active');
}

function toggleMobileMenu() {
    if (sidebar.classList.contains('open')) {
        closeMobileMenu();
    } else {
        openMobileMenu();
    }
}

// ==================== 이벤트 리스너 설정 ====================
function setupEventListeners() {
    // 메뉴 전환
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            switchTool(item.dataset.tool);
        });
    });

    // 모바일 메뉴
    hamburgerBtn.addEventListener('click', toggleMobileMenu);
    sidebarOverlay.addEventListener('click', closeMobileMenu);

    // ========== 이미지 변환 이벤트 ==========
    // 파일 선택 버튼
    selectFileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
    });

    // 드롭존 클릭
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    // 파일 입력 변경
    fileInput.addEventListener('change', handleFileSelect);

    // 드래그 앤 드롭
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type === 'application/pdf') {
            loadPDF(files[0]);
        }
    });

    // 파일 제거
    removeFileBtn.addEventListener('click', resetAll);

    // 이미지 형식 변경
    document.querySelectorAll('input[name="format"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'png') {
                qualityGroup.classList.add('hidden');
            } else {
                qualityGroup.classList.remove('hidden');
            }
        });
    });

    // 품질 슬라이더
    qualitySlider.addEventListener('input', () => {
        qualityValue.textContent = qualitySlider.value;
    });

    // 해상도 슬라이더
    scaleSlider.addEventListener('input', () => {
        scaleValue.textContent = scaleSlider.value;
    });

    // 페이지 범위 선택
    document.querySelectorAll('input[name="pageRange"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'custom') {
                customRangeInput.classList.remove('hidden');
            } else {
                customRangeInput.classList.add('hidden');
            }
        });
    });

    // 변환 버튼
    convertBtn.addEventListener('click', startConversion);

    // 다운로드 버튼
    downloadZipBtn.addEventListener('click', downloadAsZip);
    downloadIndividualBtn.addEventListener('click', toggleIndividualLinks);

    // ========== PDF 압축 이벤트 ==========
    // 파일 선택 버튼
    compressSelectFileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        compressFileInput.click();
    });

    // 드롭존 클릭
    compressDropZone.addEventListener('click', () => {
        compressFileInput.click();
    });

    // 파일 입력 변경
    compressFileInput.addEventListener('change', handleCompressFileSelect);

    // 드래그 앤 드롭
    compressDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        compressDropZone.classList.add('drag-over');
    });

    compressDropZone.addEventListener('dragleave', () => {
        compressDropZone.classList.remove('drag-over');
    });

    compressDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        compressDropZone.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type === 'application/pdf') {
            loadCompressPDF(files[0]);
        }
    });

    // 파일 제거
    compressRemoveFileBtn.addEventListener('click', resetCompressAll);

    // 해상도 슬라이더
    compressScaleSlider.addEventListener('input', () => {
        compressScaleValue.textContent = compressScaleSlider.value;
    });

    // 압축 버튼
    compressBtn.addEventListener('click', startCompression);

    // 압축된 PDF 다운로드
    downloadCompressedBtn.addEventListener('click', downloadCompressedPDF);
}

// ==================== 이미지 변환 기능 ====================
// 파일 선택 핸들러
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
        loadPDF(file);
    }
}

// PDF 로드
async function loadPDF(file) {
    try {
        pdfFileName = file.name.replace('.pdf', '');
        const arrayBuffer = await file.arrayBuffer();
        pdfDocument = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        // UI 업데이트
        fileName.textContent = file.name;
        pageCount.textContent = `${pdfDocument.numPages} 페이지`;

        dropZone.classList.add('hidden');
        fileInfo.classList.remove('hidden');
        settingsPanel.classList.remove('hidden');

        // 이전 변환 결과 초기화
        hideResults();
    } catch (error) {
        console.error('PDF 로드 실패:', error);
        alert('PDF 파일을 로드하는데 실패했습니다.');
    }
}

// 모든 상태 초기화
function resetAll() {
    pdfDocument = null;
    convertedImages = [];
    pdfFileName = '';
    fileInput.value = '';

    dropZone.classList.remove('hidden');
    fileInfo.classList.add('hidden');
    settingsPanel.classList.add('hidden');

    hideResults();
}

// 결과 영역 숨기기
function hideResults() {
    progressContainer.classList.add('hidden');
    previewArea.classList.add('hidden');
    downloadSection.classList.add('hidden');
    individualLinks.classList.add('hidden');
    convertedImages = [];
}

// 페이지 범위 파싱
function parsePageRange(rangeStr, maxPages) {
    const pages = new Set();
    const parts = rangeStr.split(',').map(s => s.trim());

    for (const part of parts) {
        if (part.includes('-')) {
            const [start, end] = part.split('-').map(n => parseInt(n.trim()));
            if (!isNaN(start) && !isNaN(end)) {
                for (let i = Math.max(1, start); i <= Math.min(maxPages, end); i++) {
                    pages.add(i);
                }
            }
        } else {
            const pageNum = parseInt(part);
            if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= maxPages) {
                pages.add(pageNum);
            }
        }
    }

    return Array.from(pages).sort((a, b) => a - b);
}

// 변환 시작
async function startConversion() {
    if (!pdfDocument) return;

    const format = document.querySelector('input[name="format"]:checked').value;
    const quality = parseFloat(qualitySlider.value);
    const scale = parseFloat(scaleSlider.value);
    const rangeType = document.querySelector('input[name="pageRange"]:checked').value;

    let pagesToConvert = [];
    if (rangeType === 'all') {
        for (let i = 1; i <= pdfDocument.numPages; i++) {
            pagesToConvert.push(i);
        }
    } else {
        const rangeStr = pageRangeInput.value.trim();
        if (!rangeStr) {
            alert('페이지 범위를 입력해주세요.');
            return;
        }
        pagesToConvert = parsePageRange(rangeStr, pdfDocument.numPages);
        if (pagesToConvert.length === 0) {
            alert('유효한 페이지 범위를 입력해주세요.');
            return;
        }
    }

    // UI 업데이트
    convertBtn.disabled = true;
    progressContainer.classList.remove('hidden');
    hideResults();
    progressContainer.classList.remove('hidden');

    convertedImages = [];

    try {
        for (let i = 0; i < pagesToConvert.length; i++) {
            const pageNum = pagesToConvert[i];
            const progress = Math.round(((i + 1) / pagesToConvert.length) * 100);
            updateProgress(progress);

            const imageData = await renderPage(pageNum, format, quality, scale);
            convertedImages.push({
                pageNum,
                data: imageData,
                format: format === 'jpeg' ? 'jpg' : 'png'
            });
        }

        // 변환 완료
        showResults();
    } catch (error) {
        console.error('변환 실패:', error);
        alert('페이지 변환 중 오류가 발생했습니다.');
    } finally {
        convertBtn.disabled = false;
    }
}

// 페이지 렌더링
async function renderPage(pageNum, format, quality, scale) {
    const page = await pdfDocument.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
        canvasContext: context,
        viewport: viewport
    }).promise;

    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    return canvas.toDataURL(mimeType, format === 'jpeg' ? quality : undefined);
}

// 진행률 업데이트
function updateProgress(percent) {
    progressFill.style.width = `${percent}%`;
    progressText.textContent = `${percent}%`;
}

// 결과 표시
function showResults() {
    if (convertedImages.length === 0) return;

    // 미리보기 표시
    firstPagePreview.src = convertedImages[0].data;
    lastPagePreview.src = convertedImages[convertedImages.length - 1].data;

    previewArea.classList.remove('hidden');
    downloadSection.classList.remove('hidden');

    // 개별 다운로드 링크 생성
    generateIndividualLinks();
}

// 개별 다운로드 링크 생성
function generateIndividualLinks() {
    linksList.innerHTML = '';

    convertedImages.forEach((img) => {
        const link = document.createElement('a');
        link.href = img.data;
        link.download = `${pdfFileName}_page_${img.pageNum}.${img.format}`;
        link.className = 'page-link';
        link.textContent = `페이지 ${img.pageNum}`;
        linksList.appendChild(link);
    });
}

// 개별 다운로드 링크 토글
function toggleIndividualLinks() {
    individualLinks.classList.toggle('hidden');
}

// ZIP 다운로드
async function downloadAsZip() {
    if (convertedImages.length === 0) return;

    downloadZipBtn.disabled = true;
    downloadZipBtn.textContent = 'ZIP 생성 중...';

    try {
        const zip = new JSZip();

        for (const img of convertedImages) {
            // Base64 데이터에서 실제 데이터 추출
            const base64Data = img.data.split(',')[1];
            const fileName = `${pdfFileName}_page_${img.pageNum}.${img.format}`;
            zip.file(fileName, base64Data, { base64: true });
        }

        const blob = await zip.generateAsync({ type: 'blob' });
        saveAs(blob, `${pdfFileName}_images.zip`);
    } catch (error) {
        console.error('ZIP 생성 실패:', error);
        alert('ZIP 파일 생성 중 오류가 발생했습니다.');
    } finally {
        downloadZipBtn.disabled = false;
        downloadZipBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            ZIP으로 다운로드
        `;
    }
}

// ==================== PDF 압축 기능 ====================
// 파일 선택 핸들러
function handleCompressFileSelect(e) {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
        loadCompressPDF(file);
    }
}

// PDF 로드 (압축용)
async function loadCompressPDF(file) {
    try {
        compressPdfFileName = file.name.replace('.pdf', '');
        compressPdfOriginalSize = file.size;

        const arrayBuffer = await file.arrayBuffer();
        compressPdfDocument = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        // UI 업데이트
        compressFileName.textContent = file.name;
        compressFileSize.textContent = formatFileSize(file.size);
        compressPageCount.textContent = `${compressPdfDocument.numPages} 페이지`;

        compressDropZone.classList.add('hidden');
        compressFileInfo.classList.remove('hidden');
        compressSettingsPanel.classList.remove('hidden');

        // 이전 결과 초기화
        hideCompressResults();
    } catch (error) {
        console.error('PDF 로드 실패:', error);
        alert('PDF 파일을 로드하는데 실패했습니다.');
    }
}

// 압축 상태 초기화
function resetCompressAll() {
    compressPdfDocument = null;
    compressPdfFileName = '';
    compressPdfOriginalSize = 0;
    compressedPdfBlob = null;
    compressFileInput.value = '';

    compressDropZone.classList.remove('hidden');
    compressFileInfo.classList.add('hidden');
    compressSettingsPanel.classList.add('hidden');

    hideCompressResults();
}

// 압축 결과 숨기기
function hideCompressResults() {
    compressProgressContainer.classList.add('hidden');
    compressResultSection.classList.add('hidden');
    compressedPdfBlob = null;
}

// 압축 진행률 업데이트
function updateCompressProgress(percent) {
    compressProgressFill.style.width = `${percent}%`;
    compressProgressText.textContent = `${percent}%`;
}

// 압축 시작
async function startCompression() {
    if (!compressPdfDocument) return;

    const compressionLevel = parseFloat(document.querySelector('input[name="compressionLevel"]:checked').value);
    const scale = parseFloat(compressScaleSlider.value);
    const numPages = compressPdfDocument.numPages;

    // UI 업데이트
    compressBtn.disabled = true;
    compressProgressContainer.classList.remove('hidden');
    compressResultSection.classList.add('hidden');

    try {
        // 첫 페이지를 렌더링하여 PDF 크기 계산
        const firstPage = await compressPdfDocument.getPage(1);
        const viewport = firstPage.getViewport({ scale });

        // jsPDF 생성 (첫 페이지 크기 기준)
        const pdf = new jsPDF({
            orientation: viewport.width > viewport.height ? 'landscape' : 'portrait',
            unit: 'pt',
            format: [viewport.width, viewport.height]
        });

        // 모든 페이지 처리
        for (let i = 1; i <= numPages; i++) {
            const progress = Math.round((i / numPages) * 100);
            updateCompressProgress(progress);

            const page = await compressPdfDocument.getPage(i);
            const pageViewport = page.getViewport({ scale });

            // Canvas에 렌더링
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = pageViewport.width;
            canvas.height = pageViewport.height;

            await page.render({
                canvasContext: context,
                viewport: pageViewport
            }).promise;

            // Canvas를 JPEG로 변환
            const imageData = canvas.toDataURL('image/jpeg', compressionLevel);

            // 첫 페이지가 아니면 새 페이지 추가
            if (i > 1) {
                pdf.addPage([pageViewport.width, pageViewport.height],
                    pageViewport.width > pageViewport.height ? 'landscape' : 'portrait');
            }

            // 이미지를 PDF에 추가
            pdf.addImage(imageData, 'JPEG', 0, 0, pageViewport.width, pageViewport.height);
        }

        // PDF Blob 생성
        compressedPdfBlob = pdf.output('blob');

        // 결과 표시
        showCompressResults();
    } catch (error) {
        console.error('압축 실패:', error);
        alert('PDF 압축 중 오류가 발생했습니다.');
    } finally {
        compressBtn.disabled = false;
    }
}

// 압축 결과 표시
function showCompressResults() {
    if (!compressedPdfBlob) return;

    const compressedSize = compressedPdfBlob.size;
    const savings = ((compressPdfOriginalSize - compressedSize) / compressPdfOriginalSize * 100);

    originalSizeEl.textContent = formatFileSize(compressPdfOriginalSize);
    compressedSizeEl.textContent = formatFileSize(compressedSize);

    if (savings > 0) {
        savingsPercentEl.textContent = `-${savings.toFixed(1)}%`;
        savingsPercentEl.style.color = '#28a745';
    } else {
        savingsPercentEl.textContent = `+${Math.abs(savings).toFixed(1)}%`;
        savingsPercentEl.style.color = '#dc3545';
    }

    compressResultSection.classList.remove('hidden');
}

// 압축된 PDF 다운로드
function downloadCompressedPDF() {
    if (!compressedPdfBlob) return;

    saveAs(compressedPdfBlob, `${compressPdfFileName}_compressed.pdf`);
}

// ==================== 초기화 ====================
setupEventListeners();
