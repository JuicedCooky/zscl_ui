import React, { useState, useEffect, useRef, useMemo } from "react";

const API = "http://localhost:8000";

// Fixed sequential order that matches the training progression
const STEPS = ["Base", "DTD", "MNIST", "EuroSAT", "Flowers"];
const SLIDER_MAX = (STEPS.length - 1) * 100; // 400

const DATASET_COLORS = {
    Aircraft:       "#FF6B6B",
    Caltech101:     "#4ECDC4",
    CIFAR10:        "#45B7D1",
    CIFAR100:       "#96CEB4",
    DTD:            "#FFEAA7",
    EuroSAT:        "#DDA0DD",
    Flowers:        "#98D8C8",
    MNIST:          "#F7DC6F",
    OxfordPet:      "#BB8FCE",
    ImageNet:       "#85C1E9",
    ImageNetA:      "#82E0AA",
    ImageNetR:      "#F0B27A",
    ImageNetSketch: "#AEB6BF",
    ImageNetSM:     "#F1948A",
    ImageNetSC:     "#76D7C4",
    ImageNetV2:     "#FAD7A0",
};

function SectionDivider({ label }) {
    return (
        <div className="flex items-center gap-3 w-full">
            <div className="h-px flex-1 bg-[var(--color-honeydew)]/20" />
            <span className="text-xs uppercase tracking-widest text-[var(--color-honeydew)]/40">{label}</span>
            <div className="h-px flex-1 bg-[var(--color-honeydew)]/20" />
        </div>
    );
}

function btnCls(active) {
    return `px-4 py-2 text-sm rounded-md border transition duration-300 capitalize ${
        active
            ? "bg-[var(--color-magenta)]/60 border-[var(--color-honeydew)]/40 text-[var(--color-honeydew)]"
            : "bg-white/10 border-[var(--color-honeydew)]/20 text-[var(--color-honeydew)]/70 hover:bg-[var(--color-magenta)]/30"
    }`;
}

function computeBounds(csvList) {
    let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
    for (const pts of csvList) {
        for (const p of pts) {
            if (p.x < xMin) xMin = p.x;
            if (p.x > xMax) xMax = p.x;
            if (p.y < yMin) yMin = p.y;
            if (p.y > yMax) yMax = p.y;
        }
    }
    return { xMin, xMax, yMin, yMax };
}

function drawCanvas(canvas, fromData, toData, t, bounds) {
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = "#0f0f1a";
    ctx.fillRect(0, 0, W, H);
    if (!fromData || !toData || !bounds) return;

    const { xMin, xMax, yMin, yMax } = bounds;
    const pad = 28;
    const rangeX = xMax - xMin || 1;
    const rangeY = yMax - yMin || 1;
    const scale = Math.min((W - 2 * pad) / rangeX, (H - 2 * pad) / rangeY);
    const offX = pad + ((W - 2 * pad) - scale * rangeX) / 2;
    const offY = pad + ((H - 2 * pad) - scale * rangeY) / 2;

    const n = Math.min(fromData.length, toData.length);
    for (let i = 0; i < n; i++) {
        const a = fromData[i], b = toData[i];
        const cx = offX + (a.x + t * (b.x - a.x) - xMin) * scale;
        const cy = offY + (a.y + t * (b.y - a.y) - yMin) * scale;
        ctx.beginPath();
        ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = DATASET_COLORS[a.dataset] ?? "#ffffff";
        ctx.fill();
    }
}

