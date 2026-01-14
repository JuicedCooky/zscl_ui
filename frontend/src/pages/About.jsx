import React from "react";

export default function About({ className }) {
    return (
        <div className={`${className} flex flex-col gap-4 pt-10 items-center h-auto`}>
            <h1 className="text-3xl font-bold">About</h1>
            <div className="w-8/10 text-center">
                <p className="text-lg">
                    This is the Zero-Shot Continual Learning (ZSCL) demonstration application.
                </p>
                <p className="mt-4">
                    Use the navigation on the left to switch between pages.
                </p>
            </div>
        </div>
    );
}
