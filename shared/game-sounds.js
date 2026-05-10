(function () {
    const SOUND_SCRIPT_URL = (() => {
        if (typeof document === "undefined") {
            return "";
        }

        if (
            document.currentScript === undefined
            || document.currentScript === null
        ) {
            return "";
        }

        return document.currentScript.src;
    })();
    const SOUND_FILES = {
        completion: "../data/sounds/all-complete.wav",
        error: "../data/sounds/error.wav",
        menuClick: "../data/sounds/menu-click.wav",
        success: "../data/sounds/success.wav",
    };
    const CLICK_VOLUME = 0.28;
    const MUSIC_VOLUME = 0.24;
    const SOUND_VOLUME = 0.32;

    class GameSounds {
        static playSuccess() {
            return GameSounds.playSound(SOUND_FILES.success, SOUND_VOLUME);
        }

        static playError() {
            return GameSounds.playSound(SOUND_FILES.error, SOUND_VOLUME);
        }

        static playCompletionMusic() {
            return GameSounds.playSound(SOUND_FILES.completion, MUSIC_VOLUME);
        }

        static playMenuClick() {
            return GameSounds.playSound(SOUND_FILES.menuClick, CLICK_VOLUME);
        }

        static playSound(soundPath, volume) {
            if (typeof Audio === "undefined") {
                return Promise.resolve(false);
            }

            const sound = new Audio(GameSounds.resolveSoundPath(soundPath));
            sound.volume = volume;

            const playback = sound.play();
            if (playback === undefined) {
                return Promise.resolve(true);
            }

            return playback
                .then(() => true)
                .catch(() => false);
        }

        static resolveSoundPath(soundPath) {
            if (SOUND_SCRIPT_URL === "") {
                return soundPath;
            }

            return new URL(soundPath, SOUND_SCRIPT_URL).href;
        }
    }

    if (typeof window !== "undefined") {
        window.GameSounds = GameSounds;
    }

    if (typeof module !== "undefined") {
        module.exports = {
            GameSounds,
            SOUND_FILES,
        };
    }
}());
