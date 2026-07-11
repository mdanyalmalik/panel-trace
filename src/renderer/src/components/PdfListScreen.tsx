import { useEffect, useState } from "react";

import type { PdfFile } from "../../../shared/electronApi";

interface PdfListScreenProps {
  folderPath: string;
  onBack: () => void;
  onSelectPdf: (pdf: PdfFile) => void;
}

const getFolderName = (folderPath: string): string => {
  const trimmedPath = folderPath.replace(/[\\/]+$/, "");
  const pathParts = trimmedPath.split(/[\\/]/);

  return pathParts[pathParts.length - 1] || folderPath;
};

const PdfListScreen = ({
  folderPath,
  onBack,
  onSelectPdf
}: PdfListScreenProps): JSX.Element => {
  const [pdfs, setPdfs] = useState<PdfFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    setError(null);

    window.electronAPI
      .listPdfs(folderPath)
      .then((folderPdfs) => {
        if (isMounted) {
          setPdfs(folderPdfs);
        }
      })
      .catch((listError: unknown) => {
        console.error("Unable to list PDFs:", listError);
        if (isMounted) {
          setError("Unable to read PDFs in this folder.");
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
  }, [folderPath]);

  return (
    <main className="min-h-dvh w-full overflow-x-hidden bg-zinc-800 px-4 py-6 text-zinc-100 sm:px-6 lg:px-8">
      <header className="mx-auto mb-8 grid w-full max-w-5xl grid-cols-1 items-center gap-5 sm:grid-cols-[minmax(84px,1fr)_auto_minmax(84px,1fr)]">
        <button
          className="cursor-pointer justify-self-start rounded-lg border border-zinc-600 bg-zinc-700/70 px-5 py-3 font-semibold text-zinc-100 transition duration-75 hover:-translate-y-0.5 hover:border-zinc-500 hover:bg-zinc-600 focus:outline-none focus:ring-4 focus:ring-cyan-300/25 active:translate-y-0"
          type="button"
          onClick={onBack}
        >
          Back
        </button>
        <h1 className="row-start-1 text-center text-3xl font-bold text-zinc-50 sm:row-auto">
          PDFs
        </h1>
        <span className="hidden sm:block" aria-hidden="true" />
      </header>

      <section className="mx-auto w-full max-w-5xl" aria-labelledby="pdfs-heading">
        <p className="mb-2 text-sm font-semibold uppercase text-teal-300">
          {getFolderName(folderPath)}
        </p>
        <p className="mb-7 break-all text-sm text-zinc-400">{folderPath}</p>

        <h2 id="pdfs-heading" className="mb-4 text-lg font-semibold text-zinc-300">
          PDF Files
        </h2>

        {isLoading ? <p className="text-zinc-400">Loading PDFs...</p> : null}
        {error ? <p className="font-bold text-red-300">{error}</p> : null}

        {!isLoading && !error && pdfs.length === 0 ? (
          <p className="text-zinc-400">No PDFs found in this folder.</p>
        ) : null}

        {!isLoading && !error && pdfs.length > 0 ? (
          <ul className="flex flex-col gap-3" aria-label="PDF files">
            {pdfs.map((pdf) => (
              <li key={pdf.path}>
                <button
                  className="flex min-h-20 w-full cursor-pointer flex-col items-start gap-1.5 rounded-lg border border-zinc-600 bg-zinc-700/55 px-5 py-4 text-left text-zinc-100 shadow-sm transition duration-75 hover:-translate-y-0.5 hover:border-teal-400 hover:bg-zinc-700 hover:shadow-lg hover:shadow-zinc-950/25 focus:outline-none focus:ring-4 focus:ring-cyan-300/25 active:translate-y-0"
                  type="button"
                  onClick={() => onSelectPdf(pdf)}
                >
                  <strong className="text-base font-bold">{pdf.name}</strong>
                  <span className="break-all text-sm text-zinc-400">{pdf.path}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </main>
  );
};

export default PdfListScreen;
