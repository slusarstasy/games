const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { GameAnimations } = require("../shadows_game/game-animations.js");

const {
    FINAL_MESSAGE,
    MatchingGame,
    PRAISE_MESSAGES,
    RETRY_MESSAGE,
    START_MESSAGE,
    VEHICLES,
} = require("../shadows_game/game.js");

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
        this.animations = [];
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

class FakeElement {
    constructor(rect) {
        this.__rect = rect;
        this.animations = [];
        this.attributes = new Map();
        this.classList = new FakeClassList([]);
        this.className = "";
        this.dataset = {};
        this.offsetWidth = rect.width;
        this.removed = false;
        this.style = {};
        this.textContent = "";
    }

    setAttribute(name, value) {
        this.attributes.set(name, value);
    }

    getBoundingClientRect() {
        return this.__rect;
    }

    remove() {
        this.removed = true;
    }
}

class FakeBody {
    constructor() {
        this.children = [];
    }

    append(element) {
        this.children.push(element);
    }
}

class FakeDocument {
    constructor() {
        this.body = new FakeBody();
        this.createdElements = [];
    }

    createElement() {
        const element = new FakeElement({
            bottom: 0,
            height: 0,
            left: 0,
            right: 0,
            top: 0,
            width: 0,
        });
        recordPendingAnimations(element);
        this.createdElements.push(element);

        return element;
    }

    createElementNS() {
        return new FakeLine();
    }
}

