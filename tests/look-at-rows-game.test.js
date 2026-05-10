const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
    ANSWER_ITEMS,
    FINAL_MESSAGE,
    LookAtRowsGame,
    PRAISE_MESSAGES,
    RETRY_MESSAGE,
    ROW_PATTERNS,
    VEHICLES,
} = require("../look_at_rows_game/game.js");

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

    values() {
        return [...this.__classes];
    }
}

class FakeNode {
    constructor(classes) {
        this.__className = classes.join(" ");
        this.attributes = new Map();
        this.children = [];
        this.classList = new FakeClassList(classes);
        this.dataset = {};
        this.disabled = false;
        this.parentNode = null;
        this.textContent = "";
    }

    get className() {
        return this.classList.values().join(" ");
    }

    set className(value) {
        const classes = value === "" ? [] : value.split(/\s+/);

        this.__className = value;
        this.classList = new FakeClassList(classes);
    }

    get firstChild() {
        return this.children.length === 0 ? null : this.children[0];
    }

    append(...nodes) {
        nodes.forEach((node) => {
            FakeNode.detach(node);
            node.parentNode = this;
            this.children.push(node);
        });
    }

    insertBefore(node, referenceNode) {
        FakeNode.detach(node);
        node.parentNode = this;

        const referenceIndex = this.children.indexOf(referenceNode);
        if (referenceIndex === -1) {
            this.children.push(node);
            return;
        }

        this.children.splice(referenceIndex, 0, node);
    }

    remove() {
        FakeNode.detach(this);
    }

    setAttribute(name, value) {
        this.attributes.set(name, value);
    }

    static detach(node) {
        if (node.parentNode === null) {
            return;
        }

        node.parentNode.children = node.parentNode.children.filter((child) => {
            return child !== node;
        });
        node.parentNode = null;
    }
}

function buildGame() {
    const game = {
        answerCards: new Map(),
        answerHomeNodes: new Map(),
        completedRows: new Set(),
        messageNode: new FakeNode([]),
        rows: ROW_PATTERNS,
        score: 0,
        scoreNode: new FakeNode([]),
        scorePanel: new FakeNode(["score"]),
        slotNodes: new Map(),
        statusPanel: new FakeNode(["status-panel"]),
    };

    ANSWER_ITEMS.forEach((vehicleId) => {
        const answerHomeNode = new FakeNode(["answer-home"]);
        const answerCard = new FakeNode(["answer-card"]);

        answerCard.dataset.vehicleId = vehicleId;
        answerHomeNode.dataset.vehicleId = vehicleId;
        answerHomeNode.append(answerCard);
        game.answerCards.set(vehicleId, answerCard);
        game.answerHomeNodes.set(vehicleId, answerHomeNode);
    });

    ROW_PATTERNS.forEach((row) => {
        const slotNode = new FakeNode(["answer-slot"]);

        slotNode.dataset.rowId = row.id;
        game.slotNodes.set(row.id, slotNode);
    });

    return game;
}

function buildConfiguredGame() {
    return new LookAtRowsGame({
        boardNode: new FakeNode([]),
        rowsNode: new FakeNode([]),
        scorePanel: new FakeNode(["score"]),
        scoreNode: new FakeNode([]),
        messageNode: new FakeNode([]),
        statusPanel: new FakeNode(["status-panel"]),
        rows: ROW_PATTERNS,
        answers: ANSWER_ITEMS,
        vehicles: VEHICLES,
    });
}

test("row patterns and answer pool match the design example", () => {
    assert.deepEqual(
        ROW_PATTERNS.map((row) => {
            return {
                answerId: row.answerId,
                pattern: row.pattern,
            };
        }),
        [
            {
                answerId: "excavator",
                pattern: [
                    "excavator",
                    "front-loader",
                    "excavator",
                    "front-loader",
                ],
            },
            {
                answerId: "tower-crane",
                pattern: ["tower-crane", "lift", "tower-crane", "lift"],
            },
            {
                answerId: "dump-truck",
                pattern: ["dump-truck", "truck", "dump-truck", "truck"],
            },
            {
                answerId: "concrete-pump",
                pattern: [
                    "concrete-pump",
                    "auto-crane",
                    "concrete-pump",
                    "auto-crane",
                ],
            },
            {
                answerId: "front-loader",
                pattern: [
                    "front-loader",
                    "asphalt-paver",
                    "front-loader",
                    "asphalt-paver",
                ],
            },
            {
                answerId: "crew-bus",
                pattern: ["crew-bus", "microbus", "crew-bus", "microbus"],
            },
        ],
    );
    assert.deepEqual(ANSWER_ITEMS, [
        "concrete-pump",
        "dump-truck",
        "front-loader",
        "crew-bus",
        "excavator",
        "tower-crane",
    ]);
});

