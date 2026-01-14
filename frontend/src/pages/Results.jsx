import React, { useState } from "react";
import results from "../assets/results/results.json";

const MODELS = [
    { name: "Zero Shot Continual Learning Model (ZSCL)", key: "zscl_freeze" },
    { name: "Finetune Only Model", key: "pure_finetune" }
];

const MODEL_NAMES = MODELS.map(m => m.name);

const ROW_LABELS = [
    { key: "accuracy", label: "Accuracy" },
    { key: "average_change", label: "Average Change" },
    { key: "average_change_trained_datasets", label: "Average Change (On trained datasets)" },
    { key: "average_change_untrained_datasets", label: "Average Change (On untrained datasets)" },
];

// Temporary chart data - task/dataset performance
const CHART_DATA = {
    labels: ["version-0 ()", "version-1 (DTD)", "version-2 (DTD,MNIST)", "version-3 (DTD,MNIST,EuroSAT)", "version-4 (DTD,MNIST,EuroSAT,Flowers)"],
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
                                    <td className={`p-4 text-left font-medium border-r border-[var(--color-honeydew)]/20  ${idx % 2 === 0 ? " bg-white/5" : ""}`}>
                                        {row.label}
                                    </td>
                                    {activeModels.map((modelName) => {
                                        const model = MODELS.find(m => m.name === modelName);
                                        const value = model && results[model.key] ? results[model.key][row.key] : "—";
                                        return (
                                            <td
                                                key={`${modelName}-${row.key}`}
                                                className={`p-4 text-center ${idx % 2 === 0 ? "bg-white/5" : ""}`}
                                            >
                                                {typeof value === "number" || !isNaN(value) ? `${value}%` : value}
                                            </td>
                                        );
                                    })}
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
                            <div className="relative">
                                <svg className="w-full" style={{ height: "300px" }} viewBox="0 0 500 240" preserveAspectRatio="xMidYMid meet">
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
                                                            <g key={`${dataset.name}-point-${idx}`} className="group cursor-pointer">
                                                                {/* Larger invisible hover area */}
                                                                <circle
                                                                    cx={x}
                                                                    cy={y}
                                                                    r="10"
                                                                    fill="transparent"
                                                                />
                                                                {/* Visible dot */}
                                                                <circle
                                                                    cx={x}
                                                                    cy={y}
                                                                    r="6"
                                                                    fill={dataset.color}
                                                                    className="transition-all duration-300 group-hover:r-8"
                                                                />
                                                                {/* Tooltip */}
                                                                <g className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                                    <rect
                                                                        x={x - 35}
                                                                        y={y - 35}
                                                                        width="70"
                                                                        height="24"
                                                                        rx="4"
                                                                        fill="rgba(0,0,0,0.9)"
                                                                    />
                                                                    <text
                                                                        x={x}
                                                                        y={y - 18}
                                                                        textAnchor="middle"
                                                                        fill="white"
                                                                        fontSize="12"
                                                                    >
                                                                        {`${val}%`}
                                                                    </text>
                                                                </g>
                                                            </g>
                                                        );
                                                    })}
                                                </g>
                                            );
                                        })}
                                    {/* X-axis labels inside SVG */}
                                    {CHART_DATA.labels.map((label, idx) => {
                                        const x = (idx / (CHART_DATA.labels.length - 1)) * 460 + 20;
                                        return (
                                            <text
                                                key={label}
                                                x={x}
                                                y="220"
                                                textAnchor="middle"
                                                fill="rgb(156, 163, 175)"
                                                fontSize="12"
                                            >
                                                {label}
                                            </text>
                                        );
                                    })}
                                </svg>
                            </div>
                        )}

                        {/* Y-axis labels */}
                        <div className="flex justify-between text-xs text-gray-500 px-4">
                            {/* <span>0%</span>
                            <span>25%</span>
                            <span>50%</span>
                            <span>75%</span>
                            <span>100%</span> */}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}