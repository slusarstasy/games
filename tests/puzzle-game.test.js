const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
    FINAL_MESSAGE,
    PUZZLES,
    PuzzleGame,
} = require("../puzzle_game/game.js");

class FakeClassList {
    constructor() {
        this.__classes = new Set();
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

class FakeDragDocument {
    constructor() {
        this.body = {
            children: [],
            append: (node) => {
                this.body.children.push(node);
            },
        };
        this.listeners = new Map();
    }

    addEventListener(eventName, handler) {
        this.listeners.set(eventName, handler);
    }

    removeEventListener(eventName) {
        this.listeners.delete(eventName);
    }
}

class FakePieceNode {
    constructor() {
        this.classList = new FakeClassList();
        this.style = {};
    }

    getBoundingClientRect() {
        return {
            height: 80,
            left: 10,
            top: 20,
            width: 120,
        };
    }
}

async function withFakeWindow(callback) {
    const originalWindow = global.window;
    global.window = {
        setTimeout(handler) {
            handler();
        },
    };

    try {
        await callback();
    } finally {
        global.window = originalWindow;
    }
}

function withFakeDocument(callback) {
    const originalDocument = global.document;
    const fakeDocument = new FakeDragDocument();
    global.document = fakeDocument;

    try {
        callback(fakeDocument);
    } finally {
        global.document = originalDocument;
    }
}

test("puzzle image assets exist", () => {
    const gameDirectory = path.join(__dirname, "..", "puzzle_game");

    PUZZLES.forEach((puzzle) => {
        const imagePath = path.resolve(gameDirectory, puzzle.image);

        assert.equal(puzzle.image, puzzle.image.normalize("NFC"));
        assert.equal(fs.existsSync(imagePath), true, puzzle.image);
    });
});

test("buildPieces creates two straight vertical parts without rotations", () => {
    const pieces = PuzzleGame.buildPieces(PUZZLES[0]);

    assert.equal(pieces.length, 2);
    assert.deepEqual(pieces.map((piece) => piece.slotId), ["0-0", "0-1"]);
    assert.deepEqual(pieces.map((piece) => piece.initialRotation), [0, 0]);
    assert.equal(PuzzleGame.backgroundPosition(pieces[0]), "0% 0%");
    assert.equal(PuzzleGame.backgroundPosition(pieces[1]), "100% 0%");
});

test("buildPieces creates four straight grid parts with rotations", () => {
    const pieces = PuzzleGame.buildPieces(PUZZLES[3]);

    assert.equal(pieces.length, 4);
    assert.deepEqual(
        pieces.map((piece) => piece.slotId),
        ["0-0", "0-1", "1-0", "1-1"],
    );
    assert.deepEqual(
        pieces.map((piece) => piece.initialRotation),
        [90, 270, 180, 90],
    );
    assert.equal(PuzzleGame.backgroundPosition(pieces[3]), "100% 100%");
});

test("rotatePieceState turns a part by ninety degrees", () => {
    const pieces = PuzzleGame.buildPieces(PUZZLES[1]);
    const pieceStates = PuzzleGame.createPieceStates(pieces);
    const pieceId = pieces[0].id;

    assert.equal(pieceStates.get(pieceId).rotation, 90);
    assert.equal(PuzzleGame.rotatePieceState(pieceStates, pieceId, true), 180);
    assert.equal(PuzzleGame.nextRotation(270), 360);
    assert.equal(PuzzleGame.normalizeRotation(360), 0);
});

test("pointer drag starts from document movement", () => {
    withFakeDocument((fakeDocument) => {
        const game = {
            isTransitioning: false,
            pointerDrag: null,
            wasPointerDragging: false,
        };
        const pieceNode = new FakePieceNode();

        PuzzleGame.startPointerDrag(game, pieceNode, "piece-1", {
            button: 0,
            clientX: 20,
            clientY: 30,
            pointerId: 7,
        });

        assert.equal(fakeDocument.listeners.has("pointermove"), true);
        fakeDocument.listeners.get("pointermove")({
            clientX: 70,
            clientY: 90,
            pointerId: 7,
            preventDefault() {},
        });

        assert.equal(game.wasPointerDragging, true);
        assert.ok(pieceNode.classList.contains("is-dragging"));
        assert.equal(pieceNode.style.position, "fixed");
        assert.equal(pieceNode.style.left, "60px");
        assert.equal(pieceNode.style.top, "80px");

        PuzzleGame.removePointerDragListeners(game.pointerDrag);
        assert.equal(fakeDocument.listeners.size, 0);
    });
});

test("isPuzzleComplete requires correct slots and rotations", () => {
    const pieces = PuzzleGame.buildPieces(PUZZLES[0]);
    const pieceStates = PuzzleGame.createPieceStates(pieces);
    const slotPieces = new Map();

    PuzzleGame.placePieceState(pieceStates, slotPieces, pieces[0].id, pieces[1].slotId);
    PuzzleGame.placePieceState(pieceStates, slotPieces, pieces[1].id, pieces[0].slotId);
    assert.equal(PuzzleGame.isPuzzleComplete(pieces, pieceStates), false);

    PuzzleGame.placePieceState(pieceStates, slotPieces, pieces[0].id, pieces[0].slotId);
    PuzzleGame.placePieceState(pieceStates, slotPieces, pieces[1].id, pieces[1].slotId);
    assert.equal(PuzzleGame.isPuzzleComplete(pieces, pieceStates), true);
});

test("completeCurrentPuzzle awards one point for a solved puzzle", async () => {
    await withFakeWindow(async () => {
        const pieceNode = {
            disabled: false,
        };
        const game = {
            currentPuzzleIndex: PUZZLES.length - 1,
            isTransitioning: false,
            messageNode: {
                textContent: "",
            },
            pieceNodes: new Map([["piece-1", pieceNode]]),
            puzzles: PUZZLES,
            score: 0,
            scoreNode: {
                textContent: "0",
            },
            scorePanel: {
                classList: new FakeClassList(),
            },
            statusPanel: {
                className: "status-panel",
                classList: new FakeClassList(),
            },
            targetNode: {
                classList: new FakeClassList(),
            },
        };

        await PuzzleGame.completeCurrentPuzzle(game);

        assert.equal(game.score, 1);
        assert.equal(game.scoreNode.textContent, "1");
        assert.equal(game.messageNode.textContent, FINAL_MESSAGE);
        assert.equal(pieceNode.disabled, true);
        assert.ok(game.targetNode.classList.contains("is-complete"));
        assert.ok(game.statusPanel.classList.contains("is-finished"));
    });
});
