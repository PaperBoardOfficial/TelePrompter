import { autoUpdater } from "electron-updater"
import { BrowserWindow, ipcMain, app } from "electron"
import log from "electron-log"

export function initAutoUpdater() {
  console.log("Initializing auto-updater...")

  // For testing purposes, we'll allow the auto-updater to run in development mode
  // but log a warning
  if (!app.isPackaged) {
    console.log("Auto-updater running in development mode (for testing)")
  }

  // If we're in development mode, simulate update events for testing
  if (!app.isPackaged || !process.env.GH_TOKEN) {
    console.log("Auto updater: Development mode, update notifications disabled")
    
    // Disable all update events
    ipcMain.handle("start-update", async () => {
      console.log("Update download requested, but updates are disabled")
      return { success: true }
    })
    
    ipcMain.handle("install-update", () => {
      console.log("Update installation requested, but updates are disabled")
    })
    
    // No simulated update events will be sent
    
    return
  }

  // Configure auto updater for production
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.allowDowngrade = true
  autoUpdater.allowPrerelease = true

  // Enable more verbose logging
  autoUpdater.logger = log
  log.transports.file.level = "debug"
  console.log(
    "Auto-updater logger configured with level:",
    log.transports.file.level
  )

  // Log all update events
  autoUpdater.on("checking-for-update", () => {
    console.log("Checking for updates...")
  })

  autoUpdater.on("update-available", (info) => {
    console.log("Update available:", info)
    // Notify renderer process about available update
    BrowserWindow.getAllWindows().forEach((window) => {
      console.log("Sending update-available to window")
      window.webContents.send("update-available", info)
    })
  })

  autoUpdater.on("update-not-available", (info) => {
    console.log("Update not available:", info)
  })

  autoUpdater.on("download-progress", (progressObj) => {
    console.log("Download progress:", progressObj)
  })

  autoUpdater.on("update-downloaded", (info) => {
    console.log("Update downloaded:", info)
    // Notify renderer process that update is ready to install
    BrowserWindow.getAllWindows().forEach((window) => {
      console.log("Sending update-downloaded to window")
      window.webContents.send("update-downloaded", info)
    })
  })

  autoUpdater.on("error", (err) => {
    console.error("Auto updater error:", err)
  })

  // Check for updates immediately
  console.log("Checking for updates...")
  autoUpdater
    .checkForUpdates()
    .then((result) => {
      console.log("Update check result:", result)
    })
    .catch((err) => {
      console.error("Error checking for updates:", err)
    })

  // Set up update checking interval (every 1 hour)
  setInterval(() => {
    console.log("Checking for updates (interval)...")
    autoUpdater
      .checkForUpdates()
      .then((result) => {
        console.log("Update check result (interval):", result)
      })
      .catch((err) => {
        console.error("Error checking for updates (interval):", err)
      })
  }, 60 * 60 * 1000)

  // Handle IPC messages from renderer
  ipcMain.handle("start-update", async () => {
    console.log("Start update requested")
    try {
      await autoUpdater.downloadUpdate()
      console.log("Update download completed")
      return { success: true }
    } catch (error) {
      console.error("Failed to start update:", error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle("install-update", () => {
    console.log("Install update requested")
    autoUpdater.quitAndInstall()
  })
}
