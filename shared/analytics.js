(function () {
    const YANDEX_METRIKA_COUNTER_ID = "109614802";
    const METRIKA_TAG_URL = "https://mc.yandex.ru/metrika/tag.js";
    const METRIKA_INIT_OPTIONS = {
        accurateTrackBounce: true,
        clickmap: true,
        trackLinks: true,
        webvisor: false,
    };
    const PROMOTION_LINKS = {
        telegram: "https://slusarstasy.github.io/games/?utm_source=telegram&utm_medium=group_post&utm_campaign=free_game_test",
        vk: "https://slusarstasy.github.io/games/?utm_source=vk&utm_medium=social&utm_campaign=free_game_test",
    };

    class GameAnalytics {
        static install(windowObject, documentObject, counterId) {
            if (!GameAnalytics.isCounterConfigured(counterId)) {
                return false;
            }

            GameAnalytics.createMetrikaQueue(windowObject);
            GameAnalytics.appendMetrikaTag(documentObject);
            windowObject.ym(
                Number(counterId),
                "init",
                METRIKA_INIT_OPTIONS,
            );

            return true;
        }

        static isCounterConfigured(counterId) {
            return /^[0-9]+$/.test(counterId);
        }

        static createMetrikaQueue(windowObject) {
            windowObject.ym = windowObject.ym || function () {
                windowObject.ym.a = windowObject.ym.a || [];
                windowObject.ym.a.push(arguments);
            };

            if (!windowObject.ym.l) {
                windowObject.ym.l = Number(new Date());
            }
        }

        static appendMetrikaTag(documentObject) {
            if (GameAnalytics.hasMetrikaTag(documentObject)) {
                return;
            }

            const firstScript = documentObject.getElementsByTagName("script")[0];
            const metrikaTag = documentObject.createElement("script");
            metrikaTag.async = true;
            metrikaTag.src = METRIKA_TAG_URL;
            firstScript.parentNode.insertBefore(metrikaTag, firstScript);
        }

        static hasMetrikaTag(documentObject) {
            return Array.from(documentObject.getElementsByTagName("script"))
                .some((scriptNode) => scriptNode.src === METRIKA_TAG_URL);
        }
    }

    if (typeof window !== "undefined" && typeof document !== "undefined") {
        GameAnalytics.install(
            window,
            document,
            YANDEX_METRIKA_COUNTER_ID,
        );
        window.GameAnalytics = GameAnalytics;
        window.GamePromotionLinks = PROMOTION_LINKS;
    }

    if (typeof module !== "undefined") {
        module.exports = {
            GameAnalytics,
            METRIKA_INIT_OPTIONS,
            METRIKA_TAG_URL,
            PROMOTION_LINKS,
            YANDEX_METRIKA_COUNTER_ID,
        };
    }
}());
