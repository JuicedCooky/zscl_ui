import React from "react";
import { useState, useCallback } from "react";
import { UploadImage } from "../components/UploadImage";
import LoadingSpinner from "../components/LoadingSpinner";
import { ClassTextArea } from "../components/ClassTextArea";
import { ProbabilityBar } from "../components/ProbabilityBar";
import { Camera } from "../components/Camera";
import { IoIosSend } from "react-icons/io";
import { FaEdit } from "react-icons/fa";

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

    const [useCamera, setUseCamera] = useState(false);
    const [noImageError, setNoImageError] = useState(false);
    const [noSelectionError, setNoSelectionError] = useState(false);

    const [limitProbabilities, setLimitProbabilities] = useState("5");

    const listedProbOptions = ["1", "5", "10", "20", "50", "100", "all"];

    const [currentImageData, setImageData] = useState(null);

    // Sequential dataset selection: index of the selected dataset
    // -1 means none selected, 0 = Base Model, 1 = DTD, 2 = MNIST, 3 = EuroSAT, 4 = Flowers
    // Visual display highlights all datasets up to selected to show training sequence
    const [selectedUpTo, setSelectedUpTo] = useState(-1);

    // Selected training method (null = not selected)
    const [selectedMethod, setSelectedMethod] = useState(null);

    async function handlePredict() {
        setIsPredicting(true);
        setNoImageError(false);
        setNoSelectionError(false);
        console.log(preview);

        // Validate selections
        // Base Model (index 0) doesn't require method selection
        if (selectedUpTo < 0 || (selectedUpTo > 0 && !selectedMethod)) {
            setNoSelectionError(true);
            setIsPredicting(false);
            return;
        }

        if (preview != null) {
            if (currentImageData != null) {
                const resImage = await fetch("http://localhost:8000/upload", {
                    method: "POST",
                    body: currentImageData,
                });
            }

            // Send dataset and method selection to backend
            await fetch("http://localhost:8000/setsequentialmodel", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    datasetIndex: selectedUpTo,
                    dataset: SEQUENTIAL_DATASETS[selectedUpTo],
                    method: selectedMethod
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

    // Handle dataset selection - clicking selects that dataset (visually highlights up to it)
    const handleDatasetClick = (index) => {
        if (selectedUpTo === index) {
            // Clicking the same dataset deselects it
            setSelectedUpTo(-1);
            setSelectedMethod(null);
        } else {
            // Clicking a dataset selects it
            setSelectedUpTo(index);
            setSelectedMethod(null); // Reset method when changing dataset
        }
    };

    // Handle method selection
    const handleMethodClick = (methodId) => {
        if (selectedMethod === methodId) {
            setSelectedMethod(null);
        } else {
            setSelectedMethod(methodId);
        }
    };

    return (
        <div className={`${className} flex flex-col gap-4 pt-10 items-center h-auto`}>
            <div className="w-1/3 bg-white/10 rounded-md p-2 border-1 gap-2 flex relative">
                <button className={`${useCamera ?
                    "hover:border-solid \
                hover:bg-[var(--color-onyx)]/20 hover:border-[var(--color-onyx)] transition duration-300"
                    : ""}
                w-1/2 rounded-md p-3 z-1 border-transparent border-1`}
                    onClick={() => { setUseCamera(false); setPreview(null); }}>
                    Select & Upload Image
                </button>

                <button className={`${!useCamera ?
                    "hover:border-solid \
                hover:bg-[var(--color-onyx)]/20 hover:border-[var(--color-onyx)] transition duration-300"
                    : ""}
                w-1/2 rounded-md p-3 z-1 border-transparent border-1`}
                    onClick={() => { setUseCamera(true); setPreview(null); }}>Capture Image</button>

                <div className={`transition duration-300
                border-1 border-[var(--color-onyx)] absolute bg-[var(--color-magenta)]/60 h-[calc(100%-theme(space.4))] rounded-md w-[calc(50%-theme(space.4))] ${useCamera ? "translate-x-[calc(100%+theme(space.4))]" : ""
                    }`}></div>
            </div>
            {!useCamera ?
                <UploadImage className="h-100 w-100"
                    changeImage={changeImage}
                    handleUpload={handleUpload}></UploadImage>
                : <Camera setPreview={setPreview} handleUpload={handleUpload}></Camera>
            }
            {(preview && !useCamera) &&
                <img
                    src={preview}
                    alt="Uploaded"
                    style={{ width: "300px", marginTop: "20px" }}
                >
                </img>}



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
            <div className="gap-y-4 flex flex-col">
                <span>1. Choose Dataset (Sequential Training)</span>
                <p className="text-sm text-[var(--color-honeydew)]/70">
                    Each model is trained sequentially on datasets before it
                </p>
                <div className="flex gap-2 flex-wrap">
                    {SEQUENTIAL_DATASETS.map((dataset, index) => (
                        <button
                            key={dataset}
                            className={`btn ${index <= selectedUpTo ? "" : "bg-transparent hover:bg-gray-600/50"}`}
                            onClick={() => handleDatasetClick(index)}
                        >
                            {dataset}
                        </button>
                    ))}
                </div>
            </div>

            {selectedUpTo > 0 && (
                <div className="gap-y-4 flex flex-col">
                    <span>2. Choose Training Method</span>
                    <p className="text-sm text-[var(--color-honeydew)]/70">
                        Select the training method used for the model
                    </p>
                    <div className="flex gap-2 flex-wrap">
                        {TRAINING_METHODS.map((method) => (
                            <button
                                key={method.id}
                                className={`btn ${selectedMethod === method.id ? "" : "bg-transparent hover:bg-gray-600/50"}`}
                                onClick={() => handleMethodClick(method.id)}
                            >
                                {method.label}
                            </button>
                        ))}
                    </div>
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
            <div className="border-2 p-5 rounded-md w-8/10">
                {isPredicting &&
                    <LoadingSpinner />
                }
                {results && !results.error &&
                    <div className="flex flex-row gap-6">
                        {Object.entries(results).map(([modelName, modelResults]) => (
                            <div key={modelName} className="flex flex-col gap-2 flex-1">
                                <span className="text-xl font-semibold border-b border-[var(--color-honeydew)]/30 pb-2">
                                    {modelName}
                                </span>
                                <div>
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
                }
                {results?.error &&
                    <span className="text-red-700">{results.error}</span>
                }
                {noImageError &&
                    <span className="text-red-700">ERROR, NO IMAGE SELECTED</span>
                }
                {noSelectionError &&
                    <span className="text-red-700">ERROR, SELECT A DATASET{selectedUpTo > 0 ? " AND TRAINING METHOD" : ""}</span>
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
