import React, { useState, useEffect } from "react";

const API = "http://localhost:8000";

function labelFromFilename(filename) {
    const match = filename.match(/^\d+_(.+)_tsne\.png$/i);
    return match ? match[1].toUpperCase() : filename;
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

export default function TSNE({ className }) {
    const [methods, setMethods] = useState([]);
    const [selectedMethods, setSelectedMethods] = useState([]);
    const [images, setImages] = useState([]);
    const [sliderIndex, setSliderIndex] = useState(0);

    useEffect(() => {
        fetch(`${API}/tsne/methods`)
            .then(r => r.json())
            .then(data => setMethods(data.methods || []))
            .catch(() => {});
    }, []);

    // Fetch image list from first selected method; reuse for all methods since naming is uniform
    useEffect(() => {
        if (selectedMethods.length === 0) {
            setImages([]);
            setSliderIndex(0);
            return;
        }
        if (images.length > 0) return;
        fetch(`${API}/tsne/${selectedMethods[0]}/list`)
            .then(r => r.json())
            .then(data => setImages(data.images || []))
            .catch(() => {});
    }, [selectedMethods]);

    function toggleMethod(method) {
        setSelectedMethods(prev =>
            prev.includes(method) ? prev.filter(m => m !== method) : [...prev, method]
        );
    }

    const currentImage = images[sliderIndex];
    const currentLabel = currentImage ? labelFromFilename(currentImage) : null;

    return (
        <div className={`${className} flex flex-col items-center gap-8 pt-10 px-8 pb-12`}>
            <h1 className="text-3xl font-bold text-[var(--color-honeydew)]">t-SNE Visualizations</h1>

            {/* ── Base CLIP ─────────────────────────────────────────── */}
            <div className="flex flex-col items-center gap-4 w-full max-w-6xl">
                <SectionDivider label="Base CLIP" />
                <div className="w-72">
                    <img
                        src={`${API}/tsne/base`}
                        alt="Base t-SNE"
                        className="rounded-lg border border-[var(--color-honeydew)]/20 w-full object-contain"
                    />
                </div>
            </div>

            {/* ── Methods ───────────────────────────────────────────── */}
            <div className="flex flex-col items-center gap-4 w-full max-w-6xl">
                <SectionDivider label="Methods" />

                {/* Toggle buttons */}
                <div className="flex gap-2 flex-wrap justify-center">
                    {methods.map(method => (
                        <button
                            key={method}
                            onClick={() => toggleMethod(method)}
                            className={`px-4 py-2 rounded-md border transition duration-300 capitalize ${
                                selectedMethods.includes(method)
                                    ? "bg-[var(--color-magenta)]/60 border-[var(--color-honeydew)]/40 text-[var(--color-honeydew)]"
                                    : "bg-white/10 border-[var(--color-honeydew)]/20 text-[var(--color-honeydew)]/70 hover:bg-[var(--color-magenta)]/30"
                            }`}
                        >
                            {method}
                        </button>
                    ))}
                </div>

                {/* Method images */}
                {selectedMethods.length > 0 ? (
                    <div className="flex gap-4 overflow-x-auto pb-2 w-full justify-center">
                        {selectedMethods.map(method => (
                            <div key={method} className="flex flex-col items-center gap-2 min-w-52 max-w-72 flex-shrink-0">
                                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-honeydew)]/60">
                                    {method}{currentLabel ? ` — ${currentLabel}` : ""}
                                </span>
                                {currentImage ? (
                                    <img
                                        key={`${method}/${currentImage}`}
                                        src={`${API}/tsne/${method}/${currentImage}`}
                                        alt={`${method} ${currentLabel}`}
                                        className="rounded-lg border border-[var(--color-honeydew)]/20 w-full object-contain"
                                    />
                                ) : (
                                    <div className="w-full aspect-square rounded-lg border border-[var(--color-honeydew)]/20 bg-white/5" />
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-[var(--color-honeydew)]/30 text-sm">Select one or more methods above</p>
                )}

                {/* Slider */}
                {selectedMethods.length > 0 && images.length > 1 && (
                    <div className="w-full max-w-2xl flex flex-col items-center gap-2">
                        <input
                            type="range"
                            min={0}
                            max={images.length - 1}
                            value={sliderIndex}
                            onChange={e => setSliderIndex(Number(e.target.value))}
                            className="w-full accent-[var(--color-magenta)] cursor-pointer"
                        />
                        <div className="flex justify-between w-full px-1">
                            {images.map((img, i) => (
                                <button
                                    key={i}
                                    onClick={() => setSliderIndex(i)}
                                    className={`text-xs transition duration-200 ${
                                        i === sliderIndex
                                            ? "text-[var(--color-magenta)] font-bold"
                                            : "text-[var(--color-honeydew)]/50 hover:text-[var(--color-honeydew)]/80"
                                    }`}
                                >
                                    {labelFromFilename(img)}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
