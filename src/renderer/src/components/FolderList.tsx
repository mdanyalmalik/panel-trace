import { ArrowRightIcon, FolderIcon, TrashIcon } from "./icons";

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
          <div className="grid gap-2 rounded-xl border border-zinc-700 bg-zinc-900/65 p-3 shadow-lg shadow-zinc-950/15 transition duration-75 hover:border-teal-300/60 hover:bg-zinc-900 hover:shadow-teal-950/10 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <button
              className="group flex min-h-16 w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-1 text-left text-zinc-100 transition duration-75 hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-cyan-300/25 active:translate-y-0"
              type="button"
              onClick={() => onSelectFolder(folderPath)}
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-lg border border-teal-300/20 bg-teal-400/10 text-teal-200">
                <FolderIcon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-base font-bold">
                  {getFolderName(folderPath)}
                </strong>
                <span className="mt-1 block break-all text-sm text-zinc-400">{folderPath}</span>
              </span>
              <ArrowRightIcon className="hidden size-5 shrink-0 text-zinc-500 transition duration-75 group-hover:translate-x-0.5 group-hover:text-teal-200 sm:block" />
            </button>
            <button
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2.5 text-sm font-bold text-red-200 transition duration-75 hover:-translate-y-0.5 hover:border-red-300 hover:bg-red-500/20 focus:outline-none focus:ring-4 focus:ring-red-300/20 active:translate-y-0 sm:w-auto"
              type="button"
              onClick={() => onRemoveFolder(folderPath)}
              aria-label={`Remove ${getFolderName(folderPath)}`}
            >
              <TrashIcon className="size-4" />
              Remove
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
};

export default FolderList;
