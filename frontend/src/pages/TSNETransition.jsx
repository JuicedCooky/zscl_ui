import React, { useState, useEffect, useRef, useMemo } from "react";

const API = "http://localhost:8000";

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

// ── Per-method canvas ─────────────────────────────────────────────────
function MethodCanvas({ method, csvs, sliderValue, bounds, loading }) {
    const canvasRef = useRef(null);
    const [tooltip, setTooltip] = useState(null);

    const totalT   = csvs.length > 1 ? (sliderValue / SLIDER_MAX) * (STEPS.length - 1) : 0;
    const segment  = Math.min(Math.floor(totalT), STEPS.length - 2);
    const interpT  = totalT - segment;
    const fromData = csvs[segment]     ?? null;
    const toData   = csvs[segment + 1] ?? null;

    useEffect(() => {
        if (canvasRef.current)
            drawCanvas(canvasRef.current, fromData, toData, interpT, bounds);
    }, [fromData, toData, interpT, bounds]);

    function handleMouseMove(e) {
        const canvas = canvasRef.current;
        if (!canvas || !fromData || !toData || !bounds) { setTooltip(null); return; }

        const rect = canvas.getBoundingClientRect();
        const sx = canvas.width / rect.width;
        const sy = canvas.height / rect.height;
        const mx = (e.clientX - rect.left) * sx;
        const my = (e.clientY - rect.top)  * sy;

        const { xMin, xMax, yMin, yMax } = bounds;
        const pad = 28, W = canvas.width, H = canvas.height;
        const rangeX = xMax - xMin || 1, rangeY = yMax - yMin || 1;
        const scale = Math.min((W - 2*pad) / rangeX, (H - 2*pad) / rangeY);
        const offX = pad + ((W - 2*pad) - scale * rangeX) / 2;
        const offY = pad + ((H - 2*pad) - scale * rangeY) / 2;

        const n = Math.min(fromData.length, toData.length);
        let bestDist = Infinity, bestPt = null;
        for (let i = 0; i < n; i++) {
            const a = fromData[i], b = toData[i];
            const px = offX + (a.x + interpT * (b.x - a.x) - xMin) * scale;
            const py = offY + (a.y + interpT * (b.y - a.y) - yMin) * scale;
            const d = (mx - px) ** 2 + (my - py) ** 2;
            if (d < bestDist) { bestDist = d; bestPt = a; }
        }

        if (bestPt && Math.sqrt(bestDist) < 20) {
            setTooltip({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
                dataset: bestPt.dataset,
                classname: bestPt.classname ?? null,
            });
        } else {
            setTooltip(null);
        }
    }

    return (
        <div
            className="relative aspect-square w-full"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setTooltip(null)}
        >
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
            <div className="absolute top-2 left-3 text-xs capitalize text-[var(--color-honeydew)]/70 bg-black/50 px-2 py-0.5 rounded">
                {method}
            </div>
            {tooltip && (
                <div
                    className="absolute z-10 bg-black/80 border border-[var(--color-honeydew)]/30 rounded px-2 py-1 text-xs text-[var(--color-honeydew)] whitespace-nowrap pointer-events-none"
                    style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}
                >
                    <div className="font-semibold">{tooltip.dataset}</div>
                    {tooltip.classname && <div className="text-[var(--color-honeydew)]/60">{tooltip.classname}</div>}
                </div>
            )}
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────
export default function TSNETransition({ className }) {
    const [methods, setMethods]           = useState([]);
    const [selected, setSelected]         = useState([]);
    const [csvsByMethod, setCsvsByMethod] = useState({});
    const [loadingSet, setLoadingSet]     = useState(new Set());
    const [sliderValue, setSliderValue]   = useState(0);
    const [snapEnabled, setSnapEnabled]   = useState(true);
    const [isPlaying, setIsPlaying]       = useState(false);
    const [speed, setSpeed]               = useState("1");

    const csvCache    = useRef({});
    const loadTrigged = useRef(new Set());
    const rafRef      = useRef(null);
    const lastTimeRef = useRef(null);
    const playingRef  = useRef(false);

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

    // Kick off loading for any newly selected method
    useEffect(() => {
        for (const m of selected) {
            if (loadTrigged.current.has(m)) continue;
            loadTrigged.current.add(m);
            setLoadingSet(prev => new Set([...prev, m]));

            fetch(`${API}/tsne-csv/${m}/list`)
                .then(r => r.json())
                .then(async ({ files }) => {
                    const paths = ["base", ...files.map(f => `${m}/${f}`)];
                    const datasets = await Promise.all(paths.map(loadCsvData));
                    setCsvsByMethod(prev => ({ ...prev, [m]: datasets }));
                    setLoadingSet(prev => { const s = new Set(prev); s.delete(m); return s; });
                })
                .catch(() => {
                    loadTrigged.current.delete(m);
                    setLoadingSet(prev => { const s = new Set(prev); s.delete(m); return s; });
                });
        }
    }, [selected]);

    function toggleMethod(m) {
        setSelected(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
    }

    function togglePlay() {
        if (playingRef.current) {
            playingRef.current = false;
            setIsPlaying(false);
        } else {
            if (sliderValue >= SLIDER_MAX) setSliderValue(0);
            playingRef.current = true;
            setIsPlaying(true);
        }
    }

    useEffect(() => {
        if (!isPlaying) return;
        lastTimeRef.current = null;
        const spd = Math.max(0.01, parseFloat(speed) || 1);

        function tick(now) {
            if (!playingRef.current) return;
            if (lastTimeRef.current === null) lastTimeRef.current = now;
            const dt = now - lastTimeRef.current;
            lastTimeRef.current = now;
            setSliderValue(prev => {
                const next = prev + (dt / 1000) * spd * 100;
                if (next >= SLIDER_MAX) {
                    playingRef.current = false;
                    setIsPlaying(false);
                    return SLIDER_MAX;
                }
                return next;
            });
            if (playingRef.current) rafRef.current = requestAnimationFrame(tick);
        }

        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, [isPlaying, speed]);

    // Stable bounds from all currently selected methods combined
    const bounds = useMemo(() => {
        const allCsvs = selected.flatMap(m => csvsByMethod[m] ?? []);
        if (allCsvs.length === 0) return null;
        return computeBounds(allCsvs);
    }, [selected, csvsByMethod]);

    function applySnap(raw) {
        if (!snapEnabled) return raw;
        const nearest = Math.round(raw / 100) * 100;
        return Math.abs(raw - nearest) <= 12 ? nearest : raw;
    }

    const nearestStep = Math.round(sliderValue / 100);
    const anyLoaded   = selected.some(m => (csvsByMethod[m]?.length ?? 0) >= 2);

    // Grid: 1 column for 1 method, 2 for 2+
    const gridCols = selected.length === 1 ? "1fr" : "repeat(auto-fit, minmax(280px, 1fr))";

    return (
        <div className={`${className} flex flex-col items-center gap-6 pt-10 px-8 pb-12`}>
            <h1 className="text-3xl font-bold text-[var(--color-honeydew)]">t-SNE Transition</h1>

            {/* ── Method selector ───────────────────────────────────── */}
            <div className="flex flex-col items-center gap-3 w-full max-w-3xl">
                <SectionDivider label="Method" />
                <div className="flex gap-2 flex-wrap justify-center">
                    {methods.map(m => (
                        <button key={m} className={btnCls(selected.includes(m))} onClick={() => toggleMethod(m)}>
                            {m}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Canvas grid ───────────────────────────────────────── */}
            {selected.length > 0 ? (
                <div
                    className="w-full max-w-5xl"
                    style={{ display: "grid", gridTemplateColumns: gridCols, gap: "1rem" }}
                >
                    {selected.map(m => (
                        <MethodCanvas
                            key={m}
                            method={m}
                            csvs={csvsByMethod[m] ?? []}
                            sliderValue={sliderValue}
                            bounds={bounds}
                            loading={loadingSet.has(m)}
                        />
                    ))}
                </div>
            ) : (
                <div className="w-full max-w-2xl aspect-square flex items-center justify-center rounded-lg border border-[var(--color-honeydew)]/10">
                    <span className="text-sm text-[var(--color-honeydew)]/30">Select a method above</span>
                </div>
            )}

            {/* ── Slider + step labels ──────────────────────────────── */}
            <div className="w-full max-w-2xl flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={togglePlay}
                            disabled={!anyLoaded}
                            className={`px-3 py-1.5 text-xs rounded-md border transition duration-300 ${
                                isPlaying
                                    ? "bg-[var(--color-magenta)]/60 border-[var(--color-honeydew)]/40 text-[var(--color-honeydew)]"
                                    : "bg-white/10 border-[var(--color-honeydew)]/20 text-[var(--color-honeydew)]/70 hover:bg-[var(--color-magenta)]/30"
                            } disabled:opacity-30 disabled:cursor-not-allowed`}
                        >
                            {isPlaying ? "⏸ Pause" : "▶ Play"}
                        </button>
                        <input
                            type="text"
                            value={speed}
                            onChange={e => setSpeed(e.target.value)}
                            placeholder="1"
                            className="w-14 px-2 py-1.5 text-xs rounded-md border bg-white/10 border-[var(--color-honeydew)]/20 text-[var(--color-honeydew)] text-center outline-none focus:border-[var(--color-honeydew)]/50"
                        />
                        <span className="text-xs text-[var(--color-honeydew)]/40">steps/s</span>
                    </div>
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
                        disabled={!anyLoaded}
                        className="w-full accent-[var(--color-magenta)] cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    />
                    {[1, 2, 3].map(i => {
                        const frac = i / (STEPS.length - 1);
                        return (
                            <div key={i} style={{
                                position: "absolute",
                                left: `calc(${frac * 100}% + ${(0.5 - frac) * 16}px)`,
                                top: "50%",
                                transform: "translate(-50%, -50%)",
                                pointerEvents: "none",
                            }}>
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
                            disabled={!anyLoaded}
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
