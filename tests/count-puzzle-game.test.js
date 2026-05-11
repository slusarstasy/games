const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
    COUNT_TASKS,
    CountPuzzleGame,
    FINAL_MESSAGE,
    PRAISE_MESSAGES,
    RETRY_MESSAGE,
} = require("../count_puzzle_game/game.js");

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

    toggle(className, force) {
        if (force) {
            this.add(className);
            return true;
        }

        this.remove(className);
        return false;
    }

    values() {
        return [...this.__classes];
    }
}

class FakeStyle {
    constructor() {
        this.__properties = new Map();
    }

    setProperty(name, value) {
        this.__properties.set(name, value);
    }

    getPropertyValue(name) {
        return this.__properties.get(name) || "";
    }
}

class FakeNode {
    constructor(classes) {
        this.attributes = new Map();
        this.children = [];
        this.classList = new FakeClassList(classes);
        this.dataset = {};
        this.disabled = false;
        this.listeners = new Map();
        this.parentNode = null;
        this.style = new FakeStyle();
        this.textContent = "";
        this.type = "";
    }

    get className() {
        return this.classList.values().join(" ");
    }

    set className(value) {
        const classes = value === "" ? [] : value.split(/\s+/);

        this.classList = new FakeClassList(classes);
    }

    get firstChild() {
        if (this.children.length === 0) {
            return null;
        }

        return this.children[0];
    }

    append(...nodes) {
        nodes.forEach((node) => {
            FakeNode.detach(node);
            node.parentNode = this;
            this.children.push(node);
        });
    }

    remove() {
        FakeNode.detach(this);
    }

    setAttribute(name, value) {
        this.attributes.set(name, value);
    }

