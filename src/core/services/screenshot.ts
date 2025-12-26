import path from "node:path";
import fs from "node:fs";
import { app } from "electron";
import { v4 as uuidv4 } from "uuid";
import { execFile } from "child_process";
import { promisify } from "util";
import { WindowService } from "@/core/services/window";
import { sleep } from "@/core/utils";

const execFileAsync = promisify(execFile);

export class ScreenshotService {
  private screenshotQueue: string[] = [];
  private extraScreenshotQueue: string[] = [];
  private readonly MAX_SCREENSHOTS = 2;

  private readonly screenshotDir: string;
  private readonly extraScreenshotDir: string;

  private view: "queue" | "solutions" | "debug" = "queue";

  private windowsManager: WindowService;

  constructor(
    view: "queue" | "solutions" | "debug" = "queue",
    windowsManager: WindowService
  ) {
    this.view = view;
    this.windowsManager = windowsManager;

    // Initialize directories
    this.screenshotDir = path.join(app.getPath("userData"), "screenshots");
    this.extraScreenshotDir = path.join(
      app.getPath("userData"),
      "extra_screenshots"
    );

    // Create directories if they don't exist
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir);
    }
    if (!fs.existsSync(this.extraScreenshotDir)) {
      fs.mkdirSync(this.extraScreenshotDir);
    }
  }

  public getView(): "queue" | "solutions" | "debug" {
    return this.view;
  }

  public setView(view: "queue" | "solutions" | "debug"): void {
    console.log("Setting view in ScreenshotHelper:", view);
    console.log(
      "Current queues - Main:",
      this.screenshotQueue,
      "Extra:",
      this.extraScreenshotQueue
    );
    this.view = view;
  }

  public getScreenshotQueue(): string[] {
    return this.screenshotQueue;
  }

  public getExtraScreenshotQueue(): string[] {
    console.log("Getting extra screenshot queue:", this.extraScreenshotQueue);
    return this.extraScreenshotQueue;
  }

  /**
   * Clears both screenshot queues
   */
  public async clearQueues(): Promise<void> {
    // Clear main queue
    await this.clearQueue(this.screenshotQueue, "main");
    this.screenshotQueue = [];

    // Clear extra queue
    await this.clearQueue(this.extraScreenshotQueue, "extra");
    this.extraScreenshotQueue = [];
  }

  /**
   * Clears the extra screenshot queue
   */
  public async clearExtraScreenshotQueue(): Promise<void> {
    await this.clearQueue(this.extraScreenshotQueue, "extra");
    this.extraScreenshotQueue = [];
  }

  /**
   * Helper method to clear a queue of screenshots
   */
  private async clearQueue(queue: string[], queueName: string): Promise<void> {
    for (const screenshotPath of queue) {
      try {
        await fs.promises.unlink(screenshotPath);
      } catch (err) {
        console.error(
          `Error deleting ${queueName} screenshot at ${screenshotPath}:`,
          err
        );
      }
    }
  }

  private async captureScreenshotMac(): Promise<Buffer> {
    const tmpPath = path.join(app.getPath("temp"), `${uuidv4()}.png`);
    await execFileAsync("screencapture", ["-x", tmpPath]);
    const buffer = await fs.promises.readFile(tmpPath);
    await fs.promises.unlink(tmpPath);
    return buffer;
  }

  private async captureScreenshotLinux(): Promise<Buffer> {
    const tmpPath = path.join(app.getPath("temp"), `${uuidv4()}.png`);
    // Use gnome-screenshot for Ubuntu/Linux systems
    await execFileAsync("gnome-screenshot", ["-f", tmpPath]);
    const buffer = await fs.promises.readFile(tmpPath);
    await fs.promises.unlink(tmpPath);
    return buffer;
  }

  private async captureScreenshotWindows(): Promise<Buffer> {
    // Using PowerShell's native screenshot capability
    const tmpPath = path.join(app.getPath("temp"), `${uuidv4()}.png`);
    const script = `
      Add-Type -AssemblyName System.Windows.Forms
      Add-Type -AssemblyName System.Drawing
      $screen = [System.Windows.Forms.Screen]::PrimaryScreen
      $bitmap = New-Object System.Drawing.Bitmap $screen.Bounds.Width, $screen.Bounds.Height
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      $graphics.CopyFromScreen($screen.Bounds.X, $screen.Bounds.Y, 0, 0, $bitmap.Size)
      $bitmap.Save('${tmpPath.replace(/\\/g, "\\\\")}')
      $graphics.Dispose()
      $bitmap.Dispose()
    `;
    await execFileAsync("powershell", ["-command", script]);
    const buffer = await fs.promises.readFile(tmpPath);
    await fs.promises.unlink(tmpPath);
    return buffer;
  }

  /**
   * Takes a screenshot and adds it to the appropriate queue
   */
  public async takeScreenshot(): Promise<string> {
    console.log("Taking screenshot in view:", this.view);

    // Hide window before taking screenshot
    this.windowsManager.hideWindow();
    await sleep(100);

    try {
      // Capture the screenshot
      const screenshotBuffer = await this.captureScreenshot();

      // Save and manage the screenshot
      const screenshotPath = await this.saveScreenshot(screenshotBuffer);

      return screenshotPath;
    } catch (error) {
      console.error("Screenshot error:", error);
      throw error;
    } finally {
      // Show window after taking screenshot
      await sleep(50);
      this.windowsManager.showWindow();
    }
  }

  /**
   * Captures a screenshot using platform-specific methods
   */
  private async captureScreenshot(): Promise<Buffer> {
    if (process.platform === "darwin") {
      return this.captureScreenshotMac();
    } else if (process.platform === "linux") {
      return this.captureScreenshotLinux();
    } else {
      return this.captureScreenshotWindows();
    }
  }

  /**
   * Saves a screenshot to the appropriate directory and manages the queue
   */
  private async saveScreenshot(screenshotBuffer: Buffer): Promise<string> {
    let screenshotPath = "";

    if (this.view === "queue") {
      screenshotPath = await this.saveToMainQueue(screenshotBuffer);
    } else {
      screenshotPath = await this.saveToExtraQueue(screenshotBuffer);
    }

    return screenshotPath;
  }

  /**
   * Saves a screenshot to the main queue
   */
  private async saveToMainQueue(screenshotBuffer: Buffer): Promise<string> {
    const screenshotPath = path.join(this.screenshotDir, `${uuidv4()}.png`);
    await fs.promises.writeFile(screenshotPath, screenshotBuffer);

    console.log("Adding screenshot to main queue:", screenshotPath);
    this.screenshotQueue.push(screenshotPath);

    await this.enforceQueueLimit(this.screenshotQueue, "main");

    return screenshotPath;
  }

  /**
   * Saves a screenshot to the extra queue
   */
  private async saveToExtraQueue(screenshotBuffer: Buffer): Promise<string> {
    const screenshotPath = path.join(
      this.extraScreenshotDir,
      `${uuidv4()}.png`
    );
    await fs.promises.writeFile(screenshotPath, screenshotBuffer);

    console.log("Adding screenshot to extra queue:", screenshotPath);
    this.extraScreenshotQueue.push(screenshotPath);

    await this.enforceQueueLimit(this.extraScreenshotQueue, "extra");

    return screenshotPath;
  }

  /**
   * Enforces the maximum queue size by removing oldest screenshots
   */
  private async enforceQueueLimit(
    queue: string[],
    queueName: string
  ): Promise<void> {
    if (queue.length > this.MAX_SCREENSHOTS) {
      const removedPath = queue.shift();
      if (removedPath) {
        try {
          await fs.promises.unlink(removedPath);
          console.log(
            `Removed old screenshot from ${queueName} queue:`,
            removedPath
          );
        } catch (error) {
          console.error(
            `Error removing old screenshot from ${queueName} queue:`,
            error
          );
        }
      }
    }
  }

  public async getImagePreview(filepath: string): Promise<string> {
    try {
      const data = await fs.promises.readFile(filepath);
      return `data:image/png;base64,${data.toString("base64")}`;
    } catch (error) {
      console.error("Error reading image:", error);
      throw error;
    }
  }

  public async deleteScreenshot(
    path: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await fs.promises.unlink(path);
      if (this.view === "queue") {
        this.screenshotQueue = this.screenshotQueue.filter(
          (filePath) => filePath !== path
        );
      } else {
        this.extraScreenshotQueue = this.extraScreenshotQueue.filter(
          (filePath) => filePath !== path
        );
      }
      return { success: true };
    } catch (error) {
      console.error("Error deleting file:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }
}
