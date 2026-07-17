import { useEffect, useState } from "react";

import {
  ArrowLeftIcon,
  CheckCircleIcon,
  EyeIcon,
  EyeOffIcon,
  RefreshIcon,
  SaveIcon,
  TrashIcon
} from "./icons";
import type { VoyageKeyStatus } from "../../../shared/voyage";

interface SettingsScreenProps {
  onBack: () => void;
}

const maskedKeyPlaceholder = "********************************";

const SettingsScreen = ({ onBack }: SettingsScreenProps): JSX.Element => {
  const [keyStatus, setKeyStatus] = useState<VoyageKeyStatus>({
    configured: false,
    secureStorageAvailable: true
  });
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    window.electronAPI
      .getVoyageKeyStatus()
      .then((status) => {
        if (isMounted) {
          setKeyStatus(status);
          if (!status.secureStorageAvailable) {
            setMessage("Secure credential storage is unavailable on this system.");
          }
        }
      })
      .catch((error: unknown) => {
        console.error("Unable to load Voyage key status:", error);
        if (isMounted) {
          setMessage("Unable to load settings.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingStatus(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const saveKey = async (): Promise<void> => {
    const trimmedKey = apiKey.trim();

    if (!trimmedKey) {
      setMessage("Enter a Voyage API key before saving.");
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const status = await window.electronAPI.saveVoyageApiKey(trimmedKey);
      setKeyStatus(status);
      setApiKey("");
      setShowKey(false);
      setMessage("API key saved. Waiting documents have been queued for indexing.");
    } catch (error) {
      console.error("Unable to save Voyage API key:", error);
      setMessage(
        keyStatus.secureStorageAvailable
          ? "Unable to save API key."
          : "Secure credential storage is unavailable on this system."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const testConnection = async (): Promise<void> => {
    setIsTesting(true);
    setMessage(null);

    try {
      const result = await window.electronAPI.testVoyageConnection(apiKey.trim() || undefined);
      setMessage(result.message);
    } catch (error) {
      console.error("Unable to test Voyage connection:", error);
      setMessage("Connection failed");
    } finally {
      setIsTesting(false);
    }
  };

  const removeKey = async (): Promise<void> => {
    setIsRemoving(true);
    setMessage(null);

    try {
      const status = await window.electronAPI.removeVoyageApiKey();
      setKeyStatus(status);
      setApiKey("");
      setShowKey(false);
      setMessage("API key removed");
    } catch (error) {
      console.error("Unable to remove Voyage API key:", error);
      setMessage("Unable to remove API key.");
    } finally {
      setIsRemoving(false);
    }
  };

  const isBusy = isSaving || isTesting || isRemoving || isLoadingStatus;

  return (
    <main className="min-h-dvh w-full overflow-x-hidden px-4 py-6 text-zinc-100 sm:px-6 lg:px-8">
      <header className="mx-auto mb-8 grid w-full max-w-4xl grid-cols-1 items-center gap-5 sm:grid-cols-[minmax(84px,1fr)_auto_minmax(84px,1fr)]">
        <button
          className="flex cursor-pointer items-center gap-2 justify-self-start rounded-xl border border-zinc-700 bg-zinc-900/70 px-4 py-2.5 font-semibold text-zinc-100 shadow-lg shadow-zinc-950/15 transition duration-75 hover:-translate-y-0.5 hover:border-zinc-500 hover:bg-zinc-800 focus:outline-none focus:ring-4 focus:ring-cyan-300/25 active:translate-y-0"
          type="button"
          onClick={onBack}
        >
          <ArrowLeftIcon className="size-4" />
          Back
        </button>
        <h1 className="row-start-1 text-center text-3xl font-black text-zinc-50 sm:row-auto">
          Settings
        </h1>
        <span className="hidden sm:block" aria-hidden="true" />
      </header>

      <section className="mx-auto w-full max-w-4xl" aria-labelledby="voyage-heading">
        <div className="rounded-2xl border border-zinc-700 bg-zinc-950/70 p-5 shadow-2xl shadow-zinc-950/25 sm:p-6">
          <div className="mb-6">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-xl border border-teal-300/20 bg-teal-400/10 text-teal-200">
                <CheckCircleIcon className="size-5" />
              </span>
              <h2 id="voyage-heading" className="text-xl font-bold text-zinc-50">
                Voyage AI
              </h2>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Used to create local page embeddings for PDFs. The key is encrypted in
              the main process and is never shown again after saving.
            </p>
          </div>

          <label className="mb-2 block text-sm font-semibold text-zinc-300" htmlFor="voyage-key">
            API Key
          </label>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <input
              id="voyage-key"
              className="min-h-12 rounded-lg border border-zinc-600 bg-zinc-950 px-4 text-zinc-100 outline-none transition duration-75 placeholder:text-zinc-500 focus:border-teal-400 focus:ring-4 focus:ring-teal-400/15"
              type={showKey ? "text" : "password"}
              value={apiKey}
              placeholder={keyStatus.configured ? maskedKeyPlaceholder : "Paste Voyage API key"}
              onChange={(event) => setApiKey(event.target.value)}
              autoComplete="off"
            />
            <button
              className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-5 py-3 font-semibold text-zinc-100 transition duration-75 hover:-translate-y-0.5 hover:border-zinc-500 hover:bg-zinc-800 focus:outline-none focus:ring-4 focus:ring-cyan-300/25 active:translate-y-0"
              type="button"
              onClick={() => setShowKey((currentValue) => !currentValue)}
            >
              {showKey ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
              {showKey ? "Hide" : "Show"}
            </button>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-5 py-3 font-bold text-zinc-100 transition duration-75 hover:-translate-y-0.5 hover:border-zinc-500 hover:bg-zinc-800 focus:outline-none focus:ring-4 focus:ring-cyan-300/25 active:translate-y-0 disabled:cursor-default disabled:opacity-60 disabled:hover:translate-y-0"
              type="button"
              onClick={testConnection}
              disabled={isBusy || (!apiKey.trim() && !keyStatus.configured)}
            >
              <RefreshIcon className="size-4" />
              {isTesting ? "Testing..." : "Test Connection"}
            </button>
            <button
              className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-teal-300/30 bg-teal-400 px-5 py-3 font-black text-zinc-950 shadow-xl shadow-teal-950/25 transition duration-75 hover:-translate-y-0.5 hover:bg-teal-300 focus:outline-none focus:ring-4 focus:ring-cyan-300/35 active:translate-y-0 disabled:cursor-default disabled:opacity-60 disabled:hover:translate-y-0"
              type="button"
              onClick={saveKey}
              disabled={isBusy || !keyStatus.secureStorageAvailable}
            >
              <SaveIcon className="size-4" />
              {isSaving ? "Saving..." : "Save"}
            </button>
            <button
              className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-400/40 bg-red-500/10 px-5 py-3 font-bold text-red-200 transition duration-75 hover:-translate-y-0.5 hover:border-red-300 hover:bg-red-500/20 focus:outline-none focus:ring-4 focus:ring-red-300/20 active:translate-y-0 disabled:cursor-default disabled:opacity-60 disabled:hover:translate-y-0"
              type="button"
              onClick={removeKey}
              disabled={isBusy || (!keyStatus.configured && !apiKey)}
            >
              <TrashIcon className="size-4" />
              {isRemoving ? "Removing..." : "Remove Key"}
            </button>
          </div>

          <p className="mt-5 text-sm font-semibold text-zinc-300" role="status">
            {message ?? (keyStatus.configured ? "Key configured" : "No API key configured")}
          </p>
        </div>
      </section>
    </main>
  );
};

export default SettingsScreen;
