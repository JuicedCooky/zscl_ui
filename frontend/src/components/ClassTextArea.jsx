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
        <div className="z-2 inset-0 m-auto rounded-xl border border-[var(--color-honeydew)]/20 my-5 w-1/2 max-h-screen fixed flex flex-col bg-[var(--color-grey-dark)] shadow-2xl items-center overflow-hidden">
            <div className="w-full px-5 py-3 border-b border-[var(--color-honeydew)]/10">
                <span className="text-sm font-semibold uppercase tracking-widest text-[var(--color-honeydew)]/60">Edit Class Names</span>
            </div>
            <div className={`${className} flex justify-center px-5 pt-4 pb-2 w-full`}>
                <textarea
                    ref={textAreaRef}
                    className="w-full h-full resize-none bg-white/5 rounded-lg border border-[var(--color-honeydew)]/15 px-3 py-2 text-sm leading-relaxed focus:outline-none focus:border-[var(--color-honeydew)]/30"
                    placeholder="Write text here"
                    defaultValue={classes.join("\n")}
                    onChange={(e) => setTextClasses(e.target.value.split("\n"))}
                />
            </div>
            <Prompt setPrompt={setPromptCurr} prompt={promptCurr}/>
            <div className="w-full flex border-t border-[var(--color-honeydew)]/10">
                <button
                    className="flex-1 py-3 text-[var(--color-honeydew)]/50 hover:text-[var(--color-honeydew)]/80 hover:bg-white/5 transition duration-200 text-sm"
                    onClick={onCancel}
                >
                    Cancel
                </button>
                <div className="w-px bg-[var(--color-honeydew)]/10" />
                <button
                    className="flex-1 py-3 bg-[var(--color-magenta)]/60 hover:bg-[var(--color-magenta)]/80 text-[var(--color-honeydew)] font-medium transition duration-200 text-sm"
                    onClick={saveClasses}
                >
                    Done
                </button>
            </div>
        </div>
    )
}
