import { ipcMain, shell, app } from "electron"
import { store } from './store'
import { WindowManager } from "./WindowManager"
import { ScreenshotHelper } from "./screenshotHelper"
import { AppState } from "./AppState"
import { ProcessingHelper } from "./processingHelper"

export class IpcHandler {
  private windowManager: WindowManager;
  private screenshotHelper: ScreenshotHelper;
  private processingHelper: ProcessingHelper;
  private appState: AppState;

  constructor(
    windowManager: WindowManager,
    screenshotHelper: ScreenshotHelper,
    processingHelper: ProcessingHelper,
    appState: AppState
  ) {
    this.windowManager = windowManager;
    this.screenshotHelper = screenshotHelper;
    this.processingHelper = processingHelper;
    this.appState = appState;
  }

  public initialize(): void {
    console.log("Initializing IPC handlers")

    // Screenshot queue handlers
    ipcMain.handle("get-screenshot-queue", () => {
      return this.screenshotHelper.getScreenshotQueue()
    })

    ipcMain.handle("get-extra-screenshot-queue", () => {
      return this.screenshotHelper.getExtraScreenshotQueue()
    })

    ipcMain.handle("delete-screenshot", async (event, path: string) => {
      return (
        this.screenshotHelper.deleteScreenshot(path) || {
          success: false,
          error: "Screenshot helper not initialized"
        }
      )
    })

    ipcMain.handle("get-image-preview", async (event, path: string) => {
      return this.screenshotHelper.getImagePreview(path)
    })

    // Screenshot processing handlers
    ipcMain.handle("process-screenshots", async () => {
      await this.processingHelper.processScreenshots()
    })

    // Window dimension handlers
    ipcMain.handle(
      "update-content-dimensions",
      async (event, { width, height }: { width: number; height: number }) => {
        if (width && height) {
          this.windowManager.setDimensions(width, height)
        }
      }
    )

    ipcMain.handle(
      "set-window-dimensions",
      (event, width: number, height: number) => {
        this.windowManager.setDimensions(width, height)
      }
    )

    // Screenshot management handlers
    ipcMain.handle("get-screenshots", async () => {
      try {
        let previews = []
        const currentView = this.appState.getView()

        if (currentView === "queue") {
          const queue = this.screenshotHelper.getScreenshotQueue()
          previews = await Promise.all(
            queue.map(async (path) => ({
              path,
              preview: await this.screenshotHelper.getImagePreview(path)
            }))
          )
        } else {
          const extraQueue = this.screenshotHelper.getExtraScreenshotQueue()
          previews = await Promise.all(
            extraQueue.map(async (path) => ({
              path,
              preview: await this.screenshotHelper.getImagePreview(path)
            }))
          )
        }

        return previews
      } catch (error) {
        console.error("Error getting screenshots:", error)
        throw error
      }
    })

    // Screenshot trigger handlers
    ipcMain.handle("trigger-screenshot", async () => {
      const mainWindow = this.windowManager.getMainWindow()
      if (mainWindow) {
        try {
          const screenshotPath = await this.screenshotHelper.takeScreenshot()
          const preview = await this.screenshotHelper.getImagePreview(screenshotPath)
          mainWindow.webContents.send("screenshot-taken", {
            path: screenshotPath,
            preview
          })
          return { success: true }
        } catch (error) {
          console.error("Error triggering screenshot:", error)
          return { error: "Failed to trigger screenshot" }
        }
      }
      return { error: "No main window available" }
    })

    ipcMain.handle("take-screenshot", async () => {
      try {
        const screenshotPath = await this.screenshotHelper.takeScreenshot()
        return { success: true, path: screenshotPath }
      } catch (error) {
        console.error("Error taking screenshot:", error)
        return { success: false, error: String(error) }
      }
    })

    // Cancel processing handler
    ipcMain.handle("cancel-processing", () => {
      this.processingHelper.cancelProcessing()
      return { success: true }
    })

    // External link handler
    ipcMain.handle("open-external-link", async (event, url: string) => {
      try {
        await shell.openExternal(url)
        return { success: true }
      } catch (error) {
        console.error("Error opening external link:", error)
        return { success: false, error: String(error) }
      }
    })

    // Window management handlers
    ipcMain.handle("toggle-window", () => {
      try {
        this.windowManager.toggleWindow();
        return { success: true }
      } catch (error) {
        console.error("Error toggling window:", error)
        return { error: "Failed to toggle window" }
      }
    })

    ipcMain.handle("reset-queues", async () => {
      try {
        this.screenshotHelper.clearQueues();
        this.appState.setProblemInfo(null);
        this.appState.setView("queue");
        return { success: true }
      } catch (error) {
        console.error("Error resetting queues:", error)
        return { error: "Failed to reset queues" }
      }
    })

    // Process screenshot handlers
    ipcMain.handle("trigger-process-screenshots", async () => {
      try {
        await this.processingHelper.processScreenshots()
        return { success: true }
      } catch (error) {
        console.error("Error processing screenshots:", error)
        return { error: "Failed to process screenshots" }
      }
    })

    // Reset handlers
    ipcMain.handle("trigger-reset", () => {
      try {
        // First cancel any ongoing requests
        this.processingHelper.cancelOngoingRequests()

        // Clear all queues immediately
        this.screenshotHelper.clearQueues();
        this.appState.setProblemInfo(null);
        this.appState.setView("queue");

        // Get main window and send reset events
        const mainWindow = this.windowManager.getMainWindow()
        if (mainWindow && !mainWindow.isDestroyed()) {
          // Send reset events in sequence
          mainWindow.webContents.send("reset-view")
          mainWindow.webContents.send("reset")
        }

        return { success: true }
      } catch (error) {
        console.error("Error triggering reset:", error)
        return { error: "Failed to trigger reset" }
      }
    })

    // Window movement handlers
    ipcMain.handle("trigger-move-left", () => {
      try {
        this.windowManager.moveLeft()
        return { success: true }
      } catch (error) {
        console.error("Error moving window left:", error)
        return { error: "Failed to move window left" }
      }
    })

    ipcMain.handle("trigger-move-right", () => {
      try {
        this.windowManager.moveRight()
        return { success: true }
      } catch (error) {
        console.error("Error moving window right:", error)
        return { error: "Failed to move window right" }
      }
    })

    ipcMain.handle("trigger-move-up", () => {
      try {
        this.windowManager.moveUp()
        return { success: true }
      } catch (error) {
        console.error("Error moving window up:", error)
        return { error: "Failed to move window up" }
      }
    })

    ipcMain.handle("trigger-move-down", () => {
      try {
        this.windowManager.moveDown()
        return { success: true }
      } catch (error) {
        console.error("Error moving window down:", error)
        return { error: "Failed to move window down" }
      }
    })

    // Get API key
    ipcMain.handle("get-api-key", async () => {
      try {
        return {
          success: true,
          apiKey: store.get('apiKey') || ""
        };
      } catch (error) {
        console.error("Error getting API key:", error);
        return {
          success: false,
          error: (error as Error).message
        };
      }
    });

    // Set API key
    ipcMain.handle("set-api-key", async (_event, apiKey: string) => {
      try {
        store.set('apiKey', apiKey);
        return { success: true };
      } catch (error) {
        console.error("Error setting API key:", error);
        return {
          success: false,
          error: (error as Error).message
        };
      }
    });

    // Quit app
    ipcMain.handle("quit-app", async () => {
      try {
        app.quit();
        return { success: true };
      } catch (error) {
        console.error("Error quitting app:", error);
        return {
          success: false,
          error: (error as Error).message
        };
      }
    });

    // Get transparency
    ipcMain.handle("get-transparency", async () => {
      try {
        const transparency = store.get('transparency');
        return { success: true, transparency };
      } catch (error) {
        console.error("Error getting transparency:", error);
        return {
          success: false,
          error: (error as Error).message
        };
      }
    });

    // Set transparency
    ipcMain.handle("set-transparency", async (_event, value: number) => {
      try {
        store.set('transparency', value);

        const mainWindow = this.windowManager.getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
          const opacity = value / 100;
          mainWindow.setOpacity(opacity);
        }

        return { success: true };
      } catch (error) {
        console.error("Error setting transparency:", error);
        return {
          success: false,
          error: (error as Error).message
        };
      }
    });

