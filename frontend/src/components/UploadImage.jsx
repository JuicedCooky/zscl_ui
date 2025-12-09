import React, { useCallback } from "react";
import { useState } from "react";


export function UploadImage({className, setPreview, changeImage}) {
    // const [preview, setPreview] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploaded, setIsUploaded] = useState(false);

    const handleUpload = useCallback(async (files) =>
    {
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

    const handleSelectImage = (e) => {
        const files = e.target.files;
        handleUpload(files);
        setIsUploaded(true);

    } 

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        // const {files} = e.dataTransfer;
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const { files } = e.dataTransfer;
        handleUpload(files);
        
        setIsUploaded(true);
    }

    return (
        <div>
            {isUploaded && (
                <button onClick={() => {changeImage(); setIsUploaded(false);}}>Select Another Image</button>
            )}
            {!isUploaded && ( 
                <div className={`${className} flex flex-col`}>
                    <label className={`border-2 border-dashed h-full w-full rounded-md cursor-pointer flex flex-col justify-center
                    ${isDragging ? "border-green-500 bg-blue-500/10" : ""}
                    `}
                        onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}  
                    >
                        <input type="file" accept="image/*" onChange={handleSelectImage}  className="hidden"/>
                        <p className="font-medium">Drag & drop a image here</p>
                        <p className="text-sm text-gray-300 mt-1">or Click to select</p>
                    </label>
                </div>
            )}
        </div>
    )
    ;
}