async function withFakeDocument(callback) {
    const originalDocument = global.document;
    const fakeDocument = new FakeDocument();
    global.document = fakeDocument;

    try {
        await callback(fakeDocument);
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
    const scoreNode = new FakeElement({
        bottom: 46,
        height: 32,
        left: 350,
        right: 370,
        top: 14,
        width: 20,
    });
    scoreNode.textContent = "0";
    const messageNode = new FakeElement({
        bottom: 0,
        height: 0,
        left: 0,
        right: 0,
        top: 0,
        width: 0,
    });
    messageNode.textContent = START_MESSAGE;

    return {
        board: {
            classList: new FakeClassList([]),
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
        messageNode,
        praiseMessageIndex: 0,
        score: 0,
        scoreNode,
        scorePanel: new FakeElement({
            bottom: 50,
            height: 40,
            left: 300,
            right: 380,
            top: 10,
            width: 80,
        }),
        selectedImageId: "",
        selectedShadowId: "",
        shadowColumn: new FakeColumn(shadowCards),
        statusPanel: {
            className: "status-panel",
            classList: new FakeClassList([]),
        },
    };
}

async function flushPromises() {
    await Promise.resolve();
    await Promise.resolve();
}

function setCardRect(card, rect) {
    setCardRects(card, [rect]);
}

function setCardRects(card, rects) {
    let currentIndex = 0;

    card.getBoundingClientRect = () => {
        const rect = rects[currentIndex];

        if (currentIndex < rects.length - 1) {
            currentIndex += 1;
        }

        return rect;
    };
}

function recordAnimations(card) {
    card.animate = (keyframes, options) => {
        const animation = {
            finished: Promise.resolve(),
            keyframes,
            options,
        };

        card.animations.push(animation);
        return animation;
    };
}

function recordPendingAnimations(card) {
    card.animate = (keyframes, options) => {
        let finishAnimation;
        const animation = {
            finished: new Promise((resolve) => {
                finishAnimation = resolve;
            }),
            finish() {
                finishAnimation();
            },
            keyframes,
            options,
        };

        card.animations.push(animation);
        return animation;
    };
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

test("vehicle image and shadow assets exist", () => {
    const gameDirectory = path.join(__dirname, "..", "shadows_game");

    VEHICLES.forEach((vehicle) => {
        const imagePath = path.resolve(gameDirectory, vehicle.image);
        const shadowPath = path.resolve(gameDirectory, vehicle.shadow);

        assert.equal(vehicle.image, vehicle.image.normalize("NFC"));
        assert.equal(vehicle.shadow, vehicle.shadow.normalize("NFC"));
        assert.equal(path.basename(vehicle.image), path.basename(vehicle.shadow));
        assert.equal(fs.existsSync(imagePath), true, vehicle.image);
        assert.equal(fs.existsSync(shadowPath), true, vehicle.shadow);
    });
});

test("updateMessage restarts animation for feedback messages", () => {
    const game = buildGame();

    MatchingGame.updateMessage(game, "Молодец!", "is-success");
    assert.equal(game.messageNode.textContent, "Молодец!");
    assert.ok(game.messageNode.classList.contains("is-message-animated"));

    MatchingGame.updateMessage(game, "Отлично!", "is-success");
    assert.equal(game.messageNode.textContent, "Отлично!");
    assert.ok(game.messageNode.classList.contains("is-message-animated"));

    MatchingGame.updateMessage(game, RETRY_MESSAGE, "is-wrong");
    assert.ok(game.messageNode.classList.contains("is-message-animated"));

    MatchingGame.updateMessage(game, FINAL_MESSAGE, "is-finished");
    assert.ok(game.messageNode.classList.contains("is-message-animated"));

    MatchingGame.updateMessage(game, START_MESSAGE, "");
    assert.equal(
        game.messageNode.classList.contains("is-message-animated"),
        false,
    );
});

test("nextPraiseMessage uses each praise before repeating", () => {
    const game = buildGame();
    const messages = PRAISE_MESSAGES.map(() => MatchingGame.nextPraiseMessage(game));

    assert.deepEqual(messages, PRAISE_MESSAGES);
    assert.equal(MatchingGame.nextPraiseMessage(game), PRAISE_MESSAGES[0]);
});

test("acceptPair scores, disables cards, moves pair, and draws a line", async () => {
    await withFakeDocument(async () => {
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

        await MatchingGame.checkPair(game);

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

test("acceptPair starts score impulse without blocking the next choice", async () => {
    await withFakeDocument(async (fakeDocument) => {
        const originalWait = GameAnimations.wait;
        GameAnimations.wait = () => Promise.resolve();

        try {
            const game = buildGame();
            const imageCard = game.imageColumn.querySelector('[data-id="1"]');
            const shadowCard = game.shadowColumn.querySelector('[data-id="1"]');
            recordPendingAnimations(game.scorePanel);
            setCardRect(imageCard, {
                bottom: 140,
                height: 20,
                left: 30,
                right: 70,
                top: 120,
                width: 40,
            });
            setCardRect(shadowCard, {
                bottom: 140,
                height: 20,
                left: 130,
                right: 170,
                top: 120,
                width: 40,
            });
            game.selectedImageId = "1";
            game.selectedShadowId = "1";

            const matchPromise = MatchingGame.checkPair(game);
            await flushPromises();

            assert.equal(game.connectionLayer.lines.length, 1);
            assert.equal(game.score, 0);
            assert.equal(game.scoreNode.textContent, "0");
            assert.equal(game.isPairMoving, false);
            assert.equal(fakeDocument.body.children.length, 1);

            const impulse = fakeDocument.body.children[0];
            assert.equal(impulse.className, "score-impulse");
            assert.equal(impulse.style.left, "100px");
            assert.equal(impulse.style.top, "130px");
            assert.equal(impulse.animations.length, 1);

            impulse.animations[0].finish();
            await flushPromises();

            assert.equal(impulse.animations.length, 2);
            assert.equal(game.score, 0);
            assert.equal(game.scoreNode.textContent, "0");
            assert.equal(impulse.animations[1].keyframes.length, 2);
            assert.equal(impulse.animations[1].keyframes[1].left, "360px");
            assert.equal(impulse.animations[1].keyframes[1].top, "30px");

            MatchingGame.handleImageChoice(
                game,
                game.imageColumn.querySelector('[data-id="2"]'),
            );
            assert.equal(game.selectedImageId, "2");

            impulse.animations[1].finish();
            await flushPromises();

            assert.equal(impulse.removed, true);
            assert.equal(game.score, 1);
            assert.equal(game.scoreNode.textContent, "1");
            assert.ok(game.scorePanel.classList.contains("is-score-awarded"));
            assert.equal(game.scorePanel.animations.length, 1);

            game.scorePanel.animations[0].finish();
            await matchPromise;

            assert.equal(
                game.scorePanel.classList.contains("is-score-awarded"),
                false,
            );
        } finally {
            GameAnimations.wait = originalWait;
        }
    });
});

test("acceptPair scores without score animation when animate is unavailable", async () => {
    await withFakeDocument(async (fakeDocument) => {
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

        await MatchingGame.checkPair(game);

        assert.equal(fakeDocument.body.children.length, 0);
        assert.equal(game.connectionLayer.lines.length, 1);
        assert.equal(game.score, 1);
        assert.equal(game.scoreNode.textContent, "1");
    });
});

test("acceptPair animates matching cards before drawing the line", async () => {
    await withFakeDocument(async () => {
        const game = buildGame();
        const imageCard = game.imageColumn.querySelector('[data-id="1"]');
        const shadowCard = game.shadowColumn.querySelector('[data-id="1"]');
        setCardRects(imageCard, [
            {
                height: 20,
                left: 30,
                right: 70,
                top: 50,
            },
            {
                height: 20,
                left: 30,
                right: 70,
                top: 120,
            },
        ]);
        setCardRects(shadowCard, [
            {
                height: 20,
                left: 130,
                right: 170,
                top: 90,
            },
            {
                height: 20,
                left: 130,
                right: 170,
                top: 120,
            },
        ]);
        recordAnimations(imageCard);
        recordAnimations(shadowCard);
        game.selectedImageId = "1";
        game.selectedShadowId = "1";

        const matchPromise = MatchingGame.checkPair(game);

        assert.equal(game.connectionLayer.lines.length, 0);
        assert.equal(imageCard.animations.length, 1);
        assert.equal(shadowCard.animations.length, 1);
        assert.equal(imageCard.animations[0].options.duration, 1500);
        assert.match(imageCard.animations[0].keyframes[0].transform, /translate/);
        assert.match(imageCard.animations[0].keyframes[1].transform, /rotateX/);
        assert.match(imageCard.animations[0].keyframes[1].transform, /rotateY/);
        assert.ok(imageCard.classList.contains("is-moving-match"));
        assert.ok(shadowCard.classList.contains("is-moving-match"));
        assert.ok(game.board.classList.contains("is-moving-match"));

        await matchPromise;

        assert.equal(game.connectionLayer.lines.length, 1);
        assert.equal(game.connectionLayer.lines[0].attributes.get("y1"), "110");
        assert.equal(game.connectionLayer.lines[0].attributes.get("y2"), "110");
        assert.equal(imageCard.classList.contains("is-moving-match"), false);
        assert.equal(shadowCard.classList.contains("is-moving-match"), false);
        assert.equal(game.board.classList.contains("is-moving-match"), false);
    });
});

test("acceptPair shows final message after last match", async () => {
    await withFakeDocument(async () => {
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

        await MatchingGame.checkPair(game);

        assert.equal(game.messageNode.textContent, FINAL_MESSAGE);
        assert.ok(game.statusPanel.classList.contains("is-finished"));
    });
});
