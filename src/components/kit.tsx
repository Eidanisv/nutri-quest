"use client";

import {
  Children,
  Fragment,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useDialog } from "@/lib/dialog";

// ─────────────────────────── Ícones (traço 1.8, 24 px) ───────────────────────────

const ICONS = {
  home: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" /></>,
  bag: <><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></>,
  chart: <><path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" /></>,
  trend: <><path d="M23 18l-9.5-9.5-5 5L1 6" /><path d="M17 18h6v-6" /></>,
  user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
  mail: <><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" /><path d="M22 6l-10 7L2 6" /></>,
  lock: <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>,
  eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>,
  eyeoff: <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><path d="M1 1l22 22" /></>,
  bell: <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></>,
  cloud: <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />,
  dl: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" /></>,
  ul: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M17 8l-5-5-5 5" /><path d="M12 3v12" /></>,
  file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M16 13H8" /><path d="M16 17H8" /></>,
  check: <path d="M20 6L9 17l-5-5" />,
  cl: <path d="M15 18l-6-6 6-6" />,
  cr: <path d="M9 18l6-6-6-6" />,
  cd: <path d="M6 9l6 6 6-6" />,
  cu: <path d="M18 15l-6-6-6 6" />,
  info: <><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></>,
  alert: <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><path d="M12 9v4" /><path d="M12 17h.01" /></>,
  drop: <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />,
  plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
  minus: <path d="M5 12h14" />,
  x: <><path d="M18 6L6 18" /><path d="M6 6l12 12" /></>,
  trash: <><path d="M3 6h18" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>,
  out: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></>,
  search: <><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></>,
  coffee: <><path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" /><path d="M6 1v3" /><path d="M10 1v3" /><path d="M14 1v3" /></>,
  target: <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></>,
  wifi: <><path d="M1 1l22 22" /><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" /><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" /><path d="M10.71 5.05A16 16 0 0 1 22.58 9" /><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><path d="M12 20h.01" /></>,
  refresh: <><path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></>,
  flame: <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z" />,
  edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" /></>,
  dumb: <><path d="M5 12h14" /><path d="M7.5 7v10" /><path d="M16.5 7v10" /><path d="M3.5 9.5v5" /><path d="M20.5 9.5v5" /></>,
  clock: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>,
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 22, sw = 1.8, className = "" }: { name: IconName; size?: number; sw?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`shrink-0 ${className}`}
    >
      {ICONS[name]}
    </svg>
  );
}

// ─────────────────────────── Botão (pílula, como no design system) ───────────────────────────

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "link";
  size?: "lg" | "md" | "sm";
  danger?: boolean;
  block?: boolean;
};

