"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

type Toast = {
  id: number;
  message: string;
  type: ToastType;
};

type ToastContextValue = {
  toast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

function ToastItem({ toast: t, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(t.id), 4000);
    return () => clearTimeout(timer);
  }, [t.id, onDismiss]);

  const iconMap = {
    success: <CheckCircle2 size={16} className="text-emerald-700" />,
    error: <XCircle size={16} className="text-red-600" />,
    info: <Info size={16} className="text-blue-600" />,
  };

  const typeStyles = {
    success: "bg-emerald-50/95 border-emerald-200 text-emerald-950",
    error: "bg-red-50/95 border-red-200 text-red-950",
    info: "bg-blue-50/95 border-blue-200 text-blue-950",
  };

  return (
    <div
      className={`flex items-center gap-2.5 p-3 sm:px-3.5 rounded-xl border shadow-lg text-[13px] backdrop-blur-sm transition-all duration-200 ${typeStyles[t.type]}`}
      role="alert"
    >
      <span className="shrink-0 flex items-center justify-center">{iconMap[t.type]}</span>
      <span className="flex-1 leading-snug font-medium">{t.message}</span>
      <button
        className="shrink-0 text-neutral-400 hover:text-neutral-700 hover:bg-black/5 rounded p-1 transition-colors"
        onClick={() => onDismiss(t.id)}
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {mounted &&
        createPortal(
          <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-[380px] pointer-events-auto" aria-live="polite">
            {toasts.map((t) => (
              <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}
