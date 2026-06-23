import React from "react";
import { Link } from "react-router-dom";
import { IoSwapHorizontal, IoCubeOutline, IoPlayCircleOutline } from "react-icons/io5";
import { IoMdBook } from "react-icons/io";

// ── Palette matches Results.jsx ───────────────────────────────────────────────
const METHOD_COLORS = {
    Finetune:  "#FF6B6B",
    LoRA:      "#4ECDC4",
    OGD:       "#45B7D1",
    SFAO:      "#FFEAA7",
    ShareLoRA: "#DDA0DD",
    ZSCL:      "#82E0AA",
};

// ── Data from CSVs (avg accuracy across all 4 datasets at each checkpoint) ────
const CHECKPOINTS     = ["Base", "+DTD", "+MNIST", "+EuroSAT", "+Flowers"];
const FINETUNE_CURVE  = [57.61, 16.70, 16.63, 17.25,  9.81];
const ZSCL_CURVE      = [57.61, 66.46, 74.89, 83.00, 93.02];
const BASE_ACC        = 57.61;

// Sorted by final accuracy desc
const FINAL_ACC = [
    { name: "OGD",       acc: 93.19, color: METHOD_COLORS.OGD },
    { name: "LoRA",      acc: 93.08, color: METHOD_COLORS.LoRA },
    { name: "ZSCL",      acc: 93.02, color: METHOD_COLORS.ZSCL },
    { name: "SFAO",      acc: 92.93, color: METHOD_COLORS.SFAO },
    { name: "ShareLoRA", acc: 91.98, color: METHOD_COLORS.ShareLoRA },
    { name: "Finetune",  acc:  9.81, color: METHOD_COLORS.Finetune },
];

const STAT_CARDS = [
    { value: "93.2%",  label: "Best final accuracy",       sub: "OGD",      color: METHOD_COLORS.OGD },
    { value: "−1.5%",  label: "Best forward transfer",     sub: "ZSCL",     color: METHOD_COLORS.ZSCL },
    { value: "−0.5%",  label: "Best backward transfer",    sub: "OGD",      color: METHOD_COLORS.OGD },
    { value: "−34.9%", label: "Finetune backward transfer",sub: "baseline", color: METHOD_COLORS.Finetune },
];

// ── Mini line chart: running avg accuracy across 5 checkpoints ────────────────
function RunningAccChart() {
    const W = 480, H = 170;
    const PL = 38, PR = 70, PT = 14, PB = 30;
    const cW = W - PL - PR;
    const cH = H - PT - PB;
    const toX = i => PL + (i / (CHECKPOINTS.length - 1)) * cW;
    const toY = v => PT + (1 - v / 100) * cH;

    const ftPts = FINETUNE_CURVE.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");
    const zsPts = ZSCL_CURVE.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");

    return (
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
            {/* Grid lines + Y labels */}
            {[0, 25, 50, 75, 100].map(v => (
                <g key={v}>
                    <line x1={PL} y1={toY(v)} x2={W - PR} y2={toY(v)}
                        stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                    <text x={PL - 5} y={toY(v) + 3.5} textAnchor="end"
                        fill="rgba(255,255,255,0.22)" fontSize="9">{v}%</text>
                </g>
            ))}

            {/* Base CLIP dashed reference */}
            <line x1={PL} y1={toY(BASE_ACC)} x2={W - PR} y2={toY(BASE_ACC)}
                stroke="rgba(255,255,255,0.20)" strokeWidth="1.2" strokeDasharray="4,3" />
            <text x={W - PR + 5} y={toY(BASE_ACC) + 3.5}
                fill="rgba(255,255,255,0.25)" fontSize="9">base</text>

            {/* Finetune line */}
            <polyline points={ftPts} fill="none" stroke={METHOD_COLORS.Finetune}
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {FINETUNE_CURVE.map((v, i) => (
                <circle key={i} cx={toX(i)} cy={toY(v)} r="3.5" fill={METHOD_COLORS.Finetune} />
            ))}
            <text x={toX(4) + 8} y={toY(FINETUNE_CURVE[4]) + 4}
                fill={METHOD_COLORS.Finetune} fontSize="11" fontWeight="600">9.8%</text>

            {/* ZSCL line */}
            <polyline points={zsPts} fill="none" stroke={METHOD_COLORS.ZSCL}
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {ZSCL_CURVE.map((v, i) => (
                <circle key={i} cx={toX(i)} cy={toY(v)} r="3.5" fill={METHOD_COLORS.ZSCL} />
            ))}
            <text x={toX(4) + 8} y={toY(ZSCL_CURVE[4]) + 4}
                fill={METHOD_COLORS.ZSCL} fontSize="11" fontWeight="600">93.0%</text>

            {/* X axis labels */}
            {CHECKPOINTS.map((label, i) => (
                <text key={i} x={toX(i)} y={H - 6} textAnchor="middle"
                    fill="rgba(255,255,255,0.28)" fontSize="10">{label}</text>
            ))}
        </svg>
    );
}

