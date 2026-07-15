# Panel Trace

Panel Trace is a local-first desktop manga/PDF reader with spoiler-aware evidence retrieval.

The app lets you add folders of PDFs, read them one page at a time, index pages with Voyage multimodal embeddings, and ask questions in the reader chat. Instead of generating an LLM answer, Panel Trace returns clickable evidence cards from earlier indexed pages only, so the reader can look back without accidentally seeing future content.

## Current Status

Panel Trace is an early desktop MVP. It currently supports PDF folders and page-level retrieval. It does not yet support image folders, CBZ/CBR archives, OCR, panel detection, natural-language answer generation, or a production database.

## Features

- Electron desktop app with React, TypeScript, Vite, Tailwind CSS, and `react-pdf`.
- Main Menu, Settings, Library, PDF List, PDF Reader, and separate Evidence Viewer screens.
- Library folders are saved locally and can be removed.
- Direct-child PDFs are listed with natural sorting, so `Volume 2.pdf` appears before `Volume 10.pdf`.
- One-page-at-a-time PDF reader with previous/next navigation, keyboard shortcuts, zoom controls, Ctrl/Cmd-scroll zoom, and click-to-jump page numbers.
- Resizable reader chat panel with per-PDF chat history and a clear-chat action.
- Secure Voyage API key settings using Electron `safeStorage`; the saved key is never returned to the renderer.
- Background PDF indexing with one Voyage document embedding per page.
- Per-PDF indexing status and retry controls in the PDF list.
- Spoiler-aware chat retrieval:
  - searches only ready indexes
  - searches earlier PDFs in the same folder
  - searches only earlier pages in the current PDF
  - never searches the current page, future pages, later PDFs, or other folders
- Clickable evidence cards in chat.
- Separate simplified evidence viewer window with navigation and zoom, while the main reader stays where it is.

## How Retrieval Works

1. Add a folder to the Library.
2. Panel Trace discovers direct-child PDFs and queues them for indexing.
3. Each PDF page is rendered to an image in a hidden Electron renderer.
4. The page image is embedded with Voyage using `voyage-multimodal-3.5` and `input_type: "document"`.
5. Page embeddings are stored locally.
6. In the reader chat, your question is embedded with Voyage using `input_type: "query"`.
7. The query embedding is blended with the current page embedding when available.
8. Local cosine similarity finds the best spoiler-safe earlier pages.
9. Results appear as evidence cards, not generated prose.

## Spoiler Boundary

PDF order is determined by natural, case-insensitive filename sorting inside the selected folder.

When reading the current PDF:

- Pages before the current page are eligible.
- The current page is not eligible.
- Later pages are not eligible.

For other PDFs:

- PDFs alphabetically before the current PDF are eligible.
- PDFs after the current PDF are not eligible.
- PDFs outside the current folder are not eligible.

This boundary is enforced in the main process, not trusted from renderer state alone.

## Local Data

Panel Trace stores app data in Electron's `userData` directory. On macOS this is usually:

```text
~/Library/Application Support/panel-trace/
```

Important files:

```text
library.json
secrets/voyage-api-key.bin
indexes/page-index.json
```

- `library.json` stores saved library folders.
- `secrets/voyage-api-key.bin` stores the encrypted Voyage API key.
- `indexes/page-index.json` stores index metadata and page embeddings.

Embeddings are currently stored in a JSON-backed local index as base64-encoded `Float32Array` data. SQLite or a vector database has not been added yet.

## Security Notes

- `contextIsolation` is enabled.
- `nodeIntegration` is disabled.
- Renderer code uses a typed preload API instead of direct Node access.
- The Voyage API key is encrypted with Electron `safeStorage`.
- The saved key is never sent back to the renderer.
- Voyage calls are made from the main process.
- Evidence-window open requests are revalidated in the main process against the spoiler boundary.

The API key is not stored inside the repo and should not appear in git.

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
2. Add and save a Voyage API key.
3. Open **Read**.
4. Add a folder containing PDF files.
5. Wait for PDFs to index, or watch their status in the PDF list.
6. Open a PDF.
7. Ask a question in the chat panel.
8. Click an evidence card to open the matching page in a separate evidence window.

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
      evidenceWindowService.ts

  preload/
    preload.ts

  shared/
    electronApi.ts
    indexing.ts
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
- Chat retrieval returns evidence cards only; it does not generate natural-language answers.
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
