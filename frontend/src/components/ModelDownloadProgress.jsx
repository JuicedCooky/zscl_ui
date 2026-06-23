export default function ModelDownloadProgress({ progress }) {
    const { current_file, file_done, file_total, files_done, files_total } = progress;
    const pct = file_total > 0 ? Math.min(100, Math.round((file_done / file_total) * 100)) : 0;
    const doneMB = (file_done / (1024 * 1024)).toFixed(1);
    const totalMB = (file_total / (1024 * 1024)).toFixed(0);

    return (
        <div className="flex flex-col gap-2 py-2">
            <span className="text-sm text-[var(--color-honeydew)]/70">
                Downloading models — {files_done + 1} of {files_total}
            </span>
            <span className="text-xs text-[var(--color-honeydew)]/50 font-mono truncate">
                {current_file}
            </span>
            <div
                className="w-full h-1.5 rounded-full overflow-hidden"
                style={{ background: 'rgba(236,255,248,0.1)' }}
            >
                <div
                    className="h-full rounded-full transition-all duration-200"
                    style={{ width: `${pct}%`, background: '#ECFFF8' }}
                />
            </div>
            <span className="text-xs text-[var(--color-honeydew)]/40">
                {doneMB} / {totalMB} MB ({pct}%)
            </span>
        </div>
    );
}
