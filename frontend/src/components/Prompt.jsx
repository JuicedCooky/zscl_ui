import { useAspect } from "@react-three/drei";
import { useState } from "react";

function PromptInput({ setPrompt, prompt }){
    const [currPrompt, setCurrPrompt] = useState(null);
    
    return (
        <div className="flex w-full gap-4">
            <input placeholder="prefix" className="w-4/10 bg-white/5 outline-gray-400 outline-1 rounded-md "
                defaultValue={prompt["prefix"]}
                onChange={(e) => setPrompt(prev => ({
                    ...prev,
                    prefix: e.target.value
                }))}
            ></input>
            <span className="w-2/10 rounded-md text-center">{"<class>"}</span>
            <input placeholder="suffix" className="w-4/10 bg-white/5 outline-gray-400 outline-1 rounded-md"
                defaultValue={prompt["suffix"]}
                onChange={(e) => setPrompt(prev => ({
                    ...prev,
                    suffix: e.target.value
                }))}
            ></input>
        </div>
    )
}

export function Prompt({setPrompt, prompt}){
    const [currPrompt, setCurrPrompt] = useState(null);

    return (
        <div className="w-full flex flex-col items-center">
            <div className="flex flex-col items-center w-8/10">
                <span className="mb-2">Prompt</span>
                <PromptInput setPrompt={setPrompt} prompt={prompt}></PromptInput>
            </div>
            <button className="btn mt-3 py-2 rounded-md border-1">Add another prompt</button>
        </div>
    );
}