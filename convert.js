const puppeteer = require('puppeteer');
const { PDFDocument } = require('pdf-lib');
const fs = require('fs');

// ── 配置（按需修改，或通过环境变量覆盖）────────────────────────────
const WIDTH = Number(process.env.SLIDE_WIDTH) || 1920;
const HEIGHT = Number(process.env.SLIDE_HEIGHT) || 1080;
const TOTAL_PAGES = Number(process.env.SLIDE_COUNT) || 14;
const OUTPUT_FILE = process.env.OUTPUT_FILE || 'output.pdf';

// 幻灯片站点的基础 URL（不要带 hash 或 query）
// 本地示例: http://localhost:8080
// 线上示例: https://your-deck.example.com
const BASE_URL = process.env.SLIDE_URL || 'http://localhost:8080';

function buildSlideUrl(pageNum) {
  const base = BASE_URL.replace(/[#?].*$/, '').replace(/\/$/, '');
  // html-ppt 内置 preview 模式：只渲染第 N 页，无动画/无键盘依赖，最适合 PDF 导出
  return `${base}/?preview=${pageNum}`;
}

async function waitForSlideReady(page, pageNum) {
  await page.waitForFunction(
    (expected) => {
      const deck = document.querySelector('.deck');
      if (!deck) return false;

      const slides = [...deck.querySelectorAll(':scope > .slide')];
      if (!slides.length) return false;

      const active = slides.find(
        (s) =>
          s.classList.contains('is-active') &&
          getComputedStyle(s).display !== 'none' &&
          getComputedStyle(s).opacity !== '0'
      );
      if (!active) return false;

      const activeIndex = slides.indexOf(active);
      if (activeIndex !== expected - 1) return false;

      if (!document.fonts || document.fonts.status === 'loading') return false;
      const images = [...active.querySelectorAll('img')];
      return images.every((img) => img.complete);
    },
    { timeout: 30000 },
    pageNum
  );
}

(async () => {
  if (BASE_URL.includes('localhost:8080') && !process.env.SLIDE_URL) {
    console.warn(
      '⚠  请先在 convert.js 中设置 BASE_URL，或通过 SLIDE_URL 环境变量传入你的幻灯片地址。'
    );
  }

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT });

  await page.addStyleTag({
    content: `
      @page {
        size: ${WIDTH}px ${HEIGHT}px !important;
        margin: 0 !important;
      }
      @media print {
        html, body {
          width: ${WIDTH}px !important;
          height: ${HEIGHT}px !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .deck {
          width: ${WIDTH}px !important;
          height: ${HEIGHT}px !important;
          overflow: hidden !important;
        }
        .deck > .slide {
          width: ${WIDTH}px !important;
          height: ${HEIGHT}px !important;
        }
        .progress-bar,
        .notes-overlay,
        .overview,
        .mini-slide {
          display: none !important;
        }
      }
    `,
  });

  const mergedPdf = await PDFDocument.create();

  console.log(`开始导出 ${TOTAL_PAGES} 页横屏 PDF（preview 模式）...`);
  console.log(`源地址: ${BASE_URL}`);

  for (let i = 1; i <= TOTAL_PAGES; i++) {
    const slideUrl = buildSlideUrl(i);
    console.log(`正在抓取第 ${i} / ${TOTAL_PAGES} 页... ${slideUrl}`);

    await page.goto(slideUrl, { waitUntil: 'networkidle0', timeout: 60000 });
    await waitForSlideReady(page, i);

    const slideTitle = await page.evaluate(() => {
      const active = document.querySelector('.deck > .slide.is-active');
      return active?.querySelector('h1, h2, h3')?.textContent?.trim() || '(无标题)';
    });
    console.log(`  → 当前页标题: ${slideTitle}`);

    const pagePdfBuffer = await page.pdf({
      // width > height 已是 16:9 横屏；再设 landscape:true 会额外旋转 90° 变成竖屏
      landscape: false,
      preferCSSPageSize: false,
      width: `${WIDTH}px`,
      height: `${HEIGHT}px`,
      printBackground: true,
      margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
    });

    const tempDoc = await PDFDocument.load(pagePdfBuffer);
    const pageCount = tempDoc.getPageCount();
    if (pageCount !== 1) {
      console.warn(`  ⚠ 第 ${i} 页 PDF 含 ${pageCount} 页，仅取第一页`);
    }

    const [copiedPage] = await mergedPdf.copyPages(tempDoc, [0]);
    mergedPdf.addPage(copiedPage);
  }

  const pdfBytes = await mergedPdf.save();
  fs.writeFileSync(OUTPUT_FILE, pdfBytes);

  await browser.close();
  console.log(`🎉 全部 ${TOTAL_PAGES} 页导出完成: ${OUTPUT_FILE}`);
})();
