export function ProbabilityBar({ label, prob, isCorrect }) {
    return (
        <div className={`rounded-md px-2 py-1.5 ${isCorrect ? "ring-1 ring-yellow-400/70 bg-yellow-400/10" : "hover:bg-white/5"}`}>
            <div className="flex items-center justify-between gap-2 mb-1">
                <span className={`text-sm truncate ${isCorrect ? "text-yellow-300 font-semibold" : "text-[var(--color-honeydew)]/85"}`}>
                    {label}
                    {isCorrect && <span className="text-yellow-400 ml-1.5 text-xs">✓</span>}
                </span>
                <span className={`text-xs shrink-0 tabular-nums font-mono ${isCorrect ? "text-yellow-300" : "text-[var(--color-honeydew)]/50"}`}>
                    {(prob * 100).toFixed(2)}%
                </span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                    className={`h-1.5 rounded-full transition-all duration-500 ${isCorrect ? "bg-yellow-400" : "bg-[var(--color-emerald)]"}`}
                    style={{ width: `${prob * 100}%` }}
                />
            </div>
        </div>
    );
}
