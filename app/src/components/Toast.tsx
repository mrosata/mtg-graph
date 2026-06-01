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
      className="fixed bottom-4 right-4 z-50 cursor-pointer overflow-hidden rounded-md border border-ink-line bg-ink-raised px-4 py-2.5 text-sm text-vellum shadow-[0_18px_40px_-12px_rgba(0,0,0,0.7),0_0_0_1px_rgba(212,164,74,0.18)]"
    >
      <div className="brass-hairline-soft -mx-4 -mt-2.5 mb-2" aria-hidden="true" />
      <span className="font-head italic text-vellum">{message}</span>
    </div>
  );
}
