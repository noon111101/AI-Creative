import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type ToastKind = 'info' | 'success' | 'error' | 'warning';
type ToastItem = { id: string; message: string; kind?: ToastKind };

const ToastContext = createContext<{ addToast: (msg: string, kind?: ToastKind) => void } | undefined>(undefined);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const t: ToastItem = { id, message, kind };
    setToasts((s) => [t, ...s]);
    // auto remove
    setTimeout(() => {
      setToasts((s) => s.filter(x => x.id !== id));
    }, 4500);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 items-end">
        {toasts.map((t) => (
          <div key={t.id} className={`max-w-sm w-full px-4 py-2 rounded shadow-lg text-sm text-white pointer-events-auto transform transition-all duration-200 ${t.kind === 'success' ? 'bg-green-600' : t.kind === 'error' ? 'bg-red-600' : t.kind === 'warning' ? 'bg-yellow-600 text-black' : 'bg-indigo-600'}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
