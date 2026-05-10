const NEXT_PUZZLE_DELAY_MS = 1200;
const POINTER_DRAG_THRESHOLD = 8;
const SCORE_FLASH_ANIMATION_DURATION_MS = 120;
const SCORE_FLIGHT_ANIMATION_DURATION_MS = 760;
const SCORE_AWARD_ANIMATION_EASING = "cubic-bezier(0.2, 0.86, 0.32, 1)";
const TRAY_EDGE_GAP_PX = 8;
const TRAY_TOP_OFFSET_PX = 0;
const TRAY_PIECE_HEIGHT_PX = 124;
const TRAY_PIECE_MIN_WIDTH_PX = 44;
const TRAY_PIECE_MAX_WIDTH_PX = 172;
const START_MESSAGE = "Перетащи части в рамку. Клик по части поворачивает ее";
const FINAL_MESSAGE = "Все пазлы собраны! Отличная работа!";
const PRAISE_MESSAGES = [
    "Отлично!",
    "Получилось!",
    "Верно!",
    "Здорово!",
    "Молодец!",
    "Супер!",
];
const GameSounds = (() => {
    if (typeof require !== "undefined") {
        return require("../shared/game-sounds.js").GameSounds;
    }

    return window.GameSounds;
})();

const PUZZLE_IMAGES = [
    {
        id: "tower-crane",
        title: "Башенный кран",
        image: "../data/images/башенный_кран.png",
        width: 568,
        height: 742,
    },
    {
        id: "auto-crane",
        title: "Автокран",
        image: "../data/images/автокран.png",
        width: 761,
        height: 607,
    },
    {
        id: "lift",
        title: "Подъёмник",
        image: "../data/images/подъёмник.png",
        width: 475,
        height: 703,
    },
    {
        id: "concrete-pump",
        title: "Бетононасос",
        image: "../data/images/бетононасос.png",
        width: 646,
        height: 708,
    },
    {
        id: "concrete-mixer",
        title: "Бетономешалка",
        image: "../data/images/бетономешалка.png",
        width: 756,
        height: 520,
    },
    {
        id: "roller",
        title: "Каток",
        image: "../data/images/каток.png",
        width: 755,
        height: 578,
    },
    {
        id: "front-loader",
        title: "Фронтальный погрузчик",
        image: "../data/images/фронтальный_погрузчик.png",
        width: 747,
        height: 528,
    },
    {
        id: "excavator",
        title: "Экскаватор",
        image: "../data/images/экскаватор.png",
        width: 744,
        height: 654,
    },
    {
        id: "asphalt-paver",
        title: "Асфальтоукладчик",
        image: "../data/images/асфальтоукладчик.png",
        width: 730,
        height: 590,
    },
    {
        id: "shift-bus",
        title: "Вахтовый автобус",
        image: "../data/images/вахтовый_автобус.png",
        width: 761,
        height: 451,
    },
    {
        id: "dump-truck",
        title: "Самосвал",
        image: "../data/images/самосвал.png",
        width: 779,
        height: 542,
    },
    {
        id: "bulldozer",
        title: "Бульдозер",
        image: "../data/images/бульдозер.png",
        width: 750,
        height: 532,
    },
    {
        id: "microbus",
        title: "Микроавтобус",
        image: "../data/images/микроавтобус.png",
        width: 742,
        height: 460,
    },
    {
        id: "truck",
        title: "Грузовик",
        image: "../data/images/грузовик.png",
        width: 754,
        height: 483,
    },
    {
        id: "mortar-pump",
        title: "Растворонасос",
        image: "../data/images/растворонасос.png",
        width: 740,
        height: 455,
    },
];

const PUZZLE_LAYOUTS = [
    {
        rows: 1,
        columns: 2,
        rotationsEnabled: false,
    },
    {
        rows: 1,
        columns: 2,
        rotationsEnabled: true,
    },
    {
        rows: 2,
        columns: 1,
        rotationsEnabled: true,
    },
    {
        rows: 2,
        columns: 2,
        rotationsEnabled: true,
    },
    {
        rows: 2,
        columns: 2,
        rotationsEnabled: true,
    },
    {
        rows: 2,
        columns: 2,
        rotationsEnabled: true,
    },
];

