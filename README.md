# html-ppt-to-pdf

将 [html-ppt](https://github.com/lewislulu/html-ppt-skill) 幻灯片（本地或 Vercel 部署）导出为 16:9 横屏、多页合并的 PDF。

## 使用

**要求：** Node.js 18+；已可访问的 html-ppt 幻灯片站点。

```bash
git clone https://github.com/Rosemary-Yan/html-ppt-to-pdf.git
cd html-ppt-to-pdf
npm install
```

导出前在浏览器确认 `预览地址/?preview=1` 与 `/?preview=2` 内容不同（`预览地址` 为根 URL，不含 `#` 或 query）。

```bash
# 本地
SLIDE_URL=http://localhost:8080 SLIDE_COUNT=14 OUTPUT_FILE=output.pdf npm run convert

# Vercel
SLIDE_URL=https://your-deck.vercel.app SLIDE_COUNT=14 OUTPUT_FILE=output.pdf npm run convert
```

`SLIDE_URL` 填本地或 Vercel 根地址之一即可，无需同时使用。输出文件生成于当前目录。

## 配置

均可通过环境变量或 `convert.js` 顶部常量设置：

| 环境变量 / 常量 | 默认值 | 说明 |
|-----------------|--------|------|
| `SLIDE_URL` / `BASE_URL` | `http://localhost:8080` | 幻灯片根地址 |
| `SLIDE_COUNT` / `TOTAL_PAGES` | `14` | 总页数 |
| `OUTPUT_FILE` | `output.pdf` | 输出路径 |
| `SLIDE_WIDTH` | `1920` | 页宽（px） |
| `SLIDE_HEIGHT` | `1080` | 页高（px） |

## 说明

- 逐页访问 `?preview=N`，经 Puppeteer 导出后由 pdf-lib 合并，避免浏览器打印时页码不切换、内容重复为第一页。
- 固定 `1920×1080` 且 `landscape: false`，避免横屏尺寸被二次旋转为竖屏。
- 仅适配 html-ppt（`.deck`、`.slide.is-active`、`?preview=`）。

## 故障排查

| 问题 | 处理 |
|------|------|
| 找不到 Chrome | `npx puppeteer browsers install chrome` |
| 某一页超时 | 检查 `/?preview=N` 是否可访问；核对 `SLIDE_COUNT`；调大 `waitForSlideReady` 的 `timeout` |
| PDF 页内容重复 | 确认幻灯片支持 `?preview=` 且预览页内容互异 |

## License

Rosemary-Yan
