import { useState, useRef, useEffect} from "react"

export function ClassTextArea({className, classes, onCancel, onSubmit, prompt}) {
    const [textClasses, setTextClasses] = useState(classes);
    const [promptCurr, setPromptCurr] = useState(prompt);

    const textAreaRef = useRef(null)

    useEffect(() => {
      if (textAreaRef.current) {
        textAreaRef.current.scrollTop = textAreaRef.current.scrollHeight;
      }
      console.log(promptCurr);
    }, []);

    async function saveClasses() {
        onSubmit(textClasses, promptCurr);
    }

    return (
        <div className="inset-0 m-auto border-2 m-10 w-1/2 h-5/6 flex flex-col space-evenly bg-white/25 items-center">
            <span className="mt-2">Classes</span>
            <div className={`${className} flex justify-center mb-2`}>
                <textarea 
                ref={textAreaRef}
                className="w-full h-full resize-none bg-black/30 rounded-md" 
                placeholder="Write text here" 
                defaultValue={classes.join("\n")}
                onChange={(e) => setTextClasses(e.target.value.split("\n"))}
                />
            </div>
            <div className="flex flex-col items-center w-9/10">
                <span className="mb-2">Prompt</span>
                <div className="flex w-full gap-4">
                    <input placeholder="prefix" className="w-4/10 bg-white/5 outline-gray-400 outline-1 rounded-md "
                    defaultValue={prompt["prefix"]}
                    onChange={(e) => setPromptCurr(prev => ({
                        ...prev,
                        prefix: e.target.value}))}
                    ></input>
                    <span className="w-2/10 text-left bg-black/70 rounded-md">Class</span>
                    <input placeholder="suffix" className="w-4/10 bg-white/5 outline-gray-400 outline-1 rounded-md"
                    defaultValue={prompt["suffix"]}
                    onChange={(e) => setPromptCurr(prev => ({
                        ...prev,
                        suffix: e.target.value}))}
                    ></input>
                </div>
            </div>
            <div className="w-full h-1/10 pt-5">
                <button className="w-1/2 h-full" onClick={onCancel}>Cancel</button>
                <button className="w-1/2 h-full" onClick={saveClasses}>Done</button>
            </div>
        </div>
    )
}