const PUZZLES = buildPuzzleDefinitions(PUZZLE_IMAGES, PUZZLE_LAYOUTS);

function buildPuzzleDefinitions(puzzleImages, puzzleLayouts) {
    return puzzleLayouts.map((layout, index) => {
        const puzzleImage = puzzleImages[index];

        return {
            id: puzzleImage.id,
            title: puzzleImage.title,
            image: puzzleImage.image,
            width: puzzleImage.width,
            height: puzzleImage.height,
            rows: layout.rows,
            columns: layout.columns,
            rotationsEnabled: layout.rotationsEnabled,
        };
    });
}

class PuzzleGame {
    constructor(config) {
        this.targetNode = config.targetNode;
        this.trayNode = config.trayNode;
        this.scorePanel = config.scorePanel;
        this.scoreNode = config.scoreNode;
        this.messageNode = config.messageNode;
        this.statusPanel = config.statusPanel;
        this.puzzleTitleNode = config.puzzleTitleNode;
        this.progressNode = config.progressNode;
        this.puzzles = PuzzleGame.buildPuzzleSequence(
            config.puzzleImages,
            config.puzzleLayouts,
        );
        this.currentPuzzleIndex = 0;
        this.score = 0;
        this.pieces = [];
        this.pieceStates = new Map();
        this.slotPieces = new Map();
        this.pieceNodes = new Map();
        this.pointerDrag = null;
        this.wasPointerDragging = false;
        this.isTransitioning = false;
    }

    start() {
        PuzzleGame.setScoreText(this);
        PuzzleGame.renderCurrentPuzzle(this);
    }

    static renderCurrentPuzzle(game) {
        const puzzle = PuzzleGame.currentPuzzle(game);
        game.pieces = PuzzleGame.buildPieces(puzzle);
        game.pieceStates = PuzzleGame.createPieceStates(game.pieces);
        game.slotPieces = new Map();
        game.pieceNodes = new Map();
        game.isTransitioning = false;

        PuzzleGame.clearNode(game.targetNode);
        PuzzleGame.clearNode(game.trayNode);
        game.targetNode.classList.remove("is-complete");
        PuzzleGame.updatePuzzleHeader(game, puzzle);
        PuzzleGame.updateMessage(game, START_MESSAGE, "");
        PuzzleGame.renderSlots(game, puzzle);
        PuzzleGame.updateTrayLayout(game, puzzle);
        PuzzleGame.renderPieces(game, puzzle);
    }

    static currentPuzzle(game) {
        return game.puzzles[game.currentPuzzleIndex];
    }

    static buildPuzzleSequence(puzzleImages, puzzleLayouts) {
        const shuffledImages = PuzzleGame.shuffle(puzzleImages).slice(
            0,
            puzzleLayouts.length,
        );

        return buildPuzzleDefinitions(shuffledImages, puzzleLayouts);
    }

    static shuffle(items) {
        const shuffledItems = [...items];

        for (let index = shuffledItems.length - 1; index > 0; index -= 1) {
            const targetIndex = Math.floor(Math.random() * (index + 1));
            const currentItem = shuffledItems[index];
            shuffledItems[index] = shuffledItems[targetIndex];
            shuffledItems[targetIndex] = currentItem;
        }

        return shuffledItems;
    }

    static buildPieces(puzzle) {
        const pieces = [];

        for (let row = 0; row < puzzle.rows; row += 1) {
            for (let column = 0; column < puzzle.columns; column += 1) {
                const index = pieces.length;
                const slotId = PuzzleGame.buildSlotId(row, column);
                const initialRotation = puzzle.rotationsEnabled
                    ? PuzzleGame.initialRotation(index)
                    : 0;

                pieces.push({
                    id: `${puzzle.id}-${slotId}`,
                    puzzleId: puzzle.id,
                    slotIndex: index,
                    title: puzzle.title,
                    image: puzzle.image,
                    width: puzzle.width,
                    height: puzzle.height,
                    rows: puzzle.rows,
                    columns: puzzle.columns,
                    row,
                    column,
                    slotId,
                    initialRotation,
                    correctRotation: 0,
                });
            }
        }

        return pieces;
    }

    static buildSlotId(row, column) {
        return `${row}-${column}`;
    }

