import fs from "node:fs";
import { ScreenshotService } from "@/core/services/screenshot";
import { ProblemService } from "@/core/services/problem";
import { WindowService } from "@/core/services/window";
import { AppState, PROCESSING_EVENTS } from "@/core/app-state";
import { sleep } from "@/core/utils";
import { BrowserWindow } from "electron";

export class ProcessingService {
  private screenshotService: ScreenshotService;
  private problemService: ProblemService;
  private windowService: WindowService;
  private appState: AppState;
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 1000; // 1 second

  // Track if processing is in progress
  private isProcessing = false;
  private isExtraProcessing = false;

  constructor(
    windowService: WindowService,
    screenshotService: ScreenshotService,
    appState: AppState
  ) {
    this.screenshotService = screenshotService;
    this.windowService = windowService;
    this.appState = appState;
    this.problemService = new ProblemService();
  }

  /**
   * Main method to process screenshots based on current view
   */
  public async processScreenshots(): Promise<void> {
    const mainWindow = this.windowService.getMainWindow();
    if (!mainWindow) return;

    const view = this.appState.getView();
    console.log("Processing screenshots in view:", view);

    if (view === "queue") {
      await this.processMainQueue(mainWindow);
    } else {
      await this.processExtraQueue(mainWindow);
    }
  }

