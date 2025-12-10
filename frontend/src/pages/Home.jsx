import React from "react";
import { useState, useCallback} from "react";
import { UploadImage } from "../components/UploadImage";
import LoadingSpinner from "../components/LoadingSpinner";
import { ClassTextArea } from "../components/ClassTextArea";
import { ProbabilityBar } from "../components/ProbabilityBar";
import { Camera } from "../components/Camera";

export default function Home() {
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

    const [limitProbabilities, setLimitProbabilities] = useState("5");

    const listedProbOptions = ["1","5","10","20","50","100","all"];

    async function handlePredict(){
        setIsPredicting(true);
        console.log(preview);
        if (preview != null){
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

    const handleUpload = useCallback(async (files) =>
    {
        console.log(files);
        if (!files || files.length === 0) return; 
        const file = files[0];
        
        setPreview(URL.createObjectURL(file));

        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("http://localhost:8000/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

    }, [setPreview] );

    return (
        <div className="flex flex-col gap-4 pt-10 items-center h-full">
            <div className="w-1/3">
                <button className="w-1/2" onClick={() => {setUseCamera(false); setPreview(null);}}>Select & Upload Image</button>
                <button className="w-1/2" onClick={() => {setUseCamera(true); setPreview(null);}}>Capture Image</button>
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
                <button onClick={displayClasses}>Review and Edit Class Names</button>
                {isGettingClasses && 
                    <LoadingSpinner/>
                }
            </div>

            <button onClick={handlePredict} className="w-100">Predict</button>
            <div className="bg-transparent border-2 h-1/20 rounded-md border-slate-600 overflow-visible">
                <span className="mr-2">Limit:</span>
                {/* <input type="text" className="w-10 h-6 bg-gray-600" value={limitProbabilities}></input> */}
                <select
                className="bg-slate-800 h-full pl-2" 
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
                    <LoadingSpinner/>
                }
                {results &&
                <div>
                    {
                        ((limitProbabilities === "all") 
                        ? Object.entries(results) 
                        : Object.entries(results).slice(0,Number(limitProbabilities)))
                        .map(([label,prob]) => (
                        // <div key={label}>{label}:{prob}</div>
                        <ProbabilityBar key={label} label={label} prob={prob}></ProbabilityBar>
                    ))}
                </div>
                }
                {noImageError &&
                    <span className="text-red-700">ERROR, NO IMAGE SELECTED</span>
                }
            </div>
            {showClasses && 
                <div className="absolute bg-black/75 h-full w-full top-0 flex">
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