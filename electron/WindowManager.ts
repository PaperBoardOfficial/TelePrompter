import { app, BrowserWindow, screen, shell } from "electron";
import path from "path";

class WindowPosition {
  constructor(public x: number = 0, public y: number = 0) {}
}

class WindowSize {
  constructor(public width: number = 800, public height: number = 600) {}
}

class ScreenDimensions {
  constructor(public width: number = 1920, public height: number = 1080) {}
}

/**
 * WindowManager handles all operations related to the application window
 * including creation, positioning, visibility, and transparency.
 */
export class WindowManager {
  private mainWindow: BrowserWindow | null = null;
  private isVisible: boolean = false;
  private position: WindowPosition | null = null;
  private size: WindowSize | null = null;
  private screenDimensions: ScreenDimensions | null = null;
  private moveStep = 60;
  private isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

  constructor() {
    this.initScreenDimensions();
  }

  private initScreenDimensions(): void {
    const primaryDisplay = screen.getPrimaryDisplay();
    const workArea = primaryDisplay.workAreaSize;
    this.screenDimensions = new ScreenDimensions(
      workArea.width,
      workArea.height
    );
  }

  /**
   * Creates the main application window or focuses it if it already exists
   */
  public createWindow(): BrowserWindow {
    if (this.mainWindow) {
      if (this.mainWindow.isMinimized()) this.mainWindow.restore();
      this.mainWindow.focus();
      return this.mainWindow;
    }

    const windowSettings: Electron.BrowserWindowConstructorOptions = {
      x: 0,
      y: 50,
      alwaysOnTop: true,
      webPreferences: {
        preload: path.join(app.getAppPath(), "dist-electron", "preload.js"),
        scrollBounce: true,
      },
      frame: false,
      transparent: true,
      fullscreenable: false,
      hasShadow: false,
      backgroundColor: "#00000000",
      skipTaskbar: true,
      type: "panel",
      paintWhenInitiallyHidden: true,
      titleBarStyle: "hidden",
      enableLargerThanScreen: true,
    };

    this.mainWindow = new BrowserWindow(windowSettings);

    // Set up event handlers
    this.setupWindowEvents();

    // Load the application
    const htmlPath = path.join(app.getAppPath(), "dist", "index.html");
    console.log("Loading HTML from:", htmlPath);
    this.mainWindow.loadFile(htmlPath).catch((error) => {
      console.error("Failed to load built files:", error);
    });

    // Configure window behavior
    this.configureWindowBehavior();

    // Initialize window state
    const bounds = this.mainWindow.getBounds();
    this.position = new WindowPosition(bounds.x, bounds.y);
    this.size = new WindowSize(bounds.width, bounds.height);
    this.isVisible = true;

    return this.mainWindow;
  }

  /**
   * Sets up event handlers for the window
   */
  private setupWindowEvents(): void {
    if (!this.mainWindow) return;

    this.mainWindow.on("move", () => {
      if (!this.mainWindow) return;
      const bounds = this.mainWindow.getBounds();
      this.position = new WindowPosition(bounds.x, bounds.y);
    });

    this.mainWindow.on("resize", () => {
      if (!this.mainWindow) return;
      const bounds = this.mainWindow.getBounds();
      this.size = new WindowSize(bounds.width, bounds.height);
    });

    this.mainWindow.on("closed", () => {
      this.mainWindow = null;
      this.isVisible = false;
      this.position = null;
      this.size = null;
    });

    this.mainWindow.webContents.on("did-finish-load", () => {
      console.log("Window finished loading");
    });

    this.mainWindow.webContents.on(
      "did-fail-load",
      (event, errorCode, errorDescription) => {
        console.error("Window failed to load:", errorCode, errorDescription);
        this.retryLoadingApplication();
      }
    );
  }

  /**
   * Retries loading the application after a failure
   */
  private retryLoadingApplication(): void {
    if (!this.mainWindow) return;

    console.log("Attempting to load built files...");
    setTimeout(() => {
      if (this.mainWindow) {
        const htmlPath = path.join(app.getAppPath(), "dist", "index.html");
        console.log("Reloading HTML from:", htmlPath);
        this.mainWindow.loadFile(htmlPath).catch((error) => {
          console.error("Failed to load built files on retry:", error);
        });
      }
    }, 1000);
  }