export function Button({ variant = "primary", size = "lg", danger, block = true, className = "", children, ...p }: BtnProps) {
  const sz = { lg: "h-12 px-6 t-body", md: "h-10 px-5 t-body", sm: "h-8 px-3.5 t-small" }[size];
  const v =
    variant === "primary"
      ? `${danger ? "bg-err" : "bg-blue"} text-white`
      : variant === "outline"
        ? `border ${danger ? "border-err text-err" : "border-blue text-link"}`
        : `${danger ? "text-err" : "text-link"}`;
  return (
    <button
      {...p}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full transition-opacity active:opacity-60 disabled:opacity-35 ${sz} ${v} ${block ? "w-full" : ""} ${className}`}
    >
      {children}
    </button>
  );
}

// ─────────────────────────── Superfícies ───────────────────────────

export function Card({ children, className = "", as: Tag = "section" }: { children: ReactNode; className?: string; as?: "section" | "div" }) {
  return <Tag className={`ctx-white rounded-xl bg-bg p-4 ${className}`}>{children}</Tag>;
}

/** Lista agrupada: linhas com divisor, como em Ajustes do iOS. */
export function Group({ children, className = "" }: { children: ReactNode; className?: string }) {
  const items = Children.toArray(children).filter(Boolean);
  return (
    <div className={`overflow-hidden rounded-xl bg-bg ${className}`}>
      {items.map((c, i) => (
        <Fragment key={isValidElement(c) && c.key ? c.key : i}>
          {i > 0 && <div className="mx-4 h-px bg-bd" />}
          {c}
        </Fragment>
      ))}
    </div>
  );
}

export function SectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-1 pt-1">
      <h2 className="t-cap-sb tracking-wide text-tx2 uppercase">{children}</h2>
      {right && <span className="t-cap text-tx2">{right}</span>}
    </div>
  );
}

export function IconTile({ name, tone = "blue" }: { name: IconName; tone?: "blue" | "gray" | "err" }) {
  const bg = tone === "blue" ? "bg-blue" : tone === "err" ? "bg-err" : "bg-tx2";
  return (
    <span className={`grid size-[30px] shrink-0 place-items-center rounded-lg text-white ${bg}`}>
      <Icon name={name} size={18} sw={2} />
    </span>
  );
}

/** Linha de lista: ícone, título, valor à direita e seta. */
export function Row({
  icon,
  tone,
  title,
  sub,
  value,
  onClick,
  chevron = true,
  right,
  danger,
  disabled,
}: {
  icon?: IconName;
  tone?: "blue" | "gray" | "err";
  title: ReactNode;
  sub?: ReactNode;
  value?: ReactNode;
  onClick?: () => void;
  chevron?: boolean;
  right?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
}) {
  const inner = (
    <>
      {icon && <IconTile name={icon} tone={tone} />}
      <span className="min-w-0 flex-1 text-left">
        <span className={`block t-body ${danger ? "text-err" : ""}`}>{title}</span>
        {sub && <span className="block t-cap text-tx2">{sub}</span>}
      </span>
      {value && <span className="t-small text-tx2">{value}</span>}
      {right}
      {onClick && chevron && <Icon name="cr" size={18} sw={2} className="text-tx2/70" />}
    </>
  );
  const cls = "flex min-h-[52px] w-full items-center gap-3 px-4 py-2.5";
  return onClick ? (
    <button onClick={onClick} disabled={disabled} className={`${cls} active:bg-sup disabled:opacity-40`}>
      {inner}
    </button>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

export function Chip({ children, tone = "blue" }: { children: ReactNode; tone?: "blue" | "ok" | "err" | "warn" | "gray" | "white" }) {
  const t = {
    blue: "bg-blue/10 text-link",
    ok: "bg-ok/10 text-ok",
    err: "bg-err/10 text-err",
    warn: "bg-warn/10 text-warn",
    gray: "bg-sup text-tx2",
    white: "bg-bg text-tx",
  }[tone];
  return <span className={`t-cap-sb inline-flex items-center rounded-full px-2.5 py-1 ${t}`}>{children}</span>;
}

export function Banner({ tone = "blue", icon = "info", children }: { tone?: "blue" | "err" | "warn" | "ok"; icon?: IconName; children: ReactNode }) {
  const t = { blue: "bg-blue/10 text-link", err: "bg-err/10 text-err", warn: "bg-warn/10 text-warn", ok: "bg-ok/10 text-ok" }[tone];
  return (
    <div role="status" className={`flex items-start gap-2.5 rounded-xl px-3.5 py-3 t-small ${t}`}>
      <Icon name={icon} size={20} className="mt-px" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

// ─────────────────────────── Indicadores ───────────────────────────

export function Progress({ value, tone = "blue", h = 6, label }: { value: number; tone?: "blue" | "ok" | "err"; h?: number; label?: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const c = { blue: "bg-blue", ok: "bg-ok", err: "bg-err" }[tone];
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      className="w-full overflow-hidden rounded-full bg-bd"
      style={{ height: h }}
    >
      <motion.div className={`h-full rounded-full ${c}`} initial={false} animate={{ width: `${pct}%` }} transition={{ type: "spring", stiffness: 160, damping: 26 }} />
    </div>
  );
}

export function Ring({ size = 132, stroke = 12, value, tone = "blue", children }: { size?: number; stroke?: number; value: number; tone?: "blue" | "ok" | "err"; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  const col = { blue: "var(--c-blue)", ok: "var(--c-ok)", err: "var(--c-err)" }[tone];
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--c-bd)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={col}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c * (1 - v) }}
          transition={{ type: "spring", stiffness: 120, damping: 24 }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-bd ${className}`} />;
}

// ─────────────────────────── Controles ───────────────────────────

export const inputCls =
  "h-12 w-full rounded-xl border-2 border-transparent bg-[var(--field,var(--c-bg))] px-4 t-body text-tx outline-none placeholder:text-tx2 focus:border-blue focus:bg-bg";

export function Field({ label, hint, error, children }: { label?: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="block min-w-0">
      {label && <span className="t-small-sb mb-1.5 block">{label}</span>}
      {children}
      {error ? <span className="t-cap mt-1.5 block text-err">{error}</span> : hint ? <span className="t-cap mt-1.5 block text-tx2">{hint}</span> : null}
    </label>
  );
}

