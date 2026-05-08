const test = require("node:test");
const assert = require("node:assert/strict");

const {
    FINAL_MESSAGE,
    MatchingGame,
    RETRY_MESSAGE,
    START_MESSAGE,
} = require("../game.js");

class FakeClassList {
    constructor(classes) {
        this.__classes = new Set(classes);
    }

    add(className) {
        this.__classes.add(className);
    }

    remove(className) {
        this.__classes.delete(className);
    }

    contains(className) {
        return this.__classes.has(className);
    }
}

class FakeCard {
    constructor(id, classes) {
        this.dataset = { id };
        this.classList = new FakeClassList(classes);
        this.disabled = false;
    }
}

class FakeColumn {
    constructor(cards) {
        this.__cards = cards;
    }

    append(card) {
        this.__cards = this.__cards.filter((existingCard) => existingCard !== card);
        this.__cards.push(card);
    }

    querySelector(selector) {
        const id = selector.match(/data-id="([^"]+)"/)[1];
        return this.__cards.find((card) => card.dataset.id === id);
    }

    querySelectorAll(selector) {
        if (selector !== ".is-selected") {
            return [];
        }

        return this.__cards.filter((card) => card.classList.contains("is-selected"));
    }

    cardIds() {
        return this.__cards.map((card) => card.dataset.id);
    }
}

class FakeConnectionLayer {
    constructor() {
        this.lines = [];
    }

    append(line) {
        this.lines.push(line);
    }
}

class FakeLine {
    constructor() {
        this.dataset = {};
        this.attributes = new Map();
    }

    setAttribute(name, value) {
        this.attributes.set(name, value);
    }
}

function withFakeDocument(callback) {
    const originalDocument = global.document;
    global.document = {
        createElementNS() {
            return new FakeLine();
        },
    };

    try {
        callback();
    } finally {
        global.document = originalDocument;
    }
}

function buildGame() {
    const imageCards = [
        new FakeCard("1", ["is-selected"]),
        new FakeCard("2", []),
    ];
    const shadowCards = [
        new FakeCard("2", []),
        new FakeCard("1", ["is-selected"]),
    ];

    return {
        board: {
            getBoundingClientRect() {
                return {
                    left: 10,
                    top: 20,
                };
            },
        },
        connectionLayer: new FakeConnectionLayer(),
        imageColumn: new FakeColumn(imageCards),
        items: [{ id: "1" }, { id: "2" }],
        linesById: new Map(),
        matchedIds: new Set(),
        messageNode: { textContent: START_MESSAGE },
        score: 0,
        scoreNode: { textContent: "0" },
        selectedImageId: "",
        selectedShadowId: "",
        shadowColumn: new FakeColumn(shadowCards),
        statusPanel: {
            className: "status-panel",
            classList: new FakeClassList([]),
        },
    };
}

function setCardRect(card, rect) {
    card.getBoundingClientRect = () => rect;
}

test("buildAriaLabel returns labels for images and shadows", () => {
    assert.equal(MatchingGame.buildAriaLabel("image", "3"), "Картинка техники 3");
    assert.equal(MatchingGame.buildAriaLabel("shadow", "3"), "Тень техники 3");
});

test("shuffle keeps source items unchanged", () => {
    const items = [{ id: "1" }, { id: "2" }, { id: "3" }];
    const originalRandom = Math.random;
    Math.random = () => 0;

    let shuffledItems;

    try {
        shuffledItems = MatchingGame.shuffle(items);
    } finally {
        Math.random = originalRandom;
    }

    assert.deepEqual(items.map((item) => item.id), ["1", "2", "3"]);
    assert.deepEqual(shuffledItems.map((item) => item.id), ["2", "3", "1"]);
});

test("connectionPoint returns the middle point for selected side", () => {
    const boardRect = {
        left: 10,
        top: 20,
    };
    const cardRect = {
        height: 40,
        left: 30,
        right: 90,
        top: 50,
    };

    assert.deepEqual(MatchingGame.connectionPoint(boardRect, cardRect, "right"), {
        x: 80,
        y: 50,
    });
    assert.deepEqual(MatchingGame.connectionPoint(boardRect, cardRect, "left"), {
        x: 20,
        y: 50,
    });
});

test("rejectPair shows retry message and clears selected cards", () => {
    const game = buildGame();
    game.selectedImageId = "1";
    game.selectedShadowId = "2";

    MatchingGame.checkPair(game);

    assert.equal(game.messageNode.textContent, RETRY_MESSAGE);
    assert.equal(game.statusPanel.className, "status-panel");
    assert.ok(game.statusPanel.classList.contains("is-wrong"));
    assert.equal(game.selectedImageId, "");
    assert.equal(game.selectedShadowId, "");
    assert.equal(game.imageColumn.querySelectorAll(".is-selected").length, 0);
    assert.equal(game.shadowColumn.querySelectorAll(".is-selected").length, 0);
});

test("acceptPair scores, disables cards, moves pair, and draws a line", () => {
    withFakeDocument(() => {
        const game = buildGame();
        const imageCard = game.imageColumn.querySelector('[data-id="1"]');
        const shadowCard = game.shadowColumn.querySelector('[data-id="1"]');
        setCardRect(imageCard, {
            height: 20,
            left: 30,
            right: 70,
            top: 50,
        });
        setCardRect(shadowCard, {
            height: 20,
            left: 130,
            right: 170,
            top: 90,
        });
        game.selectedImageId = "1";
        game.selectedShadowId = "1";

        MatchingGame.checkPair(game);

        assert.equal(game.score, 1);
        assert.equal(game.scoreNode.textContent, "1");
        assert.ok(imageCard.disabled);
        assert.ok(shadowCard.disabled);
        assert.ok(imageCard.classList.contains("is-matched"));
        assert.ok(shadowCard.classList.contains("is-matched"));
        assert.deepEqual(game.imageColumn.cardIds(), ["2", "1"]);
        assert.deepEqual(game.shadowColumn.cardIds(), ["2", "1"]);
        assert.equal(game.connectionLayer.lines.length, 1);
        assert.equal(game.connectionLayer.lines[0].attributes.get("x1"), "60");
        assert.equal(game.connectionLayer.lines[0].attributes.get("y1"), "40");
        assert.equal(game.connectionLayer.lines[0].attributes.get("x2"), "120");
        assert.equal(game.connectionLayer.lines[0].attributes.get("y2"), "80");
    });
});

test("acceptPair shows final message after last match", () => {
    withFakeDocument(() => {
        const game = buildGame();
        const imageCard = game.imageColumn.querySelector('[data-id="1"]');
        const shadowCard = game.shadowColumn.querySelector('[data-id="1"]');
        setCardRect(imageCard, {
            height: 20,
            left: 30,
            right: 70,
            top: 50,
        });
        setCardRect(shadowCard, {
            height: 20,
            left: 130,
            right: 170,
            top: 90,
        });
        game.matchedIds.add("2");
        game.selectedImageId = "1";
        game.selectedShadowId = "1";

        MatchingGame.checkPair(game);

        assert.equal(game.messageNode.textContent, FINAL_MESSAGE);
        assert.ok(game.statusPanel.classList.contains("is-finished"));
    });
});
