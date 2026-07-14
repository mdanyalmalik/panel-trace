import { useEffect, useRef, useState, type ReactNode } from "react";

import LibraryScreen from "./components/LibraryScreen";
import MainMenu from "./components/MainMenu";
import PdfListScreen from "./components/PdfListScreen";
import PdfReaderScreen from "./components/PdfReaderScreen";
import SettingsScreen from "./components/SettingsScreen";
import type { PdfFile } from "../../shared/electronApi";

type Screen = "menu" | "settings" | "library" | "pdf-list" | "reader";
type TransitionPhase = "idle" | "exiting" | "entering";

const screenExitDurationMs = 120;
const screenEnterDurationMs = 170;

const App = (): JSX.Element => {
  const [screen, setScreen] = useState<Screen>("menu");
  const [transitionPhase, setTransitionPhase] = useState<TransitionPhase>("idle");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedPdf, setSelectedPdf] = useState<PdfFile | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);

  const clearTransitionTimers = (): void => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  };

  const navigateTo = (nextScreen: Screen): void => {
    if (nextScreen === screen) {
      return;
    }

    clearTransitionTimers();
    setTransitionPhase("exiting");

    timeoutRef.current = window.setTimeout(() => {
      setScreen(nextScreen);
      setTransitionPhase("entering");

      frameRef.current = window.requestAnimationFrame(() => {
        setTransitionPhase("idle");
        timeoutRef.current = window.setTimeout(() => {
          timeoutRef.current = null;
        }, screenEnterDurationMs);
      });
    }, screenExitDurationMs);
  };

  useEffect(() => {
    return () => {
      clearTransitionTimers();
    };
  }, []);

  const renderScreen = (): ReactNode => {
    if (screen === "library") {
      return (
        <LibraryScreen
          onBack={() => navigateTo("menu")}
          onSelectFolder={(folderPath) => {
            setSelectedFolder(folderPath);
            setSelectedPdf(null);
            navigateTo("pdf-list");
          }}
        />
      );
    }

    if (screen === "settings") {
      return <SettingsScreen onBack={() => navigateTo("menu")} />;
    }

    if (screen === "pdf-list" && selectedFolder) {
      return (
        <PdfListScreen
          folderPath={selectedFolder}
          onBack={() => navigateTo("library")}
          onSelectPdf={(pdf) => {
            setSelectedPdf(pdf);
            navigateTo("reader");
          }}
        />
      );
    }

    if (screen === "reader" && selectedFolder && selectedPdf) {
      return <PdfReaderScreen pdf={selectedPdf} onBack={() => navigateTo("pdf-list")} />;
    }

    return (
      <MainMenu
        onRead={() => navigateTo("library")}
        onSettings={() => navigateTo("settings")}
        onExit={() => window.electronAPI.exitApp()}
      />
    );
  };

  const transitionClass =
    transitionPhase === "idle"
      ? "opacity-100 translate-y-0 scale-100"
      : "pointer-events-none opacity-0 translate-y-1 scale-[0.995]";
  const transitionDurationClass =
    transitionPhase === "exiting" ? "duration-[120ms]" : "duration-[170ms]";

  return (
    <div className="min-h-dvh overflow-hidden bg-zinc-800">
      <div
        className={`min-h-dvh transition-[opacity,transform,filter] ease-[cubic-bezier(0.22,1,0.36,1)] ${transitionDurationClass} ${transitionClass}`}
      >
        {renderScreen()}
      </div>
    </div>
  );
};

export default App;
