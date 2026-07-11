import { useState } from "react";

import LibraryScreen from "./components/LibraryScreen";
import MainMenu from "./components/MainMenu";
import PdfListScreen from "./components/PdfListScreen";
import PdfReaderScreen from "./components/PdfReaderScreen";
import type { PdfFile } from "../../shared/electronApi";

type Screen = "menu" | "library" | "pdf-list" | "reader";

const App = (): JSX.Element => {
  const [screen, setScreen] = useState<Screen>("menu");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedPdf, setSelectedPdf] = useState<PdfFile | null>(null);

  if (screen === "library") {
    return (
      <LibraryScreen
        onBack={() => setScreen("menu")}
        onSelectFolder={(folderPath) => {
          setSelectedFolder(folderPath);
          setSelectedPdf(null);
          setScreen("pdf-list");
        }}
      />
    );
  }

  if (screen === "pdf-list" && selectedFolder) {
    return (
      <PdfListScreen
        folderPath={selectedFolder}
        onBack={() => setScreen("library")}
        onSelectPdf={(pdf) => {
          setSelectedPdf(pdf);
          setScreen("reader");
        }}
      />
    );
  }

  if (screen === "reader" && selectedFolder && selectedPdf) {
    return <PdfReaderScreen pdf={selectedPdf} onBack={() => setScreen("pdf-list")} />;
  }

  return (
    <MainMenu
      onRead={() => setScreen("library")}
      onExit={() => window.electronAPI.exitApp()}
    />
  );
};

export default App;
