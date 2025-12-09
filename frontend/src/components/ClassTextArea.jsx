import { useState } from "react"

export function ClassTextArea({className, classes, onCancel, onSubmit}) {
    const [textClasses, setTextClasses] = useState(classes)
    return (
        <div className="inset-0 m-auto border-2 m-10 w-1/2 h-5/6 flex flex-col space-evenly bg-white/25">
            
            <div className={`${className} flex justify-center`}>
                <textarea 
                className="w-full h-full resize-none" 
                placeholder="Write text here" 
                defaultValue={classes.join("\n")}
                onChange={(e) => setTextClasses(e.target.value)}
                />
            </div>
            <div className="w-full h-1/10">
                <button className="w-1/2 h-full" onClick={onCancel}>Cancel</button>
                <button className="w-1/2 h-full">Done</button>
            </div>
        </div>
    )
}