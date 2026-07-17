import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  MinusIcon,
  PlusIcon,
  XIcon
} from "./icons";
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
  const [isEditingPageNumber, setIsEditingPageNumber] = useState(false);
  const [pageNumberInput, setPageNumberInput] = useState("1");
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

  const jumpToPage = (nextPage: number): void => {
    if (!numPages) {
      return;
    }

    setPageNumber(Math.min(numPages, Math.max(1, nextPage)));
  };

  const startPageNumberEdit = (): void => {
    setPageNumberInput(String(pageNumber));
    setIsEditingPageNumber(true);
  };

  const commitPageNumberEdit = (): void => {
    const nextPage = Number.parseInt(pageNumberInput, 10);

    if (Number.isFinite(nextPage)) {
      jumpToPage(nextPage);
    }

    setIsEditingPageNumber(false);
  };

  const cancelPageNumberEdit = (): void => {
    setPageNumberInput(String(pageNumber));
    setIsEditingPageNumber(false);
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
        setPageNumberInput(String(state.initialPage));
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
    <main className="flex h-dvh min-h-0 flex-col overflow-hidden px-3 py-4 text-zinc-100 sm:px-6">
      <header className="mx-auto mb-4 grid w-full max-w-6xl shrink-0 grid-cols-1 gap-3 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
        <button
          className="flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/70 px-4 py-2.5 font-semibold text-zinc-100 shadow-lg shadow-zinc-950/15 transition duration-75 hover:-translate-y-0.5 hover:border-zinc-500 hover:bg-zinc-800 focus:outline-none focus:ring-4 focus:ring-cyan-300/25 active:translate-y-0"
          type="button"
          onClick={() => window.close()}
        >
          <XIcon className="size-4" />
          Close
        </button>

        <div className="min-w-0 text-left lg:text-center">
          <h1 className="truncate text-lg font-bold text-zinc-50 sm:text-xl">
            {viewerState?.pdfName ?? "Evidence"}
          </h1>
          <div className="mt-1 flex justify-start lg:justify-center">
            {isEditingPageNumber ? (
              <label className="flex items-center justify-center gap-1 text-sm font-semibold text-zinc-400">
                <span>Page</span>
                <input
                  className="h-8 w-16 rounded-md border border-teal-400 bg-zinc-950 px-2 text-center text-zinc-100 outline-none focus:ring-4 focus:ring-teal-400/20"
                  type="number"
                  min={1}
                  max={numPages ?? undefined}
                  value={pageNumberInput}
                  autoFocus
                  onChange={(event) => setPageNumberInput(event.target.value)}
                  onBlur={commitPageNumberEdit}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      commitPageNumberEdit();
                      return;
                    }

                    if (event.key === "Escape") {
                      event.preventDefault();
                      cancelPageNumberEdit();
                    }
                  }}
                />
                <span>of {numPages ?? "-"}</span>
              </label>
            ) : (
              <button
                className="cursor-pointer rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-1.5 text-sm font-semibold text-zinc-400 transition duration-75 hover:border-teal-300/50 hover:bg-zinc-800 hover:text-zinc-100 focus:outline-none focus:ring-4 focus:ring-cyan-300/25"
                type="button"
                onClick={startPageNumberEdit}
                disabled={!numPages}
                title="Jump to page"
              >
                Page {pageNumber} of {numPages ?? "-"}
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <button
            className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900/70 px-3 py-2.5 text-sm font-semibold text-zinc-100 shadow-lg shadow-zinc-950/10 transition duration-75 hover:-translate-y-0.5 hover:border-zinc-500 hover:bg-zinc-800 focus:outline-none focus:ring-4 focus:ring-cyan-300/25 active:translate-y-0 disabled:cursor-default disabled:opacity-50 disabled:hover:translate-y-0"
            type="button"
            onClick={goPrevious}
            disabled={!canGoPrevious}
          >
            <ArrowLeftIcon className="size-4" />
            <span className="hidden sm:inline">Previous</span>
          </button>
          <button
            className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900/70 px-3 py-2.5 text-sm font-semibold text-zinc-100 shadow-lg shadow-zinc-950/10 transition duration-75 hover:-translate-y-0.5 hover:border-zinc-500 hover:bg-zinc-800 focus:outline-none focus:ring-4 focus:ring-cyan-300/25 active:translate-y-0 disabled:cursor-default disabled:opacity-50 disabled:hover:translate-y-0"
            type="button"
            onClick={goNext}
            disabled={!canGoNext}
          >
            <span className="hidden sm:inline">Next</span>
            <ArrowRightIcon className="size-4" />
          </button>
          <div className="flex w-full items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/70 px-3 py-2 shadow-lg shadow-zinc-950/10 sm:w-72">
            <button
              className="grid size-8 cursor-pointer place-items-center rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-100 transition duration-75 hover:bg-zinc-700 focus:outline-none focus:ring-4 focus:ring-cyan-300/25 disabled:cursor-default disabled:opacity-50"
              type="button"
              onClick={zoomOut}
              disabled={zoom <= minZoom}
              aria-label="Zoom out"
            >
              <MinusIcon className="size-4" />
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
              className="grid size-8 cursor-pointer place-items-center rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-100 transition duration-75 hover:bg-zinc-700 focus:outline-none focus:ring-4 focus:ring-cyan-300/25 disabled:cursor-default disabled:opacity-50"
              type="button"
              onClick={zoomIn}
              disabled={zoom >= maxZoom}
              aria-label="Zoom in"
            >
              <PlusIcon className="size-4" />
            </button>
            <span className="w-12 text-right text-sm font-semibold text-zinc-300">
              {zoom}%
            </span>
          </div>
        </div>
      </header>

      <section
        ref={readerRef}
        className="pdf-scroll-surface mx-auto flex min-h-0 w-full max-w-6xl flex-1 items-start justify-center overflow-auto rounded-2xl border border-zinc-800/80 bg-zinc-900/35 p-1 shadow-inner shadow-zinc-950/20 sm:p-2"
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
