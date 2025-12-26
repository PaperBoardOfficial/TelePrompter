import { app, BrowserWindow } from "electron";
import { IpcHandler } from "@/core/ipc-handler";
import { ProcessingService } from "@/core/services/processing";
import { ScreenshotService } from "@/core/services/screenshot";
import { ShortcutsService } from "@/core/services/shortcuts";
import { WindowService } from "@/core/services/window";
import { AppState } from "@/core/app-state";

async function initializeApp() {
  try {
    const appState = new AppState();
    const windowService = new WindowService();
    const screenshotService = new ScreenshotService(
      appState.getView(),
      windowService
    );
    const processingService = new ProcessingService(
      windowService,
      screenshotService,
      appState
    );
    const shortcutsService = new ShortcutsService(
      windowService,
      screenshotService,
      processingService,
      appState
    );
    const ipcHandler = new IpcHandler(
      windowService,
      screenshotService,
      processingService,
      appState
    );
    ipcHandler.initialize();
    windowService.createWindow();
    shortcutsService.registerGlobalShortcuts();
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