test("look at rows image assets exist", () => {
    const gameDirectory = path.join(__dirname, "..", "look_at_rows_game");

    VEHICLES.forEach((vehicle) => {
        const imagePath = path.resolve(gameDirectory, vehicle.image);

        assert.equal(vehicle.image, vehicle.image.normalize("NFC"));
        assert.equal(fs.existsSync(imagePath), true, vehicle.image);
    });
});

test("answer card order is shuffled for a new game", () => {
    const originalRandom = Math.random;
    let game;

    Math.random = () => 0;

    try {
        game = buildConfiguredGame();
    } finally {
        Math.random = originalRandom;
    }

    assert.deepEqual(ANSWER_ITEMS, [
        "concrete-pump",
        "dump-truck",
        "front-loader",
        "crew-bus",
        "excavator",
        "tower-crane",
    ]);
    assert.deepEqual(game.answers, [
        "dump-truck",
        "front-loader",
        "crew-bus",
        "excavator",
        "tower-crane",
        "concrete-pump",
    ]);
});

test("correct answer fills a slot and awards one point", () => {
    const game = buildGame();
    const answerCard = game.answerCards.get("excavator");
    const answerHomeNode = game.answerHomeNodes.get("excavator");
    const slotNode = game.slotNodes.get("earth-row");

    assert.equal(
        LookAtRowsGame.acceptAnswer(game, "excavator", "earth-row"),
        true,
    );

    assert.equal(game.score, 1);
    assert.equal(game.scoreNode.textContent, "1");
    assert.equal(game.completedRows.has("earth-row"), true);
    assert.equal(slotNode.children[0], answerCard);
    assert.equal(answerCard.parentNode, slotNode);
    assert.equal(answerHomeNode.children.length, 0);
    assert.equal(answerCard.disabled, true);
    assert.equal(slotNode.classList.contains("is-complete"), true);
    assert.equal(answerCard.classList.contains("is-complete"), true);
    assert.equal(game.messageNode.textContent, PRAISE_MESSAGES[0]);
    assert.equal(game.statusPanel.classList.contains("is-success"), true);
});

test("wrong answer returns to its card home and shows retry message", () => {
    const game = buildGame();
    const answerCard = game.answerCards.get("dump-truck");
    const answerHomeNode = game.answerHomeNodes.get("dump-truck");
    const slotNode = game.slotNodes.get("earth-row");

    assert.equal(
        LookAtRowsGame.acceptAnswer(game, "dump-truck", "earth-row"),
        false,
    );

    assert.equal(game.score, 0);
    assert.equal(game.scoreNode.textContent, "");
    assert.equal(game.completedRows.size, 0);
    assert.equal(slotNode.children.length, 0);
    assert.equal(answerCard.parentNode, answerHomeNode);
    assert.equal(answerHomeNode.children[0], answerCard);
    assert.equal(game.messageNode.textContent, RETRY_MESSAGE);
    assert.equal(game.statusPanel.classList.contains("is-wrong"), true);
});

test("last correct answer finishes the game", () => {
    const game = buildGame();

    ROW_PATTERNS.slice(0, -1).forEach((row) => {
        game.completedRows.add(row.id);
    });
    game.score = ROW_PATTERNS.length - 1;
    LookAtRowsGame.setScoreText(game);

    assert.equal(
        LookAtRowsGame.acceptAnswer(game, "crew-bus", "buses-row"),
        true,
    );

    assert.equal(game.score, ROW_PATTERNS.length);
    assert.equal(game.scoreNode.textContent, String(ROW_PATTERNS.length));
    assert.equal(game.messageNode.textContent, FINAL_MESSAGE);
    assert.equal(game.statusPanel.classList.contains("is-finished"), true);
});

test("look at rows game is placed after puzzle in the menu", () => {
    const hubHtml = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
    const gameHrefs = [...hubHtml.matchAll(/<a class="game-card[^"]*" href="([^"]+)"/g)]
        .map((match) => match[1]);
    const puzzleIndex = gameHrefs.indexOf("puzzle_game/index.html");

    assert.equal(gameHrefs[0], "equipment_info_game/index.html");
    assert.equal(gameHrefs[puzzleIndex + 1], "look_at_rows_game/index.html");
});
