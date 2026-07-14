import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

import PdfIndexStatusBadge from "./PdfIndexStatusBadge";
import ReaderChatPanel from "./ReaderChatPanel";
import { loadChatHistory, saveChatHistory } from "../services/chatHistoryStore";
import { chatService } from "../services/chatService";
import type { ChatMessage } from "../types/chat";
import type { PdfFile } from "../../../shared/electronApi";
import type { PdfIndexProgress } from "../../../shared/indexing";
import type { RetrievalResult } from "../../../shared/retrieval";
import type { PageProps } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

interface PdfReaderScreenProps {
  folderPath: string;
  pdf: PdfFile;
  onBack: () => void;
}

interface PdfLoadSuccess {
  numPages: number;
}

const pagePadding = 16;
const maxPageWidth = 1600;
const minZoom = 50;
const maxZoom = 200;
const zoomStep = 10;
const chatDefaultWidth = 360;
const chatMinWidth = 240;
const chatMaxWidth = 560;
const minReaderWidth = 320;

const clampZoom = (zoomValue: number): number =>
  Math.min(maxZoom, Math.max(minZoom, zoomValue));

const getMaxChatWidth = (containerWidth: number): number =>
  Math.max(chatMinWidth, Math.min(chatMaxWidth, containerWidth - minReaderWidth));

const clampChatWidth = (width: number, containerWidth: number): number =>
  Math.min(getMaxChatWidth(containerWidth), Math.max(chatMinWidth, width));

const isTextInputTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable
  );
};

