import React, { useState, useRef, useEffect } from "react";

// Raw CSV imports
import atd_finetune  from "../assets/results/accuracies_trained_datasets/finetune.csv?raw";
import atd_lora      from "../assets/results/accuracies_trained_datasets/lora.csv?raw";
import atd_ogd       from "../assets/results/accuracies_trained_datasets/ogd.csv?raw";
import atd_sfao      from "../assets/results/accuracies_trained_datasets/sfao.csv?raw";
import atd_sharelora from "../assets/results/accuracies_trained_datasets/sharelora.csv?raw";
import atd_zscl      from "../assets/results/accuracies_trained_datasets/zscl.csv?raw";

import bt_finetune   from "../assets/results/backward_transfer/finetune.csv?raw";
import bt_lora       from "../assets/results/backward_transfer/lora.csv?raw";
import bt_ogd        from "../assets/results/backward_transfer/ogd.csv?raw";
import bt_sfao       from "../assets/results/backward_transfer/sfao.csv?raw";
import bt_sharelora  from "../assets/results/backward_transfer/sharelora.csv?raw";
import bt_zscl       from "../assets/results/backward_transfer/zscl.csv?raw";

import ft_finetune   from "../assets/results/forward_transfer/finetune.csv?raw";
import ft_lora       from "../assets/results/forward_transfer/lora.csv?raw";
import ft_ogd        from "../assets/results/forward_transfer/ogd.csv?raw";
import ft_sfao       from "../assets/results/forward_transfer/sfao.csv?raw";
import ft_sharelora  from "../assets/results/forward_transfer/sharelora.csv?raw";
import ft_zscl       from "../assets/results/forward_transfer/zscl.csv?raw";

// ── Constants ─────────────────────────────────────────────────────────
const METHODS = ["finetune", "lora", "ogd", "sfao", "sharelora", "zscl"];

const METHOD_COLORS = {
    finetune:  "#FF6B6B",
    lora:      "#4ECDC4",
    ogd:       "#45B7D1",
    sfao:      "#FFEAA7",
    sharelora: "#DDA0DD",
    zscl:      "#82E0AA",
};

const COL_SHORT = {
    base:                        "Base",
    DTD:                         "DTD",
    "DTD-MNIST":                 "+MNIST",
    "DTD-MNIST-EuroSAT":         "+EuroSAT",
    "DTD-MNIST-EuroSAT-Flowers": "+Flowers",
};

// ── Parsers ───────────────────────────────────────────────────────────
function parseATD(raw) {
    const lines = raw.trim().split("\n");
    const headers = lines[0].split(",").slice(1).map(h => h.trim());
    const rows = lines.slice(1).map(line => {
        const [dataset, ...rest] = line.split(",");
        return { dataset: dataset.trim(), values: rest.map(v => parseFloat(v.trim())) };
    });
    return { headers, rows };
}

function parseTransfer(raw) {
    return raw.trim().split("\n").slice(1).map(line => {
        const [dataset, value] = line.split(",");
        return { dataset: dataset.trim(), value: parseFloat(value.trim()) };
    });
}

// ── Static data ───────────────────────────────────────────────────────
const ATD = {
    finetune:  parseATD(atd_finetune),
    lora:      parseATD(atd_lora),
    ogd:       parseATD(atd_ogd),
    sfao:      parseATD(atd_sfao),
    sharelora: parseATD(atd_sharelora),
    zscl:      parseATD(atd_zscl),
};

const BT = {
    finetune:  parseTransfer(bt_finetune),
    lora:      parseTransfer(bt_lora),
    ogd:       parseTransfer(bt_ogd),
    sfao:      parseTransfer(bt_sfao),
    sharelora: parseTransfer(bt_sharelora),
    zscl:      parseTransfer(bt_zscl),
};

const FT = {
    finetune:  parseTransfer(ft_finetune),
    lora:      parseTransfer(ft_lora),
    ogd:       parseTransfer(ft_ogd),
    sfao:      parseTransfer(ft_sfao),
    sharelora: parseTransfer(ft_sharelora),
    zscl:      parseTransfer(ft_zscl),
};

// ── Helpers ───────────────────────────────────────────────────────────
function heatColor(value) {
    const t = Math.max(0, Math.min(1, value / 100));
    const r = t < 0.5 ? 210 : Math.round((1 - (t - 0.5) * 2) * 210);
    const g = t < 0.5 ? Math.round(t * 2 * 165) : 165;
    return `rgb(${r},${g},20)`;
}

