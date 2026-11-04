"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useT } from "@/i18n/client";
import { IconClose } from "./Icons";

/**
 * Native dialog: Esc and the close button close it. A sheet from the bottom on phones, centred from tablets up.
 * The content is only rendered while open, so a form starts fresh every time.
 */
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const { t } = useT();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => { if (event.target === ref.current) onClose(); }}
      className="mx-auto mt-auto mb-0 max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-[28px] bg-white p-0 text-navy shadow-[var(--shadow-float)] backdrop:bg-navy/50 sm:m-auto sm:max-w-xl sm:rounded-[24px]"
    >
      {open && (
        <div className="flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold">{title}</h2>
            <button type="button" onClick={onClose} aria-label={t("common.close")} className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-cloud">
              <IconClose size={18} />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
