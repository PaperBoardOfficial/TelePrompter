import { globalShortcut, app } from "electron"
import { WindowManager } from "./WindowManager"
import { ScreenshotHelper } from "./screenshotHelper";
import { AppState } from "./AppState";
import { ProcessingHelper } from "./processingHelper";
export class ShortcutsHelper {
  private windowManager: WindowManager;
  private screenshotHelper: ScreenshotHelper;
  private appState: AppState;
  private processingHelper: ProcessingHelper;

  constructor(windowManager: WindowManager, screenshotHelper: ScreenshotHelper, processingHelper: ProcessingHelper, appState: AppState) {
    this.windowManager = windowManager;
    this.screenshotHelper = screenshotHelper;
    this.processingHelper = processingHelper;
    this.appState = appState;
  }

  public registerGlobalShortcuts(): void {
    globalShortcut.register("CommandOrControl+H", async () => {
      const mainWindow = this.windowManager.getMainWindow()
      if (mainWindow) {
        console.log("Taking screenshot...")
        try {
          const screenshotPath = await this.screenshotHelper.takeScreenshot()
          const preview = await this.screenshotHelper.getImagePreview(screenshotPath)
          mainWindow.webContents.send("screenshot-taken", {
            path: screenshotPath,
            preview
          })
        } catch (error) {
          console.error("Error capturing screenshot:", error)
        }
      }
    })

    globalShortcut.register("CommandOrControl+Enter", async () => {
      await this.processingHelper.processScreenshots()
    })

    globalShortcut.register("CommandOrControl+R", () => {
      console.log(
        "Command + R pressed. Canceling requests and resetting queues..."
      )

      // Cancel ongoing API requests
      this.processingHelper.cancelOngoingRequests()

      // Clear both screenshot queues
      this.screenshotHelper.clearQueues();
      this.appState.setProblemInfo(null);
      this.appState.setView("queue");

      console.log("Cleared queues.")

      // Notify renderer process to switch view to 'queue'
      const mainWindow = this.windowManager.getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("reset-view")
        mainWindow.webContents.send("reset")
      }
    })

    // New shortcuts for moving the window
    globalShortcut.register("CommandOrControl+Left", () => {
      console.log("Command/Ctrl + Left pressed. Moving window left.")
      this.windowManager.moveLeft()
    })

    globalShortcut.register("CommandOrControl+Right", () => {
      console.log("Command/Ctrl + Right pressed. Moving window right.")
      this.windowManager.moveRight()
    })

    globalShortcut.register("CommandOrControl+Down", () => {
      console.log("Command/Ctrl + down pressed. Moving window down.")
      this.windowManager.moveDown()
    })

    globalShortcut.register("CommandOrControl+Up", () => {
      console.log("Command/Ctrl + Up pressed. Moving window Up.")
      this.windowManager.moveUp()
    })

    globalShortcut.register("CommandOrControl+B", () => {
      this.windowManager.toggleWindow();
    })

    // Unregister shortcuts when quitting
    app.on("will-quit", () => {
      globalShortcut.unregisterAll()
    })
  }
}