export function TextField({
  label,
  hint,
  error,
  password,
  className = "",
  ...p
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string; error?: string; password?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <Field label={label} hint={hint} error={error}>
      <div className="relative">
        <input
          {...p}
          type={password ? (show ? "text" : "password") : p.type}
          className={`${inputCls} ${error ? "!border-err" : ""} ${password ? "pr-12" : ""} ${className}`}
        />
        {password && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Esconder senha" : "Mostrar senha"}
            className="absolute top-1/2 right-3 grid size-8 -translate-y-1/2 place-items-center text-tx2"
          >
            <Icon name={show ? "eyeoff" : "eye"} size={20} />
          </button>
        )}
      </div>
    </Field>
  );
}

const fmtNum = (n: number, d: number) => (Number.isInteger(n) ? String(n) : n.toFixed(d).replace(/\.?0+$/, "").replace(".", ","));

/** Campo numérico (vírgula ou ponto). Só grava ao sair do campo; volta ao valor anterior se inválido. */
export function NumField({
  label,
  hint,
  value,
  onCommit,
  min = 0,
  max = 100000,
  decimals = 1,
  unit,
  allowEmpty = false,
  placeholder,
  ariaLabel,
  big,
  className = "",
}: {
  label?: string;
  hint?: string;
  value: number | undefined;
  onCommit: (n: number | null) => void;
  min?: number;
  max?: number;
  decimals?: number;
  unit?: string;
  allowEmpty?: boolean;
  placeholder?: string;
  ariaLabel?: string;
  big?: boolean;
  className?: string;
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
    if (t === "") return allowEmpty ? onCommit(null) : setText(show);
    const n = Number(t);
    if (Number.isFinite(n) && n >= min && n <= max) onCommit(n);
    else setText(show);
  };
  return (
    <Field label={label} hint={hint}>
      <div className="relative">
        <input
          inputMode="decimal"
          value={text}
          placeholder={placeholder}
          aria-label={ariaLabel ?? label}
          onFocus={(e) => {
            focused.current = true;
            e.currentTarget.select();
          }}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          style={big ? { fontSize: 34, fontWeight: 600, lineHeight: 1.1 } : undefined}
          className={`${inputCls} tnum ${unit ? "pr-12" : ""} ${big ? "h-16 text-center" : ""} ${className}`}
        />
        {unit && <span className="t-small pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-tx2">{unit}</span>}
      </div>
    </Field>
  );
}

export function Select({ label, hint, children, ...p }: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; hint?: string }) {
  return (
    <Field label={label} hint={hint}>
      <select {...p} className={`${inputCls} appearance-none`}>
        {children}
      </select>
    </Field>
  );
}

export function Segmented<T extends string>({ options, value, onChange, label }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void; label?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-0.5 rounded-xl bg-bd p-[3px]">
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.id)}
            className={`t-small flex-1 rounded-[10px] py-2 transition-colors ${on ? "t-small-sb bg-bg shadow-[0_1px_3px_rgba(0,0,0,0.12)]" : "text-tx2"}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors ${on ? "bg-blue" : "bg-bd"}`}
    >
      <span className={`absolute top-0.5 size-[27px] rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.2)] transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

/** Opção de escolha (cartão com borda azul quando selecionado), como "Opção de escolha" do design system. */
export function Choice({ title, desc, selected, onClick, disabled, badge }: { title: string; desc?: string; selected: boolean; onClick: () => void; disabled?: boolean; badge?: string }) {
  return (
    <button
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onClick}
      className={`w-full rounded-xl border-2 bg-bg px-4 py-3.5 text-left transition-colors disabled:opacity-50 ${selected ? "border-blue" : "border-transparent"}`}
    >
      <span className="flex items-center gap-2">
        <span className="t-body-sb">{title}</span>
        {badge && <Chip tone="gray">{badge}</Chip>}
      </span>
      {desc && <span className="t-small mt-0.5 block text-tx2">{desc}</span>}
    </button>
  );
}

export function Stepper({ value, onMinus, onPlus, label }: { value: ReactNode; onMinus: () => void; onPlus: () => void; label: string }) {
  const b = "grid size-8 place-items-center rounded-full bg-bg text-blue active:opacity-60";
  return (
    <div className="flex shrink-0 items-center gap-0.5 rounded-full bg-sup p-0.5" role="group" aria-label={label}>
      <button onClick={onMinus} aria-label="Diminuir" className={b}>
        <Icon name="minus" size={16} sw={2.4} />
      </button>
      <span className="t-small-sb tnum min-w-[58px] text-center">{value}</span>
      <button onClick={onPlus} aria-label="Aumentar" className={b}>
        <Icon name="plus" size={16} sw={2.4} />
      </button>
    </div>
  );
}

/** Caixa de marcação redonda (refeições e compras). */
export function Check({ on, size = 26 }: { on: boolean; size?: number }) {
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-full border-[1.5px] transition-colors ${on ? "border-blue bg-blue text-white" : "border-tx2"}`}
      style={{ width: size, height: size }}
    >
      {on && <Icon name="check" size={size * 0.55} sw={3.2} />}
    </span>
  );
}

