const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
    FINAL_MESSAGE,
    PUZZLE_IMAGES,
    PUZZLE_LAYOUTS,
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

    createElement() {
        return new FakePlaceholder();
    }

    addEventListener(eventName, handler) {
        this.listeners.set(eventName, handler);
    }

    removeEventListener(eventName) {
        this.listeners.delete(eventName);
    }
}

class FakeParentNode {
    constructor() {
        this.children = [];
    }

    insertBefore(node) {
        node.parentNode = this;
        this.children.push(node);
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

class FakePlaceholder {
    constructor() {
        this.className = "";
        this.dataset = {};
        this.parentNode = null;
        this.removed = false;
        this.style = new FakeStyle();
    }

    remove() {
        this.removed = true;
        this.parentNode = null;
    }
}

class FakePieceNode {
    constructor() {
        this.classList = new FakeClassList();
        this.dataset = {
            pieceIndex: "0",
        };
        this.parentNode = new FakeParentNode();
        this.style = new FakeStyle();
        this.style.aspectRatio = "1 / 1";
        this.style.setProperty("--piece-tray-width", "120px");
        this.style.setProperty("--piece-tray-left", "24%");
        this.style.setProperty("--piece-tray-top", "12px");
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

    PUZZLE_IMAGES.forEach((puzzleImage) => {
        const imagePath = path.resolve(gameDirectory, puzzleImage.image);

        assert.equal(puzzleImage.image, puzzleImage.image.normalize("NFC"));
        assert.equal(fs.existsSync(imagePath), true, puzzleImage.image);
    });
});

test("buildPuzzleSequence picks shuffled images for fixed puzzle layouts", () => {
    const originalRandom = Math.random;
    const puzzleImages = [
        {
            id: "first",
            title: "Первая",
            image: "../data/images/автокран.png",
            width: 761,
            height: 607,
        },
        {
            id: "second",
            title: "Вторая",
            image: "../data/images/каток.png",
            width: 755,
            height: 578,
        },
        {
            id: "third",
            title: "Третья",
            image: "../data/images/самосвал.png",
            width: 779,
            height: 542,
        },
    ];
    const puzzleLayouts = PUZZLE_LAYOUTS.slice(0, 2);
    let puzzleSequence;

    Math.random = () => 0;

    try {
        puzzleSequence = PuzzleGame.buildPuzzleSequence(puzzleImages, puzzleLayouts);
    } finally {
        Math.random = originalRandom;
    }

    assert.deepEqual(puzzleImages.map((puzzleImage) => puzzleImage.id), [
        "first",
        "second",
        "third",
    ]);
    assert.deepEqual(puzzleSequence.map((puzzle) => puzzle.id), ["second", "third"]);
    assert.deepEqual(puzzleSequence.map((puzzle) => puzzle.rows), [1, 1]);
    assert.deepEqual(puzzleSequence.map((puzzle) => puzzle.columns), [2, 2]);
});

test("buildPieces creates two straight vertical parts without rotations", () => {
    const pieces = PuzzleGame.buildPieces(PUZZLES[0]);

    assert.equal(pieces.length, 2);
    assert.deepEqual(pieces.map((piece) => piece.slotId), ["0-0", "0-1"]);
    assert.deepEqual(pieces.map((piece) => piece.slotIndex), [0, 1]);
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

test("mixedTrayPieces does not leave pieces above matching slots", () => {
    const originalRandom = Math.random;
    const pieces = PuzzleGame.buildPieces(PUZZLES[3]);
    let mixedPieces;

    Math.random = () => 0.999;

    try {
        mixedPieces = PuzzleGame.mixedTrayPieces(pieces);
    } finally {
        Math.random = originalRandom;
    }

    assert.deepEqual(pieces.map((piece) => piece.slotIndex), [0, 1, 2, 3]);
    assert.equal(mixedPieces.length, pieces.length);
    mixedPieces.forEach((piece, index) => {
        assert.notEqual(piece.slotIndex, index);
    });
});

test("topTrayPositions keeps starting pieces in a straight top row", () => {
    const positions = PuzzleGame.topTrayPositions(4);

    assert.equal(positions.length, 4);

    positions.forEach((position) => {
        const topPx = Number.parseInt(position.top, 10);

        assert.match(position.left, /^clamp\(8px, \d+(\.\d+)?%, /);
        assert.match(position.top, /^\d+px$/);
        assert.equal(topPx, 0);
        assert.equal(Object.hasOwn(position, "right"), false);
        assert.equal(Object.hasOwn(position, "bottom"), false);
    });
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
        assert.equal(pieceNode.parentNode.children.length, 1);
        assert.equal(pieceNode.parentNode.children[0].className, "puzzle-piece-placeholder");
        assert.equal(pieceNode.parentNode.children[0].dataset.pieceIndex, "0");
        assert.equal(
            pieceNode.parentNode.children[0].style.getPropertyValue("--piece-tray-left"),
            "24%",
        );
        assert.equal(
            pieceNode.parentNode.children[0].style.getPropertyValue("--piece-tray-top"),
            "12px",
        );

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
