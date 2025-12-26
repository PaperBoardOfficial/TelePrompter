import { globalShortcut, app } from "electron";
import { WindowService } from "@/core/services/window";
import { ScreenshotService } from "@/core/services/screenshot";
import { AppState } from "@/core/app-state";
import { ProcessingService } from "@/core/services/processing";

export class ShortcutsService {
  private windowService: WindowService;
  private screenshotService: ScreenshotService;
  private appState: AppState;
  private processingService: ProcessingService;

  constructor(
    windowService: WindowService,
    screenshotService: ScreenshotService,
    processingService: ProcessingService,
    appState: AppState
  ) {
    this.windowService = windowService;
    this.screenshotService = screenshotService;
    this.processingService = processingService;
    this.appState = appState;
  }

  public registerGlobalShortcuts(): void {
    globalShortcut.register("CommandOrControl+H", async () => {
      const mainWindow = this.windowService.getMainWindow();
      if (mainWindow) {
        console.log("Taking screenshot...");
        try {
          const screenshotPath = await this.screenshotService.takeScreenshot();
          const preview = await this.screenshotService.getImagePreview(
            screenshotPath
          );
          mainWindow.webContents.send("screenshot-taken", {
            path: screenshotPath,
            preview,
          });
        } catch (error) {
          console.error("Error capturing screenshot:", error);
        }
      }
    });

    globalShortcut.register("CommandOrControl+Enter", async () => {
      await this.processingService.processScreenshots();
    });

    globalShortcut.register("CommandOrControl+R", () => {
      console.log(
        "Command + R pressed. Canceling requests and resetting queues..."
      );

      // Cancel ongoing API requests
      this.processingService.cancelProcessing();

      // Clear both screenshot queues
      this.screenshotService.clearQueues();
      this.appState.setProblemInfo(null);
      this.appState.setView("queue");

      console.log("Cleared queues.");

      // Notify renderer process to switch view to 'queue'
      const mainWindow = this.windowService.getMainWindow();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("reset-view");
        mainWindow.webContents.send("reset");
      }
    });

    // New shortcuts for moving the window
    globalShortcut.register("CommandOrControl+Left", () => {
      console.log("Command/Ctrl + Left pressed. Moving window left.");
      this.windowService.moveLeft();
    });

    globalShortcut.register("CommandOrControl+Right", () => {
      console.log("Command/Ctrl + Right pressed. Moving window right.");
      this.windowService.moveRight();
    });

    globalShortcut.register("CommandOrControl+Down", () => {
      console.log("Command/Ctrl + down pressed. Moving window down.");
      this.windowService.moveDown();
    });

    globalShortcut.register("CommandOrControl+Up", () => {
      console.log("Command/Ctrl + Up pressed. Moving window Up.");
      this.windowService.moveUp();
    });

    globalShortcut.register("CommandOrControl+B", () => {
      this.windowService.toggleWindow();
    });

    // Unregister shortcuts when quitting
    app.on("will-quit", () => {
      globalShortcut.unregisterAll();
    });
  }
}