function SectionDivider({ label }) {
    return (
        <div className="flex items-center gap-3 w-full">
            <div className="h-px flex-1 bg-[var(--color-honeydew)]/20" />
            <span className="text-xs uppercase tracking-widest text-[var(--color-honeydew)]/40">{label}</span>
            <div className="h-px flex-1 bg-[var(--color-honeydew)]/20" />
        </div>
    );
}

// ── Heatmap card ──────────────────────────────────────────────────────
function HeatmapCard({ method, data }) {
    const { headers, rows } = data;
    const dataRows = rows.filter(r => r.dataset !== "average");
    const avgRow   = rows.find(r => r.dataset === "average");

    return (
        <div className="flex flex-col items-center gap-2">
            <span className="text-sm font-semibold capitalize" style={{ color: METHOD_COLORS[method] }}>
                {method}
            </span>
            <table className="border-collapse text-xs">
                <thead>
                    <tr>
                        <th />
                        {headers.map(h => (
                            <th key={h} className="px-1.5 pb-1.5 text-center text-[var(--color-honeydew)]/50 font-medium whitespace-nowrap">
                                {COL_SHORT[h] ?? h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {dataRows.map(row => (
                        <tr key={row.dataset}>
                            <td className="pr-2 text-right text-[var(--color-honeydew)]/60 font-medium uppercase">
                                {row.dataset}
                            </td>
                            {row.values.map((val, i) => (
                                <td
                                    key={i}
                                    title={`${val}%`}
                                    className="border border-black/25 text-center font-mono"
                                    style={{
                                        backgroundColor: heatColor(val),
                                        color: val > 45 ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.9)",
                                        minWidth: 52,
                                        padding: "4px 3px",
                                    }}
                                >
                                    {val.toFixed(1)}
                                </td>
                            ))}
                        </tr>
                    ))}
                    {avgRow && (
                        <tr className="opacity-70 border-t border-[var(--color-honeydew)]/20">
                            <td className="pr-2 text-right text-[var(--color-honeydew)]/40 italic">avg</td>
                            {avgRow.values.map((val, i) => (
                                <td
                                    key={i}
                                    title={`${val}%`}
                                    className="border border-black/25 text-center font-mono"
                                    style={{
                                        backgroundColor: heatColor(val),
                                        color: val > 45 ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.9)",
                                        padding: "3px 3px",
                                    }}
                                >
                                    {val.toFixed(1)}
                                </td>
                            ))}
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

// ── Zoom / pan hook ───────────────────────────────────────────────────
function useZoomPan(initW, initH) {
    const [vb, setVb]  = useState({ x: 0, y: 0, w: initW, h: initH });
    const vbRef        = useRef({ x: 0, y: 0, w: initW, h: initH });
    const wrapRef      = useRef(null);
    const dragging     = useRef(false);
    const lastPos      = useRef({ x: 0, y: 0 });

    // Wheel listener must be non-passive to call preventDefault
    useEffect(() => {
        const el = wrapRef.current;
        if (!el) return;
        const handler = e => {
            e.preventDefault();
            e.stopPropagation();
            const rect  = el.getBoundingClientRect();
            const cur   = vbRef.current;
            const mx    = (e.clientX - rect.left) / rect.width  * cur.w + cur.x;
            const my    = (e.clientY - rect.top)  / rect.height * cur.h + cur.y;
            const scale = e.deltaY < 0 ? 0.8 : 1 / 0.8;
            const next  = {
                x: mx - (mx - cur.x) * scale,
                y: my - (my - cur.y) * scale,
                w: cur.w * scale,
                h: cur.h * scale,
            };
            vbRef.current = next;
            setVb(next);
        };
        el.addEventListener("wheel", handler, { passive: false });
        return () => el.removeEventListener("wheel", handler);
    }, []);

    const onMouseDown = e => {
        dragging.current = true;
        lastPos.current  = { x: e.clientX, y: e.clientY };
        e.currentTarget.style.cursor = "grabbing";
    };

    const onMouseMove = e => {
        if (!dragging.current) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const cur  = vbRef.current;
        const dx   = (e.clientX - lastPos.current.x) / rect.width  * cur.w;
        const dy   = (e.clientY - lastPos.current.y) / rect.height * cur.h;
        lastPos.current = { x: e.clientX, y: e.clientY };
        const next = { ...cur, x: cur.x - dx, y: cur.y - dy };
        vbRef.current = next;
        setVb(next);
    };

    const stopDrag = e => {
        dragging.current = false;
        if (e?.currentTarget) e.currentTarget.style.cursor = "grab";
    };

    const reset = () => {
        const next = { x: 0, y: 0, w: initW, h: initH };
        vbRef.current = next;
        setVb(next);
    };

    return { wrapRef, vb, onMouseDown, onMouseMove, stopDrag, reset };
}

// ── Transfer chart ────────────────────────────────────────────────────
const MAIN_DATASETS = ["dtd", "mnist", "eurosat", "flowers"];
const W = 550, H = 250, PL = 52, PR = 20, PT = 16, PB = 36;
const cW = W - PL - PR, cH = H - PT - PB;

// X positions: main datasets evenly across 8%-72%, average at 88%
function datasetX(idx) {
    return idx < 4
        ? PL + (0.08 + idx * (0.64 / 3)) * cW
        : PL + 0.88 * cW;
}
const SEP_X = PL + 0.80 * cW; // dashed separator before average

function TransferChart({ data, activeMethods }) {
    const [chartType, setChartType] = useState("bar");
    const { wrapRef, vb, onMouseDown, onMouseMove, stopDrag, reset } = useZoomPan(W, H);
    if (activeMethods.length === 0) return null;

    const allDatasets = [...MAIN_DATASETS, "average"];
    const allVals = activeMethods.flatMap(m =>
        allDatasets.map(d => data[m]?.find(r => r.dataset === d)?.value ?? 0)
    );
    const rawMin  = Math.min(...allVals, 0);
    const rawMax  = Math.max(...allVals, 0);
    const padding = Math.max((rawMax - rawMin) * 0.12, 3);
    const yMin    = rawMin - padding;
    const yMax    = rawMax + padding;
    const yRange  = yMax - yMin;
    const toY     = v => PT + (1 - (v - yMin) / yRange) * cH;
    const yTicks  = [0, 0.25, 0.5, 0.75, 1].map(f => yMin + f * yRange);

    return (
        <div className="flex flex-col gap-3 w-full">
            <div className="flex justify-between items-center">
                <button onClick={reset}
                    className="px-3 py-1.5 text-xs rounded-md border border-[var(--color-honeydew)]/20 bg-white/10 text-[var(--color-honeydew)]/60 hover:bg-white/20 transition duration-300">
                    Reset
                </button>
                <div className="flex bg-white/10 rounded-md p-1 gap-1">
                    {["bar", "line"].map(t => (
                        <button key={t} onClick={() => setChartType(t)}
                            className={`px-3 py-1.5 text-xs rounded capitalize transition duration-300 ${
                                chartType === t ? "bg-[var(--color-magenta)]/60" : "hover:bg-white/10"
                            }`}>{t}</button>
                    ))}
                </div>
            </div>
            <p className="text-xs text-[var(--color-honeydew)]/25 text-center -mt-1">
                scroll to zoom · drag to pan
            </p>

            <div ref={wrapRef}
                style={{ cursor: "grab", userSelect: "none" }}
                onMouseDown={onMouseDown} onMouseMove={onMouseMove}
                onMouseUp={stopDrag} onMouseLeave={stopDrag}>
            <svg width="100%" viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
                style={{ height: H, display: "block", pointerEvents: "none" }}>
                {/* Y grid + labels */}
                {yTicks.map(val => {
                    const y = toY(val);
                    return (
                        <g key={val}>
                            <line x1={PL} y1={y} x2={W - PR} y2={y}
                                stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
                            <text x={PL - 5} y={y + 4} textAnchor="end" fill="rgb(156,163,175)" fontSize="10">
                                {val.toFixed(1)}%
                            </text>
                        </g>
                    );
                })}

                {/* Zero baseline — always visible */}
                <line x1={PL} y1={toY(0)} x2={W - PR} y2={toY(0)}
                    stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" strokeDasharray="5,4" />

                {/* Dashed separator before average */}
                <line x1={SEP_X} y1={PT} x2={SEP_X} y2={PT + cH}
                    stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="4,3" />

                {chartType === "bar" ? (() => {
                    const n   = activeMethods.length;
                    const bw  = Math.min(22, 44 / n);
                    return allDatasets.map((dataset, di) => {
                        const cx     = datasetX(di);
                        const isAvg  = di === 4;
                        const totalW = bw * n;
                        return (
                            <g key={dataset}>
                                {activeMethods.map((m, mi) => {
                                    const val = data[m]?.find(r => r.dataset === dataset)?.value ?? 0;
                                    const top = toY(Math.max(val, 0));
                                    const bot = toY(Math.min(val, 0));
                                    return (
                                        <g key={m}>
                                            <rect x={cx - totalW / 2 + mi * bw} y={top}
                                                width={bw - 1.5} height={Math.max(bot - top, 1)}
                                                fill={METHOD_COLORS[m]} opacity={isAvg ? 0.45 : 0.85} rx={1.5} />
                                            <title>{`${m}: ${val.toFixed(2)}%`}</title>
                                        </g>
                                    );
                                })}
                                <text x={cx} y={H - 8} textAnchor="middle" fontSize="11"
                                    fill={isAvg ? "rgba(156,163,175,0.45)" : "rgb(156,163,175)"}
                                    fontStyle={isAvg ? "italic" : "normal"}>
                                    {isAvg ? "avg" : dataset.toUpperCase()}
                                </text>
                            </g>
                        );
                    });
                })() : (
                    <>
                        {activeMethods.map(m => {
                            const mainPts = MAIN_DATASETS.map((d, i) => {
                                const val = data[m]?.find(r => r.dataset === d)?.value ?? 0;
                                return [datasetX(i), toY(val), val];
                            });
                            const avgVal = data[m]?.find(r => r.dataset === "average")?.value ?? 0;
                            const [ax, ay] = [datasetX(4), toY(avgVal)];
                            return (
                                <g key={m}>
                                    <polyline
                                        points={mainPts.map(([x, y]) => `${x},${y}`).join(" ")}
                                        fill="none" stroke={METHOD_COLORS[m]}
                                        strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                    {mainPts.map(([x, y, val], i) => (
                                        <g key={i}>
                                            <circle cx={x} cy={y} r="5" fill={METHOD_COLORS[m]} />
                                            <title>{`${m} – ${MAIN_DATASETS[i]}: ${val.toFixed(2)}%`}</title>
                                        </g>
                                    ))}
                                    {/* Average: hollow circle, visually separate */}
                                    <circle cx={ax} cy={ay} r="5"
                                        fill="none" stroke={METHOD_COLORS[m]} strokeWidth="2" opacity={0.55} />
                                    <title>{`${m} – avg: ${avgVal.toFixed(2)}%`}</title>
                                </g>
                            );
                        })}
                        {MAIN_DATASETS.map((d, i) => (
                            <text key={d} x={datasetX(i)} y={H - 8} textAnchor="middle"
                                fill="rgb(156,163,175)" fontSize="11">
                                {d.toUpperCase()}
                            </text>
                        ))}
                        <text x={datasetX(4)} y={H - 8} textAnchor="middle"
                            fill="rgba(156,163,175,0.45)" fontSize="11" fontStyle="italic">avg</text>
                    </>
                )}
            </svg>
            </div>

            <div className="flex gap-4 flex-wrap justify-center">
                {activeMethods.map(m => (
                    <div key={m} className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: METHOD_COLORS[m] }} />
                        <span className="text-xs text-[var(--color-honeydew)]/60 capitalize">{m}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────
export default function Results({ className }) {
    const [active, setActive] = useState(
        Object.fromEntries(METHODS.map(m => [m, m === "zscl"]))
    );
    const toggle = m => setActive(prev => ({ ...prev, [m]: !prev[m] }));
    const activeMethods = METHODS.filter(m => active[m]);

    return (
        <div className={`${className} flex flex-col gap-8 pt-10 items-center pb-12 px-6`}>
            <h1 className="text-3xl font-bold">Results</h1>

            {/* Method selector */}
            <div className="w-full max-w-3xl bg-white/10 rounded-md p-2 gap-2 flex flex-wrap justify-center">
                {METHODS.map(m => (
                    <button key={m} onClick={() => toggle(m)}
                        className={`flex-1 min-w-20 rounded-md px-4 py-2.5 capitalize text-sm transition duration-300 ${
                            active[m]
                                ? "bg-[var(--color-magenta)]/60 text-[var(--color-honeydew)]"
                                : "text-[var(--color-honeydew)]/60 hover:bg-white/10"
                        }`}>
                        {m}
                    </button>
                ))}
            </div>

            {activeMethods.length === 0 && (
                <p className="text-[var(--color-honeydew)]/30 text-sm">Select at least one method above</p>
            )}

            {activeMethods.length > 0 && (
                <>
                    {/* Accuracy heatmaps */}
                    <section className="w-full max-w-6xl flex flex-col gap-4">
                        <SectionDivider label="Accuracy on Trained Datasets" />
                        <div className="flex flex-wrap gap-8 justify-center">
                            {activeMethods.map(m => (
                                <HeatmapCard key={m} method={m} data={ATD[m]} />
                            ))}
                        </div>
                    </section>

                    {/* Backward transfer */}
                    <section className="w-full max-w-3xl">
                        <SectionDivider label="Backward Transfer" />
                        <div className="mt-4">
                            <TransferChart title="" data={BT} activeMethods={activeMethods} />
                        </div>
                    </section>

                    {/* Forward transfer */}
                    <section className="w-full max-w-3xl">
                        <SectionDivider label="Forward Transfer" />
                        <div className="mt-4">
                            <TransferChart title="" data={FT} activeMethods={activeMethods} />
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}
