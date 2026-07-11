interface FolderListProps {
  folders: string[];
  onSelectFolder: (folderPath: string) => void;
  onRemoveFolder: (folderPath: string) => void;
}

const getFolderName = (folderPath: string): string => {
  const trimmedPath = folderPath.replace(/[\\/]+$/, "");
  const pathParts = trimmedPath.split(/[\\/]/);

  return pathParts[pathParts.length - 1] || folderPath;
};

const FolderList = ({
  folders,
  onSelectFolder,
  onRemoveFolder
}: FolderListProps): JSX.Element => {
  if (folders.length === 0) {
    return <p className="text-zinc-400">No folders added yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-3" aria-label="Previously opened folders">
      {folders.map((folderPath) => (
        <li key={folderPath}>
          <div className="grid gap-2 rounded-lg border border-zinc-600 bg-zinc-700/55 p-3 shadow-sm transition duration-75 hover:border-teal-400 hover:bg-zinc-700 hover:shadow-lg hover:shadow-zinc-950/25 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <button
              className="flex min-h-16 w-full cursor-pointer flex-col items-start gap-1.5 rounded-md px-2 py-1 text-left text-zinc-100 transition duration-75 hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-cyan-300/25 active:translate-y-0"
              type="button"
              onClick={() => onSelectFolder(folderPath)}
            >
              <strong className="text-base font-bold">{getFolderName(folderPath)}</strong>
              <span className="break-all text-sm text-zinc-400">{folderPath}</span>
            </button>
            <button
              className="w-full cursor-pointer rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-2.5 text-sm font-bold text-red-200 transition duration-75 hover:-translate-y-0.5 hover:border-red-300 hover:bg-red-500/20 focus:outline-none focus:ring-4 focus:ring-red-300/20 active:translate-y-0 sm:w-auto"
              type="button"
              onClick={() => onRemoveFolder(folderPath)}
            >
              Remove
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
};

export default FolderList;
