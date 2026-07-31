import { useState } from 'react';
import clsx from 'clsx';

interface ConfirmActionButtonProps {
  /** Text on the resting button. */
  label: string;
  /** Shown next to the confirm/cancel pair once the button is armed. */
  question: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  disabled?: boolean;
  /** Applied to the resting button only, so each caller keeps its own look. */
  className?: string;
}

/**
 * A destructive-action button that asks for confirmation in the page instead of
 * through `window.confirm`.
 *
 * In-app webviews (the Instagram and Kakao browsers) and Chrome's "prevent this
 * page from creating additional dialogs" both suppress `confirm()`, and a
 * suppressed dialog returns `false` -- so `if (!confirm(...)) return;` silently
 * swallows the click and the action looks broken with nothing to see.
 */
export function ConfirmActionButton({
  label,
  question,
  confirmLabel = '해제',
  cancelLabel = '취소',
  onConfirm,
  disabled = false,
  className,
}: ConfirmActionButtonProps) {
  const [isArmed, setIsArmed] = useState(false);

  if (!isArmed) {
    return (
      <button
        type="button"
        onClick={() => setIsArmed(true)}
        disabled={disabled}
        className={className}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5 rounded-xl bg-red-50 px-2.5 py-1.5">
      <span className="text-[11px] font-bold text-red-700">{question}</span>
      <button
        type="button"
        onClick={() => {
          setIsArmed(false);
          onConfirm();
        }}
        disabled={disabled}
        className={clsx(
          'rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-black text-white transition',
          disabled ? 'opacity-50' : 'cursor-pointer hover:bg-red-700',
        )}
      >
        {confirmLabel}
      </button>
      <button
        type="button"
        onClick={() => setIsArmed(false)}
        className="cursor-pointer rounded-lg px-2 py-1 text-[11px] font-bold text-gray-500 transition hover:text-gray-800"
      >
        {cancelLabel}
      </button>
    </div>
  );
}
