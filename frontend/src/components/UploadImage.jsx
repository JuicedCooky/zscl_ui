import { useState } from "react";
import { IoCloudUploadOutline } from "react-icons/io5";

export function UploadImage({className, changeImage, handleUpload}) {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploaded, setIsUploaded] = useState(false);

    const handleSelectImage = (e) => {
        const files = e.target.files;
        handleUpload(files);
        setIsUploaded(true);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const { files } = e.dataTransfer;
        handleUpload(files);
        setIsUploaded(true);
    };

    return (
        <div>
            {isUploaded && (
                <button className="btn" onClick={() => { changeImage(); setIsUploaded(false); }}>
                    Select Another Image
                </button>
            )}
            {!isUploaded && (
                <div className={`${className} flex flex-col`}>
                    <label
                        className={`border-2 border-dashed h-full w-full rounded-xl cursor-pointer flex flex-col justify-center items-center gap-2 transition duration-200
                            ${isDragging
                                ? "border-[var(--color-honeydew)]/60 bg-[var(--color-magenta)]/20"
                                : "border-[var(--color-honeydew)]/20 hover:border-[var(--color-honeydew)]/40 hover:bg-white/5"
                            }`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <input type="file" accept="image/*" onChange={handleSelectImage} className="hidden" />
                        <IoCloudUploadOutline className={`text-5xl transition duration-200 ${isDragging ? "text-[var(--color-honeydew)]/80" : "text-[var(--color-honeydew)]/40"}`} />
                        <p className="font-medium text-[var(--color-honeydew)]/70">Drag & drop an image here</p>
                        <p className="text-sm text-[var(--color-honeydew)]/40">or click to select</p>
                    </label>
                </div>
            )}
        </div>
    );
}
