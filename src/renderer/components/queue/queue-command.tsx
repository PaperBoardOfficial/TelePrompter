import React, { useState, useEffect, useRef } from "react";

import { toast } from "@/renderer/components/common/toast";
import { COMMAND_KEY } from "@/renderer/utils/platform";
import SettingsModal from "@/renderer/components/settings/settings-modal";

interface QueueCommandsProps {
  onTooltipVisibilityChange: (visible: boolean, height: number) => void;
  screenshotCount?: number;
}

const QueueCommands: React.FC<QueueCommandsProps> = ({
  onTooltipVisibilityChange,
  screenshotCount = 0,
}) => {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"api" | "prompts">("api");
  const [transparency, setTransparency] = useState(80);

  useEffect(() => {
    let tooltipHeight = 0;
    if (tooltipRef.current && isTooltipVisible) {
      tooltipHeight = tooltipRef.current.offsetHeight + 10;
    }
    onTooltipVisibilityChange(isTooltipVisible, tooltipHeight);
  }, [isTooltipVisible]);

  // Load transparency value on component mount
  useEffect(() => {
    const loadTransparency = async () => {
      try {
        const result = await window.electronAPI.getTransparency();
        if (result.success && result.transparency !== undefined) {
          setTransparency(result.transparency);
        }
      } catch (error) {
        console.error("Error loading transparency:", error);
      }
    };

    loadTransparency();
  }, []);

  // Apply transparency when the value changes
  const handleTransparencyChange = async (value: number) => {
    setTransparency(value);
    try {
      const result = await window.electronAPI.setTransparency(value);
      if (!result.success) {
        console.error("Failed to set transparency:", result.error);
        toast.error("Failed to set transparency", "error");
      }
    } catch (error) {
      console.error("Error setting transparency:", error);
      toast.error("Failed to set transparency", "error");
    }
  };

  // Calculate background opacity styles based on transparency value
  const getBackgroundStyle = (baseOpacity: number) => {
    // Scale the opacity based on the transparency slider
    // For example, if baseOpacity is 0.6 and transparency is 50%,
    // the result will be 0.3 (50% of 0.6)
    const scaledOpacity = baseOpacity * (transparency / 100);
    return {
      backgroundColor: `rgba(0, 0, 0, ${scaledOpacity})`,
    };
  };

  const handleMouseEnter = () => {
    setIsTooltipVisible(true);
  };

  const handleMouseLeave = () => {
    setIsTooltipVisible(false);
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
      <div className="flex items-center">
        <div
          className="text-xs text-white/90 backdrop-blur-md rounded-lg py-2 px-4 flex items-center justify-center gap-4"
          style={getBackgroundStyle(0.6)} // Replace bg-black/60 with dynamic style
        >
          {/* Screenshot */}
          <div
            className="flex items-center gap-2 cursor-pointer rounded px-2 py-1.5 hover:bg-white/10 transition-colors"
            onClick={async () => {
              try {
                const result = await window.electronAPI.triggerScreenshot();
                if (!result.success) {
                  console.error("Failed to take screenshot:", result.error);
                  toast.error("Failed to take screenshot", "error");
                }
              } catch (error) {
                console.error("Error taking screenshot:", error);
                toast.error("Failed to take screenshot", "error");
              }
            }}
          >
            <span className="text-[11px] leading-none truncate">
              {screenshotCount === 0
                ? "Take first screenshot"
                : screenshotCount === 1
                ? "Take second screenshot"
                : "Reset first screenshot"}
            </span>
            <div className="flex gap-1">
              <button className="bg-white/10 rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70">
                {COMMAND_KEY}
              </button>
              <button className="bg-white/10 rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70">
                H
              </button>
            </div>
          </div>

          {/* Solve Command */}
          {screenshotCount > 0 && (
            <div
              className="flex flex-col cursor-pointer rounded px-2 py-1.5 hover:bg-white/10 transition-colors"
              onClick={async () => {
                try {
                  const result =
                    await window.electronAPI.triggerProcessScreenshots();
                  if (!result.success) {
                    console.error(
                      "Failed to process screenshots:",
                      result.error
                    );
                    toast.error("Error", "Failed to process screenshots");
                  }
                } catch (error) {
                  console.error("Error processing screenshots:", error);
                  toast.error("Error", "Failed to process screenshots");
                }
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] leading-none">Solve </span>
                <div className="flex gap-1 ml-2">
                  <button className="bg-white/10 rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70">
                    {COMMAND_KEY}
                  </button>
                  <button className="bg-white/10 rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70">
                    ↵
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Separator */}
          <div className="mx-2 h-4 w-px bg-white/20" />

          {/* Settings with Tooltip */}
          <div
            className="relative inline-block"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {/* Gear icon */}
            <div className="w-4 h-4 flex items-center justify-center cursor-pointer text-white/70 hover:text-white/90 transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-3.5 h-3.5"
              >
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>

            {/* Tooltip Content */}
            {isTooltipVisible && (
              <div
                ref={tooltipRef}
                className="absolute top-full left-0 mt-2 w-80 transform -translate-x-[calc(50%-12px)]"
                style={{ zIndex: 100 }}
              >
                {/* Add transparent bridge */}
                <div className="absolute -top-2 right-0 w-full h-2" />
                <div
                  className="p-3 text-xs backdrop-blur-md rounded-lg border border-white/10 text-white/90 shadow-lg"
                  style={getBackgroundStyle(0.8)} // Replace bg-black/80 with dynamic style
                >
                  <div className="space-y-4">
                    <h3 className="font-medium truncate">Keyboard Shortcuts</h3>
                    <div className="space-y-3">
                      {/* Toggle Command */}
                      <div
                        className="cursor-pointer rounded px-2 py-1.5 hover:bg-white/10 transition-colors"
                        onClick={async () => {
                          try {
                            const result =
                              await window.electronAPI.toggleMainWindow();
                            if (!result.success) {
                              console.error(
                                "Failed to toggle window:",
                                result.error
                              );
                              toast.error("Error", "Failed to toggle window");
                            }
                          } catch (error) {
                            console.error("Error toggling window:", error);
                            toast.error("Error", "Failed to toggle window");
                          }
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate">Toggle Window</span>
                          <div className="flex gap-1 flex-shrink-0">
                            <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] leading-none">
                              {COMMAND_KEY}
                            </span>
                            <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] leading-none">
                              B
                            </span>
                          </div>
                        </div>
                        <p className="text-[10px] leading-relaxed text-white/70 truncate mt-1">
                          Show or hide this window.
                        </p>
                      </div>

                      {/* Screenshot Command */}
                      <div
                        className="cursor-pointer rounded px-2 py-1.5 hover:bg-white/10 transition-colors"
                        onClick={async () => {
                          try {
                            const result =
                              await window.electronAPI.triggerScreenshot();
                            if (!result.success) {
                              console.error(
                                "Failed to take screenshot:",
                                result.error
                              );
                              toast.error("Error", "Failed to take screenshot");
                            }
                          } catch (error) {
                            console.error("Error taking screenshot:", error);
                            toast.error("Error", "Failed to take screenshot");
                          }
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate">Take Screenshot</span>
                          <div className="flex gap-1 flex-shrink-0">
                            <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] leading-none">
                              {COMMAND_KEY}
                            </span>
                            <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] leading-none">
                              H
                            </span>
                          </div>
                        </div>
                        <p className="text-[10px] leading-relaxed text-white/70 truncate mt-1">
                          Take a screenshot of the problem description.
                        </p>
                      </div>

                      {/* Solve Command */}
                      <div
                        className={`cursor-pointer rounded px-2 py-1.5 hover:bg-white/10 transition-colors ${
                          screenshotCount > 0
                            ? ""
                            : "opacity-50 cursor-not-allowed"
                        }`}
                        onClick={async () => {
                          if (screenshotCount === 0) return;

                          try {
                            const result =
                              await window.electronAPI.triggerProcessScreenshots();
                            if (!result.success) {
                              console.error(
                                "Failed to process screenshots:",
                                result.error
                              );
                              toast.error(
                                "Error",
                                "Failed to process screenshots"
                              );
                            }
                          } catch (error) {
                            console.error(
                              "Error processing screenshots:",
                              error
                            );
                            toast.error(
                              "Error",
                              "Failed to process screenshots"
                            );
                          }
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate">Solve</span>
                          <div className="flex gap-1 flex-shrink-0">
                            <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] leading-none">
                              {COMMAND_KEY}
                            </span>
                            <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] leading-none">
                              ↵
                            </span>
                          </div>
                        </div>
                        <p className="text-[10px] leading-relaxed text-white/70 truncate mt-1">
                          {screenshotCount > 0
                            ? "Generate a solution based on the current problem."
                            : "Take a screenshot first to generate a solution."}
                        </p>
                      </div>

                      {/* Transparency Slider */}
                      <div className="rounded px-2 py-1.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="truncate">App Transparency</span>
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded leading-none"
                            style={getBackgroundStyle(0.2)} // Replace bg-white/20 with dynamic style
                          >
                            {transparency}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="20"
                          max="100"
                          value={transparency}
                          onChange={(e) =>
                            handleTransparencyChange(parseInt(e.target.value))
                          }
                          className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
                          style={{
                            backgroundColor: `rgba(255, 255, 255, ${
                              (0.2 * transparency) / 100
                            })`,
                          }}
                        />
                        <p className="text-[10px] leading-relaxed text-white/70 truncate mt-1">
                          Adjust the transparency of the application window.
                        </p>
                      </div>

                      {/* Settings Option */}
                      <div
                        className="cursor-pointer rounded px-2 py-1.5 hover:bg-white/10 transition-colors"
                        onClick={() => {
                          setSettingsTab("api");
                          setIsSettingsOpen(true);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate">Settings</span>
                        </div>
                        <p className="text-[10px] leading-relaxed text-white/70 truncate mt-1">
                          Configure API key, prompt templates, and other
                          settings.
                        </p>
                      </div>

                      {/* Quit App Option */}
                      <div
                        className="cursor-pointer rounded px-2 py-1.5 hover:bg-white/10 transition-colors"
                        onClick={async () => {
                          try {
                            await window.electronAPI.quitApp();
                          } catch (error) {
                            console.error("Error quitting app:", error);
                            toast.error("Error", "Failed to quit application");
                          }
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate">Quit Application</span>
                        </div>
                        <p className="text-[10px] leading-relaxed text-white/70 truncate mt-1">
                          Close the application completely.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        transparency={transparency}
        initialTab={settingsTab}
      />
    </div>
  );
};

export default QueueCommands;
