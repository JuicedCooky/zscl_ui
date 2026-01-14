import React, { useState } from "react";
import results from "../assets/results/results.json";

const MODEL_NAMES = [
    "Zero Shot Continual Learning Model (ZSCL)",
    "Finetune Only Model"
];

const ROW_LABELS = [
    { key: "accuracy", label: "Accuracy" },
    { key: "top5", label: "Top-5 Accuracy" },
    { key: "transfer", label: "Confidence Score" },
    // { key: "inference_time", label: "Inference Time" },
];

export default function Results({ className }) {
    const [selectedModels, setSelectedModels] = useState([true, false]);

    const toggleModel = (index) => {
        setSelectedModels(prev => {
            const newArray = [...prev];
            newArray[index] = !newArray[index];
            return newArray;
        });
    };

    const activeModels = MODEL_NAMES.filter((_, idx) => selectedModels[idx]);

    return (
        <div className={`${className} flex flex-col gap-4 pt-10 items-center h-auto`}>
            <h1 className="text-3xl font-bold">Model Comparison</h1>

            {/* Model Selection Tabs */}
            <div className="w-2/3 bg-white/10 rounded-md p-2 border-1 gap-2 flex relative">
                {MODEL_NAMES.map((name, idx) => (
                    <button
                        key={idx}
                        className={`flex-1 rounded-md p-3 z-1 border-1 transition duration-300 ${
                            selectedModels[idx]
                                ? "bg-[var(--color-magenta)]/60 border-[var(--color-onyx)]"
                                : "bg-transparent border-transparent hover:bg-[var(--color-onyx)]/20 hover:border-[var(--color-onyx)]"
                        }`}
                        onClick={() => toggleModel(idx)}
                    >
                        {name}
                    </button>
                ))}
            </div>

            <p className="text-sm text-gray-400">
                Selected: {activeModels.length > 0 ? activeModels.join(", ") : "None"}
            </p>

            <hr className="w-9/10 border-[var(--color-honeydew)]/50" />

            {/* Comparison Table */}
            <div className="w-9/10 border-2 border-[var(--color-onyx)] rounded-md overflow-hidden">
                {activeModels.length === 0 ? (
                    <div className="w-full text-center text-gray-400 py-10">
                        Select at least one model to view comparison
                    </div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-[var(--color-honeydew)]/30">
                                <th className="p-4 text-left bg-white/5 w-48">Metric</th>
                                {activeModels.map((modelName) => (
                                    <th
                                        key={modelName}
                                        className="p-4 text-center font-semibold"
                                    >
                                        {modelName}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {ROW_LABELS.map((row, idx) => (
                                <tr
                                    key={row.key}
                                    // className={idx % 2 === 0 ? "bg-white/5" : ""}
                                >
                                    <td className="p-4 text-left font-medium border-r border-[var(--color-honeydew)]/20">
                                        {row.label}
                                    </td>
                                    {activeModels.map((modelName) => (
                                        <td
                                            key={`${modelName}-${row.key}`}
                                            className={`"p-4 text-center text-gray-400" ${idx % 2 === 0 ? "bg-white/5" : ""}`}
                                        >
                                            —
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}