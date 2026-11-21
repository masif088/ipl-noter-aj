"use client";

// Pengganti window.confirm/prompt/alert (tidak didukung di beberapa browser tertanam).
import { createContext, useCallback, useContext, useState } from "react";

type Req =
  | { kind: "confirm"; text: string; resolve: (v: boolean) => void }
  | { kind: "alert"; text: string; resolve: () => void }
  | { kind: "prompt"; text: string; initial: string; resolve: (v: string | null) => void };

type Api = {
  confirmBox: (text: string) => Promise<boolean>;
  alertBox: (text: string) => Promise<void>;
  promptBox: (text: string, initial?: string) => Promise<string | null>;
};

const Ctx = createContext<Api | null>(null);

export const useDialog = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useDialog di luar DialogProvider");
  return c;
};

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [req, setReq] = useState<Req | null>(null);
  const [val, setVal] = useState("");
  const [api] = useState<Api>(() => ({
    confirmBox: (text) => new Promise((resolve) => setReq({ kind: "confirm", text, resolve })),
    alertBox: (text) => new Promise((resolve) => setReq({ kind: "alert", text, resolve })),
    promptBox: (text, initial = "") =>
      new Promise((resolve) => {
        setVal(initial);
        setReq({ kind: "prompt", text, initial, resolve });
      }),
  }));

  const close = useCallback(
    (ok: boolean) => {
      if (!req) return;
      if (req.kind === "confirm") req.resolve(ok);
      else if (req.kind === "alert") req.resolve();
      else req.resolve(ok ? val : null);
      setReq(null);
    },
    [req, val],
  );

  return (
    <Ctx.Provider value={api}>
      {children}
      {req && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center p-4 z-50" onClick={() => close(false)}>
          <form
            className="card w-full max-w-sm space-y-3"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => { e.preventDefault(); close(true); }}
          >
            <p className="text-sm whitespace-pre-line">{req.text}</p>
            {req.kind === "prompt" && (
              <input className="input" autoFocus value={val} onChange={(e) => setVal(e.target.value)} />
            )}
            <div className="flex gap-2 justify-end">
              {req.kind !== "alert" && (
                <button type="button" className="btn-ghost" onClick={() => close(false)}>Batal</button>
              )}
              <button className="btn" autoFocus={req.kind !== "prompt"}>
                {req.kind === "confirm" ? "Ya" : "OK"}
              </button>
            </div>
          </form>
        </div>
      )}
    </Ctx.Provider>
  );
}
