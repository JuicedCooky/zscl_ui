import React from "react";
import { useState, useCallback, useEffect } from "react";

const API = import.meta.env.VITE_API_URL;
import { UploadImage } from "../components/UploadImage";
import LoadingSpinner from "../components/LoadingSpinner";
import ModelDownloadProgress from "../components/ModelDownloadProgress";
import { ClassTextArea } from "../components/ClassTextArea";
import { ProbabilityBar } from "../components/ProbabilityBar";
import { Camera } from "../components/Camera";
import { IoIosSend  } from "react-icons/io";
import { IoFolderOpenOutline } from "react-icons/io5";
import { FaEdit } from "react-icons/fa";
import { DatasetImageSelector } from "../components/DatasetImageSelector";
import { FiChevronDown, FiChevronRight } from "react-icons/fi";

function ScrollableRow({ children, wrapperClass = "", className = "" }) {
    const ref = React.useRef(null);
    const [canScrollRight, setCanScrollRight] = React.useState(false);

    const check = React.useCallback(() => {
        const el = ref.current;
        if (el) setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
    }, []);

    React.useEffect(() => {
        check();
        const el = ref.current;
        if (!el) return;
        const ro = new ResizeObserver(check);
        ro.observe(el);
        return () => ro.disconnect();
    }, [check]);

    return (
        <div className={`flex items-center gap-1 ${wrapperClass}`}>
            <div
                ref={ref}
                onScroll={check}
                className={`flex flex-nowrap overflow-x-auto pb-1 gap-2 items-center flex-1 min-w-0 ${className}`}
            >
                {children}
            </div>
            {canScrollRight && (
                <FiChevronRight className="text-white/60 text-lg shrink-0" />
            )}
        </div>
    );
}

const METHOD_DESCRIPTIONS = {
    "base model":        "Unmodified CLIP ViT-B/16 with no task-specific training. Serves as the zero-shot baseline before any continual learning.",
    "finetune baseline": "Standard sequential fine-tuning on each new dataset. Simple and effective on the latest task, but typically suffers severe catastrophic forgetting on earlier ones.",
    "finetune":          "Standard sequential fine-tuning on each new dataset. Simple and effective on the latest task, but typically suffers severe catastrophic forgetting on earlier ones.",
    "zscl":              "Zero-Shot Continual Learning. Replays a reference dataset alongside new task training to distill prior knowledge, preventing the model from forgetting previously learned distributions.",
    "zscl+freeze":       "ZSCL with partial layer freezing. Locks early encoder layers to protect general visual features, reducing representation drift across tasks while still adapting to new ones.",
    "zscl+ogd":          "ZSCL with Orthogonal Gradient Descent. Constrains weight updates to be orthogonal to gradients from previous tasks, directly minimizing interference between old and new knowledge.",
    "lora":              "Low-Rank Adaptation. Injects small trainable low-rank matrices into frozen model layers, fine-tuning only a fraction of parameters. Reduces overfitting to new tasks and limits overwriting of pretrained representations.",
    "ogd":               "Orthogonal Gradient Descent. Projects gradient updates onto the subspace orthogonal to those of previous tasks, so new learning does not overwrite prior task knowledge.",
    "sfao":              "Sparse Fine-tuning with Attention Optimization. Selectively updates only the most task-relevant parameters while optimizing attention layers, balancing plasticity on new tasks with stability on old ones.",
    "sharelora":         "Shared LoRA. Learns a set of low-rank adapters that are shared and composed across tasks, enabling knowledge transfer between tasks while keeping the base model frozen.",
};