    // Add new IPC handlers for prompt templates
    ipcMain.handle('get-prompt-templates', async () => {
      try {
        const templates = store.get('promptTemplates');
        const activeTemplate = store.get('activeTemplate');

        return {
          success: true,
          templates,
          activeTemplate
        };
      } catch (error) {
        console.error('Error getting prompt templates:', error);
        return {
          success: false,
          error: 'Failed to get prompt templates'
        };
      }
    });

    ipcMain.handle('save-prompt-templates', async (_, { templates, activeTemplate }) => {
      try {
        store.set('promptTemplates', templates);
        store.set('activeTemplate', activeTemplate);

        return {
          success: true
        };
      } catch (error) {
        console.error('Error saving prompt templates:', error);
        return {
          success: false,
          error: 'Failed to save prompt templates'
        };
      }
    });

    ipcMain.handle('reset-prompt-templates', async () => {
      try {
        const templates = {
          coding_task: {
            name: "Coding Task",
            initialPrompt: `Analyze the image and extract all relevant information about this programming task.

Main Task:
[problem_statement]

Input Specifications:
[input_format_description]
Parameters:
[input_format.parameters]

Output Specifications:
[output_format_description]
Returns: [output_format.type]

Constraints:
[constraints]

Examples:
[test_cases]

Generate a solution in this format:
{
  "thoughts": [
    "First thought about understanding the task",
    "Second thought about approach to solve it",
    "Third thought about implementation details"
  ],
  "code": "The solution with comments explaining the code",
  "time_complexity": "The time complexity in form O(_) because _",
  "space_complexity": "The space complexity in form O(_) because _"
}`,
            followUpPrompt: `Review the code solution and provide improvements.

First extract and analyze what's shown in the image. Then create an improved version while maintaining the same general approach and structure.

Return your response in this JSON format:
{
  "thoughts": [
    "First thought about the task and current solution",
    "Second thought about possible improvements",
    "Third thought about the final solution"
  ],
  "old_code": "The exact code from the image",
  "new_code": "The improved code with inline comments on changed lines",
  "time_complexity": "O(_) because _",
  "space_complexity": "O(_) because _"
}`
          },
          meeting_notes: {
            name: "Meeting Notes",
            initialPrompt: `Analyze the image of meeting notes or slides and extract all relevant information.

Please identify:
1. The main topics or agenda items
2. Key points discussed for each topic
3. Any action items or decisions made
4. Participants mentioned (if any)
5. Dates, deadlines, or timelines mentioned

Organize the information in a clear, structured format.`,

            followUpPrompt: `Review the meeting notes again and provide additional insights or clarifications.

Based on the image and the previous extraction, please:
1. Identify any information that might have been missed
2. Clarify any ambiguous points
3. Suggest potential follow-up questions or actions
4. Highlight the most important takeaways
5. Organize the information in a more structured way if needed

Present your analysis in a clear, professional format.`
          }
        };

        store.set('promptTemplates', templates);

        // Set the first template as active
        const firstTemplateKey = Object.keys(templates)[0];
        store.set('activeTemplate', firstTemplateKey);

        return {
          success: true,
          templates: templates,
          activeTemplate: firstTemplateKey
        };
      } catch (error) {
        console.error('Error resetting prompt templates:', error);
        return {
          success: false,
          error: 'Failed to reset prompt templates'
        };
      }
    });
  }
}

