import { create } from 'zustand';

export type ToastTone = 'success' | 'neutral';

export type ToastMessage = {
  id: number;
  message: string;
  tone: ToastTone;
};

type ToastState = {
  current: ToastMessage | null;
  show: (message: string, tone?: ToastTone) => void;
  dismiss: () => void;
};

let nextId = 1;

export const useToastStore = create<ToastState>((set) => ({
  current: null,
  show: (message, tone = 'success') => set({ current: { id: nextId++, message, tone } }),
  dismiss: () => set({ current: null }),
}));
