import { toast as sonnerToast } from "sonner";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

export { Toaster } from "sonner";
function Toast({
  id,
  title,
  description,
  variant,
}: {
  id: string | number;
  title: string;
  description?: string;
  variant: "neutral" | "success" | "error";
}) {
  const variants = {
    neutral: {
      icon: <Info className="h-3 w-3 text-amber-700" />,
      bgColor: "bg-amber-100",
    },
    success: {
      icon: <CheckCircle2 className="h-3 w-3 text-emerald-700" />,
      bgColor: "bg-emerald-100",
    },
    error: {
      icon: <AlertCircle className="h-3 w-3 text-red-700" />,
      bgColor: "bg-red-100",
    },
  };

  const config = variants[variant];

  return (
    <div
      className={`group pointer-events-auto relative flex w-full items-center space-x-2 overflow-hidden rounded-md p-2 ${config.bgColor}`}
    >
      <div className="shrink-0">{config.icon}</div>
      <div className="flex-1">
        <p className="text-[0.7rem] font-medium text-zinc-900">{title}</p>
        {description && (
          <p className="text-[0.65rem] text-zinc-600 mt-0.5">{description}</p>
        )}
      </div>
      <button
        onClick={() => sonnerToast.dismiss(id)}
        className="absolute right-1 top-1 rounded-md p-0.5 text-zinc-500 opacity-0 transition-opacity hover:text-zinc-700 group-hover:opacity-100"
      >
        <X className="h-2 w-2" />
      </button>
    </div>
  );
}

export const toast = {
  success: (title: string, description?: string) => {
    return sonnerToast.custom((id) => (
      <Toast
        id={id}
        title={title}
        description={description}
        variant="success"
      />
    ));
  },
  error: (title: string, description?: string) => {
    return sonnerToast.custom((id) => (
      <Toast id={id} title={title} description={description} variant="error" />
    ));
  },
  neutral: (title: string, description?: string) => {
    return sonnerToast.custom((id) => (
      <Toast
        id={id}
        title={title}
        description={description}
        variant="neutral"
      />
    ));
  },
};
