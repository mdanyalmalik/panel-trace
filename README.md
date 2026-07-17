# Panel Trace

Panel Trace is a local-first desktop manga/PDF reader with spoiler-aware retrieval and cited reasoning.

The app lets you add folders of PDFs, read them one page at a time, index pages with Voyage multimodal embeddings, and ask questions in the reader chat. Gemini answers with Markdown and clickable evidence citations while Panel Trace enforces a spoiler boundary around the current reading position.

## Current Status

Panel Trace is an early desktop MVP. It currently supports PDF folders, page-level retrieval, Gemini multimodal reasoning, and clickable evidence citations. It does not yet support image folders, CBZ/CBR archives, OCR, panel detection, or a production database.

## Features

- Electron desktop app with React, TypeScript, Vite, Tailwind CSS, and `react-pdf`.
- Main Menu, Settings, Library, PDF List, PDF Reader, and separate Evidence Viewer screens.
- Library folders are saved locally and can be removed.
- Direct-child PDFs are listed with natural sorting, so `Volume 2.pdf` appears before `Volume 10.pdf`.
- One-page-at-a-time PDF reader with previous/next navigation, keyboard shortcuts, zoom controls, Ctrl/Cmd-scroll zoom, and click-to-jump page numbers.
- Resizable reader chat panel with per-PDF chat history and a clear-chat action.
- Secure Voyage and Gemini API key settings using Electron `safeStorage`; saved keys are never returned to the renderer.
- Background PDF indexing with one Voyage document embedding per page.
- Per-PDF indexing status and retry controls in the PDF list.
- Spoiler-aware retrieval:
  - searches only ready indexes
  - searches earlier PDFs in the same folder
  - searches only earlier pages in the current PDF
  - never searches future pages, later PDFs, or other folders
- Gemini reasoning flow:
  - first crafts a better retrieval query from the user question and current page image
  - then receives the current page, retrieved evidence pages, metadata, chat history, and shared system prompt
  - returns Markdown with inline `evidence:<id>` citations
- Clickable evidence citations in chat.
- User questions show the page number they were asked on.
- Dev-mode reasoning logs for prompts, retrieval query output, retrieval results, and final Markdown. Image data and API keys are not logged.
- Separate simplified evidence viewer window with navigation and zoom, while the main reader stays where it is.

## How Reasoning Works

1. Add a folder to the Library.
2. Panel Trace discovers direct-child PDFs and queues them for indexing.
3. Each PDF page is rendered to an image in a hidden Electron renderer.
4. The page image is embedded with Voyage using `voyage-multimodal-3.5` and `input_type: "document"`.
5. Page embeddings are stored locally.
6. In the reader chat, Gemini receives your question and the current page image to craft a retrieval query.
7. The crafted query is embedded with Voyage using `input_type: "query"`.
8. The query embedding is blended with the current page embedding when available.
9. Local cosine similarity finds the best spoiler-safe earlier pages.
10. Gemini receives the original question, chat history, current page image, retrieved evidence page images, metadata, and the shared system prompt.
11. The answer appears as Markdown with clickable evidence citations.

## Spoiler Boundary

PDF order is determined by natural, case-insensitive filename sorting inside the selected folder.

For retrieval while reading the current PDF:

- Pages before the current page are eligible.
- The current page is not retrieved as earlier evidence.
- Later pages are not eligible.

For other PDFs:

- PDFs alphabetically before the current PDF are eligible.
- PDFs after the current PDF are not eligible.
- PDFs outside the current folder are not eligible.

This boundary is enforced in the main process, not trusted from renderer state alone. The current page can still be sent to Gemini and opened from current-page citations because it is already visible to the reader.

## Local Data

Panel Trace stores app data in Electron's `userData` directory. On macOS this is usually:

```text
~/Library/Application Support/panel-trace/
```

Important files:

```text
library.json
secrets/gemini-api-key.bin
secrets/voyage-api-key.bin
indexes/page-index.json
```

- `library.json` stores saved library folders.
- `secrets/gemini-api-key.bin` stores the encrypted Gemini API key.
- `secrets/voyage-api-key.bin` stores the encrypted Voyage API key.
- `indexes/page-index.json` stores index metadata and page embeddings.

Embeddings are currently stored in a JSON-backed local index as base64-encoded `Float32Array` data. SQLite or a vector database has not been added yet.

## Security Notes

- `contextIsolation` is enabled.
- `nodeIntegration` is disabled.
- Renderer code uses a typed preload API instead of direct Node access.
- Voyage and Gemini API keys are encrypted with Electron `safeStorage`.
- Saved keys are never sent back to the renderer.
- Voyage and Gemini calls are made from the main process.
- Evidence-window open requests are revalidated in the main process against the spoiler boundary.
- Codex and Claude Code CLI integrations are not used.

API keys are not stored inside the repo and should not appear in git.

## Getting Started

Install dependencies:

```bash
pnpm install
```

Run in development:

```bash
pnpm dev
```

Build:

```bash
pnpm build
```

Preview the built app:

```bash
pnpm preview
```

Typecheck only:

```bash
pnpm typecheck
```

## Using The App

1. Open **Settings** from the home screen.
2. In **Embeddings**, add and save a Voyage API key.
3. In **Reasoning**, add and save a Gemini API key.
4. Open **Read**.
5. Add a folder containing PDF files.
6. Wait for PDFs to index, or watch their status in the PDF list.
7. Open a PDF.
8. Ask a question in the chat panel.
9. Click an evidence citation to open the matching page in a separate evidence window.

## Project Structure

```text
src/
  main/
    main.ts
    libraryStore.ts
    pdfLibrary.ts
    services/
      secureCredentialStore.ts
      voyageEmbeddingService.ts
      pdfPageRenderer.ts
      pageIndexStore.ts
      indexingQueue.ts
      folderIndexingService.ts
      spoilerBoundaryService.ts
      retrievalService.ts
      reasoningProviders.ts
      reasoningService.ts
      evidenceWindowService.ts

  preload/
    preload.ts

  shared/
    electronApi.ts
    indexing.ts
    reasoning.ts
    retrieval.ts
    voyage.ts

  renderer/src/
    App.tsx
    components/
    services/
    types/
    styles.css
```

## Current Limitations

- PDF files only; image folders and CBZ/CBR are not implemented.
- Only direct-child PDFs are scanned; nested folders are not scanned.
- Reasoning currently uses Gemini only; additional providers are not implemented yet.
- No OCR or dialogue extraction.
- No panel detection or panel-level embeddings.
- No thumbnails in evidence cards.
- Embeddings are stored in JSON, not SQLite or a vector database.
- No cloud sync, user accounts, or cross-device state.

## Development Notes

- Personal planning docs are ignored by git through `docs/`.
- Build output is ignored through `out/`, `dist/`, `build/`, and release artifact patterns.
- Local app data lives outside the repo in Electron `userData`.

## License

See [LICENSE](LICENSE).