const PdfReaderScreen = ({ folderPath, pdf, onBack }: PdfReaderScreenProps): JSX.Element => {
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageWidth, setPageWidth] = useState(720);
  const [pageHeight, setPageHeight] = useState<number | null>(null);
  const [zoom, setZoom] = useState(100);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [chatWidth, setChatWidth] = useState(chatDefaultWidth);
  const [isChatResizing, setIsChatResizing] = useState(false);
  const [indexProgress, setIndexProgress] = useState<PdfIndexProgress | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadedChatPath, setLoadedChatPath] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const readerShellRef = useRef<HTMLDivElement | null>(null);
  const readerRef = useRef<HTMLDivElement | null>(null);
  const chatPanelRef = useRef<HTMLDivElement | null>(null);

  const canGoPrevious = pageNumber > 1;
  const canGoNext = numPages !== null && pageNumber < numPages;
  const zoomScale = zoom / 100;
  const scaledPageWidth = Math.round(pageWidth * zoomScale);
  const scaledPageHeight = pageHeight ? Math.round(pageHeight * zoomScale) : undefined;

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

  const toggleChat = (): void => {
    setIsChatOpen((currentValue) => !currentValue);
  };

  const getChatWidthFromPointer = (clientX: number): number => {
    const shellBounds = readerShellRef.current?.getBoundingClientRect();

    if (!shellBounds) {
      return chatWidth;
    }

    return clampChatWidth(shellBounds.right - clientX, shellBounds.width);
  };

  const startChatResize = (event: React.PointerEvent<HTMLDivElement>): void => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsChatOpen(true);
    setIsChatResizing(true);
    setChatWidth(getChatWidthFromPointer(event.clientX));
  };

  const resizeChat = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (!isChatResizing) {
      return;
    }

    setChatWidth(getChatWidthFromPointer(event.clientX));
  };

  const stopChatResize = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    setIsChatResizing(false);
  };

  const sendMessage = async (): Promise<void> => {
    const content = input.trim();

    if (!content || isSending) {
      return;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      createdAt: new Date().toISOString()
    };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput("");
    setChatError(null);
    setIsSending(true);

    try {
      const response = await chatService.sendMessage({
        messages: nextMessages,
        folderPath,
        currentPdfPath: pdf.path,
        currentPage: pageNumber,
        query: content
      });

      const assistantMessage = response.message;

      if (assistantMessage) {
        setMessages((currentMessages) => [...currentMessages, assistantMessage]);
      }
    } catch (sendError) {
      console.error("Unable to send chat message:", sendError);
      setChatError("The message was saved, but a response could not be requested.");
    } finally {
      setIsSending(false);
    }
  };

  const openEvidence = async (result: RetrievalResult): Promise<void> => {
    setChatError(null);

    try {
      await window.electronAPI.openEvidenceViewer({
        sourceFolderPath: folderPath,
        sourcePdfPath: pdf.path,
        sourceCurrentPage: pageNumber,
        targetPdfPath: result.pdfPath,
        targetPage: result.pageNumber
      });
    } catch (openError) {
      console.error("Unable to open evidence viewer:", openError);
      setChatError("Unable to open that evidence page.");
    }
  };

  useEffect(() => {
    let isMounted = true;

    setPdfData(null);
    setPageNumber(1);
    setNumPages(null);
    setPageHeight(null);
    setZoom(100);
    setIsLoading(true);
    setError(null);
    setIsChatOpen(true);
    setIsChatResizing(false);
    setLoadedChatPath(null);
    setMessages(loadChatHistory(pdf.path));
    setLoadedChatPath(pdf.path);
    setInput("");
    setIsSending(false);
    setChatError(null);

    window.electronAPI
      .openPdf(pdf.path)
      .then((data) => {
        if (isMounted) {
          setPdfData(new Uint8Array(data));
        }
      })
      .catch((openError: unknown) => {
        console.error("Unable to open PDF:", openError);
        if (isMounted) {
          setError("Unable to open this PDF.");
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
  }, [pdf.path]);

  useEffect(() => {
    let isMounted = true;

    window.electronAPI
      .getPdfIndexStatus(pdf.path)
      .then((progress) => {
        if (isMounted) {
          setIndexProgress(progress);
        }
      })
      .catch((statusError: unknown) => {
        console.error("Unable to load PDF index status:", statusError);
      });

    const unsubscribe = window.electronAPI.onPdfIndexProgress((progress) => {
      if (progress.pdfPath === pdf.path) {
        setIndexProgress(progress);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [pdf.path]);

  useEffect(() => {
    if (loadedChatPath !== pdf.path) {
      return;
    }

    saveChatHistory(pdf.path, messages);
  }, [loadedChatPath, messages, pdf.path]);

  useEffect(() => {
    const shellElement = readerShellRef.current;

    if (!shellElement) {
      return;
    }

    const clampCurrentChatWidth = (): void => {
      setChatWidth((currentWidth) => clampChatWidth(currentWidth, shellElement.clientWidth));
    };

    clampCurrentChatWidth();

    const resizeObserver = new ResizeObserver(clampCurrentChatWidth);
    resizeObserver.observe(shellElement);

    return () => {
      resizeObserver.disconnect();
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
    const chatPanelElement = chatPanelRef.current;

    if (!chatPanelElement) {
      return;
    }

    if (isChatOpen) {
      chatPanelElement.removeAttribute("inert");
      return;
    }

    chatPanelElement.setAttribute("inert", "");
  }, [isChatOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        onBack();
        return;
      }

      if (isTextInputTarget(event.target)) {
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
  }, [numPages, onBack]);

  useEffect(() => {
    const readerElement = readerRef.current;

    if (!readerElement) {
      return;
    }

    const handleWheel = (event: WheelEvent): void => {
      if (!event.ctrlKey) {
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

  const handleLoadError = (loadError: Error): void => {
    console.error("Unable to render PDF:", loadError);
    setError("Unable to render this PDF.");
  };

  return (
    <main className="flex h-dvh min-h-0 flex-col overflow-hidden bg-zinc-800 px-3 py-4 text-zinc-100 sm:px-6 lg:px-8">
      <header className="mx-auto mb-4 grid w-full max-w-7xl shrink-0 grid-cols-1 gap-3 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
        <button
          className="w-fit cursor-pointer rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2.5 font-semibold text-zinc-100 transition duration-75 hover:-translate-y-0.5 hover:border-zinc-500 hover:bg-zinc-700 focus:outline-none focus:ring-4 focus:ring-cyan-300/25 active:translate-y-0 sm:px-5 sm:py-3"
          type="button"
          onClick={onBack}
        >
          Back
        </button>

        <div className="min-w-0 text-left lg:text-center">
          <div className="flex min-w-0 flex-wrap items-center gap-2 lg:justify-center">
            <h1 className="truncate text-lg font-bold text-zinc-50 sm:text-xl lg:text-2xl">
              {pdf.name}
            </h1>
            <PdfIndexStatusBadge progress={indexProgress} />
          </div>
          <p className="mt-1 line-clamp-2 break-all text-xs text-zinc-400 sm:text-sm">
            {pdf.path}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 lg:justify-end">
          <button
            className="cursor-pointer rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2.5 text-sm font-semibold text-zinc-100 transition duration-75 hover:-translate-y-0.5 hover:border-zinc-500 hover:bg-zinc-700 focus:outline-none focus:ring-4 focus:ring-cyan-300/25 active:translate-y-0 disabled:cursor-default disabled:opacity-50 disabled:hover:translate-y-0 sm:px-4 sm:py-3 sm:text-base"
            type="button"
            onClick={goPrevious}
            disabled={!canGoPrevious}
          >
            Previous
          </button>
          <span className="min-w-20 text-center text-sm font-semibold text-zinc-300 sm:min-w-24">
            Page {pageNumber} of {numPages ?? "-"}
          </span>
          <button
            className="cursor-pointer rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2.5 text-sm font-semibold text-zinc-100 transition duration-75 hover:-translate-y-0.5 hover:border-zinc-500 hover:bg-zinc-700 focus:outline-none focus:ring-4 focus:ring-cyan-300/25 active:translate-y-0 disabled:cursor-default disabled:opacity-50 disabled:hover:translate-y-0 sm:px-4 sm:py-3 sm:text-base"
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

          <button
            className="cursor-pointer rounded-lg border border-teal-600/70 bg-teal-700 px-3 py-2.5 text-sm font-semibold text-white transition duration-75 hover:-translate-y-0.5 hover:bg-teal-600 focus:outline-none focus:ring-4 focus:ring-teal-400/25 active:translate-y-0 sm:px-4 sm:py-3 sm:text-base"
            type="button"
            onClick={toggleChat}
            aria-expanded={isChatOpen}
            aria-controls="reader-chat-panel"
          >
            {isChatOpen ? "Close Chat" : "Open Chat"}
          </button>
        </div>
      </header>

      <div
        ref={readerShellRef}
        className={`mx-auto flex min-h-0 w-full max-w-[1920px] flex-1 overflow-hidden ${
          isChatResizing ? "cursor-col-resize select-none" : ""
        }`}
      >
        <section
          ref={readerRef}
          className="flex min-h-0 min-w-0 flex-1 items-start justify-center overflow-auto bg-zinc-800 p-1 sm:p-2"
          aria-label="PDF reader"
        >
          {isLoading ? <p className="mt-16 text-zinc-400">Loading PDF...</p> : null}
          {error ? <p className="mt-16 font-bold text-red-300">{error}</p> : null}

          {!isLoading && !error && pdfFile ? (
            <div
              className="shrink-0"
              style={{
                width: scaledPageWidth,
                height: scaledPageHeight
              }}
            >
              <div
                className="origin-top-left"
                style={{
                  width: pageWidth,
                  transform: `scale(${zoomScale})`
                }}
              >
                <Document
                  file={pdfFile}
                  loading={<p className="mt-16 text-zinc-400">Loading pages...</p>}
                  error={
                    <p className="mt-16 font-bold text-red-300">Unable to render this PDF.</p>
                  }
                  onLoadSuccess={handleLoadSuccess}
                  onLoadError={handleLoadError}
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

        <div
          ref={chatPanelRef}
          id="reader-chat-panel"
          className={`relative h-full min-h-0 shrink-0 overflow-hidden ${
            isChatResizing ? "" : "transition-[width,opacity] duration-200 ease-in-out"
          } ${isChatOpen ? "opacity-100" : "pointer-events-none w-0 opacity-0"}`}
          style={{
            width: isChatOpen ? chatWidth : 0
          }}
          aria-hidden={!isChatOpen}
        >
          {isChatOpen ? (
            <div
              className="absolute inset-y-0 left-0 z-10 w-2 -translate-x-1 cursor-col-resize touch-none bg-transparent transition-colors duration-75 hover:bg-teal-400/35"
              role="separator"
              aria-label="Resize chat"
              aria-orientation="vertical"
              onPointerDown={startChatResize}
              onPointerMove={resizeChat}
              onPointerUp={stopChatResize}
              onPointerCancel={stopChatResize}
            >
              <div
                className={`mx-auto h-full w-px transition-colors duration-75 ${
                  isChatResizing ? "bg-teal-300" : "bg-transparent"
                }`}
              />
            </div>
          ) : null}

          <div
            className={`h-full min-h-0 transition-transform duration-200 ease-in-out ${
              isChatOpen ? "translate-x-0" : "translate-x-full"
            }`}
            style={{
              width: chatWidth
            }}
          >
            <ReaderChatPanel
              messages={messages}
              input={input}
              isSending={isSending}
              error={chatError}
              isSearching={isSending}
              onInputChange={setInput}
              onOpenEvidence={openEvidence}
              onSend={sendMessage}
            />
          </div>
        </div>
      </div>
    </main>
  );
};

export default PdfReaderScreen;
