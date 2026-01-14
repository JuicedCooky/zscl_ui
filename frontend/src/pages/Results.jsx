import React, { useState } from "react";
import results from "../assets/results/results.json";

const MODEL_NAMES = [
    "Zero Shot Continual Learning Model (ZSCL)",
    "Finetune Only Model"
];

const ROW_LABELS = [
    { key: "accuracy", label: "Accuracy" },
    { key: "top5", label: "Top-5 Accuracy" },
];

// Temporary chart data - task/dataset performance
const CHART_DATA = {
    labels: ["CIFAR-10", "CIFAR-100", "ImageNet", "Flowers102", "Food101"],
    datasets: [
        {
            name: "Zero Shot Continual Learning Model (ZSCL)",
            values: [92.5, 78.3, 68.9, 85.2, 79.1],
            color: "var(--color-magenta)",
        },
        {
            name: "Finetune Only Model",
            values: [88.1, 71.5, 62.4, 78.9, 72.3],
            color: "var(--color-honeydew)",
        },
    ],
};

export default function Results({ className }) {
    const [selectedModels, setSelectedModels] = useState([true, false]);
    const [chartType, setChartType] = useState("bar"); // "bar" or "line"

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

            {/* Chart Section */}
            <div className="w-9/10 flex items-center justify-between mt-6">
                <h2 className="text-2xl font-bold">Performance Across Datasets</h2>
                {/* Chart Type Toggle */}
                <div className="flex bg-white/10 rounded-md p-1 gap-1">
                    <button
                        className={`px-4 py-2 rounded transition duration-300 ${
                            chartType === "bar"
                                ? "bg-[var(--color-magenta)]/60"
                                : "hover:bg-white/10"
                        }`}
                        onClick={() => setChartType("bar")}
                    >
                        Bar
                    </button>
                    <button
                        className={`px-4 py-2 rounded transition duration-300 ${
                            chartType === "line"
                                ? "bg-[var(--color-magenta)]/60"
                                : "hover:bg-white/10"
                        }`}
                        onClick={() => setChartType("line")}
                    >
                        Line
                    </button>
                </div>
            </div>
            <div className="w-9/10 border-2 border-[var(--color-onyx)] rounded-md p-6">
                {activeModels.length === 0 ? (
                    <div className="w-full text-center text-gray-400 py-10">
                        Select at least one model to view chart
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {/* Chart Legend */}
                        <div className="flex gap-6 justify-center mb-4">
                            {CHART_DATA.datasets
                                .filter((dataset) => activeModels.includes(dataset.name))
                                .map((dataset) => (
                                    <div key={dataset.name} className="flex items-center gap-2">
                                        <div
                                            className="w-4 h-4 rounded"
                                            style={{ backgroundColor: dataset.color }}
                                        />
                                        <span className="text-sm">{dataset.name}</span>
                                    </div>
                                ))}
                        </div>

                        {chartType === "bar" ? (
                            /* Bar Chart */
                            <div className="flex items-end justify-around gap-4 h-64">
                                {CHART_DATA.labels.map((label, labelIdx) => (
                                    <div key={label} className="flex flex-col items-center gap-2 flex-1">
                                        <div className="flex items-end gap-1 h-48">
                                            {CHART_DATA.datasets
                                                .filter((dataset) => activeModels.includes(dataset.name))
                                                .map((dataset) => (
                                                    <div
                                                        key={`${dataset.name}-${label}`}
                                                        className="w-8 rounded-t transition-all duration-300 relative group"
                                                        style={{
                                                            height: `${dataset.values[labelIdx] * 0.48}%`,
                                                            backgroundColor: dataset.color,
                                                            opacity: 0.8,
                                                        }}
                                                    >
                                                        {/* Tooltip */}
                                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/90 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                            {dataset.values[labelIdx]}%
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                        <span className="text-sm text-gray-400">{label}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            /* Line Chart */
                            <div className="relative h-64">
                                <svg className="w-full h-48" viewBox="0 0 500 200" preserveAspectRatio="none">
                                    {/* Grid lines */}
                                    {[0, 25, 50, 75, 100].map((val) => (
                                        <line
                                            key={val}
                                            x1="0"
                                            y1={200 - val * 2}
                                            x2="500"
                                            y2={200 - val * 2}
                                            stroke="rgba(255,255,255,0.1)"
                                            strokeWidth="1"
                                        />
                                    ))}
                                    {/* Lines for each dataset */}
                                    {CHART_DATA.datasets
                                        .filter((dataset) => activeModels.includes(dataset.name))
                                        .map((dataset) => {
                                            const points = dataset.values
                                                .map((val, idx) => {
                                                    const x = (idx / (CHART_DATA.labels.length - 1)) * 460 + 20;
                                                    const y = 200 - val * 2;
                                                    return `${x},${y}`;
                                                })
                                                .join(" ");
                                            return (
                                                <g key={dataset.name}>
                                                    <polyline
                                                        points={points}
                                                        fill="none"
                                                        stroke={dataset.color}
                                                        strokeWidth="3"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        className="transition-all duration-300"
                                                    />
                                                    {/* Data points */}
                                                    {dataset.values.map((val, idx) => {
                                                        const x = (idx / (CHART_DATA.labels.length - 1)) * 460 + 20;
                                                        const y = 200 - val * 2;
                                                        return (
                                                            <g key={`${dataset.name}-point-${idx}`} className="group">
                                                                <circle
                                                                    cx={x}
                                                                    cy={y}
                                                                    r="6"
                                                                    fill={dataset.color}
                                                                    className="transition-all duration-300 hover:r-8"
                                                                />
                                                                <title>{`${CHART_DATA.labels[idx]}: ${val}%`}</title>
                                                            </g>
                                                        );
                                                    })}
                                                </g>
                                            );
                                        })}
                                </svg>
                                {/* X-axis labels */}
                                <div className="flex justify-between px-2 mt-2">
                                    {CHART_DATA.labels.map((label) => (
                                        <span key={label} className="text-sm text-gray-400">
                                            {label}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Y-axis labels */}
                        <div className="flex justify-between text-xs text-gray-500 px-4">
                            <span>0%</span>
                            <span>25%</span>
                            <span>50%</span>
                            <span>75%</span>
                            <span>100%</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}