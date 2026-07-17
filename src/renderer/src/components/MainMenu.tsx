import { BookOpenIcon, PowerIcon, SettingsIcon } from "./icons";

interface MainMenuProps {
  onRead: () => void;
  onSettings: () => void;
  onExit: () => void;
}

const MainMenu = ({ onRead, onSettings, onExit }: MainMenuProps): JSX.Element => (
  <main className="grid min-h-dvh w-full place-items-center overflow-x-hidden px-6 py-10 text-zinc-100 sm:px-8">
    <section className="flex w-full max-w-md flex-col items-center gap-10">
      <div className="text-center">
        <div className="mx-auto mb-5 grid size-16 place-items-center rounded-2xl border border-teal-300/20 bg-teal-400/10 text-teal-200 shadow-2xl shadow-teal-950/20">
          <BookOpenIcon className="size-8" />
        </div>
        <h1 className="text-5xl font-black text-zinc-50 sm:text-6xl">
          Panel Trace
        </h1>
        <p className="mt-3 text-sm font-medium text-zinc-400">
          Read, index, and retrace earlier pages.
        </p>
      </div>

      <nav className="flex w-full flex-col gap-3" aria-label="Main menu">
        <button
          className="group flex min-h-16 cursor-pointer items-center justify-between rounded-xl border border-teal-300/30 bg-teal-400 px-5 text-base font-black text-zinc-950 shadow-xl shadow-teal-950/30 transition duration-75 hover:-translate-y-0.5 hover:bg-teal-300 focus:outline-none focus:ring-4 focus:ring-cyan-300/35 active:translate-y-0"
          type="button"
          onClick={onRead}
        >
          <span className="flex items-center gap-3">
            <BookOpenIcon className="size-5" />
            Read
          </span>
          <span className="text-lg transition duration-75 group-hover:translate-x-0.5" aria-hidden="true">
            &rarr;
          </span>
        </button>
        <button
          className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-900/70 px-5 text-base font-bold text-zinc-100 shadow-lg shadow-zinc-950/20 transition duration-75 hover:-translate-y-0.5 hover:border-zinc-500 hover:bg-zinc-800 focus:outline-none focus:ring-4 focus:ring-cyan-300/25 active:translate-y-0"
          type="button"
          onClick={onSettings}
        >
          <SettingsIcon className="size-5 text-zinc-300" />
          Settings
        </button>
        <button
          className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-900/70 px-5 text-base font-bold text-zinc-100 shadow-lg shadow-zinc-950/20 transition duration-75 hover:-translate-y-0.5 hover:border-red-300/50 hover:bg-red-500/10 hover:text-red-100 focus:outline-none focus:ring-4 focus:ring-red-300/20 active:translate-y-0"
          type="button"
          onClick={onExit}
        >
          <PowerIcon className="size-5 text-zinc-300" />
          Exit
        </button>
      </nav>
    </section>
  </main>
);

export default MainMenu;
