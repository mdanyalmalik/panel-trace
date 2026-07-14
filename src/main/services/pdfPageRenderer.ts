import { BrowserWindow } from "electron";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

import {
  PAGE_JPEG_QUALITY,
  PAGE_LONGEST_SIDE
} from "../../shared/indexing";

interface RenderPageResult {
  pageCount: number;
  imageDataUrl: string;
}

const require = createRequire(import.meta.url);
const pdfJsModuleUrl = pathToFileURL(
  require.resolve("pdfjs-dist/build/pdf.mjs")
).toString();
const pdfJsWorkerUrl = pathToFileURL(
  require.resolve("pdfjs-dist/build/pdf.worker.mjs")
).toString();

const rendererHtml = encodeURIComponent(`
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
  </head>
  <body>
    <script type="module">
      import * as pdfjs from "${pdfJsModuleUrl}";

      pdfjs.GlobalWorkerOptions.workerSrc = "${pdfJsWorkerUrl}";

      window.panelTracePdfRenderer = {
        async getPageCount(pdfUrl) {
          const pdfDocument = await pdfjs.getDocument({ url: pdfUrl }).promise;
          const pageCount = pdfDocument.numPages;
          await pdfDocument.destroy();
          return pageCount;
        },
        async renderPage(pdfUrl, pageNumber, longestSide, jpegQuality) {
          const pdfDocument = await pdfjs.getDocument({ url: pdfUrl }).promise;
          const page = await pdfDocument.getPage(pageNumber);
          const baseViewport = page.getViewport({ scale: 1 });
          const scale = Math.min(
            longestSide / Math.max(baseViewport.width, baseViewport.height),
            2
          );
          const viewport = page.getViewport({ scale });
          const canvas = window.document.createElement("canvas");
          const context = canvas.getContext("2d", { alpha: false });

          if (!context) {
            throw new Error("Canvas rendering is unavailable.");
          }

          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, canvas.width, canvas.height);

          await page.render({ canvasContext: context, viewport }).promise;

          const imageDataUrl = canvas.toDataURL("image/jpeg", jpegQuality / 100);
          const pageCount = pdfDocument.numPages;
          canvas.width = 0;
          canvas.height = 0;
          await pdfDocument.destroy();

          return {
            pageCount,
            imageDataUrl
          };
        }
      };
    </script>
  </body>
</html>
`);

const getPdfUrl = (pdfPath: string): string => pathToFileURL(pdfPath).toString();

export class PdfPageRenderer {
  private renderWindow: BrowserWindow | null = null;
  private isReady = false;

  private async getRenderWindow(): Promise<BrowserWindow> {
    if (this.renderWindow && !this.renderWindow.isDestroyed()) {
      return this.renderWindow;
    }

    this.isReady = false;
    this.renderWindow = new BrowserWindow({
      width: 1,
      height: 1,
      show: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
        backgroundThrottling: false,
        webSecurity: false
      }
    });

    await this.renderWindow.loadURL(`data:text/html;charset=utf-8,${rendererHtml}`);
    this.isReady = true;

    return this.renderWindow;
  }

  private async waitUntilReady(): Promise<BrowserWindow> {
    const renderWindow = await this.getRenderWindow();

    if (this.isReady) {
      return renderWindow;
    }

    await new Promise<void>((resolve) => {
      renderWindow.webContents.once("did-finish-load", () => resolve());
    });

    this.isReady = true;
    return renderWindow;
  }

  async getPageCount(pdfPath: string): Promise<number> {
    const renderWindow = await this.waitUntilReady();
    const pdfUrl = getPdfUrl(pdfPath);

    return renderWindow.webContents.executeJavaScript(
      `window.panelTracePdfRenderer.getPageCount(${JSON.stringify(pdfUrl)})`
    ) as Promise<number>;
  }

  async renderPageImage(pdfPath: string, pageNumber: number): Promise<RenderPageResult> {
    const renderWindow = await this.waitUntilReady();
    const pdfUrl = getPdfUrl(pdfPath);

    return renderWindow.webContents.executeJavaScript(
      `window.panelTracePdfRenderer.renderPage(${JSON.stringify(pdfUrl)}, ${pageNumber}, ${PAGE_LONGEST_SIDE}, ${PAGE_JPEG_QUALITY})`
    ) as Promise<RenderPageResult>;
  }

  destroy(): void {
    if (this.renderWindow && !this.renderWindow.isDestroyed()) {
      this.renderWindow.destroy();
    }

    this.renderWindow = null;
    this.isReady = false;
  }
}