export default function TSNETransition({ className }) {
    const [methods, setMethods]         = useState([]);
    const [selectedMethod, setMethod]   = useState(null);
    const [csvs, setCsvs]               = useState([]); // [base, dtd, mnist, eurosat, flowers]
    const [loading, setLoading]         = useState(false);
    const [sliderValue, setSliderValue] = useState(0);
    const [snapEnabled, setSnapEnabled] = useState(true);

    const canvasRef  = useRef(null);
    const csvCache   = useRef({});

    async function loadCsvData(path) {
        if (csvCache.current[path]) return csvCache.current[path];
        const url = path === "base" ? `${API}/tsne-csv/base` : `${API}/tsne-csv/${path}`;
        const data = await fetch(url).then(r => r.json());
        csvCache.current[path] = data;
        return data;
    }

    useEffect(() => {
        fetch(`${API}/tsne/methods`)
            .then(r => r.json())
            .then(d => setMethods(d.methods || []))
            .catch(() => {});
    }, []);

    // When method changes: load base + all 4 ordered files for that method
    useEffect(() => {
        if (!selectedMethod) return;
        setLoading(true);
        setCsvs([]);
        setSliderValue(0);

        fetch(`${API}/tsne-csv/${selectedMethod}/list`)
            .then(r => r.json())
            .then(async ({ files }) => {
                // files are already sorted: 1_dtd, 2_mnist, 3_eurosat, 4_flowers
                const paths = ["base", ...files.map(f => `${selectedMethod}/${f}`)];
                const datasets = await Promise.all(paths.map(loadCsvData));
                setCsvs(datasets);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [selectedMethod]);

    // Stable bounds computed once from all steps combined
    const bounds = useMemo(() => {
        if (csvs.length < 2) return null;
        return computeBounds(csvs);
    }, [csvs]);

    // Map slider (0–400) to segment index + interpolation t
    // totalT: 0→4 covering the 5 steps
    const totalT   = csvs.length > 1 ? (sliderValue / SLIDER_MAX) * (STEPS.length - 1) : 0;
    const segment  = Math.min(Math.floor(totalT), STEPS.length - 2); // 0–3
    const interpT  = totalT - segment;                                 // 0–1 within segment
    const fromData = csvs[segment]     ?? null;
    const toData   = csvs[segment + 1] ?? null;

    useEffect(() => {
        if (canvasRef.current)
            drawCanvas(canvasRef.current, fromData, toData, interpT, bounds);
    }, [fromData, toData, interpT, bounds]);

    function applySnap(raw) {
        if (!snapEnabled) return raw;
        const nearest = Math.round(raw / 100) * 100;
        return Math.abs(raw - nearest) <= 12 ? nearest : raw;
    }

    // Which step label to highlight: the one closest to the slider
    const nearestStep = Math.round(sliderValue / 100);

    return (
        <div className={`${className} flex flex-col items-center gap-6 pt-10 px-8 pb-12`}>
            <h1 className="text-3xl font-bold text-[var(--color-honeydew)]">t-SNE Transition</h1>

            {/* ── Method selector ───────────────────────────────────── */}
            <div className="flex flex-col items-center gap-3 w-full max-w-3xl">
                <SectionDivider label="Method" />
                <div className="flex gap-2 flex-wrap justify-center">
                    {methods.map(m => (
                        <button key={m} className={btnCls(selectedMethod === m)} onClick={() => setMethod(m)}>
                            {m}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Canvas ────────────────────────────────────────────── */}
            <div className="relative w-full max-w-2xl aspect-square">
                <canvas
                    ref={canvasRef}
                    width={640}
                    height={640}
                    className="w-full h-full rounded-lg border border-[var(--color-honeydew)]/20"
                />
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40">
                        <span className="text-sm text-[var(--color-honeydew)]/60">Loading…</span>
                    </div>
                )}
                {!selectedMethod && !loading && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-lg">
                        <span className="text-sm text-[var(--color-honeydew)]/30">Select a method above</span>
                    </div>
                )}
            </div>

            {/* ── Slider + step labels ──────────────────────────────── */}
            <div className="w-full max-w-2xl flex flex-col gap-2">
                <div className="flex justify-end">
                    <button
                        onClick={() => setSnapEnabled(s => !s)}
                        className={`px-3 py-1.5 text-xs rounded-md border transition duration-300 ${
                            snapEnabled
                                ? "bg-[var(--color-magenta)]/60 border-[var(--color-honeydew)]/40 text-[var(--color-honeydew)]"
                                : "bg-white/10 border-[var(--color-honeydew)]/20 text-[var(--color-honeydew)]/70 hover:bg-[var(--color-magenta)]/30"
                        }`}
                    >
                        Snap {snapEnabled ? "On" : "Off"}
                    </button>
                </div>
                <div className="relative w-full">
                    <input
                        type="range"
                        min={0}
                        max={SLIDER_MAX}
                        value={sliderValue}
                        onChange={e => setSliderValue(applySnap(Number(e.target.value)))}
                        onMouseUp={e => setSliderValue(Math.round(Number(e.target.value) / 100) * 100)}
                        onTouchEnd={e => setSliderValue(Math.round(Number(e.target.value) / 100) * 100)}
                        disabled={csvs.length < 2}
                        className="w-full accent-[var(--color-magenta)] cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    />
                    {[1, 2, 3].map(i => {
                        // Range thumb (16px wide) doesn't travel the full element width.
                        // Thumb centre at fraction f sits at: f*W + (0.5 - f)*thumbWidth
                        // so we offset the naive % by (0.5 - f) * thumbWidth px.
                        const frac = i / (STEPS.length - 1);
                        return (
                            <div
                                key={i}
                                style={{
                                    position: 'absolute',
                                    left: `calc(${frac * 100}% + ${(0.5 - frac) * 16}px)`,
                                    top: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    pointerEvents: 'none',
                                }}
                            >
                                <div className="w-px h-3 bg-[var(--color-honeydew)]/35 rounded-full" />
                            </div>
                        );
                    })}
                </div>
                <div className="flex justify-between px-1">
                    {STEPS.map((label, i) => (
                        <button
                            key={label}
                            onClick={() => setSliderValue(i * 100)}
                            disabled={csvs.length < 2}
                            className={`text-xs transition duration-200 disabled:cursor-not-allowed ${
                                i === nearestStep
                                    ? "text-[var(--color-magenta)] font-bold"
                                    : "text-[var(--color-honeydew)]/50 hover:text-[var(--color-honeydew)]/80"
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Legend ────────────────────────────────────────────── */}
            <div className="w-full max-w-2xl">
                <SectionDivider label="Legend" />
                <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 justify-center">
                    {Object.entries(DATASET_COLORS).map(([name, color]) => (
                        <div key={name} className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                            <span className="text-xs text-[var(--color-honeydew)]/60">{name}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
