"use client";

import { useRef, useState } from "react";
import { parseBackup, serializeBackup } from "@/lib/backup";
import { toDateKey } from "@/lib/calc";
import { useStore } from "@/lib/store";
import { useSync } from "@/lib/sync";
import { AccountCard } from "./Account";
import { Card, btnGhost } from "./ui";

/** Botão que abre o seletor de arquivo e importa um backup .json. */
export function ImportButton({
  label = "Importar backup (.json)",
  className = btnGhost,
  confirmReplace = true,
  onDone,
}: {
  label?: string;
  className?: string;
  confirmReplace?: boolean;
  onDone?: () => void;
}) {
  const importData = useStore((s) => s.importData);
  const ref = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const res = parseBackup(await file.text());
    if (!res.ok) return setMsg({ ok: false, text: res.error });
    if (
      confirmReplace &&
      !window.confirm("Importar substitui TODOS os dados deste aparelho (perfil, dieta e registros). Continuar?")
    )
      return;
    importData(res.data);
    setMsg({ ok: true, text: "Backup importado." });
    onDone?.();
  };

  return (
    <div>
      <button onClick={() => ref.current?.click()} className={`${className} w-full`}>
        {label}
      </button>
      <input
        ref={ref}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {msg && (
        <p className={`mt-2 text-xs ${msg.ok ? "text-neon" : "text-alert"}`} role="status">
          {msg.text}
        </p>
      )}
    </div>
  );
}

export function DataTools() {
  const resetAll = useStore((s) => s.resetAll);
  const signedIn = useSync((s) => s.status !== "signed-out" && s.status !== "unconfigured");

  const exportData = () => {
    const { user, foods, plan, logs, shopping } = useStore.getState();
    const blob = new Blob([serializeBackup({ user, foods, plan, logs, shopping })], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fuel-backup-${toDateKey(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid gap-4">
      <AccountCard />

      <Card className="grid gap-3">
        <div>
          <h3 className="text-sm font-semibold">Backup</h3>
          <p className="mt-1 text-xs leading-relaxed text-dim">
            Exporte um arquivo para guardar uma cópia dos seus dados (perfil, dieta e registros),
            com ou sem conta.
          </p>
        </div>
        <button
          onClick={exportData}
          className="rounded-xl bg-neon px-4 py-3 font-mono text-sm font-bold text-bg active:opacity-80"
        >
          Exportar backup
        </button>
        <ImportButton />
      </Card>

      <Card className="grid gap-3 border-alert/30">
        <div>
          <h3 className="text-sm font-semibold">Apagar tudo</h3>
          <p className="mt-1 text-xs leading-relaxed text-dim">
            Remove perfil, dieta, registros e pesagens e volta ao início.{signedIn ? " Como você está conectado, isso apaga também os dados da nuvem." : ""} Faça um
            backup antes.
          </p>
        </div>
        <button
          onClick={async () => {
            const where = signedIn ? "deste aparelho E da nuvem" : "deste aparelho";
            if (!window.confirm(`Apagar TODOS os dados ${where}? Não dá para desfazer.`)) return;
            const sync = useSync.getState();
            if (signedIn && !(await sync.wipeCloud())) return;
            sync.silently(() => resetAll());
          }}
          className={`${btnGhost} text-alert`}
        >
          Apagar todos os dados
        </button>
      </Card>
    </div>
  );
}
