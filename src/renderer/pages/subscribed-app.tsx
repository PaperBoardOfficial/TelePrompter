import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import Queue from "./queue";
import Solutions from "./solutions";
import { toast } from "@/renderer/components/common/toast";

const SubscribedApp: React.FC = ({}) => {
  const queryClient = useQueryClient();
  const [view, setView] = useState<"queue" | "solutions" | "debug">("queue");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cleanup = window.electronAPI.onResetView(() => {
      queryClient.invalidateQueries({
        queryKey: ["screenshots"],
      });
      queryClient.invalidateQueries({
        queryKey: ["problem_statement"],
      });
      queryClient.invalidateQueries({
        queryKey: ["solution"],
      });
      queryClient.invalidateQueries({
        queryKey: ["new_solution"],
      });
      setView("queue");
    });

    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (!containerRef.current) return;
      const height = containerRef.current.scrollHeight;
      const width = containerRef.current.scrollWidth;
      window.electronAPI?.updateContentDimensions({ width, height });
    };

    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(containerRef.current);

    const mutationObserver = new MutationObserver(updateDimensions);
    mutationObserver.observe(containerRef.current, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });

    updateDimensions();

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [view]);

  useEffect(() => {
    const cleanupFunctions = [
      window.electronAPI.onSolutionStart(() => {
        setView("solutions");
      }),
      window.electronAPI.onUnauthorized(() => {
        queryClient.removeQueries({
          queryKey: ["screenshots"],
        });
        queryClient.removeQueries({
          queryKey: ["solution"],
        });
        queryClient.removeQueries({
          queryKey: ["problem_statement"],
        });
        setView("queue");
      }),
      window.electronAPI.onResetView(() => {
        queryClient.removeQueries({
          queryKey: ["screenshots"],
        });
        queryClient.removeQueries({
          queryKey: ["solution"],
        });
        queryClient.removeQueries({
          queryKey: ["problem_statement"],
        });
        setView("queue");
      }),
      window.electronAPI.onResetView(() => {
        queryClient.setQueryData(["problem_statement"], null);
      }),
      window.electronAPI.onProblemExtracted((data: any) => {
        if (view === "queue") {
          queryClient.invalidateQueries({
            queryKey: ["problem_statement"],
          });
          queryClient.setQueryData(["problem_statement"], data);
        }
      }),
      window.electronAPI.onSolutionError((error: string) => {
        toast.error("Error", error);
      }),
    ];
    return () => cleanupFunctions.forEach((fn) => fn());
  }, [view]);

  return (
    <div className="min-h-screen bg-transparent">
      <div ref={containerRef} className="min-h-0">
        {view === "queue" ? (
          <Queue setView={setView} />
        ) : view === "solutions" ? (
          <Solutions setView={setView} />
        ) : null}
      </div>
    </div>
  );
};

export default SubscribedApp;
