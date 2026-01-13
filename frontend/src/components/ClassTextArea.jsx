import { useState, useRef, useEffect} from "react"
import { Prompt } from "./Prompt";

export function ClassTextArea({className, classes, onCancel, onSubmit, prompt}) {
    const [textClasses, setTextClasses] = useState(classes);
    const [promptCurr, setPromptCurr] = useState(prompt);

    const textAreaRef = useRef(null)

    useEffect(() => {
      if (textAreaRef.current) {
        textAreaRef.current.scrollTop = textAreaRef.current.scrollHeight;
      }
    }, []);

    async function saveClasses() {
        onSubmit(textClasses, promptCurr);
    }

    return (
        <div className="z-2 inset-0 m-auto rounded-md border-2 m-10 w-1/2 h-5/6 flex flex-col space-evenly bg-[var(--color-grey-dark)]/90 items-center">
            <span className="mt-2">Classes</span>
            <div className={`${className} flex justify-center mb-2`}>
                <textarea 
                ref={textAreaRef}
                className="w-full h-full resize-none bg-white/5  rounded-md border-1" 
                placeholder="Write text here" 
                defaultValue={classes.join("\n")}
                onChange={(e) => setTextClasses(e.target.value.split("\n"))}
                />
            </div>
            <Prompt setPrompt={setPromptCurr} prompt={promptCurr}/>
            <div className="w-full h-1/10 pt-5">
                <button className="w-1/2 h-full btn border-1" onClick={onCancel}>Cancel</button>
                <button className="w-1/2 h-full btn border-1" onClick={saveClasses}>Done</button>
            </div>
        </div>
    )
}