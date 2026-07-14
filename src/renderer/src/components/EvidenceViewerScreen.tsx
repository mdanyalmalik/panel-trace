import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

import type { EvidenceViewerState } from "../../../shared/retrieval";
import type { PageProps } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

interface PdfLoadSuccess {
  numPages: number;
}

const pagePadding = 16;
const maxPageWidth = 1200;
const minZoom = 50;
const maxZoom = 200;
const zoomStep = 10;

const clampZoom = (zoomValue: number): number =>
  Math.min(maxZoom, Math.max(minZoom, zoomValue));

const EvidenceViewerScreen = (): JSX.Element => {
  const [viewerState, setViewerState] = useState<EvidenceViewerState | null>(null);
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageWidth, setPageWidth] = useState(720);
  const [pageHeight, setPageHeight] = useState<number | null>(null);
  const [zoom, setZoom] = useState(100);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const readerRef = useRef<HTMLDivElement | null>(null);

  const zoomScale = zoom / 100;
  const scaledPageWidth = Math.round(pageWidth * zoomScale);
  const scaledPageHeight = pageHeight ? Math.round(pageHeight * zoomScale) : undefined;
  const canGoPrevious = pageNumber > 1;
  const canGoNext = numPages !== null && pageNumber < numPages;

  const pdfFile = useMemo(() => {
    if (!pdfData) {
      return null;
    }

    return { data: pdfData };
  }, [pdfData]);

  const goPrevious = (): void => {
    setPageNumber((currentPage) => Math.max(1, currentPage - 1));
  };

  const goNext = (): void => {
    setPageNumber((currentPage) => {
      if (!numPages) {
        return currentPage;
      }

      return Math.min(numPages, currentPage + 1);
    });
  };

  const zoomOut = (): void => {
    setZoom((currentZoom) => clampZoom(currentZoom - zoomStep));
  };

  const zoomIn = (): void => {
    setZoom((currentZoom) => clampZoom(currentZoom + zoomStep));
  };

  useEffect(() => {
    let isMounted = true;

    window.electronAPI
      .getEvidenceViewerState()
      .then((state) => {
        if (!isMounted) {
          return;
        }

        if (!state) {
          setError("Evidence page is unavailable.");
          setIsLoading(false);
          return;
        }

        setViewerState(state);
        setPageNumber(state.initialPage);
        return window.electronAPI.openPdf(state.pdfPath);
      })
      .then((data) => {
        if (isMounted && data) {
          setPdfData(new Uint8Array(data));
        }
      })
      .catch((openError: unknown) => {
        console.error("Unable to open evidence PDF:", openError);
        if (isMounted) {
          setError("Unable to open this evidence page.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const updateWidth = (): void => {
      const containerWidth = readerRef.current?.clientWidth ?? maxPageWidth;
      setPageWidth(Math.max(280, Math.min(maxPageWidth, containerWidth - pagePadding)));
    };

    updateWidth();

    const resizeObserver = new ResizeObserver(updateWidth);
    if (readerRef.current) {
      resizeObserver.observe(readerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        window.close();
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrevious();
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [numPages]);

  useEffect(() => {
    const readerElement = readerRef.current;

    if (!readerElement) {
      return;
    }

    const handleWheel = (event: WheelEvent): void => {
      if (!event.ctrlKey && !event.metaKey) {
        return;
      }

      event.preventDefault();
      const zoomDirection = event.deltaY < 0 ? 1 : -1;
      setZoom((currentZoom) => clampZoom(currentZoom + zoomDirection * zoomStep));
    };

    readerElement.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      readerElement.removeEventListener("wheel", handleWheel);
    };
  }, []);

  const handleLoadSuccess = ({ numPages: loadedPages }: PdfLoadSuccess): void => {
    setNumPages(loadedPages);
    setPageNumber((currentPage) => Math.min(currentPage, loadedPages));
  };

  const handlePageRenderSuccess: NonNullable<PageProps["onRenderSuccess"]> = useCallback((page) => {
    setPageHeight(page.height);
  }, []);

  return (
    <main className="flex h-dvh min-h-0 flex-col overflow-hidden bg-zinc-800 px-3 py-4 text-zinc-100 sm:px-6">
      <header className="mx-auto mb-4 grid w-full max-w-6xl shrink-0 grid-cols-1 gap-3 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
        <button
          className="w-fit cursor-pointer rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2.5 font-semibold text-zinc-100 transition duration-75 hover:-translate-y-0.5 hover:border-zinc-500 hover:bg-zinc-700 focus:outline-none focus:ring-4 focus:ring-cyan-300/25 active:translate-y-0"
          type="button"
          onClick={() => window.close()}
        >
          Close
        </button>

        <div className="min-w-0 text-left lg:text-center">
          <h1 className="truncate text-lg font-bold text-zinc-50 sm:text-xl">
            {viewerState?.pdfName ?? "Evidence"}
          </h1>
          <p className="mt-1 text-sm font-semibold text-zinc-400">
            Page {pageNumber} of {numPages ?? "-"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <button
            className="cursor-pointer rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2.5 text-sm font-semibold text-zinc-100 transition duration-75 hover:-translate-y-0.5 hover:border-zinc-500 hover:bg-zinc-700 focus:outline-none focus:ring-4 focus:ring-cyan-300/25 active:translate-y-0 disabled:cursor-default disabled:opacity-50 disabled:hover:translate-y-0"
            type="button"
            onClick={goPrevious}
            disabled={!canGoPrevious}
          >
            Previous
          </button>
          <button
            className="cursor-pointer rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2.5 text-sm font-semibold text-zinc-100 transition duration-75 hover:-translate-y-0.5 hover:border-zinc-500 hover:bg-zinc-700 focus:outline-none focus:ring-4 focus:ring-cyan-300/25 active:translate-y-0 disabled:cursor-default disabled:opacity-50 disabled:hover:translate-y-0"
            type="button"
            onClick={goNext}
            disabled={!canGoNext}
          >
            Next
          </button>
          <div className="flex w-full items-center gap-2 rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 sm:w-72">
            <button
              className="grid size-8 cursor-pointer place-items-center rounded-md border border-zinc-600 bg-zinc-700 text-lg font-bold leading-none text-zinc-100 transition duration-75 hover:bg-zinc-600 focus:outline-none focus:ring-4 focus:ring-cyan-300/25 disabled:cursor-default disabled:opacity-50"
              type="button"
              onClick={zoomOut}
              disabled={zoom <= minZoom}
              aria-label="Zoom out"
            >
              -
            </button>
            <input
              className="min-w-0 flex-1 cursor-pointer accent-teal-400"
              type="range"
              min={minZoom}
              max={maxZoom}
              step={zoomStep}
              value={zoom}
              onChange={(event) => setZoom(clampZoom(Number(event.target.value)))}
              aria-label="PDF zoom"
            />
            <button
              className="grid size-8 cursor-pointer place-items-center rounded-md border border-zinc-600 bg-zinc-700 text-lg font-bold leading-none text-zinc-100 transition duration-75 hover:bg-zinc-600 focus:outline-none focus:ring-4 focus:ring-cyan-300/25 disabled:cursor-default disabled:opacity-50"
              type="button"
              onClick={zoomIn}
              disabled={zoom >= maxZoom}
              aria-label="Zoom in"
            >
              +
            </button>
            <span className="w-12 text-right text-sm font-semibold text-zinc-300">
              {zoom}%
            </span>
          </div>
        </div>
      </header>

      <section
        ref={readerRef}
        className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 items-start justify-center overflow-auto bg-zinc-800 p-1 sm:p-2"
        aria-label="Evidence PDF viewer"
      >
        {isLoading ? <p className="mt-16 text-zinc-400">Loading evidence...</p> : null}
        {error ? <p className="mt-16 font-bold text-red-300">{error}</p> : null}

        {!isLoading && !error && pdfFile ? (
          <div
            className="shrink-0"
            style={{ width: scaledPageWidth, height: scaledPageHeight }}
          >
            <div
              className="origin-top-left"
              style={{ width: pageWidth, transform: `scale(${zoomScale})` }}
            >
              <Document
                file={pdfFile}
                loading={<p className="mt-16 text-zinc-400">Loading pages...</p>}
                error={<p className="mt-16 font-bold text-red-300">Unable to render this PDF.</p>}
                onLoadSuccess={handleLoadSuccess}
              >
                <Page
                  pageNumber={pageNumber}
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                  width={pageWidth}
                  onRenderSuccess={handlePageRenderSuccess}
                />
              </Document>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
};

export default EvidenceViewerScreen;
