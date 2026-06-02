(function () {
    const MENU_NAVIGATION_DELAY_MS = 180;
    const GameSounds = (() => {
        if (typeof require !== "undefined") {
            return require("./shared/game-sounds.js").GameSounds;
        }

        return window.GameSounds;
    })();

    class GamesHub {
        static bindGameChoices() {
            document.querySelectorAll(".game-card").forEach((card) => {
                card.addEventListener("click", (event) => {
                    GamesHub.handleGameChoice(event, card);
                });
            });
        }

        static handleGameChoice(event, card) {
            if (GamesHub.shouldUseNativeNavigation(event, card)) {
                return;
            }

            event.preventDefault();
            GameSounds.playMenuClick();
            GamesHub.openGameAfterClick(card.href);
        }

        static shouldUseNativeNavigation(event, card) {
            return event.defaultPrevented
                || event.button !== 0
                || event.altKey
                || event.ctrlKey
                || event.metaKey
                || event.shiftKey
                || card.target !== "";
        }

        static openGameAfterClick(gameUrl) {
            window.setTimeout(() => {
                window.location.href = gameUrl;
            }, MENU_NAVIGATION_DELAY_MS);
        }
    }

    if (typeof window !== "undefined" && typeof document !== "undefined") {
        GamesHub.bindGameChoices();
    }

    if (typeof module !== "undefined") {
        module.exports = {
            GamesHub,
            MENU_NAVIGATION_DELAY_MS,
        };
    }
}());
