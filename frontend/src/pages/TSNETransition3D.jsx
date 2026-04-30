import React, { useState, useEffect, useRef, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

const API = "http://localhost:8000";

const STEPS = ["Base", "DTD", "MNIST", "EuroSAT", "Flowers"];
const SLIDER_MAX = (STEPS.length - 1) * 100;

const DATASET_COLORS = {
    Aircraft:       "#FF1A1A",
    Caltech101:     "#00E5D4",
    CIFAR10:        "#00AAFF",
    CIFAR100:       "#00CC55",
    DTD:            "#FFD700",
    EuroSAT:        "#CC00FF",
    Flowers:        "#00FFB3",
    MNIST:          "#FFEE00",
    OxfordPet:      "#9900FF",
    ImageNet:       "#0055FF",
    ImageNetA:      "#00FF44",
    ImageNetR:      "#FF7700",
    ImageNetSketch: "#AAAACC",
    ImageNetSM:     "#FF0077",
    ImageNetSC:     "#00FFFF",
    ImageNetV2:     "#FF4400",
};

function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return { r: ((n >> 16) & 0xff) / 255, g: ((n >> 8) & 0xff) / 255, b: (n & 0xff) / 255 };
}

function computeBounds3D(csvList) {
    let xMin = Infinity, xMax = -Infinity;
    let yMin = Infinity, yMax = -Infinity;
    let zMin = Infinity, zMax = -Infinity;
    for (const pts of csvList) {
        for (const p of pts) {
            if (p.x < xMin) xMin = p.x; if (p.x > xMax) xMax = p.x;
            if (p.y < yMin) yMin = p.y; if (p.y > yMax) yMax = p.y;
            if (p.z < zMin) zMin = p.z; if (p.z > zMax) zMax = p.z;
        }
    }
    return { xMin, xMax, yMin, yMax, zMin, zMax };
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

function btnCls(active) {
    return `px-4 py-2 text-sm rounded-md border transition duration-300 capitalize ${
        active
            ? "bg-[var(--color-magenta)]/60 border-[var(--color-honeydew)]/40 text-[var(--color-honeydew)]"
            : "bg-white/10 border-[var(--color-honeydew)]/20 text-[var(--color-honeydew)]/70 hover:bg-[var(--color-magenta)]/30"
    }`;
}

// ── Three.js scatter plot (runs inside Canvas) ────────────────────────
const SCENE_HALF = 15;

function ScatterPoints({ csvs, sliderValue, bounds }) {
    const pointsRef = useRef();

    useEffect(() => {
        const pts = pointsRef.current;
        if (!pts || !csvs || csvs.length < 2 || !bounds) return;

        const totalT  = (sliderValue / SLIDER_MAX) * (STEPS.length - 1);
        const segment = Math.min(Math.floor(totalT), STEPS.length - 2);
        const t       = totalT - segment;
        const from    = csvs[segment];
        const to      = csvs[segment + 1];
        if (!from || !to) return;

        const n = Math.min(from.length, to.length);
        const { xMin, xMax, yMin, yMax, zMin, zMax } = bounds;
        const cx = (xMin + xMax) / 2, cy = (yMin + yMax) / 2, cz = (zMin + zMax) / 2;
        const maxRange = Math.max(xMax - xMin, yMax - yMin, zMax - zMin) || 1;
        const scale = (2 * SCENE_HALF) / maxRange;

        const positions = new Float32Array(n * 3);
        const colors    = new Float32Array(n * 3);

        for (let i = 0; i < n; i++) {
            const a = from[i], b = to[i];
            positions[i * 3]     = (a.x + t * (b.x - a.x) - cx) * scale;
            positions[i * 3 + 1] = (a.y + t * (b.y - a.y) - cy) * scale;
            positions[i * 3 + 2] = (a.z + t * (b.z - a.z) - cz) * scale;
            const c = hexToRgb(DATASET_COLORS[a.dataset] ?? "#ffffff");
            colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
        }

        pts.geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        pts.geometry.setAttribute("color",    new THREE.BufferAttribute(colors, 3));
    }, [csvs, sliderValue, bounds]);

    return (
        <points ref={pointsRef}>
            <bufferGeometry />
            <pointsMaterial size={0.12} vertexColors sizeAttenuation />
        </points>
    );
}

// ── Per-method 3D canvas ──────────────────────────────────────────────
function MethodCanvas3D({ method, csvs, sliderValue, bounds, loading }) {
    return (
        <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-[var(--color-honeydew)]/20">
            <Canvas
                camera={{ position: [0, 0, 40], fov: 60 }}
                style={{ background: "#0f0f1a" }}
            >
                <ScatterPoints csvs={csvs} sliderValue={sliderValue} bounds={bounds} />
                <OrbitControls makeDefault enableDamping dampingFactor={0.08} />
            </Canvas>
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
                    <span className="text-sm text-[var(--color-honeydew)]/60">Loading…</span>
                </div>
            )}
            <div className="absolute top-2 left-3 text-xs capitalize text-[var(--color-honeydew)]/70 bg-black/50 px-2 py-0.5 rounded pointer-events-none">
                {method}
            </div>
            <div className="absolute bottom-2 right-3 text-[10px] text-[var(--color-honeydew)]/25 pointer-events-none">
                drag · scroll · right-drag pan
            </div>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────
export default function TSNETransition3D({ className }) {
    const [methods, setMethods]           = useState([]);
    const [selected, setSelected]         = useState([]);
    const [csvsByMethod, setCsvsByMethod] = useState({});
    const [loadingSet, setLoadingSet]     = useState(new Set());
    const [sliderValue, setSliderValue]   = useState(0);
    const [snapEnabled, setSnapEnabled]   = useState(true);

    const csvCache    = useRef({});
    const loadTrigged = useRef(new Set());

    async function loadCsvData(path) {
        if (csvCache.current[path]) return csvCache.current[path];
        const url = path === "base"
            ? `${API}/tsne-csv-3d/base`
            : `${API}/tsne-csv-3d/${path}`;
        const data = await fetch(url).then(r => r.json());
        csvCache.current[path] = data;
        return data;
    }

    useEffect(() => {
        fetch(`${API}/tsne-csv-3d/methods`)
            .then(r => r.json())
            .then(d => setMethods(d.methods || []))
            .catch(() => {});
    }, []);

    useEffect(() => {
        for (const m of selected) {
            if (loadTrigged.current.has(m)) continue;
            loadTrigged.current.add(m);
            setLoadingSet(prev => new Set([...prev, m]));

            fetch(`${API}/tsne-csv-3d/${m}/list`)
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

    const bounds = useMemo(() => {
        const allCsvs = selected.flatMap(m => csvsByMethod[m] ?? []);
        if (allCsvs.length === 0) return null;
        return computeBounds3D(allCsvs);
    }, [selected, csvsByMethod]);

    function applySnap(raw) {
        if (!snapEnabled) return raw;
        const nearest = Math.round(raw / 100) * 100;
        return Math.abs(raw - nearest) <= 12 ? nearest : raw;
    }

    const nearestStep = Math.round(sliderValue / 100);
    const anyLoaded   = selected.some(m => (csvsByMethod[m]?.length ?? 0) >= 2);
    const gridCols    = selected.length === 1 ? "1fr" : "repeat(auto-fit, minmax(280px, 1fr))";

    return (
        <div className={`${className} flex flex-col items-center gap-6 pt-10 px-8 pb-12`}>
            <h1 className="text-3xl font-bold text-[var(--color-honeydew)]">3D t-SNE Transition</h1>

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
                        <MethodCanvas3D
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
