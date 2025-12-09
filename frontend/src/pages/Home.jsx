import React from "react";
import { useState } from "react";
import { UploadImage } from "../components/UploadImage";
import LoadingSpinner from "../components/LoadingSpinner";
import { ClassTextArea } from "../components/ClassTextArea";

export default function Home() {
    const [preview, setPreview] = useState(null);
    const [results, setResults] = useState(null);
    const [isPredicting, setIsPredicting] = useState(false);
    const [showClasses, setShowClasses] = useState(false);
    const [classes, setClasses] = useState(null);
    
    async function handlePredict(){
        setIsPredicting(true);
        if (preview != null){
            const res = await fetch("http://localhost:8000/predict", {
                method: "GET",
            });


            setResults(await res.json());

        }
        setIsPredicting(false);
    }

    function changeImage(){
        setPreview(null);
        setResults(null);
    }

    async function displayClasses(){
        const res = await fetch("http://localhost:8000/getclassnames", {
            method: "GET",
        });
        setClasses(await res.json());
        setShowClasses(true);
    }

    async function saveClasses(){
        // const res 
    }

    

    return (
        <div className="flex flex-col gap-4 pt-10 items-center">
            <UploadImage className="h-100 w-100" setPreview={setPreview} changeImage={changeImage}></UploadImage>

            {preview && 
            <img
                src={preview}
                alt="Uploaded"
                style={{ width: "300px", marginTop: "20px" }}
            >
            </img>} 

            <button onClick={displayClasses}>Review and Edit Class Names</button>
            
            <button onClick={handlePredict} className="w-100">Predict</button>
            {isPredicting && 
                <LoadingSpinner />
            }
            {results && Object.entries(results).map(([label,prob]) => (
                <div key={label}>{label}:{prob}</div>
            ))}
            
            {showClasses && 
                <div className="absolute bg-black/75 h-full w-full top-0 flex">
                    <ClassTextArea className="w-1/2 h-8/10 m-auto" classes={classes} onCancel={() => setShowClasses(false)} onSubmit={()=>{}}></ClassTextArea>
                </div>
            }
        </div>
    );
}