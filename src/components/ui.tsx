"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

export const inputCls =
  "w-full rounded-xl border border-line bg-raised px-3 py-2.5 text-sm outline-none focus:border-neon placeholder:text-dim/70";

export const btnPrimary =
  "rounded-xl bg-neon px-4 py-3 font-mono text-sm font-bold text-bg active:opacity-80 disabled:opacity-30";
export const btnGhost =
  "rounded-xl border border-line px-4 py-3 font-mono text-sm text-text active:bg-raised disabled:opacity-30";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[11px] tracking-wider text-dim uppercase">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-dim">{hint}</span>}
    </label>
  );
}

const fmtNum = (n: number, decimals: number) =>
  Number.isInteger(n) ? String(n) : n.toFixed(decimals).replace(/\.?0+$/, "").replace(".", ",");

/**
 * Campo numérico com vírgula ou ponto. Só grava ao sair do campo / Enter,
 * e volta ao valor anterior se o texto for inválido.
 */
export function NumInput({
  value,
  onCommit,
  min = 0,
  max = 100000,
  decimals = 1,
  unit,
  allowEmpty = false,
  placeholder,
  ariaLabel,
}: {
  value: number | undefined;
  onCommit: (n: number | null) => void;
  min?: number;
  max?: number;
  decimals?: number;
  unit?: string;
  allowEmpty?: boolean;
  placeholder?: string;
  ariaLabel?: string;
}) {
  const show = value === undefined ? "" : fmtNum(value, decimals);
  const [text, setText] = useState(show);
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(show);
  }, [show]);

  const commit = () => {
    focused.current = false;
    const t = text.trim().replace(",", ".");
    if (t === "") {
      if (allowEmpty) onCommit(null);
      else setText(show);
      return;
    }
    const n = Number(t);
    if (Number.isFinite(n) && n >= min && n <= max) onCommit(n);
    else setText(show);
  };

  return (
    <div className="relative">
      <input
        inputMode="decimal"
        value={text}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onFocus={(e) => {
          focused.current = true;
          e.currentTarget.select();
        }}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className={`${inputCls} font-mono tabular-nums ${unit ? "pr-10" : ""}`}
      />
      {unit && (
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 font-mono text-xs text-dim">
          {unit}
        </span>
      )}
    </div>
  );
}

/** Folha que sobe de baixo (mobile). Fecha no fundo escuro ou com Esc. */
export function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-30 flex items-end bg-black/65"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onClick={(e) => e.stopPropagation()}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            className="mx-auto max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-line bg-surface p-4 pb-8"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">{title}</h2>
              <button
                onClick={onClose}
                aria-label="Fechar"
                className="grid size-9 place-items-center rounded-full text-dim active:bg-raised"
              >
                ✕
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-line bg-surface p-4 ${className}`}>
      {children}
    </section>
  );
}
