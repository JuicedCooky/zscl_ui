import React from "react";
import { FiGithub, FiExternalLink } from "react-icons/fi";

export default function About({ className }) {
    return (
        <div className={`${className} flex flex-col gap-4 pt-10 items-center h-auto`}>
            <h1 className="text-3xl font-bold">About</h1>
            <div className="w-8/10 flex flex-col items-center gap-4">
                <p className="text-lg text-center">
                    This is the Zero-Shot Continual Learning (ZSCL) demonstration application.
                </p>
                <p className="text-center text-[var(--color-honeydew)]/60">
                    Use the navigation on the left to switch between pages.
                </p>
                <div className="flex flex-col gap-3 w-full max-w-md mt-2">
                    <a
                        href="https://github.com/JuicedCooky/thesis"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg border border-[var(--color-honeydew)]/15 bg-white/5 hover:bg-[var(--color-magenta)]/20 hover:border-[var(--color-honeydew)]/30 transition duration-200 group"
                    >
                        <FiGithub className="text-[var(--color-honeydew)]/50 text-lg shrink-0 group-hover:text-[var(--color-honeydew)]/80 transition duration-200" />
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm font-medium text-[var(--color-honeydew)]/85">Model &amp; Training</span>
                            <span className="text-xs text-[var(--color-honeydew)]/40 truncate">github.com/JuicedCooky/thesis</span>
                        </div>
                        <FiExternalLink className="ml-auto text-[var(--color-honeydew)]/25 text-sm shrink-0 group-hover:text-[var(--color-honeydew)]/50 transition duration-200" />
                    </a>
                    <a
                        href="https://github.com/JuicedCooky/zscl_ui"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg border border-[var(--color-honeydew)]/15 bg-white/5 hover:bg-[var(--color-magenta)]/20 hover:border-[var(--color-honeydew)]/30 transition duration-200 group"
                    >
                        <FiGithub className="text-[var(--color-honeydew)]/50 text-lg shrink-0 group-hover:text-[var(--color-honeydew)]/80 transition duration-200" />
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm font-medium text-[var(--color-honeydew)]/85">Demonstration UI</span>
                            <span className="text-xs text-[var(--color-honeydew)]/40 truncate">github.com/JuicedCooky/zscl_ui</span>
                        </div>
                        <FiExternalLink className="ml-auto text-[var(--color-honeydew)]/25 text-sm shrink-0 group-hover:text-[var(--color-honeydew)]/50 transition duration-200" />
                    </a>
                </div>
            </div>
        </div>
    );
}
