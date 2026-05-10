(function () {
    const SOUND_FILES = {
        error: "../data/sounds/error.wav",
        success: "../data/sounds/success.wav",
    };
    const SOUND_VOLUME = 0.32;

    class GameSounds {
        static playSuccess() {
            GameSounds.playSound(SOUND_FILES.success);
        }

        static playError() {
            GameSounds.playSound(SOUND_FILES.error);
        }

        static playSound(soundPath) {
            if (typeof Audio === "undefined") {
                return;
            }

            const sound = new Audio(soundPath);
            sound.volume = SOUND_VOLUME;
            sound.play().catch(() => {});
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
