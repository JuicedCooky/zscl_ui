import React from "react";
import { useState, useCallback } from "react";
import { UploadImage } from "../components/UploadImage";
import LoadingSpinner from "../components/LoadingSpinner";
import { ClassTextArea } from "../components/ClassTextArea";
import { ProbabilityBar } from "../components/ProbabilityBar";
import { Camera } from "../components/Camera";
import { DatasetImageSelector } from "../components/DatasetImageSelector";
import { IoIosSend } from "react-icons/io";
import { FaEdit, FaPlus, FaTrash } from "react-icons/fa";
import { IoFolderOpenOutline } from "react-icons/io5";

const SEQUENTIAL_DATASETS = ["Base Model/CLIP", "DTD", "MNIST", "EuroSAT", "Flowers"];
const TRAINING_METHODS = [
    { id: "finetune", label: "Finetune Only" },
    { id: "zscl", label: "ZSCL" },
    { id: "zscl+freeze", label: "ZSCL + Freeze" },
    { id: "zscl+ogd", label: "ZSCL + OGD" },
];

export default function Sequential({ className }) {
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

    // Image input mode: "upload", "camera", or "dataset"
    const [inputMode, setInputMode] = useState("upload");
    const [noImageError, setNoImageError] = useState(false);
    const [noSelectionError, setNoSelectionError] = useState(false);

    const [limitProbabilities, setLimitProbabilities] = useState("5");

    const listedProbOptions = ["1", "5", "10", "20", "50", "100", "all"];

    const [currentImageData, setImageData] = useState(null);

    // List of selected models: [{ datasetIndex: number, dataset: string, method: string | null }, ...]
    const [selectedModels, setSelectedModels] = useState([]);

    // Current selection being configured (before adding to list)
    const [currentDatasetIndex, setCurrentDatasetIndex] = useState(-1);
    const [currentMethod, setCurrentMethod] = useState(null);

    async function handlePredict() {
        setIsPredicting(true);
        setNoImageError(false);
        setNoSelectionError(false);

        // Validate that at least one model is selected
        if (selectedModels.length === 0) {
            setNoSelectionError(true);
            setIsPredicting(false);
            return;
        }

        if (preview != null) {
            if (currentImageData != null) {
                await fetch("http://localhost:8000/upload", {
                    method: "POST",
                    body: currentImageData,
                });
            }

            // Send all selected models to backend
            await fetch("http://localhost:8000/setsequentialmodels", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    models: selectedModels
                })
            });

            const res = await fetch("http://localhost:8000/predictsequential", {
                method: "GET",
            });

            setResults(await res.json());

        }
        else {
            setNoImageError(true);
        }
        setIsPredicting(false);
    }

    function changeImage() {
        setPreview(null);
        setResults(null);
    }

    async function displayClasses() {
        setIsGettingClasses(true);
        const res = await fetch("http://localhost:8000/getclassnames", {
            method: "GET",
        });
        setClasses(await res.json());

        const prompt_res = await fetch("http://localhost:8000/getprompt", {
            method: "GET",
        });

        setPrompt(await prompt_res.json());

        setShowClasses(true);
        setIsGettingClasses(false);
    }

    async function saveClasses(classes, prompt) {
        const text = classes;
        const res = await fetch("http://localhost:8000/saveclassnames", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ text })
        });

        const res_prompt = await fetch("http://localhost:8000/saveprompt", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(prompt)
        });

        setShowClasses(false);
        setClasses(classes);
        console.log(classes);
        console.log("PROMPT", prompt);
    }


    const handleUpload = useCallback(async (files) => {
        if (!files || files.length === 0) return;
        const file = files[0];

        setPreview(URL.createObjectURL(file));

        const formData = new FormData();
        formData.append("file", file);
        setImageData(formData);

    }, [setPreview]);

    // Handle dataset selection for current configuration
    const handleDatasetClick = (index) => {
        if (currentDatasetIndex === index) {
            setCurrentDatasetIndex(-1);
            setCurrentMethod(null);
        } else {
            setCurrentDatasetIndex(index);
            setCurrentMethod(null);
        }
    };

    // Handle method selection for current configuration
    const handleMethodClick = (methodId) => {
        if (currentMethod === methodId) {
            setCurrentMethod(null);
        } else {
            setCurrentMethod(methodId);
        }
    };

    // Add current selection to the list of models
    const handleAddModel = () => {
        if (currentDatasetIndex < 0) return;

        // Base model doesn't need method
        if (currentDatasetIndex === 0) {
            const newModel = {
                datasetIndex: currentDatasetIndex,
                dataset: SEQUENTIAL_DATASETS[currentDatasetIndex],
                method: null
            };
            // Check for duplicates
            const isDuplicate = selectedModels.some(
                m => m.datasetIndex === newModel.datasetIndex
            );
            if (!isDuplicate) {
                setSelectedModels([...selectedModels, newModel]);
            }
        } else if (currentMethod) {
            const newModel = {
                datasetIndex: currentDatasetIndex,
                dataset: SEQUENTIAL_DATASETS[currentDatasetIndex],
                method: currentMethod
            };
            // Check for duplicates
            const isDuplicate = selectedModels.some(
                m => m.datasetIndex === newModel.datasetIndex && m.method === newModel.method
            );
            if (!isDuplicate) {
                setSelectedModels([...selectedModels, newModel]);
            }
        }

        // Reset current selection
        setCurrentDatasetIndex(-1);
        setCurrentMethod(null);
    };

    // Remove a model from the list
    const handleRemoveModel = (index) => {
        setSelectedModels(selectedModels.filter((_, i) => i !== index));
    };

    // Get display name for a model configuration
    const getModelDisplayName = (model) => {
        if (model.datasetIndex === 0) {
            return "Base CLIP";
        }
        const methodLabel = TRAINING_METHODS.find(m => m.id === model.method)?.label || model.method;
        return `${model.dataset} (${methodLabel})`;
    };

    // Calculate tab indicator position based on inputMode
    const getTabPosition = () => {
        switch (inputMode) {
            case "upload": return "";
            case "camera": return "translate-x-[calc(100%+theme(space.2))]";
            case "dataset": return "translate-x-[calc(200%+theme(space.4))]";
            default: return "";
        }
    };

    return (
        <div className={`${className} flex flex-col gap-4 pt-10 items-center h-auto`}>
            <div className="w-1/2 bg-white/10 rounded-md p-2 border-1 gap-2 flex relative">
                <button className={`${inputMode !== "upload" ?
                    "hover:border-solid \
                hover:bg-[var(--color-onyx)]/20 hover:border-[var(--color-onyx)] transition duration-300"
                    : ""}
                w-1/3 rounded-md p-3 z-1 border-transparent border-1`}
                    onClick={() => { setInputMode("upload"); setPreview(null); }}>
                    Upload Image
                </button>

                <button className={`${inputMode !== "camera" ?
                    "hover:border-solid \
                hover:bg-[var(--color-onyx)]/20 hover:border-[var(--color-onyx)] transition duration-300"
                    : ""}
                w-1/3 rounded-md p-3 z-1 border-transparent border-1`}
                    onClick={() => { setInputMode("camera"); setPreview(null); }}>
                    Capture Image
                </button>

                <button className={`${inputMode !== "dataset" ?
                    "hover:border-solid \
                hover:bg-[var(--color-onyx)]/20 hover:border-[var(--color-onyx)] transition duration-300"
                    : ""}
                w-1/3 rounded-md p-3 z-1 border-transparent border-1 flex items-center justify-center gap-2`}
                    onClick={() => { setInputMode("dataset"); setPreview(null); }}>
                    <IoFolderOpenOutline />
                    Dataset Images
                </button>

                <div className={`transition duration-300
                border-1 border-[var(--color-onyx)] absolute bg-[var(--color-magenta)]/60 h-[calc(100%-theme(space.4))] rounded-md w-[calc(33.333%-theme(space.2))] ${getTabPosition()}`}></div>
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
                <DatasetImageSelector handleUpload={handleUpload} />
            )}

            {(preview && inputMode !== "camera") &&
                <img
                    src={preview}
                    alt="Uploaded"
                    style={{ width: "300px", marginTop: "20px" }}
                />
            }



            <div>
                <div className="btn gap-4 px-4 flex items-center justify-between">
                    <FaEdit className="text-[var(--color-honeydew)]" />
                    <button onClick={displayClasses} className="">Review and Edit Class Names</button>
                </div>
                {isGettingClasses &&
                    <LoadingSpinner />
                }
            </div>

            <hr className="w-9/10 border-[var(--color-honeydew)]/50"></hr>

            {/* Selected Models List */}
            {selectedModels.length > 0 && (
                <div className="w-8/10 gap-y-2 flex flex-col">
                    <span className="text-lg">Selected Models ({selectedModels.length}):</span>
                    <div className="flex gap-2 flex-wrap">
                        {selectedModels.map((model, index) => (
                            <div
                                key={`${model.datasetIndex}-${model.method}-${index}`}
                                className="btn flex items-center gap-2"
                            >
                                <span>{getModelDisplayName(model)}</span>
                                <button
                                    onClick={() => handleRemoveModel(index)}
                                    className="text-red-400 hover:text-red-300 ml-1"
                                >
                                    <FaTrash size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="gap-y-4 flex flex-col">
                <span>1. Choose Dataset (Sequential Training)</span>
                <p className="text-sm text-[var(--color-honeydew)]/70">
                    Select a dataset, then add it to compare multiple models
                </p>
                <div className="flex gap-2 flex-wrap">
                    {SEQUENTIAL_DATASETS.map((dataset, index) => (
                        <button
                            key={dataset}
                            className={`btn ${currentDatasetIndex === index ? "" : "bg-transparent hover:bg-gray-600/50"}`}
                            onClick={() => handleDatasetClick(index)}
                        >
                            {dataset}
                        </button>
                    ))}
                </div>
            </div>

            {currentDatasetIndex > 0 && (
                <div className="gap-y-4 flex flex-col">
                    <span>2. Choose Training Method</span>
                    <p className="text-sm text-[var(--color-honeydew)]/70">
                        Select the training method used for the model
                    </p>
                    <div className="flex gap-2 flex-wrap">
                        {TRAINING_METHODS.map((method) => (
                            <button
                                key={method.id}
                                className={`btn ${currentMethod === method.id ? "" : "bg-transparent hover:bg-gray-600/50"}`}
                                onClick={() => handleMethodClick(method.id)}
                            >
                                {method.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Add Model Button */}
            {(currentDatasetIndex === 0 || (currentDatasetIndex > 0 && currentMethod)) && (
                <div className="btn gap-4 px-4 flex items-center justify-between bg-green-700/50 hover:bg-green-600/50">
                    <FaPlus className="text-[var(--color-honeydew)]" />
                    <button onClick={handleAddModel}>Add Model to Compare</button>
                </div>
            )}
            <div className="btn gap-4 px-4 flex items-center justify-between">
                <IoIosSend className="text-[var(--color-honeydew)]" />
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
                    <LoadingSpinner />
                }
                {results && !results.error && Object.keys(results).length > 0 && (
                    <>
                        <div className="flex gap-2 mb-4 text-sm text-[var(--color-honeydew)]/70">
                            <span>Comparing {Object.keys(results).length} model{Object.keys(results).length > 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex flex-row gap-6 overflow-x-auto pb-4">
                            {Object.entries(results).map(([modelName, modelResults], index) => (
                                <div
                                    key={modelName}
                                    className="flex flex-col gap-2 min-w-[280px] flex-1 bg-white/5 rounded-lg p-4"
                                >
                                    <div className="flex items-center gap-2 border-b border-[var(--color-honeydew)]/30 pb-2">
                                        <span className="bg-[var(--color-magenta)]/60 text-xs px-2 py-1 rounded">
                                            #{index + 1}
                                        </span>
                                        <span className="text-lg font-semibold truncate" title={modelName}>
                                            {modelName}
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        {((limitProbabilities === "all")
                                            ? Object.entries(modelResults)
                                            : Object.entries(modelResults).slice(0, Number(limitProbabilities)))
                                            .map(([label, prob]) => (
                                                <ProbabilityBar key={`${modelName}-${label}`} label={label} prob={prob}></ProbabilityBar>
                                            ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
                {results && !results.error && Object.keys(results).length === 0 && (
                    <span className="text-[var(--color-honeydew)]/50">No results to display</span>
                )}
                {results?.error &&
                    <span className="text-red-700">{results.error}</span>
                }
                {noImageError &&
                    <span className="text-red-700">ERROR, NO IMAGE SELECTED</span>
                }
                {noSelectionError &&
                    <span className="text-red-700">ERROR, ADD AT LEAST ONE MODEL TO COMPARE</span>
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