// ─────────────────────────── Navegação e camadas ───────────────────────────

export function NavBar({ back, onBack, right }: { back: string; onBack: () => void; right?: ReactNode }) {
  return (
    <div className="flex h-11 items-center justify-between">
      <button onClick={onBack} className="t-body -ml-1 flex items-center gap-0.5 text-link active:opacity-60">
        <Icon name="cl" size={24} sw={2} />
        {back}
      </button>
      {right}
    </div>
  );
}

export function LargeTitle({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3 pt-1 pb-1">
      <div className="min-w-0">
        <h1 className="t-t40">{title}</h1>
        {sub && <p className="t-body mt-0.5 text-tx2 first-letter:uppercase">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function Avatar({ name, size = 40, onClick }: { name: string; size?: number; onClick?: () => void }) {
  const ini = (name.trim()[0] ?? "F").toUpperCase();
  const cls = "grid shrink-0 place-items-center rounded-full bg-blue/10 text-link";
  const st = { width: size, height: size, fontSize: size * 0.42, fontWeight: 600 };
  return onClick ? (
    <button onClick={onClick} aria-label="Abrir perfil" className={cls} style={st}>
      {ini}
    </button>
  ) : (
    <span className={cls} style={st}>
      {ini}
    </span>
  );
}

/** Folha que sobe de baixo. Fecha no fundo, no X ou com Esc. */
export function Sheet({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-40 flex items-end bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onClick={(e) => e.stopPropagation()}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            className="ctx-white mx-auto max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-[22px] bg-bg px-4 pt-2 pb-[max(2rem,env(safe-area-inset-bottom))]"
          >
            <div className="mx-auto mb-2 h-[5px] w-9 rounded-full bg-bd" />
            <div className="mb-3 flex items-center justify-between">
              <h2 className="t-t21">{title}</h2>
              <button onClick={onClose} aria-label="Fechar" className="grid size-8 place-items-center rounded-full bg-sup text-tx2 active:opacity-60">
                <Icon name="x" size={18} sw={2.2} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Alerta no estilo iOS (ver lib/dialog.ts). Vive uma vez na raiz do app. */
export function DialogHost() {
  const open = useDialog((s) => s.open);
  const close = useDialog((s) => s.close);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => close(null)}>
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-label={open.title}
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.94, opacity: 0 }}
            className="w-[300px] overflow-hidden rounded-[14px] bg-bg"
          >
            <div className="px-4 pt-5 pb-4 text-center">
              <h2 className="t-body-sb">{open.title}</h2>
              <p className="t-small mt-1">{open.message}</p>
            </div>
            {open.actions.map((a) => (
              <button
                key={a.value}
                onClick={() => close(a.value)}
                className={`block w-full border-t border-bd py-3 text-center t-body active:bg-sup ${a.strong ? "!font-semibold" : ""} ${a.tone === "danger" ? "text-err" : "text-link"}`}
              >
                {a.label}
              </button>
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Contêiner de página: coluna de celular centralizada, com folga para a barra de abas. */
export function Page({ children, tabbar = true, className = "" }: { children: ReactNode; tabbar?: boolean; className?: string }) {
  return (
    <main
      className={`mx-auto min-h-dvh w-full max-w-md px-4 pt-[max(0.75rem,env(safe-area-inset-top))] ${tabbar ? "pb-[calc(6.5rem+env(safe-area-inset-bottom))]" : "pb-[max(2rem,env(safe-area-inset-bottom))]"} ${className}`}
    >
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 380, damping: 34 }} className="grid gap-4">
        {children}
      </motion.div>
    </main>
  );
}
