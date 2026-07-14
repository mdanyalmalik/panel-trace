interface MainMenuProps {
  onRead: () => void;
  onSettings: () => void;
  onExit: () => void;
}

const MainMenu = ({ onRead, onSettings, onExit }: MainMenuProps): JSX.Element => (
  <main className="grid min-h-dvh w-full place-items-center overflow-x-hidden bg-zinc-800 px-6 py-10 text-zinc-100 sm:px-8">
    <section className="flex w-full max-w-sm flex-col items-center gap-9">
      <div className="text-center">
        <h1 className="text-5xl font-black tracking-tight text-zinc-50 sm:text-6xl">
          Panel Trace
        </h1>
      </div>

      <nav className="flex w-full max-w-72 flex-col gap-5" aria-label="Main menu">
        <button
          className="min-h-14 cursor-pointer rounded-lg bg-teal-500 px-6 text-base font-bold uppercase text-zinc-950 shadow-lg shadow-teal-950/30 transition duration-75 hover:-translate-y-0.5 hover:bg-teal-400 focus:outline-none focus:ring-4 focus:ring-cyan-300/35 active:translate-y-0"
          type="button"
          onClick={onRead}
        >
          Read
        </button>
        <button
          className="min-h-14 cursor-pointer rounded-lg border border-zinc-600 bg-zinc-700 px-6 text-base font-bold uppercase text-zinc-100 shadow-sm transition duration-75 hover:-translate-y-0.5 hover:border-zinc-500 hover:bg-zinc-600 focus:outline-none focus:ring-4 focus:ring-cyan-300/25 active:translate-y-0"
          type="button"
          onClick={onSettings}
        >
          Settings
        </button>
        <button
          className="min-h-14 cursor-pointer rounded-lg border border-zinc-600 bg-zinc-700 px-6 text-base font-bold uppercase text-zinc-100 shadow-sm transition duration-75 hover:-translate-y-0.5 hover:border-zinc-500 hover:bg-zinc-600 focus:outline-none focus:ring-4 focus:ring-cyan-300/25 active:translate-y-0"
          type="button"
          onClick={onExit}
        >
          Exit
        </button>
      </nav>
    </section>
  </main>
);

export default MainMenu;
