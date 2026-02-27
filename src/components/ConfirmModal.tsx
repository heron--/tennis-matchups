interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onCancel} />
      <div className="relative w-full max-w-sm bg-[#1a1d27] rounded-2xl border border-[#2e3350] p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-white mb-2">{title}</h2>
        <p className="text-sm text-slate-400 mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl border border-[#2e3350] text-slate-300 font-semibold text-sm active:bg-[#22263a] transition-colors min-h-[44px]"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`
              flex-1 py-3 rounded-xl font-semibold text-sm transition-colors min-h-[44px]
              ${danger
                ? 'bg-red-600 text-white active:bg-red-700'
                : 'bg-indigo-600 text-white active:bg-indigo-700'
              }
            `}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
