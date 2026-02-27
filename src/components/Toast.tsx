import { useState, useCallback, useEffect, useRef } from 'react';

export interface ToastMessage {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'info';
}

let globalShowToast: ((msg: string, type?: ToastMessage['type']) => void) | null = null;

export function showToast(message: string, type: ToastMessage['type'] = 'success') {
  globalShowToast?.(message, type);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    timersRef.current.delete(id);
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastMessage['type'] = 'success') => {
      const id = crypto.randomUUID();
      setToasts(prev => [...prev, { id, message, type }]);
      const timer = setTimeout(() => removeToast(id), 3000);
      timersRef.current.set(id, timer);
    },
    [removeToast]
  );

  useEffect(() => {
    globalShowToast = addToast;
    return () => {
      globalShowToast = null;
    };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`
            px-4 py-3 rounded-lg text-sm font-semibold shadow-xl pointer-events-auto
            animate-[slideUp_0.2s_ease-out]
            ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-indigo-600 text-white'}
          `}
          onClick={() => removeToast(toast.id)}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
