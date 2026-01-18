import React, { useState, useEffect } from "react";

const DATASETS = ["dtd", "eurosat", "flowers", "imagenet", "mnist"];

export function DatasetImageSelector({ handleUpload, onImageSelected }) {
    const [manifest, setManifest] = useState(null);
    const [selectedDataset, setSelectedDataset] = useState(null);
    const [selectedImage, setSelectedImage] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/test_images/manifest.json")
            .then((res) => res.json())
            .then((data) => {
                setManifest(data);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Failed to load manifest:", err);
                setLoading(false);
            });
    }, []);

    const handleDatasetSelect = (dataset) => {
        setSelectedDataset(dataset);
        setSelectedImage(null);
    };

    const handleImageClick = async (imageName) => {
        setSelectedImage(imageName);
        const imagePath = `/test_images/${selectedDataset}/${imageName}`;

        // Fetch the image and convert to File for handleUpload
        const response = await fetch(imagePath);
        const blob = await response.blob();
        const file = new File([blob], imageName, { type: blob.type });

        handleUpload([file]);
        if (onImageSelected) {
            onImageSelected(imagePath);
        }
    };

    const handleBack = () => {
        setSelectedDataset(null);
        setSelectedImage(null);
    };

    if (loading) {
        return <div className="text-center p-4">Loading datasets...</div>;
    }

    if (!manifest) {
        return <div className="text-center p-4 text-red-500">Failed to load datasets</div>;
    }

    // Dataset selection view
    if (!selectedDataset) {
        return (
            <div className="flex flex-col gap-4 w-full max-w-2xl">
                <span className="text-lg font-medium">Select a Dataset</span>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {DATASETS.map((dataset) => (
                        <button
                            key={dataset}
                            className="btn p-4 text-center capitalize hover:bg-[var(--color-magenta)]/60 transition"
                            onClick={() => handleDatasetSelect(dataset)}
                        >
                            {dataset}
                            <span className="block text-xs text-[var(--color-honeydew)]/70 mt-1">
                                {manifest[dataset]?.length || 0} images
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // Image selection view
    return (
        <div className="flex flex-col gap-4 w-full max-w-4xl">
            <div className="flex items-center gap-4">
                <button
                    className="btn px-3 py-1"
                    onClick={handleBack}
                >
                    ← Back
                </button>
                <span className="text-lg font-medium capitalize">{selectedDataset} Images</span>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-96 overflow-y-auto p-2">
                {manifest[selectedDataset]?.map((imageName) => {
                    const imagePath = `/test_images/${selectedDataset}/${imageName}`;
                    const isSelected = selectedImage === imageName;
                    return (
                        <div
                            key={imageName}
                            className={`cursor-pointer border-2 rounded-md overflow-hidden transition ${
                                isSelected
                                    ? "border-[var(--color-magenta)] ring-2 ring-[var(--color-magenta)]"
                                    : "border-transparent hover:border-[var(--color-honeydew)]/50"
                            }`}
                            onClick={() => handleImageClick(imageName)}
                        >
                            <img
                                src={imagePath}
                                alt={imageName}
                                className="w-full h-24 object-cover"
                            />
                            <p className="text-xs text-center p-1 truncate" title={imageName}>
                                {imageName}
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
