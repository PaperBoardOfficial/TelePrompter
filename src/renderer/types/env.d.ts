/// <reference types="vite/client" />

import { ToastMessage } from "@/renderer/components/common/toast";
import type { ElectronAPI as SharedElectronAPI } from "@/shared/types/electron-api";

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly NODE_ENV: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

export type { ElectronAPI } from "../../shared/types/electron-api";

declare global {
  interface Window {
    electronAPI: ElectronAPI;
    electron: {
      ipcRenderer: {
        on: (channel: string, func: (...args: any[]) => void) => void;
        removeListener: (
          channel: string,
          func: (...args: any[]) => void
        ) => void;
      };
    };
  }
}