// ── Horizontal accuracy bar ───────────────────────────────────────────────────
function AccBar({ name, acc, color }) {
    return (
        <div className="flex items-center gap-2.5">
            <span className="text-xs text-[var(--color-honeydew)]/50 w-20 text-right shrink-0">{name}</span>
            <div className="flex-1 h-4 rounded-full overflow-hidden"
                style={{ background: "rgba(255,255,255,0.07)" }}>
                <div className="h-full rounded-full"
                    style={{ width: `${acc}%`, backgroundColor: color }} />
            </div>
            <span className="text-xs font-mono shrink-0" style={{ color, minWidth: 44 }}>
                {acc.toFixed(1)}%
            </span>
        </div>
    );
}

// ── Explore card ─────────────────────────────────────────────────────────────
function ExploreCard({ to, icon: Icon, title, desc }) {
    return (
        <Link to={to}
            className="flex flex-col gap-2 p-4 rounded-xl border border-[var(--color-honeydew)]/10
                       bg-white/5 hover:bg-[var(--color-magenta)]/10
                       hover:border-[var(--color-magenta)]/30 transition duration-200 group">
            <div className="flex items-center gap-2">
                <Icon className="text-lg text-[var(--color-honeydew)]/50 group-hover:text-[var(--color-honeydew)]/80 transition" />
                <span className="text-sm font-semibold text-[var(--color-honeydew)]/80
                                 group-hover:text-[var(--color-honeydew)] transition">{title}</span>
            </div>
            <span className="text-xs text-[var(--color-honeydew)]/35 leading-relaxed">{desc}</span>
        </Link>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Overview({ className }) {
    return (
        <div className={`${className} flex flex-col gap-10 pt-10 items-center pb-16 px-6`}>

            {/* ── Hero ── */}
            <section className="w-full max-w-2xl flex flex-col items-center gap-3 text-center">
                <span className="text-xs uppercase tracking-widest text-[var(--color-honeydew)]/30">
                    2026 Undergraduate Honors Thesis &nbsp;·&nbsp; Alan Victor
                </span>
                <h1 className="text-4xl font-bold leading-tight">
                    Continual Learning<br />with Vision-Language Models
                </h1>
                <p className="text-[var(--color-honeydew)]/60 text-sm leading-relaxed mt-1">
                    Can CLIP learn new visual domains sequentially — without forgetting what it already
                    knows? This thesis benchmarks six continual learning strategies on a CLIP ViT-B/16
                    backbone across four sequential image classification tasks.
                </p>
            </section>

            <div className="w-full max-w-3xl h-px bg-[var(--color-honeydew)]/10" />

            {/* ── Problem ── */}
            <section className="w-full max-w-3xl flex flex-col gap-4">
                <div>
                    <h2 className="text-xl font-semibold">The Problem: Catastrophic Forgetting</h2>
                    <p className="text-sm text-[var(--color-honeydew)]/55 leading-relaxed mt-2">
                        When a neural network is fine-tuned on a new task it overwrites weights that encode
                        prior knowledge — a phenomenon called <em>catastrophic forgetting</em>.
                        CLIP starts with ~57.6% zero-shot accuracy across diverse visual domains.
                        After training sequentially on four datasets, a naively fine-tuned model collapses
                        to just <span style={{ color: METHOD_COLORS.Finetune }} className="font-semibold">9.8%</span> average
                        accuracy. Continual-learning methods retain <span style={{ color: METHOD_COLORS.ZSCL }} className="font-semibold">93%+</span>.
                    </p>
                </div>

                <div className="rounded-xl border border-[var(--color-honeydew)]/10 bg-white/5 p-5 flex flex-col gap-3">
                    <span className="text-[10px] uppercase tracking-widest text-[var(--color-honeydew)]/30">
                        Avg. accuracy across all 4 datasets — as each task is learned
                    </span>
                    <RunningAccChart />
                    <div className="flex gap-5 justify-center flex-wrap">
                        {[
                            { label: "ZSCL",      color: METHOD_COLORS.ZSCL,    dashed: false },
                            { label: "Finetune",  color: METHOD_COLORS.Finetune, dashed: false },
                            { label: "Base CLIP", color: "rgba(255,255,255,0.22)", dashed: true },
                        ].map(({ label, color, dashed }) => (
                            <div key={label} className="flex items-center gap-1.5">
                                <svg width="18" height="10">
                                    <line x1="0" y1="5" x2="18" y2="5" stroke={color}
                                        strokeWidth="2.5" strokeDasharray={dashed ? "3,2" : undefined} />
                                </svg>
                                <span className="text-xs text-[var(--color-honeydew)]/40">{label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Setting ── */}
            <section className="w-full max-w-3xl flex flex-col gap-4">
                <h2 className="text-xl font-semibold">Experimental Setup</h2>
                <p className="text-sm text-[var(--color-honeydew)]/55 leading-relaxed">
                    A CLIP ViT-B/16 pretrained on 400 million image–text pairs serves as the backbone.
                    The model is fine-tuned on four image classification benchmarks in sequence, testing
                    whether each method can learn new domains without overwriting prior task knowledge.
                </p>

                {/* Task pipeline */}
                <div className="rounded-xl border border-[var(--color-honeydew)]/10 bg-white/5 p-5">
                    <span className="text-[10px] uppercase tracking-widest text-[var(--color-honeydew)]/30">
                        Sequential training pipeline
                    </span>
                    <div className="flex items-center gap-2 mt-4 flex-wrap">
                        <div className="px-3 py-2 rounded-lg bg-white/10 text-xs text-center min-w-fit">
                            <div className="font-semibold text-[var(--color-honeydew)]/80">CLIP</div>
                            <div className="text-[var(--color-honeydew)]/40 text-[10px]">ViT-B/16</div>
                        </div>
                        {[
                            { task: "Task 1", name: "DTD",     detail: "Textures · 47 classes" },
                            { task: "Task 2", name: "MNIST",   detail: "Digits · 10 classes" },
                            { task: "Task 3", name: "EuroSAT", detail: "Satellite · 10 classes" },
                            { task: "Task 4", name: "Flowers", detail: "Species · 102 classes" },
                        ].map(({ task, name, detail }, i) => (
                            <React.Fragment key={name}>
                                <span className="text-[var(--color-honeydew)]/20 text-lg">→</span>
                                <div className="px-3 py-2 rounded-lg border border-[var(--color-magenta)]/30
                                                bg-[var(--color-magenta)]/10 text-xs text-center min-w-fit">
                                    <div className="text-[var(--color-honeydew)]/40 text-[10px]">{task}</div>
                                    <div className="font-semibold text-[var(--color-honeydew)]/80">{name}</div>
                                    <div className="text-[var(--color-honeydew)]/35 text-[10px]">{detail}</div>
                                </div>
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Methods ── */}
            <section className="w-full max-w-3xl flex flex-col gap-4">
                <h2 className="text-xl font-semibold">Methods Evaluated</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                        {
                            name: "Finetune",
                            desc: "Standard gradient descent with no forgetting prevention — the catastrophic-forgetting baseline.",
                        },
                        {
                            name: "LoRA",
                            desc: "Low-rank weight adapters: only small decomposed matrices update, leaving the base model largely intact.",
                        },
                        {
                            name: "OGD",
                            desc: "Orthogonal Gradient Descent: new task gradients are projected away from prior-task gradient directions.",
                        },
                        {
                            name: "SFAO",
                            desc: "Sparse Fisher-weighted Attention Optimization: Fisher information masks regularization to attention weights.",
                        },
                        {
                            name: "ShareLoRA",
                            desc: "A single set of LoRA adapters is shared and continuously fine-tuned across all tasks.",
                        },
                        {
                            name: "ZSCL",
                            desc: "Zero-Shot Continual Learning: knowledge distillation from a frozen reference CLIP preserves zero-shot generalization.",
                        },
                    ].map(({ name, desc }) => (
                        <div key={name}
                            className="flex gap-3 items-start p-3.5 rounded-lg
                                       border border-[var(--color-honeydew)]/10 bg-white/5">
                            <div className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                                style={{ backgroundColor: METHOD_COLORS[name] }} />
                            <div>
                                <div className="text-sm font-semibold mb-0.5"
                                    style={{ color: METHOD_COLORS[name] }}>{name}</div>
                                <div className="text-xs text-[var(--color-honeydew)]/40 leading-relaxed">{desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Results ── */}
            <section className="w-full max-w-3xl flex flex-col gap-4">
                <h2 className="text-xl font-semibold">Key Results</h2>

                {/* Final accuracy bars */}
                <div className="rounded-xl border border-[var(--color-honeydew)]/10 bg-white/5 p-5 flex flex-col gap-2.5">
                    <span className="text-[10px] uppercase tracking-widest text-[var(--color-honeydew)]/30 mb-1">
                        Final avg. accuracy across all 4 datasets (after training on all tasks)
                    </span>
                    {/* Base CLIP zero-shot reference */}
                    <div className="flex items-center gap-2.5">
                        <span className="text-xs text-[var(--color-honeydew)]/30 w-20 text-right shrink-0">Base CLIP</span>
                        <div className="flex-1 h-4 rounded-full overflow-hidden"
                            style={{ background: "rgba(255,255,255,0.07)" }}>
                            <div className="h-full rounded-full"
                                style={{ width: `${BASE_ACC}%`, background: "rgba(148,163,184,0.30)" }} />
                        </div>
                        <span className="text-xs font-mono text-[var(--color-honeydew)]/30 shrink-0"
                            style={{ minWidth: 44 }}>{BASE_ACC}%</span>
                    </div>
                    {FINAL_ACC.map(m => <AccBar key={m.name} {...m} />)}
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {STAT_CARDS.map(({ value, label, sub, color }) => (
                        <div key={label}
                            className="rounded-xl border border-[var(--color-honeydew)]/10 bg-white/5 p-4 flex flex-col gap-1">
                            <span className="text-2xl font-bold" style={{ color }}>{value}</span>
                            <span className="text-xs text-[var(--color-honeydew)]/40 leading-snug">{label}</span>
                            <span className="text-[10px] text-[var(--color-honeydew)]/25 font-mono">{sub}</span>
                        </div>
                    ))}
                </div>

                {/* Forgetting table */}
                <div className="rounded-xl border border-[var(--color-honeydew)]/10 bg-white/5 p-5 flex flex-col gap-3">
                    <span className="text-[10px] uppercase tracking-widest text-[var(--color-honeydew)]/30">
                        Finetune: per-dataset accuracy collapse after training all 4 tasks
                    </span>
                    <div className="grid grid-cols-4 gap-3">
                        {[
                            { dataset: "DTD",     peak: 54.89, final: 2.34  },
                            { dataset: "MNIST",   peak: 56.43, final: 9.77  },
                            { dataset: "EuroSAT", peak: 54.72, final: 14.26 },
                            { dataset: "Flowers", peak: 71.05, final: 12.86 },
                        ].map(({ dataset, peak, final }) => (
                            <div key={dataset} className="flex flex-col items-center gap-2">
                                <span className="text-xs text-[var(--color-honeydew)]/50">{dataset}</span>
                                <div className="flex gap-1.5 items-end h-16">
                                    {/* Peak bar */}
                                    <div className="flex flex-col items-center gap-0.5 flex-1">
                                        <span className="text-[10px] font-mono text-[var(--color-honeydew)]/35">
                                            {peak.toFixed(0)}%
                                        </span>
                                        <div className="w-full rounded-t"
                                            style={{
                                                height: `${(peak / 80) * 48}px`,
                                                background: "rgba(236,255,248,0.22)",
                                            }} />
                                        <span className="text-[9px] text-[var(--color-honeydew)]/20">peak</span>
                                    </div>
                                    {/* Final bar */}
                                    <div className="flex flex-col items-center gap-0.5 flex-1">
                                        <span className="text-[10px] font-mono" style={{ color: METHOD_COLORS.Finetune }}>
                                            {final.toFixed(0)}%
                                        </span>
                                        <div className="w-full rounded-t"
                                            style={{
                                                height: `${(final / 80) * 48}px`,
                                                backgroundColor: METHOD_COLORS.Finetune,
                                            }} />
                                        <span className="text-[9px] text-[var(--color-honeydew)]/20">final</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className="text-[10px] text-[var(--color-honeydew)]/25 text-center">
                        Each dataset's accuracy collapses as the model is trained on subsequent tasks.
                    </p>
                </div>
            </section>

            {/* ── Explore ── */}
            <section className="w-full max-w-3xl flex flex-col gap-3">
                <div className="h-px bg-[var(--color-honeydew)]/10" />
                <h2 className="text-xl font-semibold">Explore</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <ExploreCard to="/results" icon={IoMdBook}
                        title="Results"
                        desc="Full accuracy heatmaps and forward/backward transfer charts for all six methods." />
                    <ExploreCard to="/tsne-transition" icon={IoSwapHorizontal}
                        title="t-SNE Transition"
                        desc="Watch the embedding space evolve as the model learns each sequential task." />
                    <ExploreCard to="/demo" icon={IoPlayCircleOutline}
                        title="Interactive Demo"
                        desc="Upload an image and compare zero-shot predictions across model checkpoints." />
                </div>
            </section>

        </div>
    );
}