  /**
   * Configures window behavior and settings
   */
  private configureWindowBehavior(): void {
    if (!this.mainWindow) return;
    this.mainWindow.webContents.setZoomFactor(1);
    if (this.isDev) {
      this.mainWindow.webContents.openDevTools();
    }
    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: "deny" };
    });
    this.mainWindow.setContentProtection(true);
    this.mainWindow.setVisibleOnAllWorkspaces(true, {
      visibleOnFullScreen: true,
    });
    this.mainWindow.setAlwaysOnTop(true, "screen-saver", 1);
    if (process.platform === "darwin") {
      this.mainWindow.setHiddenInMissionControl(true);
      this.mainWindow.setWindowButtonVisibility(false);
      this.mainWindow.setBackgroundColor("#00000000");
      this.mainWindow.setSkipTaskbar(true);
      this.mainWindow.setHasShadow(false);
    }
    this.mainWindow.webContents.setBackgroundThrottling(false);
    this.mainWindow.webContents.setFrameRate(60);
  }

  /**
   * Hides the window
   */
  public hideWindow(): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

    // Store current bounds
    const bounds = this.mainWindow.getBounds();
    this.position = new WindowPosition(bounds.x, bounds.y);
    this.size = new WindowSize(bounds.width, bounds.height);

    // Hide-specific actions
    this.mainWindow.setIgnoreMouseEvents(true, { forward: true });
    this.mainWindow.setOpacity(0);
    this.mainWindow.hide();
    this.isVisible = false;
  }

  /**
   * Shows the window
   */
  public showWindow(): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

    // Restore bounds if available
    if (this.position && this.size) {
      this.mainWindow.setBounds({
        x: this.position.x,
        y: this.position.y,
        width: this.size.width,
        height: this.size.height,
      });
    }

    // Show-specific actions
    this.mainWindow.setIgnoreMouseEvents(false);
    this.mainWindow.setOpacity(0); // Set to 0 first for a smooth appearance
    this.mainWindow.showInactive();
    this.mainWindow.setOpacity(1);
    this.isVisible = true;
  }

  /**
   * Toggles window visibility
   */
  public toggleWindow(): void {
    this.isVisible ? this.hideWindow() : this.showWindow();
  }

  /**
   * Moves the window left
   */
  public moveLeft(): void {
    this.moveHorizontal((x) =>
      Math.max(-(this.size?.width || 0) / 2, x - this.moveStep)
    );
  }

  /**
   * Moves the window right
   */
  public moveRight(): void {
    this.moveHorizontal((x) =>
      Math.min(
        this.screenDimensions.width - (this.size?.width || 0) / 2,
        x + this.moveStep
      )
    );
  }

  /**
   * Moves the window up
   */
  public moveUp(): void {
    this.moveVertical((y) => y - this.moveStep);
  }

  /**
   * Moves the window down
   */
  public moveDown(): void {
    this.moveVertical((y) => y + this.moveStep);
  }

  /**
   * Moves the window horizontally
   */
  private moveHorizontal(updateFn: (x: number) => number): void {
    if (!this.mainWindow || !this.position) return;

    const newX = updateFn(this.position.x);
    this.position.x = newX;
    this.mainWindow.setPosition(Math.round(newX), Math.round(this.position.y));
  }

  /**
   * Moves the window vertically
   */
  private moveVertical(updateFn: (y: number) => number): void {
    if (!this.mainWindow || !this.position) return;

    const newY = updateFn(this.position.y);
    // Allow window to go 2/3 off screen in either direction
    const maxUpLimit = (-(this.size?.height || 0) * 2) / 3;
    const maxDownLimit =
      this.screenDimensions.height + ((this.size?.height || 0) * 2) / 3;

    // Only update if within bounds
    if (newY >= maxUpLimit && newY <= maxDownLimit) {
      this.position.y = newY;
      this.mainWindow.setPosition(
        Math.round(this.position.x),
        Math.round(newY)
      );
    }
  }

  /**
   * Sets the window dimensions
   */
  public setDimensions(width: number, height: number): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

    const [currentX, currentY] = this.mainWindow.getPosition();
    const primaryDisplay = screen.getPrimaryDisplay();
    const workArea = primaryDisplay.workAreaSize;
    const maxWidth = Math.floor(workArea.width * 0.5);

    this.mainWindow.setBounds({
      x: Math.min(currentX, workArea.width - maxWidth),
      y: currentY,
      width: Math.min(width + 32, maxWidth),
      height: Math.ceil(height),
    });
  }

  /**
   * Gets the main window
   */
  public getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }
}
