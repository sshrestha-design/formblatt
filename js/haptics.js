const canUseHaptics = () => {
    if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return false;
    return typeof window !== "undefined"
        && (window.matchMedia?.("(max-width: 767px), (pointer: coarse)")?.matches ?? false);
};

export function triggerHaptic(pattern = 8) {
    if (canUseHaptics()) navigator.vibrate(pattern);
}
