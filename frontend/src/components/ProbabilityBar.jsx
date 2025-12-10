

export function ProbabilityBar({label,prob}) {

    return (
        <div>
            <div>
                <span>{label}</span>
            </div>

            <div className="w-full h-4 bg-gray-700 rounded relative">
                <div className="h-4 bg-green-500 rounded"
                    style={{ width: `${prob * 100}%` }}>
                </div>
                <span className="absolute -top-1 left-1/2 -translate-x-1/2">{(prob * 100).toFixed(2)}%</span>
            </div>
        </div>
    )
}