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

// Chart data options - maps to array keys in results.json
const CHART_OPTIONS = [
    { key: "running_accuracy", label: "Running Accuracy" },
    { key: "transfer_scores", label: "Transfer Scores" },
];

// X-axis labels for each chart option
const CHART_LABELS = {
    running_accuracy: ["version-0 ()", "version-1 (DTD)", "version-2 (DTD,MNIST)", "version-3 (DTD,MNIST,EuroSAT)", "version-4 (DTD,MNIST,EuroSAT,Flowers)"],
    transfer_scores: ["DTD", "MNIST", "EuroSAT", "Flowers"],
};

// Colors for each model
const MODEL_COLORS = {
    "Zero Shot Continual Learning Model (ZSCL)": "var(--color-magenta)",
    "Finetune Only Model": "var(--color-honeydew)",
};

export default function Results({ className }) {
    const [selectedModels, setSelectedModels] = useState([true, false]);
    const [chartType, setChartType] = useState("bar"); // "bar" or "line"
    const [selectedChartData, setSelectedChartData] = useState("running_accuracy");
    const [useMaxScale, setUseMaxScale] = useState(false);

    const toggleModel = (index) => {
        setSelectedModels(prev => {
            const newArray = [...prev];
            newArray[index] = !newArray[index];
            return newArray;
        });
    };

    const activeModels = MODEL_NAMES.filter((_, idx) => selectedModels[idx]);

    // Generate chart data dynamically from results.json
    const chartData = {
        labels: CHART_LABELS[selectedChartData] || [],
        datasets: MODELS.map(model => ({
            name: model.name,
            values: results[model.key]?.[selectedChartData] || [],
            color: MODEL_COLORS[model.name],
        })),
    };

    // Calculate max value across all active models for dynamic scaling
    const activeDataValues = chartData.datasets
        .filter(dataset => activeModels.includes(dataset.name))
        .flatMap(dataset => dataset.values);
    const maxDataValue = activeDataValues.length > 0 ? Math.max(...activeDataValues) : 100;
    const yAxisMax = useMaxScale ? Math.ceil(maxDataValue * 1.1) : 100; // Add 10% padding when using max scale

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
                <div className="flex items-center gap-4">
                    {/* Chart Data Dropdown */}
                    <select
                        className="bg-white/10 border border-[var(--color-onyx)] rounded-md px-3 py-2 hover:bg-white/20 transition duration-300"
                        value={selectedChartData}
                        onChange={(e) => setSelectedChartData(e.target.value)}
                    >
                        {CHART_OPTIONS.map(option => (
                            <option key={option.key} value={option.key}>
                                {option.label}
                            </option>
                        ))}
                    </select>
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
                    {/* Max Scale Toggle */}
                    <button
                        className={`px-4 py-2 rounded transition duration-300 border ${
                            useMaxScale
                                ? "bg-[var(--color-magenta)]/60 border-[var(--color-magenta)]"
                                : "bg-white/10 border-transparent hover:bg-white/20"
                        }`}
                        onClick={() => setUseMaxScale(!useMaxScale)}
                        title="Scale Y-axis to max data value"
                    >
                        Auto Scale (Y-axis)
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
                        <div className="flex gap-6 justify-center mb-8">
                            {chartData.datasets
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
                            <div className="flex gap-2 h-64">
                                {/* Y-axis labels */}
                                <div className="flex flex-col justify-between h-48 text-xs text-gray-400 pr-2">
                                    <span>{yAxisMax}%</span>
                                    <span>{Math.round(yAxisMax * 0.75)}%</span>
                                    <span>{Math.round(yAxisMax * 0.5)}%</span>
                                    <span>{Math.round(yAxisMax * 0.25)}%</span>
                                    <span>0%</span>
                                </div>
                                <div className="flex items-end justify-around gap-4 flex-1">
                                {chartData.labels.map((label, labelIdx) => (
                                    <div key={label} className="flex flex-col items-center gap-2 flex-1">
                                        <div className="flex items-end gap-1 h-48">
                                            {chartData.datasets
                                                .filter((dataset) => activeModels.includes(dataset.name))
                                                .map((dataset) => (
                                                    <div
                                                        key={`${dataset.name}-${label}`}
                                                        className="w-8 rounded-t transition-all duration-300 relative group"
                                                        style={{
                                                            height: `${(dataset.values[labelIdx] / yAxisMax) * 100}%`,
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
                            </div>
                        ) : (
                            /* Line Chart */
                            <div className="relative">
                                <svg className="w-full" style={{ height: "300px" }} viewBox="0 0 550 260" preserveAspectRatio="xMidYMid meet">
                                    {/* Grid lines */}
                                    {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
                                        <g key={fraction}>
                                            <line
                                                x1="50"
                                                y1={220 - fraction * 200}
                                                x2="530"
                                                y2={220 - fraction * 200}
                                                stroke="rgba(255,255,255,0.1)"
                                                strokeWidth="1"
                                            />
                                            {/* Y-axis labels */}
                                            <text
                                                x="45"
                                                y={220 - fraction * 200 + 4}
                                                textAnchor="end"
                                                fill="rgb(156, 163, 175)"
                                                fontSize="11"
                                            >
                                                {Math.round(yAxisMax * fraction)}%
                                            </text>
                                        </g>
                                    ))}
                                    {/* Lines for each dataset */}
                                    {chartData.datasets
                                        .filter((dataset) => activeModels.includes(dataset.name))
                                        .map((dataset) => {
                                            const points = dataset.values
                                                .map((val, idx) => {
                                                    const x = (idx / (chartData.labels.length - 1)) * 480 + 50;
                                                    const y = 220 - (val / yAxisMax) * 200;
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
                                                        const x = (idx / (chartData.labels.length - 1)) * 480 + 50;
                                                        const y = 220 - (val / yAxisMax) * 200;
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
                                    {chartData.labels.map((label, idx) => {
                                        const x = (idx / (chartData.labels.length - 1)) * 480 + 50;
                                        return (
                                            <text
                                                key={label}
                                                x={x}
                                                y="240"
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

                    </div>
                )}
            </div>
        </div>
    );
}