    static initialRotation(index) {
        const rotations = [90, 270, 180, 90];

        return rotations[index % rotations.length];
    }

    static createPieceStates(pieces) {
        const pieceStates = new Map();

        pieces.forEach((piece) => {
            pieceStates.set(piece.id, {
                pieceId: piece.id,
                rotation: piece.initialRotation,
                slotId: "",
            });
        });

        return pieceStates;
    }

    static placePieceState(pieceStates, slotPieces, pieceId, slotId) {
        const pieceState = pieceStates.get(pieceId);
        const previousSlotId = pieceState.slotId;

        if (previousSlotId !== "") {
            slotPieces.delete(previousSlotId);
        }

        const replacedPieceId = slotPieces.get(slotId) || "";

        if (replacedPieceId !== "") {
            pieceStates.get(replacedPieceId).slotId = "";
        }

        pieceState.slotId = slotId;
        slotPieces.set(slotId, pieceId);

        return replacedPieceId;
    }

    static returnPieceStateToTray(pieceStates, slotPieces, pieceId) {
        const pieceState = pieceStates.get(pieceId);

        if (pieceState.slotId !== "") {
            slotPieces.delete(pieceState.slotId);
        }

        pieceState.slotId = "";
    }

    static rotatePieceState(pieceStates, pieceId, rotationsEnabled) {
        const pieceState = pieceStates.get(pieceId);

        if (!rotationsEnabled) {
            return pieceState.rotation;
        }

        pieceState.rotation = PuzzleGame.nextRotation(pieceState.rotation);

        return pieceState.rotation;
    }

    static nextRotation(rotation) {
        return rotation + 90;
    }

    static normalizeRotation(rotation) {
        return ((rotation % 360) + 360) % 360;
    }

    static isPuzzleComplete(pieces, pieceStates) {
        return pieces.every((piece) => PuzzleGame.isPieceCorrect(piece, pieceStates));
    }

    static isPieceCorrect(piece, pieceStates) {
        const pieceState = pieceStates.get(piece.id);

        return pieceState.slotId === piece.slotId
            && PuzzleGame.normalizeRotation(pieceState.rotation) === piece.correctRotation;
    }

    static renderSlots(game, puzzle) {
        game.targetNode.style.aspectRatio = `${puzzle.width} / ${puzzle.height}`;
        game.targetNode.style.gridTemplateColumns = `repeat(${puzzle.columns}, 1fr)`;
        game.targetNode.style.gridTemplateRows = `repeat(${puzzle.rows}, 1fr)`;
        game.targetNode.dataset.parts = String(puzzle.rows * puzzle.columns);

        for (let row = 0; row < puzzle.rows; row += 1) {
            for (let column = 0; column < puzzle.columns; column += 1) {
                const slot = document.createElement("div");
                slot.className = "puzzle-slot";
                slot.dataset.slotId = PuzzleGame.buildSlotId(row, column);
                slot.dataset.row = String(row);
                slot.dataset.column = String(column);

                if (column > 0) {
                    slot.classList.add("has-left-divider");
                }

                if (row > 0) {
                    slot.classList.add("has-top-divider");
                }

                slot.setAttribute("aria-label", `Место ${row + 1}-${column + 1}`);
                game.targetNode.append(slot);
            }
        }
    }

    static renderPieces(game, puzzle) {
        const pieces = PuzzleGame.mixedTrayPieces(game.pieces);
        const trayPositions = PuzzleGame.topTrayPositions(pieces.length);

        pieces.forEach((piece, index) => {
            const pieceNode = PuzzleGame.createPieceNode(game, puzzle, piece);
            pieceNode.dataset.pieceIndex = String(index);
            PuzzleGame.applyTrayPosition(pieceNode, trayPositions[index]);
            game.pieceNodes.set(piece.id, pieceNode);
            game.trayNode.append(pieceNode);
        });
    }

    static mixedTrayPieces(pieces) {
        const shuffledPieces = PuzzleGame.shuffle(pieces);

        if (PuzzleGame.hasNoMatchingTraySlots(shuffledPieces)) {
            return shuffledPieces;
        }

        return PuzzleGame.rotatePieces(
            pieces,
            PuzzleGame.randomTrayOffset(pieces.length),
        );
    }

