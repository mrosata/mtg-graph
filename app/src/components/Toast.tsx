import { useEffect } from 'react';
import { useToastStore } from '../stores/toastStore';

const AUTO_DISMISS_MS = 2500;

export default function Toast() {
  const message = useToastStore((s) => s.message);
  const dismiss = useToastStore((s) => s.dismiss);

  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => window.clearTimeout(id);
  }, [message, dismiss]);

  if (!message) return null;

  return (
    <div
      role="status"
      onClick={dismiss}
      className="fixed bottom-4 right-4 z-50 cursor-pointer rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 shadow-lg"
    >
      {message}
    </div>
  );
}
