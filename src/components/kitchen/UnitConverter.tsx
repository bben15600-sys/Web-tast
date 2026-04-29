import { useMemo, useState } from "react";
import { UNITS_BY_DIM, convert, fmtAmount } from "@/lib/kitchenUnits";

type Dim = "volume" | "mass" | "temperature";

const DIM_LABELS: Record<Dim, string> = {
  volume: "נפח",
  mass: "משקל",
  temperature: "טמפרטורה",
};

const DIM_DEFAULT_UNITS: Record<Dim, { from: string; to: string }> = {
  volume: { from: "cup", to: "ml" },
  mass: { from: "g", to: "oz" },
  temperature: { from: "c", to: "f" },
};

const OVEN_PRESETS = [
  { label: "נמוך", c: 120 },
  { label: "בינוני-נמוך", c: 150 },
  { label: "בינוני", c: 180 },
  { label: "בינוני-גבוה", c: 200 },
  { label: "גבוה", c: 220 },
  { label: "מאוד גבוה", c: 240 },
];

export function UnitConverter() {
  const [dim, setDim] = useState<Dim>("volume");
  const [fromKey, setFromKey] = useState(DIM_DEFAULT_UNITS.volume.from);
  const [toKey, setToKey] = useState(DIM_DEFAULT_UNITS.volume.to);
  const [value, setValue] = useState("1");

  const switchDim = (d: Dim) => {
    setDim(d);
    setFromKey(DIM_DEFAULT_UNITS[d].from);
    setToKey(DIM_DEFAULT_UNITS[d].to);
  };

  const result = useMemo(() => {
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    return convert(n, fromKey, toKey);
  }, [value, fromKey, toKey]);

  const units = UNITS_BY_DIM[dim];

  return (
    <div className="flex flex-col gap-4">
      <section className="glass" style={{ ["--i" as string]: 1 } as React.CSSProperties}>
        <div className="card-header">
          <h2 className="card-title">ממיר יחידות</h2>
        </div>

        <div
          className="kitchen-tabs"
          style={{ width: "fit-content", marginBottom: 16 }}
        >
          {(Object.keys(DIM_LABELS) as Dim[]).map((d) => (
            <button
              key={d}
              type="button"
              className={`kitchen-tab ${dim === d ? "is-active" : ""}`}
              onClick={() => switchDim(d)}
            >
              {DIM_LABELS[d]}
            </button>
          ))}
        </div>

        <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div
            className="flex flex-col gap-2"
            style={{
              padding: 14,
              background: "rgba(10,12,28,0.45)",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <span className="label-cap">מ-</span>
            <input
              type="number"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "var(--oslife-chip)",
                border: "1px solid var(--oslife-chip-border)",
                borderRadius: 8,
                color: "var(--oslife-text-strong)",
                fontSize: 22,
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 700,
                outline: "none",
                textAlign: "center",
              }}
            />
            <select
              value={fromKey}
              onChange={(e) => setFromKey(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                background: "var(--oslife-chip)",
                border: "1px solid var(--oslife-chip-border)",
                borderRadius: 8,
                color: "var(--oslife-text-strong)",
                fontSize: 13,
                outline: "none",
                fontFamily: "inherit",
              }}
            >
              {units.map((u) => (
                <option key={u.key} value={u.key}>{u.labelHe}</option>
              ))}
            </select>
          </div>

          <div
            className="flex flex-col gap-2"
            style={{
              padding: 14,
              background: "rgba(201,100,66,0.06)",
              borderRadius: 10,
              border: "1px solid rgba(201,100,66,0.22)",
            }}
          >
            <span className="label-cap">ל-</span>
            <div
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "rgba(201,100,66,0.10)",
                borderRadius: 8,
                color: "#E89A7D",
                fontSize: 22,
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 700,
                textAlign: "center",
                minHeight: 44,
              }}
            >
              {result == null ? "—" : fmtAmount(result)}
            </div>
            <select
              value={toKey}
              onChange={(e) => setToKey(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                background: "var(--oslife-chip)",
                border: "1px solid var(--oslife-chip-border)",
                borderRadius: 8,
                color: "var(--oslife-text-strong)",
                fontSize: 13,
                outline: "none",
                fontFamily: "inherit",
              }}
            >
              {units.map((u) => (
                <option key={u.key} value={u.key}>{u.labelHe}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={() => { const x = fromKey; setFromKey(toKey); setToKey(x); }}
          style={{
            marginTop: 10,
            width: "100%",
            padding: "8px",
            background: "transparent",
            border: "1px dashed var(--oslife-chip-border)",
            borderRadius: 8,
            color: "var(--oslife-text-mid)",
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          ⇄ החלף כיוון
        </button>
      </section>

      <section className="glass" style={{ ["--i" as string]: 2 } as React.CSSProperties}>
        <div className="card-header">
          <h2 className="card-title">טמפרטורות תנור</h2>
        </div>
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
          {OVEN_PRESETS.map((p) => (
            <div
              key={p.label}
              style={{
                padding: "10px 12px",
                background: "rgba(10,12,28,0.45)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 10,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <span style={{ fontSize: 11, color: "var(--oslife-text-mute)" }}>{p.label}</span>
              <span className="mono" style={{ fontSize: 15, fontWeight: 700, color: "var(--oslife-text-strong)" }}>
                {p.c}°C
              </span>
              <span className="mono" style={{ fontSize: 11, color: "var(--oslife-text-mid)" }}>
                {Math.round(p.c * 9 / 5 + 32)}°F · Gas {cToGas(p.c)}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function cToGas(c: number): string {
  // Classic British gas-mark conversion
  if (c < 140) return "1";
  if (c < 160) return "2";
  if (c < 170) return "3";
  if (c < 180) return "4";
  if (c < 195) return "5";
  if (c < 205) return "6";
  if (c < 220) return "7";
  if (c < 235) return "8";
  return "9";
}