    static hasNoMatchingTraySlots(pieces) {
        return pieces.every((piece, index) => piece.slotIndex !== index);
    }

    static rotatePieces(pieces, offset) {
        if (pieces.length === 0) {
            return [];
        }

        return pieces.map((piece, index) => {
            const sourceIndex = (index + offset) % pieces.length;

            return pieces[sourceIndex];
        });
    }

    static randomTrayOffset(pieceCount) {
        if (pieceCount < 2) {
            return 0;
        }

        return 1 + Math.floor(Math.random() * (pieceCount - 1));
    }

    static updateTrayLayout(game, puzzle) {
        game.trayNode.dataset.parts = String(puzzle.rows * puzzle.columns);
    }

    static topTrayPositions(pieceCount) {
        const traySlots = PuzzleGame.topTraySlots(pieceCount);

        return traySlots.map((traySlot) => {
            return {
                left: PuzzleGame.trayLeftStyleValue(traySlot.leftPercent),
                top: `${traySlot.topPx}px`,
            };
        });
    }

    static topTraySlots(pieceCount) {
        const traySlots = [];
        const leftStep = 100 / (pieceCount + 1);

        for (let index = 0; index < pieceCount; index += 1) {
            traySlots.push({
                leftPercent: leftStep * (index + 1),
                topPx: TRAY_TOP_OFFSET_PX,
            });
        }

        return traySlots;
    }

    static trayLeftStyleValue(leftPercent) {
        const clampedLeftPercent = Math.min(84, Math.max(4, leftPercent));
        const formattedLeftPercent = Number(clampedLeftPercent.toFixed(2));

        return `clamp(${TRAY_EDGE_GAP_PX}px, ${formattedLeftPercent}%, `
            + "calc(100% - min(var(--piece-tray-width), "
            + "var(--piece-tray-width-limit)) - "
            + `${TRAY_EDGE_GAP_PX}px))`;
    }

    static applyTrayPosition(pieceNode, trayPosition) {
        pieceNode.style.setProperty("--piece-tray-left", trayPosition.left);
        pieceNode.style.setProperty("--piece-tray-top", trayPosition.top);
    }

    static createPieceNode(game, puzzle, piece) {
        const pieceNode = document.createElement("button");
        pieceNode.className = "puzzle-piece";
        pieceNode.type = "button";
        pieceNode.dataset.pieceId = piece.id;
        pieceNode.style.aspectRatio = PuzzleGame.pieceAspectRatio(piece);
        pieceNode.style.backgroundImage = `url("${piece.image}")`;
        pieceNode.style.backgroundSize = `${piece.columns * 100}% ${piece.rows * 100}%`;
        pieceNode.style.backgroundPosition = PuzzleGame.backgroundPosition(piece);
        pieceNode.style.setProperty(
            "--piece-tray-width",
            `${PuzzleGame.trayPieceWidth(piece)}px`,
        );
        pieceNode.setAttribute(
            "aria-label",
            `Часть пазла: ${piece.title}, место ${piece.row + 1}-${piece.column + 1}`,
        );

        PuzzleGame.updatePieceNode(game, pieceNode, piece.id);
        pieceNode.addEventListener("click", (event) => {
            PuzzleGame.handlePieceClick(game, piece.id, event);
        });
        pieceNode.addEventListener("pointerdown", (event) => {
            PuzzleGame.startPointerDrag(game, pieceNode, piece.id, event);
        });

        return pieceNode;
    }

    static pieceAspectRatio(piece) {
        const pieceWidth = piece.width / piece.columns;
        const pieceHeight = piece.height / piece.rows;

        return `${pieceWidth} / ${pieceHeight}`;
    }

    static backgroundPosition(piece) {
        const x = PuzzleGame.backgroundPercent(piece.column, piece.columns);
        const y = PuzzleGame.backgroundPercent(piece.row, piece.rows);

        return `${x}% ${y}%`;
    }

    static backgroundPercent(index, count) {
        if (count === 1) {
            return 0;
        }

        return (index / (count - 1)) * 100;
    }

