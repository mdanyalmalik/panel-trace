import { useEffect, useState } from "react";

import FolderList from "./FolderList";

interface LibraryScreenProps {
  onBack: () => void;
  onSelectFolder: (folderPath: string) => void;
}

const LibraryScreen = ({ onBack, onSelectFolder }: LibraryScreenProps): JSX.Element => {
  const [folders, setFolders] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isOpeningFolder, setIsOpeningFolder] = useState(false);

  useEffect(() => {
    let isMounted = true;

    window.electronAPI
      .getFolders()
      .then((savedFolders) => {
        if (isMounted) {
          setFolders(savedFolders);
        }
      })
      .catch((loadError: unknown) => {
        console.error("Unable to load library folders:", loadError);
        if (isMounted) {
          setError("Unable to load saved folders.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleOpenFolder = async (): Promise<void> => {
    setError(null);
    setIsOpeningFolder(true);

    try {
      const selectedFolder = await window.electronAPI.selectFolder();

      if (!selectedFolder) {
        return;
      }

      const updatedFolders = await window.electronAPI.addFolder(selectedFolder);
      setFolders(updatedFolders);
    } catch (openError) {
      console.error("Unable to add selected folder:", openError);
      setError("Unable to add that folder. Please try again.");
    } finally {
      setIsOpeningFolder(false);
    }
  };

  const handleRemoveFolder = async (folderPath: string): Promise<void> => {
    setError(null);

    try {
      const updatedFolders = await window.electronAPI.removeFolder(folderPath);
      setFolders(updatedFolders);
    } catch (removeError) {
      console.error("Unable to remove folder:", removeError);
      setError("Unable to remove that folder. Please try again.");
    }
  };

  return (
    <main className="min-h-dvh w-full overflow-x-hidden bg-zinc-800 px-4 py-6 text-zinc-100 sm:px-6 lg:px-8">
      <header className="mx-auto mb-8 grid w-full max-w-5xl grid-cols-1 items-center gap-5 sm:grid-cols-[minmax(84px,1fr)_auto_minmax(84px,1fr)]">
        <button
          className="cursor-pointer justify-self-start rounded-lg border border-zinc-600 bg-zinc-700/70 px-5 py-3 font-semibold text-zinc-100 transition duration-75 hover:-translate-y-0.5 hover:border-zinc-500 hover:bg-zinc-600 focus:outline-none focus:ring-4 focus:ring-cyan-300/25 active:translate-y-0 sm:row-auto"
          type="button"
          onClick={onBack}
        >
          Back
        </button>
        <h1 className="row-start-1 text-center text-3xl font-bold text-zinc-50 sm:row-auto">
          Library
        </h1>
        <span className="hidden sm:block" aria-hidden="true" />
      </header>

      <section className="mx-auto w-full max-w-5xl" aria-labelledby="folders-heading">
        <button
          className="mb-7 cursor-pointer rounded-lg bg-teal-500 px-5 py-3 font-bold text-zinc-950 shadow-lg shadow-teal-950/25 transition duration-75 hover:-translate-y-0.5 hover:bg-teal-400 focus:outline-none focus:ring-4 focus:ring-cyan-300/35 active:translate-y-0 disabled:cursor-default disabled:opacity-60 disabled:hover:translate-y-0"
          type="button"
          onClick={handleOpenFolder}
          disabled={isOpeningFolder}
        >
          {isOpeningFolder ? "Opening..." : "Open Folder"}
        </button>

        {error ? <p className="mb-5 max-w-xl font-bold text-red-300">{error}</p> : null}

        <h2 id="folders-heading" className="mb-4 text-lg font-semibold text-zinc-300">
          Previously Opened Folders
        </h2>
        <FolderList
          folders={folders}
          onSelectFolder={onSelectFolder}
          onRemoveFolder={handleRemoveFolder}
        />
      </section>
    </main>
  );
};

export default LibraryScreen;
