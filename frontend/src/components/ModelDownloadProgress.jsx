export default function ModelDownloadProgress({ progress, onTogglePause }) {
    const { files = [], files_done = 0, files_total = 0, paused = false } = progress;

    return (
        <div className="flex flex-col gap-3 py-2">
            <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-[var(--color-honeydew)]/70">
                    Models downloaded — {files_done} of {files_total}{paused ? " (paused)" : ""}
                </span>
                {onTogglePause && (
                    <button
                        onClick={onTogglePause}
                        className="text-xs px-2.5 py-1 rounded-md border border-[var(--color-honeydew)]/20 bg-white/5 hover:bg-white/10 text-[var(--color-honeydew)]/70 transition duration-150"
                    >
                        {paused ? "Resume" : "Pause"}
                    </button>
                )}
            </div>
            <div className="flex flex-col gap-2.5 max-h-56 overflow-y-auto pr-1">
                {files.map((f, idx) => {
                    const pct = f.total > 0 ? Math.min(100, Math.round((f.done / f.total) * 100)) : 0;
                    const doneMB = (f.done / (1024 * 1024)).toFixed(1);
                    const totalMB = (f.total / (1024 * 1024)).toFixed(0);
                    return (
                        <div key={`${f.name}-${idx}`} className="flex flex-col gap-1">
                            <span className="text-xs text-[var(--color-honeydew)]/50 font-mono truncate">
                                {f.completed ? "✓ " : ""}{f.name}
                            </span>
                            <div
                                className="w-full h-1.5 rounded-full overflow-hidden"
                                style={{ background: 'rgba(236,255,248,0.1)' }}
                            >
                                <div
                                    className="h-full rounded-full transition-all duration-200"
                                    style={{ width: `${f.completed ? 100 : pct}%`, background: f.completed ? '#4ADE80' : '#ECFFF8' }}
                                />
                            </div>
                            <span className="text-xs text-[var(--color-honeydew)]/40">
                                {f.completed ? `${totalMB} MB` : `${doneMB} / ${totalMB} MB (${pct}%)`}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