    static trayPieceWidth(piece) {
        const pieceWidth = piece.width / piece.columns;
        const pieceHeight = piece.height / piece.rows;
        const aspectRatio = pieceWidth / pieceHeight;
        const width = aspectRatio * TRAY_PIECE_HEIGHT_PX;

        return Math.round(Math.min(
            TRAY_PIECE_MAX_WIDTH_PX,
            Math.max(TRAY_PIECE_MIN_WIDTH_PX, width),
        ));
    }

    static handlePieceClick(game, pieceId, event) {
        if (game.wasPointerDragging) {
            event.preventDefault();
            return;
        }

        if (game.isTransitioning) {
            return;
        }

        const puzzle = PuzzleGame.currentPuzzle(game);
        PuzzleGame.rotatePieceState(game.pieceStates, pieceId, puzzle.rotationsEnabled);
        PuzzleGame.updatePieceNode(game, game.pieceNodes.get(pieceId), pieceId);
        PuzzleGame.playRotationSound(game, pieceId);
        PuzzleGame.checkCurrentPuzzle(game);
    }

    static playRotationSound(game, pieceId) {
        const pieceState = game.pieceStates.get(pieceId);

        if (pieceState.slotId === "") {
            return;
        }

        PuzzleGame.playPlacementSound(game, pieceId);
    }

    static startPointerDrag(game, pieceNode, pieceId, event) {
        if (game.isTransitioning || event.button > 0) {
            return;
        }

        const rect = pieceNode.getBoundingClientRect();
        const moveHandler = (moveEvent) => {
            PuzzleGame.movePointerDrag(game, moveEvent);
        };
        const finishHandler = (finishEvent) => {
            PuzzleGame.finishPointerDrag(game, finishEvent, true);
        };
        const cancelHandler = (cancelEvent) => {
            PuzzleGame.finishPointerDrag(game, cancelEvent, false);
        };

        game.pointerDrag = {
            pieceNode,
            pieceId,
            pointerId: event.pointerId,
            moveHandler,
            finishHandler,
            cancelHandler,
            placeholder: PuzzleGame.createPiecePlaceholder(pieceNode),
            startX: event.clientX,
            startY: event.clientY,
            offsetX: event.clientX - rect.left,
            offsetY: event.clientY - rect.top,
            width: rect.width,
            height: rect.height,
            hasMoved: false,
        };
        document.addEventListener("pointermove", moveHandler);
        document.addEventListener("pointerup", finishHandler);
        document.addEventListener("pointercancel", cancelHandler);
    }

    static movePointerDrag(game, event) {
        const drag = game.pointerDrag;

        if (drag === null || drag.pointerId !== event.pointerId) {
            return;
        }

        const deltaX = event.clientX - drag.startX;
        const deltaY = event.clientY - drag.startY;
        const distance = Math.hypot(deltaX, deltaY);

        if (!drag.hasMoved && distance < POINTER_DRAG_THRESHOLD) {
            return;
        }

        if (!drag.hasMoved) {
            drag.hasMoved = true;
            game.wasPointerDragging = true;
            PuzzleGame.prepareDraggedPiece(drag);
        }

        event.preventDefault();
        PuzzleGame.positionDraggedPiece(drag, event.clientX, event.clientY);
    }

    static prepareDraggedPiece(drag) {
        drag.pieceNode.classList.add("is-dragging");
        drag.pieceNode.style.width = `${drag.width}px`;
        drag.pieceNode.style.height = `${drag.height}px`;
        drag.pieceNode.style.position = "fixed";
        drag.pieceNode.style.zIndex = "30";
        drag.pieceNode.style.pointerEvents = "none";
        PuzzleGame.placeDragPlaceholder(drag);
        document.body.append(drag.pieceNode);
    }

    static createPiecePlaceholder(pieceNode) {
        const placeholder = document.createElement("span");
        placeholder.className = "puzzle-piece-placeholder";
        placeholder.dataset.pieceIndex = pieceNode.dataset.pieceIndex;
        placeholder.style.aspectRatio = pieceNode.style.aspectRatio;
        PuzzleGame.copyStyleProperty(
            pieceNode,
            placeholder,
            "--piece-tray-width",
        );
        PuzzleGame.copyStyleProperty(
            pieceNode,
            placeholder,
            "--piece-tray-left",
        );
        PuzzleGame.copyStyleProperty(
            pieceNode,
            placeholder,
            "--piece-tray-top",
        );

        return placeholder;
    }