export default function Home({className}) {
    const [preview, setPreview] = useState(null);

    const [results, setResults] = useState(null);
    const [isPredicting, setIsPredicting] = useState(false);

    const [isGettingClasses, setIsGettingClasses] = useState(false);
    const [showClasses, setShowClasses] = useState(false);
    const [classes, setClasses] = useState(null);

    const [prompt, setPrompt] = useState({
        prefix: null,
        suffix: null,
    });

    const [inputMode, setInputMode] = useState("upload");
    const [noImageError, setNoImageError] = useState(false);
    const [correctClass, setCorrectClass] = useState(null);

    const [limitProbabilities, setLimitProbabilities] = useState("5");
    const [showOnlyCorrect, setShowOnlyCorrect] = useState(false);
    const [sortByScore, setSortByScore] = useState(null); // null | "desc" | "asc"
    const [lowMemMode, setLowMemMode] = useState(true);

    const listedProbOptions = ["1","5","10","20","50","100","all"];

    const [currentImageData, setImageData] = useState(null);

    const [availableModels, setAvailableModels] = useState([]);
    const [selectedModels, setSelectedModels] = useState([]);
    const [isLoadingModels, setIsLoadingModels] = useState(true);
    const [downloadProgress, setDownloadProgress] = useState(null);
    const [backendDevice, setBackendDevice] = useState(null);

    useEffect(() => {
        setIsLoadingModels(true);
        let stopped = false;

        const poll = async () => {
            while (!stopped) {
                try {
                    const r = await fetch(`${API}/download-progress`);
                    const data = await r.json();
                    setDownloadProgress(data);
                } catch {}
                await new Promise(res => setTimeout(res, 400));
            }
        };
        poll();

        fetch(`${API}/getmodels`)
            .then(r => r.json())
            .then(data => {
                setAvailableModels(data.models);
                setSelectedModels(data.models.map(m => m.active));
            })
            .catch(() => {})
            .finally(() => {
                stopped = true;
                setIsLoadingModels(false);
                setDownloadProgress(null);
                fetch(`${API}/device`).then(r => r.json()).then(d => setBackendDevice(d.device)).catch(() => {});
            });

        return () => { stopped = true; };
    }, []);

    const toggleDownloadPause = useCallback(async () => {
        const endpoint = downloadProgress?.paused ? "resume-downloads" : "pause-downloads";
        try {
            const r = await fetch(`${API}/${endpoint}`, { method: "POST" });
            const data = await r.json();
            setDownloadProgress(prev => prev ? { ...prev, paused: data.paused } : prev);
        } catch {}
    }, [downloadProgress?.paused]);

    async function handlePredict(){
        if (isPredicting) return;
        setIsPredicting(true);
        try {
            if (preview != null){
                if (currentImageData != null){
                    await fetch(`${API}/upload`, {
                        method: "POST",
                        body: currentImageData,
                    });
                }

                const activeModelsArray = selectedModels.map(m => m ? 1 : 0);
                await fetch(`${API}/setactivemodels?preload=${!lowMemMode}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(activeModelsArray)
                });

                setNoImageError(false);
                const res = await fetch(
                    lowMemMode ? `${API}/predict_lowmem` : `${API}/predict`,
                    { method: "GET" }
                );
                setResults(await res.json());
            } else {
                setNoImageError(true);
            }
        } finally {
            setIsPredicting(false);
        }
    }

    function changeImage(){
        setPreview(null);
        setResults(null);
    }

    async function displayClasses(){
        setIsGettingClasses(true);
        const res = await fetch(`${API}/getclassnames`, {
            method: "GET",
        });
        setClasses(await res.json());
        
        const prompt_res = await fetch(`${API}/getprompt`, {
            method: "GET",
        });
        
        // console.log(await prompt_res.json());
        setPrompt(await prompt_res.json());

        setShowClasses(true);
        setIsGettingClasses(false);
    }

    async function saveClasses(classes, prompt){
        const text = classes
        const res = await fetch(`${API}/saveclassnames`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({text})
        })

        const res_prompt = await fetch(`${API}/saveprompt`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(prompt)
        })

        setShowClasses(false);
        setClasses(classes);
        console.log(classes);
        console.log("PROMPT", prompt);
    }


    const [openMethod, setOpenMethod] = React.useState(null);

    function MethodLabel({ name }) {
        const desc = METHOD_DESCRIPTIONS[name.toLowerCase()];
        if (!desc) return <span className="text-xs uppercase tracking-widest text-[var(--color-honeydew)]/50">{name}</span>;
        return (
            <span className="relative group inline-flex items-center gap-1.5 cursor-help">
                <span className="text-xs uppercase tracking-widest text-[var(--color-honeydew)]/50">{name}</span>
                <span className="text-[var(--color-honeydew)]/30 text-[11px] leading-none">ⓘ</span>
                <span className="absolute bottom-full left-0 mb-2 w-68 bg-[#0d0d1a] border border-[var(--color-honeydew)]/20 text-[var(--color-honeydew)]/80 text-xs rounded-md px-3 py-2.5 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 normal-case tracking-normal font-normal shadow-xl whitespace-normal">
                    {desc}
                </span>
            </span>
        );
    }

    const modelLabelMap = React.useMemo(() => {
        const base     = availableModels.filter(m => !m.rel.includes("/") || m.rel.startsWith("base_clip/"));
        const finetune = availableModels.filter(m => m.rel.startsWith("finetune/"));
        const others   = availableModels.filter(m => m.rel.includes("/") && !m.rel.startsWith("finetune/") && !m.rel.startsWith("base_clip/"));
        const folderMap = {};
        others.forEach(m => { const f = m.rel.split("/")[0]; (folderMap[f] ??= []).push(m); });

        const map = {};
        base.forEach(m => { map[m.rel] = { label: "Base", group: "Base Model", rel: m.rel }; });

        const addCumulative = (models, group) =>
            models.forEach((model, idx) => {
                const label = models.slice(0, idx + 1).map(m => m.display_name.split("_")[1]).join(", ");
                map[model.rel] = { label, group, rel: model.rel };
            });

        addCumulative(finetune, "Finetune Baseline");
        Object.entries(folderMap).forEach(([folder, models]) => addCumulative(models, folder));
        return map;
    }, [availableModels]);

    function findCorrectLabel(predictions, cls) {
        if (!cls) return null;
        const norm = cls.toLowerCase();
        return Object.keys(predictions).find(key => key.toLowerCase().includes(norm)) ?? null;
    }

    const handleUpload = useCallback(async (files) =>
    {
        if (!files || files.length === 0) return;
        const file = files[0];

        setPreview(URL.createObjectURL(file));
        setCorrectClass(null);
        setShowOnlyCorrect(false);
        setSortByScore(null);

        const formData = new FormData();
        formData.append("file", file);
        setImageData(formData);

        // const res = await fetch(`${API}/upload`, {
        //   method: "POST",
        //   body: formData,
        // });

        // const data = await res.json();

    }, [setPreview] );

    return (
        <div className={`${className} flex flex-col gap-4 pt-10 items-center h-auto`}>
            <div className="w-8/10 rounded-xl border border-[var(--color-honeydew)]/10 bg-gradient-to-br from-[#44001A]/30 via-transparent to-[#002229]/20 p-7 flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-honeydew)]/35 font-medium">Interactive Demo · Thesis Project</span>
                    <h2 className="text-3xl font-bold tracking-tight text-[var(--color-honeydew)]">Continual Learning with CLIP</h2>
                    <div className="w-10 h-0.5 bg-[var(--color-honeydew)]/20 rounded-full mt-1"></div>
                </div>
                <p className="text-[var(--color-honeydew)]/65 text-sm leading-relaxed">
                    This demo explores how vision-language models handle <span className="text-[var(--color-honeydew)]/90 font-medium">continual learning</span> — the challenge of training a model on new tasks over time without erasing what it already knows, a problem known as <span className="text-[var(--color-honeydew)]/90 font-medium">catastrophic forgetting</span>.
                </p>
                <p className="text-[var(--color-honeydew)]/65 text-sm leading-relaxed">
                    Each method produces a <span className="text-[var(--color-honeydew)]/90 font-medium">chain of checkpoints</span>, one saved after each new dataset is learned. Checkpoint 1 has only seen the first dataset; checkpoint 2 has seen the first two; and so on. Selecting multiple checkpoints from the same method lets you trace how predictions evolve — and whether performance holds or degrades — as the model accumulates more tasks.
                </p>
                <div className="flex flex-col border border-[var(--color-honeydew)]/10 rounded-lg overflow-hidden">
                    <div className="px-4 py-2 bg-white/5 border-b border-[var(--color-honeydew)]/10">
                        <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-honeydew)]/35 font-medium">Training Methods</span>
                    </div>
                    {Object.entries(METHOD_DESCRIPTIONS)
                        .filter(([key]) => !["finetune baseline"].includes(key))
                        .map(([key, desc], idx, arr) => {
                            const isOpen = openMethod === key;
                            const isLast = idx === arr.length - 1;
                            return (
                                <div key={key} className={`${!isLast ? "border-b border-[var(--color-honeydew)]/8" : ""}`}>
                                    <button
                                        onClick={() => setOpenMethod(isOpen ? null : key)}
                                        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-white/5 transition duration-150 group"
                                    >
                                        <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-honeydew)]/60 group-hover:text-[var(--color-honeydew)]/80 transition duration-150">{key}</span>
                                        <FiChevronDown className={`text-[var(--color-honeydew)]/30 text-sm shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                                    </button>
                                    {isOpen && (
                                        <div className="px-4 pb-3 text-xs text-[var(--color-honeydew)]/55 leading-relaxed border-t border-[var(--color-honeydew)]/8 pt-2.5 bg-white/3">
                                            {desc}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    }
                </div>
                <div className="grid grid-cols-3 gap-3 pt-1">
                    {[
                        { n: "01", label: "Upload or capture an image to classify" },
                        { n: "02", label: "Select one or more model checkpoints to compare" },
                        { n: "03", label: "Hit Predict to see results side by side" },
                    ].map(({ n, label }) => (
                        <div key={n} className="bg-white/5 border border-[var(--color-honeydew)]/10 rounded-lg px-3 py-3 flex flex-col gap-1.5 overflow-hidden">
                            <span className="text-xl font-bold text-[var(--color-honeydew)]/20 leading-none tabular-nums">{n}</span>
                            <span className="text-[var(--color-honeydew)]/55 text-xs leading-relaxed break-words">{label}</span>
                        </div>
                    ))}
                </div>
            </div>
            <div className="w-10/12 sm:w-1/2 bg-white/10 rounded-md p-2 gap-2 flex relative">
                <button className={`${inputMode !== "upload" ?
                    "hover:border-solid hover:bg-[var(--color-magenta)]/20 hover:border-[var(--color-honeydew)]/60 transition duration-300"
                    : ""}
                w-1/3 rounded-md p-2 sm:p-3 z-1 border-[var(--color-honeydew)]/30 border-1 text-xs sm:text-sm`}
                    onClick={() => { setInputMode("upload"); setPreview(null); setCorrectClass(null); }}>
                    <span className="hidden sm:inline">Upload Image</span>
                    <span className="sm:hidden">Upload</span>
                </button>

                <button className={`${inputMode !== "camera" ?
                    "hover:border-solid hover:bg-[var(--color-magenta)]/20 hover:border-[var(--color-honeydew)]/60 transition duration-300"
                    : ""}
                w-1/3 rounded-md p-2 sm:p-3 z-1 border-[var(--color-honeydew)]/30 border-1 text-xs sm:text-sm`}
                    onClick={() => { setInputMode("camera"); setPreview(null); setCorrectClass(null); }}>
                    <span className="hidden sm:inline">Capture Image</span>
                    <span className="sm:hidden">Camera</span>
                </button>

                <button className={`${inputMode !== "dataset" ?
                    "hover:border-solid hover:bg-[var(--color-magenta)]/20 hover:border-[var(--color-honeydew)]/60 transition duration-300"
                    : ""}
                w-1/3 rounded-md p-2 sm:p-3 z-1 border-[var(--color-honeydew)]/30 border-1 flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm`}
                    onClick={() => { setInputMode("dataset"); setPreview(null); }}>
                    <IoFolderOpenOutline className="shrink-0" />
                    <span className="hidden sm:inline">Dataset Images</span>
                    <span className="sm:hidden">Dataset</span>
                </button>

                <div className={`transition duration-300
                border-1 border-[var(--color-onyx)] absolute top-2 left-2 bg-[var(--color-magenta)]/60 h-[calc(100%-theme(space.4))] rounded-md w-[calc((100%-32px)/3)] ${
                    inputMode === "camera" ? "translate-x-[calc(100%+theme(space.2))]"
                    : inputMode === "dataset" ? "translate-x-[calc(200%+theme(space.4))]"
                    : ""
                }`}></div>
            </div>

            {inputMode === "upload" && (
                <UploadImage className="h-100 w-100"
                    changeImage={changeImage}
                    handleUpload={handleUpload} />
            )}
            {inputMode === "camera" && (
                <Camera setPreview={setPreview} handleUpload={handleUpload} />
            )}
            {inputMode === "dataset" && (
                <DatasetImageSelector
                    handleUpload={handleUpload}
                    onImageSelected={(_, label) => setCorrectClass(label)}
                />
            )}

            {(preview && inputMode !== "camera") &&
            <img
                src={preview}
                alt="Uploaded"
                style={{ width: "300px", marginTop: "20px" }}
            />}



            <div>
                <button onClick={displayClasses} className="btn gap-3 px-4 flex items-center">
                    <FaEdit />
                    <span>Review and Edit Class Names</span>
                </button>
                {isGettingClasses &&
                    <LoadingSpinner/>
                }
            </div>

            <hr className="w-9/10 border-[var(--color-honeydew)]/50"></hr>
            <div className="gap-y-4 flex flex-col w-8/10">
                <div className="flex flex-col gap-1">
                    <span className="text-lg font-semibold text-[var(--color-honeydew)]">Choose Model Checkpoints</span>
                    <span className="text-xs text-[var(--color-honeydew)]/45 leading-relaxed">
                        Within each method, checkpoints are ordered left → right by training stage. Each one has seen all prior datasets plus one new one.
                        Selecting multiple lets you compare how the model changes as it learns more tasks.
                    </span>
                </div>
                {isLoadingModels && (
                    downloadProgress && downloadProgress.files_total > 0 && !downloadProgress.done
                        ? <ModelDownloadProgress progress={downloadProgress} onTogglePause={toggleDownloadPause} />
                        : <LoadingSpinner />
                )}
                {!isLoadingModels && availableModels.length === 0 && (
                    <span className="text-[var(--color-honeydew)]/50 text-sm">No models found in models/</span>
                )}
                {!isLoadingModels && availableModels.length > 0 && (() => {
                    const base     = availableModels.filter(m => !m.rel.includes("/") || m.rel.startsWith("base_clip/"));
                    const finetune = availableModels.filter(m =>  m.rel.startsWith("finetune/"));
                    const others   = availableModels.filter(m =>  m.rel.includes("/") && !m.rel.startsWith("finetune/") && !m.rel.startsWith("base_clip/"));

                    // Group non-finetune subfolder models by their folder name
                    const folderMap = {};
                    others.forEach(m => {
                        const folder = m.rel.split("/")[0];
                        (folderMap[folder] ??= []).push(m);
                    });

                    const A = 14;

                    const renderBtn = (model, label, { clipPath, position, zIndex, marginLeft, paddingLeft, paddingRight }) => {
                        const i = availableModels.indexOf(model);
                        const selected = selectedModels[i];
                        return (
                            <div
                                key={model.rel}
                                style={{ clipPath, position, zIndex, marginLeft, padding: 1, display: "inline-flex" }}
                                className={selected ? "bg-green-400/35 hover:bg-red-500/40" : "bg-white/20"}
                            >
                                <button
                                    title={model.rel}
                                    style={{ paddingLeft, paddingRight, border: "none", flex: 1 }}
                                    className={`btn ${selected ? "bg-green-700/40 hover:bg-red-700/50" : "bg-transparent hover:bg-gray-600/50"}`}
                                    onClick={() => setSelectedModels(prev => {
                                        const next = [...prev];
                                        next[i] = !next[i];
                                        return next;
                                    })}
                                >
                                    {label}
                                </button>
                            </div>
                        );
                    };

                    const renderConnected = (models, labels) =>
                        models.map((model, idx) => {
                            const cumulativeLabel = labels?.[idx] ?? models.slice(0, idx + 1).map(m => m.display_name.split("_")[1]).join(",");
                            const isFirst = idx === 0;
                            const isLast  = idx === models.length - 1;
                            const clipPath = `polygon(0 0, calc(100% - ${A}px) 0, 100% 50%, calc(100% - ${A}px) 100%, 0 100%, ${A}px 50%)`;
                            return renderBtn(model, cumulativeLabel, {
                                clipPath,
                                position: "relative",
                                zIndex: idx + 1,
                                marginLeft: isFirst ? 0 : -(A - 1),
                                paddingLeft: A + 12,
                                paddingRight: A + 8,
                            });
                        });

                    const folderEntries = Object.entries(folderMap);
                    return (
                        <div className="flex flex-col gap-4">
                            {base.length > 0 && (
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-3">
                                        <MethodLabel name="Base Model" />
                                        <div className="flex-1 border-t-2 border-[var(--color-honeydew)]/50"></div>
                                    </div>
                                    <ScrollableRow wrapperClass="pl-3 border-l-2 border-[var(--color-honeydew)]/20">
                                        {renderConnected(base, base.map(() => "Base"))}
                                    </ScrollableRow>
                                </div>
                            )}
                            {finetune.length > 0 && (
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-3">
                                        <MethodLabel name="Finetune Baseline" />
                                        <div className="flex-1 border-t-2 border-[var(--color-honeydew)]/50"></div>
                                    </div>
                                    <ScrollableRow wrapperClass="pl-3 border-l-2 border-[var(--color-honeydew)]/20">
                                        {renderConnected(finetune)}
                                    </ScrollableRow>
                                </div>
                            )}
                            {folderEntries.length > 0 && (
                                <div className="flex items-center gap-3 my-1">
                                    <div className="flex-1 border-t-4 border-double border-[var(--color-honeydew)]/50"></div>
                                    <span className="text-xs uppercase tracking-widest text-[var(--color-honeydew)]/40 px-2">Methods</span>
                                    <div className="flex-1 border-t-4 border-double border-[var(--color-honeydew)]/50"></div>
                                </div>
                            )}
                            {folderEntries.map(([folder, models], idx) => (
                                <React.Fragment key={folder}>
                                    {idx > 0 && <hr className="border-[var(--color-honeydew)]/20" />}
                                    <div className="flex flex-col gap-2">
                                        <MethodLabel name={folder} />
                                        <ScrollableRow>{renderConnected(models)}</ScrollableRow>
                                    </div>
                                </React.Fragment>
                            ))}
                        </div>
                    );
                })()}
            </div>
            <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-3">
                    <button
                        onClick={handlePredict}
                        disabled={isPredicting}
                        className="btn gap-3 px-4 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <IoIosSend />
                        <span>Predict</span>
                    </button>
                    <button
                        className={`flex items-center gap-2 px-3 py-2 rounded-md border-1 text-sm transition duration-200 ${
                            lowMemMode
                                ? "bg-[var(--color-magenta)]/40 border-[var(--color-honeydew)]/60"
                                : "bg-white/10 border-[var(--color-onyx)] hover:bg-white/20"
                        }`}
                        onClick={() => setLowMemMode(v => !v)}
                        title="Load and unload each model one at a time instead of keeping all in memory"
                    >
                        Low memory
                    </button>
                </div>
                {backendDevice && (
                    <span className="text-xs text-[var(--color-honeydew)]/35">
                        Backend running on <span className={backendDevice.includes("cuda") ? "text-green-400/60" : "text-[var(--color-honeydew)]/50"}>{backendDevice}</span>
                    </span>
                )}
            </div>
            <hr className="w-9/10  border-[var(--color-honeydew)]/50"></hr>

            <span className="w-8/10 text-left text-3xl">Results:</span>

            <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center bg-white/10 border-1 h-15 rounded-md border-[var(--color-onyx)] overflow-visible pl-2">
                    <span className="mr-2">Limit:</span>
                    <select
                    className="bg-[var(--color-magenta)]/30 rounded-md  w-6/10 h-8/10 pl-2 hover:bg-[var(--color-magenta)]/60"
                    value={limitProbabilities}
                    onChange={(e) => setLimitProbabilities(e.target.value)}
                    >
                        {listedProbOptions.map(opt => (
                            <option key={opt} value={opt}>
                                {opt === "all" ? "Show All" : opt}
                            </option>
                        ))}
                    </select>
                </div>
                {correctClass && (
                    <button
                        className={`flex items-center gap-2 px-3 h-15 rounded-md border-1 transition duration-200 ${
                            showOnlyCorrect
                                ? "bg-[var(--color-magenta)]/40 border-[var(--color-honeydew)]/60"
                                : "bg-white/10 border-[var(--color-onyx)] hover:bg-white/20"
                        }`}
                        onClick={() => setShowOnlyCorrect(v => !v)}
                    >
                        <span className="text-sm">Show only true label</span>
                    </button>
                )}
                {correctClass && (
                    <button
                        className={`flex items-center gap-2 px-3 h-15 rounded-md border-1 transition duration-200 ${
                            sortByScore
                                ? "bg-[var(--color-magenta)]/40 border-[var(--color-honeydew)]/60"
                                : "bg-white/10 border-[var(--color-onyx)] hover:bg-white/20"
                        }`}
                        onClick={() => setSortByScore(s => s === null ? "desc" : s === "desc" ? "asc" : null)}
                    >
                        <span className="text-sm">
                            Sort by score {sortByScore === "desc" ? "↓" : sortByScore === "asc" ? "↑" : "↕"}
                        </span>
                    </button>
                )}
            </div>
            <div className="border-2 p-5 rounded-md w-8/10 min-h-[200px]">
                {isPredicting &&
                    <LoadingSpinner/>
                }
                {results && !results.error && Object.keys(results).length > 0 && (
                    <>
                        <div className="flex gap-2 mb-4 text-sm text-[var(--color-honeydew)]/70">
                            <span>Comparing {Object.keys(results).length} model{Object.keys(results).length > 1 ? "s" : ""}</span>
                        </div>
                        <div className="flex flex-row gap-6 overflow-x-auto pb-4">
                            {(sortByScore && correctClass
                                ? [...Object.entries(results)].sort(([, a], [, b]) => {
                                    const aKey = findCorrectLabel(a, correctClass);
                                    const bKey = findCorrectLabel(b, correctClass);
                                    const aScore = aKey ? a[aKey] : 0;
                                    const bScore = bKey ? b[bKey] : 0;
                                    return sortByScore === "desc" ? bScore - aScore : aScore - bScore;
                                })
                                : Object.entries(results)
                            ).map(([modelName, modelResults], index) => {
                                if (modelResults && modelResults.error) {
                                    const meta = modelLabelMap[modelName];
                                    const group = meta?.group ?? (modelName.includes("/") ? modelName.split("/")[0] : "Base Model");
                                    const label = meta?.label ?? modelName;
                                    return (
                                        <div key={modelName} className="flex flex-col gap-2 min-w-[280px] flex-1 bg-white/5 rounded-lg p-4">
                                            <div className="flex items-center gap-2 border-b border-[var(--color-honeydew)]/30 pb-2 flex-wrap">
                                                <span className="bg-[var(--color-magenta)]/60 text-xs px-2 py-1 rounded self-start mt-0.5">
                                                    #{index + 1}
                                                </span>
                                                <div className="flex flex-col flex-1 min-w-0 gap-1" title={modelName}>
                                                    <span className="text-[10px] uppercase tracking-widest font-semibold px-1.5 py-0.5 rounded bg-[var(--color-emerald)]/50 text-[var(--color-honeydew)]/80 self-start leading-tight">
                                                        {group}
                                                    </span>
                                                    <span className="text-base font-semibold truncate leading-snug">
                                                        {label}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-red-400 bg-red-950/40 border border-red-700/40 rounded-md px-3 py-2 text-sm">
                                                Failed to run this checkpoint — it may be corrupted. {modelResults.error}
                                            </div>
                                        </div>
                                    );
                                }
                                const allEntries = Object.entries(modelResults);
                                const correctLabel = findCorrectLabel(modelResults, correctClass);
                                const correctRank = correctLabel
                                    ? allEntries.findIndex(([l]) => l === correctLabel)
                                    : -1;
                                const isTop1 = correctRank === 0;
                                const isTop5 = correctRank >= 0 && correctRank < 5;
                                const displayed = showOnlyCorrect && correctLabel
                                    ? allEntries.filter(([l]) => l === correctLabel)
                                    : limitProbabilities === "all"
                                        ? allEntries
                                        : allEntries.slice(0, Number(limitProbabilities));
                                const meta = modelLabelMap[modelName];
                                // modelName is the backend's rel path (e.g. "finetune/1_dtd.pth"),
                                // so even if the map lookup misses, the method can still be derived from it.
                                const group = meta?.group ?? (modelName.includes("/") ? modelName.split("/")[0] : "Base Model");
                                const label = meta?.label ?? modelName;
                                return (
                                    <div key={modelName} className="flex flex-col gap-2 min-w-[280px] flex-1 bg-white/5 rounded-lg p-4">
                                        <div className="flex items-center gap-2 border-b border-[var(--color-honeydew)]/30 pb-2 flex-wrap">
                                            <span className="bg-[var(--color-magenta)]/60 text-xs px-2 py-1 rounded self-start mt-0.5">
                                                #{index + 1}
                                            </span>
                                            <div className="flex flex-col flex-1 min-w-0 gap-1" title={modelName}>
                                                <span className="text-[10px] uppercase tracking-widest font-semibold px-1.5 py-0.5 rounded bg-[var(--color-emerald)]/50 text-[var(--color-honeydew)]/80 self-start leading-tight">
                                                    {group}
                                                </span>
                                                <span className="text-base font-semibold truncate leading-snug">
                                                    {label}
                                                </span>
                                            </div>
                                            {correctClass && isTop1 && (
                                                <span className="text-xs px-2 py-1 rounded bg-green-600/80 font-bold whitespace-nowrap">Top-1 ✓</span>
                                            )}
                                            {correctClass && !isTop1 && isTop5 && (
                                                <span className="text-xs px-2 py-1 rounded bg-yellow-600/80 font-bold whitespace-nowrap">Top-5 ✓</span>
                                            )}
                                            {correctClass && !isTop5 && correctRank !== -1 && (
                                                <span className="text-xs px-2 py-1 rounded bg-red-700/60 font-bold whitespace-nowrap">Top-{correctRank + 1}</span>
                                            )}
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            {displayed.map(([label, prob]) => (
                                                <ProbabilityBar
                                                    key={`${modelName}-${label}`}
                                                    label={label}
                                                    prob={prob}
                                                    isCorrect={label === correctLabel}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
                {results?.error &&
                    <div className="text-red-400 bg-red-950/40 border border-red-700/40 rounded-md px-3 py-2 text-sm">
                        {results.error}
                    </div>
                }
                {noImageError &&
                    <div className="text-red-400 bg-red-950/40 border border-red-700/40 rounded-md px-3 py-2 text-sm">
                        No image selected — please upload or select an image first.
                    </div>
                }
            </div>
            {showClasses && 
                <div className="absolute bg-black/75 h-full w-full top-0 z-50 flex">
                    <ClassTextArea className="w-1/2 h-8/10 m-auto" 
                    classes={classes} 
                    onCancel={() => setShowClasses(false)} 
                    onSubmit={saveClasses}
                    prompt={prompt}
                    ></ClassTextArea>
                </div>
            }
        </div>
    );
}