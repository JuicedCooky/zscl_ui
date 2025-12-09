import { useState, useRef, useEffect} from "react"

export function ClassTextArea({className, classes, onCancel, onSubmit}) {
    const [textClasses, setTextClasses] = useState(classes);
    const textAreaRef = useRef(null)

    useEffect(() => {
      if (textAreaRef.current) {
        textAreaRef.current.scrollTop = textAreaRef.current.scrollHeight;
      }
    }, []);

    async function saveClasses() {
        onSubmit(textClasses);
    }

    return (
        <div className="inset-0 m-auto border-2 m-10 w-1/2 h-5/6 flex flex-col space-evenly bg-white/25">
            
            <div className={`${className} flex justify-center`}>
                <textarea 
                ref={textAreaRef}
                className="w-full h-full resize-none bg-black/30" 
                placeholder="Write text here" 
                defaultValue={classes.join("\n")}
                onChange={(e) => setTextClasses(e.target.value.split("\n"))}
                />
            </div>
            <div className="w-full h-1/10">
                <button className="w-1/2 h-full" onClick={onCancel}>Cancel</button>
                <button className="w-1/2 h-full" onClick={saveClasses}>Done</button>
            </div>
        </div>
    )
}