    addEventListener(eventName, handler) {
        this.listeners.set(eventName, handler);
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

class FakeDocument {
    createElement() {
        return new FakeNode([]);
    }
}

const TEST_PUZZLE = {
    title: "Каток",
    image: "../data/images/каток.png",
    width: 755,
    height: 578,
    rows: 3,
    columns: 4,
};

function withFakeDocument(callback) {
    const originalDocument = global.document;

    global.document = new FakeDocument();

    try {
        callback();
    } finally {
        global.document = originalDocument;
    }
}

function withFakeWindow(callback) {
    const originalWindow = global.window;
    const intervals = new Map();
    let nextIntervalId = 1;

    global.window = {
        setTimeout(handler) {
            handler();
        },
        setInterval(handler) {
            const intervalId = nextIntervalId;

            nextIntervalId += 1;
            intervals.set(intervalId, handler);

            return intervalId;
        },
        clearInterval(intervalId) {
            intervals.delete(intervalId);
        },
    };

    try {
        callback(intervals);
    } finally {
        global.window = originalWindow;
    }
}

function withFakeRandom(values, callback) {
    const originalRandom = Math.random;
    let index = 0;

    Math.random = () => {
        const value = values[index];

        index += 1;
        return value;
    };

    try {
        callback();
    } finally {
        Math.random = originalRandom;
    }
}

function buildConfiguredGame(tasks) {
    return new CountPuzzleGame({
        taskGridNode: new FakeNode([]),
        answerGridNode: new FakeNode([]),
        scorePanel: new FakeNode(["score"]),
        scoreNode: new FakeNode([]),
        timerNode: new FakeNode([]),
        messageNode: new FakeNode([]),
        statusPanel: new FakeNode(["status-panel"]),
        puzzle: TEST_PUZZLE,
        tasks,
    });
}

function buildStartedGame() {
    const game = buildConfiguredGame(COUNT_TASKS);

    withFakeDocument(() => {
        game.start();
    });

    return game;
}

test("count tasks match the printed design example", () => {
    assert.deepEqual(
        COUNT_TASKS.map((task) => {
            return CountPuzzleGame.expression(task);
        }),
        [
            "7 + 3",
            "5 + 3",
            "6 - 1",
            "3 - 2",
            "6 + 2",
            "2 + 3",
            "5 - 2",
            "7 + 2",
            "10 - 5",
            "8 + 2",
            "4 + 3",
            "5 - 1",
        ],
    );
    assert.deepEqual(
        COUNT_TASKS.map((task) => {
            return task.answer;
        }),
        [10, 8, 5, 1, 8, 5, 3, 9, 5, 10, 7, 4],
    );
    COUNT_TASKS.forEach((task) => {
        assert.equal(task.answer, CountPuzzleGame.calculateAnswer(task));
    });
});

test("count puzzle image asset exists", () => {
    const imagePath = path.resolve(
        __dirname,
        "..",
        "count_puzzle_game",
        TEST_PUZZLE.image,
    );

    assert.equal(TEST_PUZZLE.image, TEST_PUZZLE.image.normalize("NFC"));
    assert.equal(fs.existsSync(imagePath), true, TEST_PUZZLE.image);
});

test("tasks and answer tiles are shuffled independently", () => {
    const tasks = COUNT_TASKS.slice(0, 4);
    let game;

    withFakeRandom([0, 0, 0, 0.999, 0.999, 0.999], () => {
        game = buildConfiguredGame(tasks);
    });

    assert.deepEqual(
        tasks.map((task) => {
            return task.id;
        }),
        ["task-1", "task-2", "task-3", "task-4"],
    );
    assert.deepEqual(
        game.tasks.map((task) => {
            return task.id;
        }),
        ["task-2", "task-3", "task-4", "task-1"],
    );
    assert.deepEqual(
        game.answerTiles.map((tile) => {
            return tile.taskId;
        }),
        ["task-1", "task-2", "task-3", "task-4"],
    );
});

test("timer waits for the first answer and formats elapsed time", () => {
    withFakeWindow((intervals) => {
        let game;

        withFakeRandom(new Array(22).fill(0.999), () => {
            game = buildStartedGame();
        });

        assert.equal(game.elapsedSeconds, 0);
        assert.equal(game.timerNode.textContent, "00:00");
        assert.equal(game.timerId, 0);
        assert.equal(intervals.size, 0);

        const wrongTile = game.answerTiles.find((tile) => {
            return tile.answer !== CountPuzzleGame.activeTask(game).answer;
        });

        assert.equal(CountPuzzleGame.handleAnswerClick(game, wrongTile.id), false);
        assert.notEqual(game.timerId, 0);
        assert.equal(intervals.size, 1);

        intervals.get(game.timerId)();
        assert.equal(game.elapsedSeconds, 1);
        assert.equal(game.timerNode.textContent, "00:01");

        game.elapsedSeconds = 65;
        CountPuzzleGame.setTimerText(game);
        assert.equal(game.timerNode.textContent, "01:05");
    });
});

test("correct answer reveals a tile, awards score, and advances active task", () => {
    withFakeWindow(() => {
        let game;

        withFakeRandom(new Array(22).fill(0.999), () => {
            game = buildStartedGame();
        });

        const activeTask = CountPuzzleGame.activeTask(game);
        const answerTile = game.answerTiles.find((tile) => {
            return tile.answer === activeTask.answer;
        });
        const answerTileNode = game.answerTileNodes.get(answerTile.id);
        const activeTaskNode = game.taskNodes.get(activeTask.id);

        assert.equal(CountPuzzleGame.handleAnswerClick(game, answerTile.id), true);

        assert.equal(game.score, 1);
        assert.equal(game.scoreNode.textContent, "1");
        assert.equal(game.completedTaskIds.has(activeTask.id), true);
        assert.equal(game.revealedTileIds.has(answerTile.id), true);
        assert.equal(answerTileNode.disabled, true);
        assert.equal(answerTileNode.classList.contains("is-revealed"), true);
        assert.equal(activeTaskNode.classList.contains("is-complete"), true);
        assert.equal(activeTaskNode.classList.contains("is-active"), false);
        assert.equal(game.activeTaskId, COUNT_TASKS[1].id);
        assert.equal(game.messageNode.textContent, PRAISE_MESSAGES[0]);
        assert.equal(game.statusPanel.classList.contains("is-success"), true);
    });
});

test("duplicate answer accepts any unrevealed tile with the active result", () => {
    withFakeWindow(() => {
        let game;

        withFakeRandom(new Array(22).fill(0.999), () => {
            game = buildStartedGame();
        });

        game.activeTaskId = "task-3";
        CountPuzzleGame.updateTaskStates(game);

        const duplicateTile = game.answerTiles.find((tile) => {
            return tile.answer === 5 && tile.taskId !== "task-3";
        });

        assert.equal(CountPuzzleGame.handleAnswerClick(game, duplicateTile.id), true);
        assert.equal(game.completedTaskIds.has("task-3"), true);
        assert.equal(game.revealedTileIds.has(duplicateTile.id), true);
        assert.equal(
            game.answerTileNodes.get(duplicateTile.id).classList.contains("is-revealed"),
            true,
        );
    });
});

test("wrong answer keeps active task and shows retry message", () => {
    withFakeWindow(() => {
        let game;

        withFakeRandom(new Array(22).fill(0.999), () => {
            game = buildStartedGame();
        });

        const activeTaskId = game.activeTaskId;
        const wrongTile = game.answerTiles.find((tile) => {
            return tile.answer !== CountPuzzleGame.activeTask(game).answer;
        });

        assert.equal(CountPuzzleGame.handleAnswerClick(game, wrongTile.id), false);

        assert.equal(game.score, 0);
        assert.equal(game.scoreNode.textContent, "0");
        assert.equal(game.activeTaskId, activeTaskId);
        assert.equal(game.revealedTileIds.size, 0);
        assert.equal(game.completedTaskIds.size, 0);
        assert.equal(game.messageNode.textContent, RETRY_MESSAGE);
        assert.equal(game.statusPanel.classList.contains("is-wrong"), true);
    });
});

test("last correct answer finishes the game and reveals the whole puzzle", () => {
    withFakeWindow((intervals) => {
        let game;

        withFakeRandom(new Array(22).fill(0.999), () => {
            game = buildStartedGame();
        });

        COUNT_TASKS.slice(0, -1).forEach((task) => {
            game.completedTaskIds.add(task.id);
        });
        game.score = COUNT_TASKS.length - 1;
        game.activeTaskId = COUNT_TASKS[COUNT_TASKS.length - 1].id;
        CountPuzzleGame.setScoreText(game);
        CountPuzzleGame.updateTaskStates(game);

        const finalTile = game.answerTiles.find((tile) => {
            return tile.answer === COUNT_TASKS[COUNT_TASKS.length - 1].answer;
        });

        assert.equal(CountPuzzleGame.handleAnswerClick(game, finalTile.id), true);

        assert.equal(game.isComplete, true);
        assert.equal(game.score, COUNT_TASKS.length);
        assert.equal(game.scoreNode.textContent, String(COUNT_TASKS.length));
        assert.equal(game.activeTaskId, "");
        assert.equal(game.timerId, 0);
        assert.equal(intervals.size, 0);
        assert.equal(game.messageNode.textContent, FINAL_MESSAGE);
        assert.equal(game.statusPanel.classList.contains("is-finished"), true);
        game.answerTiles.forEach((tile) => {
            const tileNode = game.answerTileNodes.get(tile.id);

            assert.equal(game.revealedTileIds.has(tile.id), true);
            assert.equal(tileNode.disabled, true);
            assert.equal(tileNode.classList.contains("is-revealed"), true);
        });
    });
});

test("count puzzle game is placed last in the menu", () => {
    const hubHtml = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
    const gameHrefs = [...hubHtml.matchAll(/<a class="game-card[^"]*" href="([^"]+)"/g)]
        .map((match) => {
            return match[1];
        });

    assert.equal(gameHrefs.at(-1), "count_puzzle_game/index.html");
});