    static copyStyleProperty(sourceNode, targetNode, propertyName) {
        if (typeof sourceNode.style.getPropertyValue !== "function") {
            return;
        }

        targetNode.style.setProperty(
            propertyName,
            sourceNode.style.getPropertyValue(propertyName),
        );
    }

    static placeDragPlaceholder(drag) {
        const parentNode = drag.pieceNode.parentNode;

        if (parentNode === undefined || parentNode === null) {
            return;
        }

        parentNode.insertBefore(drag.placeholder, drag.pieceNode);
    }

    static positionDraggedPiece(drag, clientX, clientY) {
        drag.pieceNode.style.left = `${clientX - drag.offsetX}px`;
        drag.pieceNode.style.top = `${clientY - drag.offsetY}px`;
    }

    static finishPointerDrag(game, event, shouldDrop) {
        const drag = game.pointerDrag;

        if (drag === null || drag.pointerId !== event.pointerId) {
            return;
        }

        game.pointerDrag = null;
        PuzzleGame.removePointerDragListeners(drag);

        if (!drag.hasMoved) {
            return;
        }

        const slot = shouldDrop
            ? PuzzleGame.findDropSlot(event.clientX, event.clientY)
            : null;

        PuzzleGame.clearDraggedPieceStyles(drag.pieceNode);

        if (slot === null) {
            PuzzleGame.returnPieceToTray(game, drag.pieceId, drag.placeholder);
        } else {
            PuzzleGame.placePieceInSlot(game, drag.pieceId, slot.dataset.slotId);
            PuzzleGame.removePiecePlaceholder(drag.placeholder);
        }

        PuzzleGame.defer(() => {
            game.wasPointerDragging = false;
        }, 0);
    }

    static removePointerDragListeners(drag) {
        document.removeEventListener("pointermove", drag.moveHandler);
        document.removeEventListener("pointerup", drag.finishHandler);
        document.removeEventListener("pointercancel", drag.cancelHandler);
    }

    static findDropSlot(clientX, clientY) {
        const target = document.elementFromPoint(clientX, clientY);

        if (target === null) {
            return null;
        }

        return target.closest(".puzzle-slot");
    }

    static clearDraggedPieceStyles(pieceNode) {
        pieceNode.classList.remove("is-dragging");
        pieceNode.style.width = "";
        pieceNode.style.height = "";
        pieceNode.style.left = "";
        pieceNode.style.top = "";
        pieceNode.style.position = "";
        pieceNode.style.zIndex = "";
        pieceNode.style.pointerEvents = "";
    }

    static placePieceInSlot(game, pieceId, slotId) {
        const replacedPieceId = PuzzleGame.placePieceState(
            game.pieceStates,
            game.slotPieces,
            pieceId,
            slotId,
        );
        const slotNode = game.targetNode.querySelector(`[data-slot-id="${slotId}"]`);

        if (replacedPieceId !== "") {
            const replacedNode = game.pieceNodes.get(replacedPieceId);
            game.trayNode.append(replacedNode);
            PuzzleGame.updatePieceNode(game, replacedNode, replacedPieceId);
        }

        slotNode.append(game.pieceNodes.get(pieceId));
        PuzzleGame.updatePieceNode(game, game.pieceNodes.get(pieceId), pieceId);
        PuzzleGame.playPlacementSound(game, pieceId);
        PuzzleGame.updateSlotStates(game);
        PuzzleGame.checkCurrentPuzzle(game);
    }

    static playPlacementSound(game, pieceId) {
        const piece = game.pieces.find((currentPiece) => currentPiece.id === pieceId);

        if (PuzzleGame.isPieceCorrect(piece, game.pieceStates)) {
            GameSounds.playSuccess();
            return;
        }

        GameSounds.playError();
    }

