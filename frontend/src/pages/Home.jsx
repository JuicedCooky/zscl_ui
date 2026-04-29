import React from "react";
import { useState, useCallback, useEffect } from "react";
import { UploadImage } from "../components/UploadImage";
import LoadingSpinner from "../components/LoadingSpinner";
import { ClassTextArea } from "../components/ClassTextArea";
import { ProbabilityBar } from "../components/ProbabilityBar";
import { Camera } from "../components/Camera";
import { IoIosSend  } from "react-icons/io";
import { IoFolderOpenOutline } from "react-icons/io5";
import { FaEdit } from "react-icons/fa";
import { DatasetImageSelector } from "../components/DatasetImageSelector";


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

    const listedProbOptions = ["1","5","10","20","50","100","all"];

    const [currentImageData, setImageData] = useState(null);

    const [availableModels, setAvailableModels] = useState([]);
    const [selectedModels, setSelectedModels] = useState([]);

    useEffect(() => {
        fetch("http://localhost:8000/getmodels")
            .then(r => r.json())
            .then(data => {
                setAvailableModels(data.models);
                setSelectedModels(data.models.map(m => m.active));
            })
            .catch(() => {});
    }, []);

    async function handlePredict(){
        setIsPredicting(true);
        console.log(preview);
        if (preview != null){
            if (currentImageData != null){
                const resImage = await fetch("http://localhost:8000/upload", {
                    method: "POST",
                    body: currentImageData,
                });
            }

            // Send selected models to backend (convert boolean to 0/1)
            const activeModelsArray = selectedModels.map(m => m ? 1 : 0);
            await fetch("http://localhost:8000/setactivemodels", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(activeModelsArray)
            });

            setNoImageError(false);
            const res = await fetch("http://localhost:8000/predict", {
                method: "GET",
            });

            setResults(await res.json());

        }
        else{
            setNoImageError(true);
        }
        setIsPredicting(false);
    }

    function changeImage(){
        setPreview(null);
        setResults(null);
    }

    async function displayClasses(){
        setIsGettingClasses(true);
        const res = await fetch("http://localhost:8000/getclassnames", {
            method: "GET",
        });
        setClasses(await res.json());
        
        const prompt_res = await fetch("http://localhost:8000/getprompt", {
            method: "GET",
        });
        
        // console.log(await prompt_res.json());
        setPrompt(await prompt_res.json());

        setShowClasses(true);
        setIsGettingClasses(false);
    }

    async function saveClasses(classes, prompt){
        const text = classes
        const res = await fetch("http://localhost:8000/saveclassnames", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({text})
        })

        const res_prompt = await fetch("http://localhost:8000/saveprompt", {
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

        const formData = new FormData();
        formData.append("file", file);
        setImageData(formData);

        // const res = await fetch("http://localhost:8000/upload", {
        //   method: "POST",
        //   body: formData,
        // });

        // const data = await res.json();

    }, [setPreview] );

    return (
        <div className={`${className} flex flex-col gap-4 pt-10 items-center h-auto`}>
            <div className="w-1/2 bg-white/10 rounded-md p-2 border-1 gap-2 flex relative">
                <button className={`${inputMode !== "upload" ?
                    "hover:border-solid hover:bg-[var(--color-onyx)]/20 hover:border-[var(--color-onyx)] transition duration-300"
                    : ""}
                w-1/3 rounded-md p-3 z-1 border-transparent border-1`}
                    onClick={() => { setInputMode("upload"); setPreview(null); setCorrectClass(null); }}>
                    Upload Image
                </button>

                <button className={`${inputMode !== "camera" ?
                    "hover:border-solid hover:bg-[var(--color-onyx)]/20 hover:border-[var(--color-onyx)] transition duration-300"
                    : ""}
                w-1/3 rounded-md p-3 z-1 border-transparent border-1`}
                    onClick={() => { setInputMode("camera"); setPreview(null); setCorrectClass(null); }}>
                    Capture Image
                </button>

                <button className={`${inputMode !== "dataset" ?
                    "hover:border-solid hover:bg-[var(--color-onyx)]/20 hover:border-[var(--color-onyx)] transition duration-300"
                    : ""}
                w-1/3 rounded-md p-3 z-1 border-transparent border-1 flex items-center justify-center gap-2`}
                    onClick={() => { setInputMode("dataset"); setPreview(null); }}>
                    <IoFolderOpenOutline />
                    Dataset Images
                </button>

                <div className={`transition duration-300
                border-1 border-[var(--color-onyx)] absolute bg-[var(--color-magenta)]/60 h-[calc(100%-theme(space.4))] rounded-md w-[calc(33.333%-theme(space.2))] ${
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
                <div className="btn gap-4 px-4 flex items-center justify-between">
                    <FaEdit className="text-[var(--color-honeydew)]"/>
                    <button onClick={displayClasses} className="">Review and Edit Class Names</button>
                </div>
                {isGettingClasses && 
                    <LoadingSpinner/>
                }
            </div>

            <hr className="w-9/10 border-[var(--color-honeydew)]/50"></hr>
            <div className="gap-y-4 flex flex-col w-8/10">
                <span>Choose Model(s)</span>
                {availableModels.length === 0 && (
                    <span className="text-[var(--color-honeydew)]/50 text-sm">No models found in models/</span>
                )}
                {availableModels.length > 0 && (() => {
                    const base     = availableModels.filter(m => !m.rel.includes("/"));
                    const finetune = availableModels.filter(m =>  m.rel.startsWith("finetune/"));
                    const others   = availableModels.filter(m =>  m.rel.includes("/") && !m.rel.startsWith("finetune/"));

                    // Group non-finetune subfolder models by their folder name
                    const folderMap = {};
                    others.forEach(m => {
                        const folder = m.rel.split("/")[0];
                        (folderMap[folder] ??= []).push(m);
                    });

                    const renderBtn = (model) => {
                        const i = availableModels.indexOf(model);
                        return (
                            <button
                                key={model.rel}
                                className={`btn ${selectedModels[i] ? "" : "bg-transparent hover:bg-gray-600/50"}`}
                                onClick={() => setSelectedModels(prev => {
                                    const next = [...prev];
                                    next[i] = !next[i];
                                    return next;
                                })}
                            >
                                {model.display_name}
                            </button>
                        );
                    };

                    return (
                        <div className="flex flex-col gap-4">
                            {base.length > 0 && (
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs uppercase tracking-widest text-[var(--color-honeydew)]/50">Base Model</span>
                                        <div className="flex-1 border-t border-dashed border-[var(--color-honeydew)]/20"></div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 pl-3 border-l-2 border-[var(--color-honeydew)]/20">
                                        {base.map(renderBtn)}
                                    </div>
                                </div>
                            )}
                            {Object.entries(folderMap).map(([folder, models]) => (
                                <div key={folder} className="flex flex-col gap-2">
                                    <span className="text-xs uppercase tracking-widest text-[var(--color-honeydew)]/50">{folder}</span>
                                    <div className="flex flex-wrap gap-2">{models.map(renderBtn)}</div>
                                </div>
                            ))}
                            {finetune.length > 0 && (
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs uppercase tracking-widest text-[var(--color-honeydew)]/50">Finetune Baseline</span>
                                        <div className="flex-1 border-t border-dashed border-[var(--color-honeydew)]/20"></div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 pl-3 border-l-2 border-[var(--color-honeydew)]/20">
                                        {finetune.map(renderBtn)}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })()}
            </div>
            <div className="btn gap-4 px-4 flex items-center justify-between">
                <IoIosSend  className="text-[var(--color-honeydew)]"/>
                <button onClick={handlePredict} className="">Predict</button>
            </div>
            <hr className="w-9/10  border-[var(--color-honeydew)]/50"></hr>

            <span className="w-8/10 text-left text-3xl">Results:</span>

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
                    ))
                    }
                </select>
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
                            {Object.entries(results).map(([modelName, modelResults], index) => {
                                const allEntries = Object.entries(modelResults);
                                const correctLabel = findCorrectLabel(modelResults, correctClass);
                                const correctRank = correctLabel
                                    ? allEntries.findIndex(([l]) => l === correctLabel)
                                    : -1;
                                const isTop1 = correctRank === 0;
                                const isTop5 = correctRank >= 0 && correctRank < 5;
                                const displayed = limitProbabilities === "all"
                                    ? allEntries
                                    : allEntries.slice(0, Number(limitProbabilities));
                                return (
                                    <div key={modelName} className="flex flex-col gap-2 min-w-[280px] flex-1 bg-white/5 rounded-lg p-4">
                                        <div className="flex items-center gap-2 border-b border-[var(--color-honeydew)]/30 pb-2 flex-wrap">
                                            <span className="bg-[var(--color-magenta)]/60 text-xs px-2 py-1 rounded">
                                                #{index + 1}
                                            </span>
                                            <span className="text-lg font-semibold truncate flex-1" title={modelName}>
                                                {modelName}
                                            </span>
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
                    <span className="text-red-700">{results.error}</span>
                }
                {noImageError &&
                    <span className="text-red-700">ERROR, NO IMAGE SELECTED</span>
                }
            </div>
            {showClasses && 
                <div className="absolute bg-black/75 h-full w-full top-0 z-2 flex">
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