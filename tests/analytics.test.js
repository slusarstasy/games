const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
    GameAnalytics,
    METRIKA_TAG_BASE_URL,
    PROMOTION_LINKS,
    YANDEX_METRIKA_COUNTER_ID,
} = require("../shared/analytics.js");

class FakeScriptParent {
    constructor() {
        this.insertedNodes = [];
    }

    insertBefore(newNode, referenceNode) {
        this.insertedNodes.push({
            newNode,
            referenceNode,
        });
    }
}

class FakeDocument {
    constructor(scriptNodes) {
        this.referrer = "https://example.com/";
        this.scriptNodes = scriptNodes;
        this.createdNodes = [];
    }

    createElement(tagName) {
        const node = {
            async: false,
            src: "",
            tagName,
        };
        this.createdNodes.push(node);

        return node;
    }

    getElementsByTagName(tagName) {
        if (tagName !== "script") {
            return [];
        }

        return this.scriptNodes;
    }
}

function buildFakeDocument() {
    const scriptParent = new FakeScriptParent();
    const firstScript = {
        parentNode: scriptParent,
        src: "game.js",
    };

    return {
        documentNode: new FakeDocument([firstScript]),
        firstScript,
        scriptParent,
    };
}

function buildWindowObject() {
    return {
        location: {
            href: "https://slusarstasy.github.io/games/",
        },
    };
}

test("analytics has configured metrika counter id", () => {
    assert.equal(YANDEX_METRIKA_COUNTER_ID, "109614802");
});

test("analytics is disabled for empty metrika counter id", () => {
    const { documentNode } = buildFakeDocument();
    const windowObject = buildWindowObject();

    assert.equal(
        GameAnalytics.install(
            windowObject,
            documentNode,
            "",
        ),
        false,
    );
    assert.equal(windowObject.ym, undefined);
});

test("analytics installs yandex metrika tag for numeric counter id", () => {
    const counterId = "12345678";
    const { documentNode, firstScript, scriptParent } = buildFakeDocument();
    const windowObject = buildWindowObject();
    const metrikaTagUrl = GameAnalytics.buildMetrikaTagUrl(counterId);

    assert.equal(
        GameAnalytics.install(windowObject, documentNode, counterId),
        true,
    );

    assert.equal(scriptParent.insertedNodes.length, 1);
    assert.equal(scriptParent.insertedNodes[0].referenceNode, firstScript);
    assert.equal(scriptParent.insertedNodes[0].newNode.async, true);
    assert.equal(scriptParent.insertedNodes[0].newNode.src, metrikaTagUrl);
    assert.equal(windowObject.ym.a.length, 1);
    assert.equal(windowObject.ym.a[0][0], Number(counterId));
    assert.equal(windowObject.ym.a[0][1], "init");
    assert.deepEqual(windowObject.ym.a[0][2], {
        accurateTrackBounce: true,
        clickmap: true,
        referrer: documentNode.referrer,
        ssr: true,
        trackLinks: true,
        url: windowObject.location.href,
        webvisor: false,
    });
    assert.equal(windowObject.ym.a[0][2].webvisor, false);
});

test("analytics does not install metrika tag twice", () => {
    const counterId = "12345678";
    const metrikaTagUrl = GameAnalytics.buildMetrikaTagUrl(counterId);
    const firstScript = {
        parentNode: new FakeScriptParent(),
        src: "game.js",
    };
    const metrikaScript = {
        parentNode: new FakeScriptParent(),
        src: metrikaTagUrl,
    };
    const documentNode = new FakeDocument([firstScript, metrikaScript]);
    const windowObject = buildWindowObject();

    assert.equal(
        GameAnalytics.install(windowObject, documentNode, counterId),
        true,
    );
    assert.equal(firstScript.parentNode.insertedNodes.length, 0);
});

test("analytics builds metrika tag url with counter id", () => {
    assert.equal(
        GameAnalytics.buildMetrikaTagUrl("12345678"),
        `${METRIKA_TAG_BASE_URL}?id=12345678`,
    );
});

test("all game html pages include analytics script", () => {
    const pages = [
        "index.html",
        "equipment_info_game/index.html",
        "shadows_game/index.html",
        "puzzle_game/index.html",
        "look_at_rows_game/index.html",
        "count_puzzle_game/index.html",
    ];

    pages.forEach((page) => {
        const pagePath = path.join(__dirname, "..", page);
        const html = fs.readFileSync(pagePath, "utf8");
        assert.match(html, /shared\/analytics\.js/);
    });
});

test("promotion links keep separate utm sources", () => {
    assert.equal(
        PROMOTION_LINKS.vk,
        "https://slusarstasy.github.io/games/?utm_source=vk&utm_medium=social&utm_campaign=free_game_test",
    );
    assert.equal(
        PROMOTION_LINKS.telegram,
        "https://slusarstasy.github.io/games/?utm_source=telegram&utm_medium=group_post&utm_campaign=free_game_test",
    );
});
