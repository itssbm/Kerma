import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createCanvas } from '@napi-rs/canvas';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const args = process.argv.slice(2);
if (args.length < 2) {
    console.error('Usage: render-pdf-pages.mjs <input.pdf> <output-dir> [target-width] [max-pages]');
    process.exit(64);
}

const [inputPath, outputDir] = args;
const targetWidth = Number(args[2]) || 1000;
const maxPages = Number(args[3]) || 0;
const pdfjsRoot = path.dirname(fileURLToPath(import.meta.resolve('pdfjs-dist/package.json')));
const directoryUrl = value => pathToFileURL(
    value.endsWith(path.sep) ? value : `${value}${path.sep}`
).href;

fs.mkdirSync(outputDir, { recursive: true });

const loadingTask = getDocument({
    data: new Uint8Array(fs.readFileSync(inputPath)),
    cMapUrl: directoryUrl(path.join(pdfjsRoot, 'cmaps')),
    cMapPacked: true,
    standardFontDataUrl: directoryUrl(path.join(pdfjsRoot, 'standard_fonts')),
    wasmUrl: directoryUrl(path.join(pdfjsRoot, 'wasm')),
    useSystemFonts: true
});

const document = await loadingTask.promise;
const renderCount = maxPages > 0
    ? Math.min(document.numPages, maxPages)
    : document.numPages;
const renderedPaths = [];

for (let pageIndex = 1; pageIndex <= renderCount; pageIndex += 1) {
    const page = await document.getPage(pageIndex);
    const baseViewport = page.getViewport({ scale: 1 });
    if (!baseViewport.width || !baseViewport.height) continue;

    const scale = targetWidth / baseViewport.width;
    const viewport = page.getViewport({ scale });
    const width = Math.max(1, Math.round(viewport.width));
    const height = Math.max(1, Math.round(viewport.height));
    const canvas = createCanvas(width, height);
    const context = canvas.getContext('2d');

    await page.render({
        canvas,
        canvasContext: context,
        viewport,
        background: 'rgb(255,255,255)'
    }).promise;

    const imageData = await canvas.encode('jpeg', 72);
    const filename = `page-${String(pageIndex).padStart(3, '0')}.jpg`;
    const pagePath = path.join(outputDir, filename);
    fs.writeFileSync(pagePath, imageData);
    renderedPaths.push(`${pagePath}\t${width}\t${height}`);
    page.cleanup();
}

await loadingTask.destroy();
console.log(renderedPaths.join('\n'));
