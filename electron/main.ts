import { app, BrowserWindow } from "electron";
import { IpcHandler } from "./ipcHandler";
import { ProcessingHelper } from "./processingHelper";
import { ScreenshotHelper } from "./screenshotHelper";
import { ShortcutsHelper } from "./shortcuts";
import { WindowManager } from "./WindowManager";
import { AppState } from "./AppState";

// Initialize application
async function initializeApp() {
  try {
    const appState = new AppState();
    const windowManager = new WindowManager();
    const screenshotHelper = new ScreenshotHelper(
      appState.getView(),
      windowManager
    );
    const processingHelper = new ProcessingHelper(
      windowManager,
      screenshotHelper,
      appState
    );
    const shortcutsHelper = new ShortcutsHelper(
      windowManager,
      screenshotHelper,
      processingHelper,
      appState
    );
    const ipcHandler = new IpcHandler(
      windowManager,
      screenshotHelper,
      processingHelper,
      appState
    );
    ipcHandler.initialize();
    windowManager.createWindow();
    shortcutsHelper.registerGlobalShortcuts();
  } catch (error) {
    console.error("Failed to initialize application:", error);
    app.quit();
  }
}

app.whenReady().then(initializeApp);

// Handle app activation (macOS)
app.on("activate", () => {
  // Re-create window on macOS when dock icon is clicked and no windows are open
  if (BrowserWindow.getAllWindows().length === 0) {
    initializeApp();
  }
});

// Quit when all windows are closed (Windows/Linux)
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
