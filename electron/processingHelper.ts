import fs from "node:fs"
import { ScreenshotHelper } from "./screenshotHelper"
import axios from "axios"
import {
  processWithInitialPrompt,
  processWithFollowUpPrompt
} from "./problemHandler"
import { WindowManager } from "./WindowManager"
import { AppState, PROCESSING_EVENTS } from "./AppState"

const MAX_API_RETRIES = 3;
const API_RETRY_DELAY = 1000; // 1 second

// Helper function for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class ProcessingHelper {
  private screenshotHelper: ScreenshotHelper

  // AbortControllers for API requests
  private currentProcessingAbortController: AbortController | null = null
  private currentExtraProcessingAbortController: AbortController | null = null
  private windowManager: WindowManager
  private appState: AppState

  constructor(windowManager: WindowManager, screenshotHelper: ScreenshotHelper, appState: AppState) {
    this.screenshotHelper = screenshotHelper
    this.windowManager = windowManager
    this.appState = appState
  }

  public async processScreenshots(): Promise<void> {
    const mainWindow = this.windowManager.getMainWindow()
    if (!mainWindow) return

    const view = this.appState.getView()
    console.log("Processing screenshots in view:", view)

    if (view === "queue") {
      mainWindow.webContents.send(PROCESSING_EVENTS.INITIAL_START)
      const screenshotQueue = this.screenshotHelper.getScreenshotQueue()
      console.log("Processing main queue screenshots:", screenshotQueue)
      if (screenshotQueue.length === 0) {
        mainWindow.webContents.send(PROCESSING_EVENTS.NO_SCREENSHOTS)
        return
      }

      try {
        // Initialize AbortController
        this.currentProcessingAbortController = new AbortController()
        const { signal } = this.currentProcessingAbortController

        const screenshots = await Promise.all(
          screenshotQueue.map(async (path) => ({
            path,
            preview: await this.screenshotHelper.getImagePreview(path),
            data: fs.readFileSync(path).toString("base64")
          }))
        )

        const result = await this.processScreenshotsHelper(screenshots, signal)

        if (!result.success) {
          console.log("Processing failed:", result.error)
          mainWindow.webContents.send(
            PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
            result.error
          )
          // Reset view back to queue on error
          console.log("Resetting view to queue due to error")
          this.appState.setView("queue")
          return
        }

        // Only set view to solutions if processing succeeded
        console.log("Setting view to solutions after successful processing")
        mainWindow.webContents.send(
          PROCESSING_EVENTS.SOLUTION_SUCCESS,
          result.data
        )
        this.appState.setView("solutions")
      } catch (error: any) {
        mainWindow.webContents.send(
          PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
          error
        )
        console.error("Processing error:", error)
        if (axios.isCancel(error)) {
          mainWindow.webContents.send(
            PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
            "Processing was canceled by the user."
          )
        } else {
          mainWindow.webContents.send(
            PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
            error.message || "Server error. Please try again."
          )
        }
        // Reset view back to queue on error
        console.log("Resetting view to queue due to error")
        this.appState.setView("queue")
      } finally {
        this.currentProcessingAbortController = null
      }
    } else {
      // view == 'solutions'
      const extraScreenshotQueue =
        this.screenshotHelper.getExtraScreenshotQueue()
      console.log("Processing extra queue screenshots:", extraScreenshotQueue)
      if (extraScreenshotQueue.length === 0) {
        mainWindow.webContents.send(PROCESSING_EVENTS.NO_SCREENSHOTS)
        return
      }
      mainWindow.webContents.send(PROCESSING_EVENTS.DEBUG_START)

      // Initialize AbortController
      this.currentExtraProcessingAbortController = new AbortController()
      const { signal } = this.currentExtraProcessingAbortController

      try {
        const screenshots = await Promise.all(
          [
            ...this.screenshotHelper.getScreenshotQueue(),
            ...extraScreenshotQueue
          ].map(async (path) => ({
            path,
            preview: await this.screenshotHelper.getImagePreview(path),
            data: fs.readFileSync(path).toString("base64")
          }))
        )
        console.log(
          "Combined screenshots for processing:",
          screenshots.map((s) => s.path)
        )

        const result = await this.processExtraScreenshotsHelper(
          screenshots,
          signal
        )

        if (result.success) {
          this.appState.setHasDebugged(true)
          mainWindow.webContents.send(
            PROCESSING_EVENTS.DEBUG_SUCCESS,
            result.data
          )
        } else {
          mainWindow.webContents.send(
            PROCESSING_EVENTS.DEBUG_ERROR,
            result.error
          )
        }
      } catch (error: any) {
        if (axios.isCancel(error)) {
          mainWindow.webContents.send(
            PROCESSING_EVENTS.DEBUG_ERROR,
            "Extra processing was canceled by the user."
          )
        } else {
          mainWindow.webContents.send(
            PROCESSING_EVENTS.DEBUG_ERROR,
            error.message
          )
        }
      } finally {
        this.currentExtraProcessingAbortController = null
      }
    }
  }

  private async processScreenshotsHelper(
    screenshots: Array<{ path: string; data: string }>,
    signal: AbortSignal
  ) {
    const MAX_RETRIES = MAX_API_RETRIES;
    let retryCount = 0;

    while (retryCount <= MAX_RETRIES) {
      try {
        const imageDataList = screenshots.map((screenshot) => screenshot.data);
        const mainWindow = this.windowManager.getMainWindow();

        // First API call - process with initial prompt
        try {
          // Add retry logic here
          let apiError = null;
          let result = null;

          for (let apiRetry = 0; apiRetry <= MAX_API_RETRIES; apiRetry++) {
            try {
              result = await processWithInitialPrompt(imageDataList);
              apiError = null;
              break; // Success, exit retry loop
            } catch (err: any) {
              apiError = err;
              console.log(`API attempt ${apiRetry + 1}/${MAX_API_RETRIES + 1} failed:`, err.message);

              // Check if we should retry
              if (apiRetry < MAX_API_RETRIES && !signal.aborted) {
                await delay(API_RETRY_DELAY);
                continue;
              }
              throw err; // Re-throw if all retries failed
            }
          }

          if (!result) {
            throw apiError || new Error("Failed to get result from API");
          }

          // Store problem info in AppState
          this.appState.setProblemInfo(result);

          // Send success events
          if (mainWindow) {
            mainWindow.webContents.send(
              PROCESSING_EVENTS.PROBLEM_EXTRACTED,
              result
            );

            // Clear any existing extra screenshots before transitioning to solutions view
            this.screenshotHelper.clearExtraScreenshotQueue();
            mainWindow.webContents.send(
              PROCESSING_EVENTS.SOLUTION_SUCCESS,
              result
            );
            return { success: true, data: result };
          }
        } catch (error: any) {
          // Handle errors...
          console.error("API Error Details:", {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
            code: error.code
          })

          // Handle API-specific errors
          if (
            error.response?.data?.error &&
            typeof error.response.data.error === "string"
          ) {
            if (error.response.data.error.includes("Operation timed out")) {
              throw new Error(
                "Operation timed out after 1 minute. Please try again."
              )
            }
            throw new Error(error.response.data.error)
          }

          // If we get here, it's an unknown error
          throw new Error(error.message || "Server error. Please try again.")
        }
      } catch (error: any) {
        // Log the full error for debugging
        console.error("Processing error details:", {
          message: error.message,
          code: error.code,
          response: error.response?.data,
          retryCount
        })

        // If it's a cancellation or we've exhausted retries, return the error
        if (axios.isCancel(error) || retryCount >= MAX_RETRIES) {
          return { success: false, error: error.message }
        }

        // Increment retry count and continue
        retryCount++
      }
    }

    // If we get here, all retries failed
    return {
      success: false,
      error: "Failed to process after multiple attempts. Please try again."
    }
  }

  private async processExtraScreenshotsHelper(
    screenshots: Array<{ path: string; data: string }>,
    signal: AbortSignal
  ) {
    try {
      const imageDataList = screenshots.map((screenshot) => screenshot.data)
      const previousResult = this.appState.getProblemInfo()

      if (!previousResult) {
        throw new Error("No previous result available")
      }

      // Process with follow-up prompt
      const result = await processWithFollowUpPrompt(
        imageDataList,
        previousResult
      )

      if (!result) {
        throw new Error("No result received")
      }

      return { success: true, data: result }
    } catch (error: any) {
      const mainWindow = this.windowManager.getMainWindow()

      // Handle cancellation first
      if (axios.isCancel(error)) {
        return {
          success: false,
          error: "Processing was canceled by the user."
        }
      }

      if (error.response?.data?.error?.includes("Operation timed out")) {
        // Cancel ongoing API requests
        this.cancelOngoingRequests()
        // Clear both screenshot queues
        this.screenshotHelper.clearQueues();
        this.appState.setProblemInfo(null);
        this.appState.setView("queue");
        // Notify renderer to switch view
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("reset-view")
          mainWindow.webContents.send(
            PROCESSING_EVENTS.DEBUG_ERROR,
            "Operation timed out after 1 minute. Please try again."
          )
        }
        return {
          success: false,
          error: "Operation timed out after 1 minute. Please try again."
        }
      }

      if (
        error.response?.data?.error?.includes(
          "Please close this window and re-enter a valid Open AI API key."
        )
      ) {
        if (mainWindow) {
          mainWindow.webContents.send(
            PROCESSING_EVENTS.API_KEY_INVALID
          )
        }
        return { success: false, error: error.response.data.error }
      }

      return { success: false, error: error.message }
    }
  }

  public cancelOngoingRequests(): void {
    let wasCancelled = false

    if (this.currentProcessingAbortController) {
      this.currentProcessingAbortController.abort()
      this.currentProcessingAbortController = null
      wasCancelled = true
    }

    if (this.currentExtraProcessingAbortController) {
      this.currentExtraProcessingAbortController.abort()
      this.currentExtraProcessingAbortController = null
      wasCancelled = true
    }

    // Reset hasDebugged flag
    this.appState.setHasDebugged(false)

    // Clear any pending state
    this.appState.setProblemInfo(null)

    const mainWindow = this.windowManager.getMainWindow()
    if (wasCancelled && mainWindow && !mainWindow.isDestroyed()) {
      // Send a clear message that processing was cancelled
      mainWindow.webContents.send(PROCESSING_EVENTS.NO_SCREENSHOTS)
    }
  }

  public cancelProcessing(): void {
    if (this.currentProcessingAbortController) {
      this.currentProcessingAbortController.abort();
      this.currentProcessingAbortController = null;
    }

    if (this.currentExtraProcessingAbortController) {
      this.currentExtraProcessingAbortController.abort();
      this.currentExtraProcessingAbortController = null;
    }
  }
}