  /**
   * Process screenshots from the main queue
   */
  private async processMainQueue(mainWindow: BrowserWindow): Promise<void> {
    // Don't start if already processing
    if (this.isProcessing) {
      console.log("Processing already in progress, ignoring request");
      return;
    }

    this.isProcessing = true;
    mainWindow.webContents.send(PROCESSING_EVENTS.INITIAL_START);

    try {
      const screenshotQueue = this.screenshotService.getScreenshotQueue();
      console.log("Processing main queue screenshots:", screenshotQueue);

      if (screenshotQueue.length === 0) {
        this.handleNoScreenshots(mainWindow);
        return;
      }

      const screenshots = await this.prepareScreenshots(screenshotQueue);
      const result = await this.processScreenshotsHelper(screenshots);

      if (!result) {
        this.handleProcessingError(mainWindow, "Unknown error");
        return;
      }

      if (result.success === false) {
        this.handleProcessingError(mainWindow, result.error || "Unknown error");
        return;
      }

      // Only set view to solutions if processing succeeded
      // At this point, TypeScript knows result.success === true
      this.handleProcessingSuccess(mainWindow, result.data);
    } catch (error: any) {
      this.handleProcessingError(
        mainWindow,
        error.message || "Server error. Please try again."
      );
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process screenshots from the extra queue
   */
  private async processExtraQueue(mainWindow: BrowserWindow): Promise<void> {
    // Don't start if already processing
    if (this.isExtraProcessing) {
      console.log("Extra processing already in progress, ignoring request");
      return;
    }

    this.isExtraProcessing = true;

    try {
      const extraScreenshotQueue =
        this.screenshotService.getExtraScreenshotQueue();
      console.log("Processing extra queue screenshots:", extraScreenshotQueue);

      if (extraScreenshotQueue.length === 0) {
        this.handleNoScreenshots(mainWindow);
        return;
      }

      mainWindow.webContents.send(PROCESSING_EVENTS.DEBUG_START);

      const screenshots = await this.prepareCombinedScreenshots(
        extraScreenshotQueue
      );
      const result = await this.processExtraScreenshotsHelper(screenshots);

      if (result.success) {
        this.handleDebugSuccess(mainWindow, result.data);
      } else {
        this.handleDebugError(mainWindow, result.error);
      }
    } catch (error: any) {
      this.handleDebugError(mainWindow, error.message);
    } finally {
      this.isExtraProcessing = false;
    }
  }

  /**
   * Prepare screenshots for processing
   */
  private async prepareScreenshots(
    paths: string[]
  ): Promise<Array<{ path: string; preview: string; data: string }>> {
    return Promise.all(
      paths.map(async (path) => ({
        path,
        preview: await this.screenshotService.getImagePreview(path),
        data: fs.readFileSync(path, { encoding: "base64" }),
      }))
    );
  }

  /**
   * Prepare combined screenshots from both queues
   */
  private async prepareCombinedScreenshots(
    extraPaths: string[]
  ): Promise<Array<{ path: string; data: string }>> {
    const allPaths = [
      ...this.screenshotService.getScreenshotQueue(),
      ...extraPaths,
    ];

    console.log("Combined screenshots for processing:", allPaths);

    return Promise.all(
      allPaths.map(async (path) => ({
        path,
        preview: await this.screenshotService.getImagePreview(path),
        data: fs.readFileSync(path, { encoding: "base64" }),
      }))
    );
  }

  /**
   * Handle case when no screenshots are available
   */
  private handleNoScreenshots(mainWindow: BrowserWindow): void {
    mainWindow.webContents.send(PROCESSING_EVENTS.NO_SCREENSHOTS);
    this.isProcessing = false;
    this.isExtraProcessing = false;
  }

  /**
   * Handle successful processing
   */
  private handleProcessingSuccess(mainWindow: BrowserWindow, data: any): void {
    console.log("Setting view to solutions after successful processing");
    mainWindow.webContents.send(PROCESSING_EVENTS.SOLUTION_SUCCESS, data);
    this.appState.setView("solutions");
  }

  /**
   * Handle processing error
   */
  private handleProcessingError(
    mainWindow: BrowserWindow,
    errorMessage: string
  ): void {
    console.log("Processing failed:", errorMessage);
    mainWindow.webContents.send(
      PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
      errorMessage
    );
    // Reset view back to queue on error
    console.log("Resetting view to queue due to error");
    this.appState.setView("queue");
  }

  /**
   * Handle debug success
   */
  private handleDebugSuccess(mainWindow: BrowserWindow, data: any): void {
    this.appState.setHasDebugged(true);
    mainWindow.webContents.send(PROCESSING_EVENTS.DEBUG_SUCCESS, data);
  }

  /**
   * Handle debug error
   */
  private handleDebugError(
    mainWindow: BrowserWindow,
    errorMessage: string
  ): void {
    mainWindow.webContents.send(PROCESSING_EVENTS.DEBUG_ERROR, errorMessage);
  }

  private async processScreenshotsHelper(
    screenshots: Array<{ path: string; preview: string; data: string }>
  ): Promise<{ success: true; data: any } | { success: false; error: string }> {
    for (
      let retryCount = 1;
      retryCount <= ProcessingService.MAX_RETRIES;
      retryCount++
    ) {
      try {
        const imageDataList = screenshots.map((screenshot) => screenshot.data);
        const mainWindow = this.windowService.getMainWindow();

        const result = await this.problemService.processWithInitialPrompt(
          imageDataList
        );

        if (!result) {
          throw new Error("Failed to get result from API");
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
          this.screenshotService.clearExtraScreenshotQueue();
          mainWindow.webContents.send(
            PROCESSING_EVENTS.SOLUTION_SUCCESS,
            result
          );
          return { success: true, data: result };
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const errorCode =
          error instanceof Error && "code" in error
            ? String(error.code)
            : undefined;
        console.error("Error Details:", {
          message: errorMessage,
          code: errorCode,
          retryCount,
        });

        // If this is the last retry, return the error
        if (retryCount === ProcessingService.MAX_RETRIES) {
          console.error("All retry attempts failed:", errorMessage);
          return {
            success: false,
            error: errorMessage || "Server error. Please try again.",
          };
        }
        console.log(
          `Retry attempt ${retryCount}/${ProcessingService.MAX_RETRIES}`
        );
        await sleep(ProcessingService.RETRY_DELAY);
      }
    }
    // If we reach here, all retries failed
    return {
      success: false,
      error: "All retry attempts failed. Please try again.",
    };
  }

  private async processExtraScreenshotsHelper(
    screenshots: Array<{ path: string; data: string }>
  ) {
    try {
      const imageDataList = screenshots.map((screenshot) => screenshot.data);
      const previousResult = this.appState.getProblemInfo();

      if (!previousResult) {
        throw new Error("No previous result available");
      }

      // Process with follow-up prompt
      const result = await this.problemService.processWithFollowUpPrompt(
        imageDataList,
        previousResult
      );

      if (!result) {
        throw new Error("No result received");
      }

      return { success: true, data: result };
    } catch (error: any) {
      const mainWindow = this.windowService.getMainWindow();

      if (error.message?.includes("Operation timed out")) {
        // Clear both screenshot queues
        this.screenshotService.clearQueues();
        this.appState.setProblemInfo(null);
        this.appState.setView("queue");
        // Notify renderer to switch view
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("reset-view");
          mainWindow.webContents.send(
            PROCESSING_EVENTS.DEBUG_ERROR,
            "Operation timed out after 1 minute. Please try again."
          );
        }
        return {
          success: false,
          error: "Operation timed out after 1 minute. Please try again.",
        };
      }

      if (
        error.message?.includes(
          "Please close this window and re-enter a valid Open AI API key."
        )
      ) {
        if (mainWindow) {
          mainWindow.webContents.send(PROCESSING_EVENTS.API_KEY_INVALID);
        }
        return { success: false, error: error.message };
      }

      return { success: false, error: error.message };
    }
  }

  public cancelProcessing(): void {
    if (this.isProcessing || this.isExtraProcessing) {
      console.log("Cancelling processing");

      // Reset processing flags
      this.isProcessing = false;
      this.isExtraProcessing = false;

      // Reset hasDebugged flag
      this.appState.setHasDebugged(false);

      // Clear any pending state
      this.appState.setProblemInfo(null);

      const mainWindow = this.windowService.getMainWindow();
      if (mainWindow && !mainWindow.isDestroyed()) {
        // Send a clear message that processing was cancelled
        mainWindow.webContents.send(PROCESSING_EVENTS.NO_SCREENSHOTS);
      }
    }
  }
}