    static returnPieceToTray(game, pieceId, placeholder) {
        PuzzleGame.returnPieceStateToTray(game.pieceStates, game.slotPieces, pieceId);
        if (placeholder.parentNode === game.trayNode) {
            placeholder.parentNode.insertBefore(game.pieceNodes.get(pieceId), placeholder);
        } else {
            game.trayNode.append(game.pieceNodes.get(pieceId));
        }
        PuzzleGame.removePiecePlaceholder(placeholder);
        PuzzleGame.updatePieceNode(game, game.pieceNodes.get(pieceId), pieceId);
        PuzzleGame.updateSlotStates(game);
    }

    static removePiecePlaceholder(placeholder) {
        if (placeholder.parentNode !== undefined && placeholder.parentNode !== null) {
            placeholder.remove();
        }
    }

    static updateSlotStates(game) {
        game.targetNode.querySelectorAll(".puzzle-slot").forEach((slot) => {
            slot.classList.toggle("is-filled", slot.children.length > 0);
        });
    }

    static updatePieceNode(game, pieceNode, pieceId) {
        const piece = game.pieces.find((currentPiece) => currentPiece.id === pieceId);
        const pieceState = game.pieceStates.get(pieceId);
        pieceNode.style.setProperty("--piece-rotation", `${pieceState.rotation}deg`);
        pieceNode.classList.toggle("is-placed", pieceState.slotId !== "");
        pieceNode.classList.toggle(
            "is-correct",
            PuzzleGame.isPieceCorrect(piece, game.pieceStates),
        );
        pieceNode.setAttribute(
            "aria-pressed",
            String(PuzzleGame.normalizeRotation(pieceState.rotation) !== 0),
        );
    }

    static checkCurrentPuzzle(game) {
        if (!PuzzleGame.isPuzzleComplete(game.pieces, game.pieceStates)) {
            return;
        }

        PuzzleGame.completeCurrentPuzzle(game);
    }

    static async completeCurrentPuzzle(game) {
        if (game.isTransitioning) {
            return;
        }

        game.isTransitioning = true;
        PuzzleGame.markPuzzleComplete(game);
        await PuzzleGame.playScoreAward(game);
        game.score += 1;
        PuzzleGame.updateScore(game);

        if (game.currentPuzzleIndex === game.puzzles.length - 1) {
            GameSounds.playCompletionMusic();
            PuzzleGame.updateMessage(game, FINAL_MESSAGE, "is-finished");
            return;
        }

        PuzzleGame.updateMessage(
            game,
            PuzzleGame.praiseMessage(game.currentPuzzleIndex),
            "is-success",
        );
        PuzzleGame.defer(
            () => PuzzleGame.showNextPuzzle(game),
            NEXT_PUZZLE_DELAY_MS,
        );
    }

    static markPuzzleComplete(game) {
        game.targetNode.classList.add("is-complete");
        game.pieceNodes.forEach((pieceNode) => {
            pieceNode.disabled = true;
        });
    }

    static async playScoreAward(game) {
        if (!PuzzleGame.canAnimateScoreAward(game)) {
            return;
        }

        const startPoint = PuzzleGame.rectCenter(game.targetNode.getBoundingClientRect());
        const endPoint = PuzzleGame.rectCenter(game.scoreNode.getBoundingClientRect());
        const impulse = PuzzleGame.createScoreImpulse(startPoint);

        if (typeof impulse.animate !== "function") {
            return;
        }

        document.body.append(impulse);
        const flashAnimation = PuzzleGame.animateScoreFlash(impulse);
        await flashAnimation.finished;

        const flightAnimation = PuzzleGame.animateScoreFlight(
            impulse,
            startPoint,
            endPoint,
        );
        await flightAnimation.finished;

        if (typeof impulse.remove === "function") {
            impulse.remove();
        }
    }

    static canAnimateScoreAward(game) {
        if (PuzzleGame.prefersReducedMotion()) {
            return false;
        }

        if (typeof document === "undefined" || document.body === undefined) {
            return false;
        }

        if (typeof document.createElement !== "function") {
            return false;
        }

        if (typeof document.body.append !== "function") {
            return false;
        }

        if (game.targetNode === undefined || game.scoreNode === undefined) {
            return false;
        }

        if (typeof game.targetNode.getBoundingClientRect !== "function") {
            return false;
        }

        return typeof game.scoreNode.getBoundingClientRect === "function";
    }

