(function () {
    const YANDEX_METRIKA_COUNTER_ID = "109614802";
    const METRIKA_TAG_BASE_URL = "https://mc.yandex.ru/metrika/tag.js";
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
            GameAnalytics.appendMetrikaTag(documentObject, counterId);
            windowObject.ym(
                Number(counterId),
                "init",
                GameAnalytics.buildMetrikaInitOptions(windowObject, documentObject),
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

        static buildMetrikaInitOptions(windowObject, documentObject) {
            return {
                accurateTrackBounce: true,
                clickmap: true,
                referrer: documentObject.referrer,
                ssr: true,
                trackLinks: true,
                url: windowObject.location.href,
                webvisor: false,
            };
        }

        static appendMetrikaTag(documentObject, counterId) {
            const metrikaTagUrl = GameAnalytics.buildMetrikaTagUrl(counterId);

            if (GameAnalytics.hasMetrikaTag(documentObject, metrikaTagUrl)) {
                return;
            }

            const firstScript = documentObject.getElementsByTagName("script")[0];
            const metrikaTag = documentObject.createElement("script");
            metrikaTag.async = true;
            metrikaTag.src = metrikaTagUrl;
            firstScript.parentNode.insertBefore(metrikaTag, firstScript);
        }

        static buildMetrikaTagUrl(counterId) {
            return `${METRIKA_TAG_BASE_URL}?id=${counterId}`;
        }

        static hasMetrikaTag(documentObject, metrikaTagUrl) {
            return Array.from(documentObject.getElementsByTagName("script"))
                .some((scriptNode) => scriptNode.src === metrikaTagUrl);
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
            METRIKA_TAG_BASE_URL,
            PROMOTION_LINKS,
            YANDEX_METRIKA_COUNTER_ID,
        };
    }
}());
