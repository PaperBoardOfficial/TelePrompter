import type { ElectronAPI } from "@/shared/types/electron-api";

// Get the platform safely
const getPlatform = (): string => {
  try {
    const api: ElectronAPI = window.electronAPI;
    return api.getPlatform() || 'win32';
  } catch {
    return 'win32'; // Default to win32 if there's an error
  }
}

// Platform-specific command key symbol
export const COMMAND_KEY = getPlatform() === 'darwin' ? '⌘' : 'Ctrl'

// Helper to check if we're on Windows
export const isWindows = getPlatform() === 'win32'

// Helper to check if we're on macOS
export const isMacOS = getPlatform() === 'darwin' 