    static prefersReducedMotion() {
        if (typeof window === "undefined") {
            return false;
        }

        if (typeof window.matchMedia !== "function") {
            return false;
        }

        return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    static createScoreImpulse(point) {
        const impulse = document.createElement("span");
        impulse.className = "puzzle-score-impulse";
        impulse.setAttribute("aria-hidden", "true");
        impulse.style.left = `${point.x}px`;
        impulse.style.top = `${point.y}px`;

        return impulse;
    }

    static rectCenter(rect) {
        const width = rect.width !== undefined ? rect.width : rect.right - rect.left;
        const height = rect.height !== undefined
            ? rect.height
            : rect.bottom - rect.top;

        return {
            x: rect.left + width / 2,
            y: rect.top + height / 2,
        };
    }

    static animateScoreFlash(impulse) {
        return impulse.animate([
            {
                opacity: 0,
                transform: "translate(-50%, -50%) scale(0.35)",
            },
            {
                opacity: 1,
                transform: "translate(-50%, -50%) scale(2.1)",
            },
            {
                opacity: 0.95,
                transform: "translate(-50%, -50%) scale(1)",
            },
        ], {
            duration: SCORE_FLASH_ANIMATION_DURATION_MS,
            easing: SCORE_AWARD_ANIMATION_EASING,
            fill: "both",
        });
    }

    static animateScoreFlight(impulse, startPoint, endPoint) {
        return impulse.animate([
            {
                left: `${startPoint.x}px`,
                opacity: 0.95,
                top: `${startPoint.y}px`,
                transform: "translate(-50%, -50%) scale(1)",
            },
            {
                left: `${endPoint.x}px`,
                opacity: 0,
                top: `${endPoint.y}px`,
                transform: "translate(-50%, -50%) scale(0.42)",
            },
        ], {
            duration: SCORE_FLIGHT_ANIMATION_DURATION_MS,
            easing: "linear",
            fill: "both",
        });
    }

    static showNextPuzzle(game) {
        game.currentPuzzleIndex += 1;
        PuzzleGame.renderCurrentPuzzle(game);
    }

    static praiseMessage(index) {
        return PRAISE_MESSAGES[index % PRAISE_MESSAGES.length];
    }

    static updateScore(game) {
        PuzzleGame.setScoreText(game);
        game.scorePanel.classList.add("is-score-awarded");
        PuzzleGame.defer(() => {
            game.scorePanel.classList.remove("is-score-awarded");
        }, 260);
    }

    static setScoreText(game) {
        game.scoreNode.textContent = String(game.score);
    }

    static defer(handler, durationMs) {
        if (typeof window !== "undefined" && typeof window.setTimeout === "function") {
            return window.setTimeout(handler, durationMs);
        }

        return setTimeout(handler, durationMs);
    }

    static updatePuzzleHeader(game, puzzle) {
        game.puzzleTitleNode.textContent = puzzle.title;
        game.progressNode.textContent = `${game.currentPuzzleIndex + 1} из ${game.puzzles.length}`;
    }

    static updateMessage(game, message, stateClass) {
        game.messageNode.textContent = message;
        game.statusPanel.className = "status-panel";

        if (stateClass !== "") {
            game.statusPanel.classList.add(stateClass);
        }
    }

    static clearNode(node) {
        while (node.firstChild !== null) {
            node.firstChild.remove();
        }
    }
}

function main() {
    const game = new PuzzleGame({
        targetNode: document.querySelector("#puzzle-target"),
        trayNode: document.querySelector("#pieces-tray"),
        scorePanel: document.querySelector(".score"),
        scoreNode: document.querySelector("#score"),
        messageNode: document.querySelector("#message"),
        statusPanel: document.querySelector(".status-panel"),
        puzzleTitleNode: document.querySelector("#puzzle-title"),
        progressNode: document.querySelector("#puzzle-progress"),
        puzzleImages: PUZZLE_IMAGES,
        puzzleLayouts: PUZZLE_LAYOUTS,
    });

    game.start();
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
    main();
}

if (typeof module !== "undefined") {
    module.exports = {
        FINAL_MESSAGE,
        PRAISE_MESSAGES,
        PUZZLE_IMAGES,
        PUZZLE_LAYOUTS,
        PUZZLES,
        PuzzleGame,
        START_MESSAGE,
        main,
    };
}
