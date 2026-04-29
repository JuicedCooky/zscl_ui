export function ProbabilityBar({ label, prob, isCorrect }) {
    return (
        <div className={`rounded px-1 py-0.5 ${isCorrect ? "ring-1 ring-yellow-400 bg-yellow-400/10" : ""}`}>
            <div className="flex items-center gap-1">
                <span className={isCorrect ? "text-yellow-300 font-semibold" : ""}>{label}</span>
                {isCorrect && <span className="text-yellow-400 text-xs">✓</span>}
            </div>

            <div className="w-full h-4 bg-gray-700 rounded relative">
                <div
                    className={`h-4 rounded ${isCorrect ? "bg-yellow-400" : "bg-green-500"}`}
                    style={{ width: `${prob * 100}%` }}
                />
                <span className="absolute -top-1 left-1/2 -translate-x-1/2">{(prob * 100).toFixed(2)}%</span>
            </div>
        </div>
    );
}
