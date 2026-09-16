import { create } from "zustand";

let seq = 0;

export const useToast = create((set) => ({
  toasts: [],
  push(toast) {
    const id = ++seq;
    const entry = { id, tone: "info", duration: 4000, ...toast };
    set((s) => ({ toasts: [...s.toasts, entry] }));
    if (entry.duration > 0) {
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
      }, entry.duration);
    }
    return id;
  },
  dismiss(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));

export const toast = {
  success: (message, opts) => useToast.getState().push({ tone: "success", message, ...opts }),
  error: (message, opts) => useToast.getState().push({ tone: "error", message, ...opts }),
  info: (message, opts) => useToast.getState().push({ tone: "info", message, ...opts }),
};
