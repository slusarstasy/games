const POINTER_DRAG_THRESHOLD = 8;
const START_MESSAGE = "Посмотри на ряды. Подумай, кто следующий, перетащи";
const RETRY_MESSAGE = "Попробуй еще раз";
const FINAL_MESSAGE = "Ура! Все ряды собраны!";
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

const VEHICLES = [
    {
        id: "excavator",
        title: "Экскаватор",
        image: "../data/images/экскаватор.png",
    },
    {
        id: "front-loader",
        title: "Фронтальный погрузчик",
        image: "../data/images/фронтальный_погрузчик.png",
    },
    {
        id: "tower-crane",
        title: "Башенный кран",
        image: "../data/images/башенный_кран.png",
    },
    {
        id: "lift",
        title: "Подъёмник",
        image: "../data/images/подъёмник.png",
    },
    {
        id: "dump-truck",
        title: "Самосвал",
        image: "../data/images/самосвал.png",
    },
    {
        id: "truck",
        title: "Грузовик",
        image: "../data/images/грузовик.png",
    },
    {
        id: "concrete-pump",
        title: "Бетононасос",
        image: "../data/images/бетононасос.png",
    },
    {
        id: "auto-crane",
        title: "Автокран",
        image: "../data/images/автокран.png",
    },
    {
        id: "asphalt-paver",
        title: "Асфальтоукладчик",
        image: "../data/images/асфальтоукладчик.png",
    },
    {
        id: "crew-bus",
        title: "Вахтовый автобус",
        image: "../data/images/вахтовый_автобус.png",
    },
    {
        id: "microbus",
        title: "Микроавтобус",
        image: "../data/images/микроавтобус.png",
    },
];

const ROW_PATTERNS = [
    {
        id: "earth-row",
        answerId: "excavator",
        pattern: ["excavator", "front-loader", "excavator", "front-loader"],
    },
    {
        id: "lifting-row",
        answerId: "tower-crane",
        pattern: ["tower-crane", "lift", "tower-crane", "lift"],
    },
    {
        id: "trucks-row",
        answerId: "dump-truck",
        pattern: ["dump-truck", "truck", "dump-truck", "truck"],
    },
    {
        id: "cranes-row",
        answerId: "concrete-pump",
        pattern: ["concrete-pump", "auto-crane", "concrete-pump", "auto-crane"],
    },
    {
        id: "road-row",
        answerId: "front-loader",
        pattern: [
            "front-loader",
            "asphalt-paver",
            "front-loader",
            "asphalt-paver",
        ],
    },
    {
        id: "buses-row",
        answerId: "crew-bus",
        pattern: ["crew-bus", "microbus", "crew-bus", "microbus"],
    },
];

const ANSWER_ITEMS = [
    "concrete-pump",
    "dump-truck",
    "front-loader",
    "crew-bus",
    "excavator",
    "tower-crane",
];

class LookAtRowsGame {
    constructor(config) {
        this.boardNode = config.boardNode;
        this.rowsNode = config.rowsNode;
        this.scorePanel = config.scorePanel;
        this.scoreNode = config.scoreNode;
        this.messageNode = config.messageNode;
        this.statusPanel = config.statusPanel;
        this.rows = config.rows;
        this.answers = LookAtRowsGame.shuffle(config.answers);
        this.vehicles = config.vehicles;
        this.score = 0;
        this.completedRows = new Set();
        this.answerCards = new Map();
        this.answerHomeNodes = new Map();
        this.slotNodes = new Map();
        this.pointerDrag = null;
    }

    start() {
        LookAtRowsGame.setScoreText(this);
        LookAtRowsGame.updateMessage(this, START_MESSAGE, "");
        LookAtRowsGame.renderRows(this);
    }

    static renderRows(game) {
        LookAtRowsGame.clearNode(game.rowsNode);
        game.answerCards = new Map();
        game.answerHomeNodes = new Map();
        game.slotNodes = new Map();

        game.rows.forEach((row, rowIndex) => {
            const rowNode = document.createElement("div");
            rowNode.className = "sequence-row";
            rowNode.dataset.rowId = row.id;

            const patternNode = LookAtRowsGame.createPatternNode(game, row);
            const slotNode = LookAtRowsGame.createSlotNode(row);
            const answerHomeNode = LookAtRowsGame.createAnswerHomeNode(
                game,
                game.answers[rowIndex],
            );

            game.slotNodes.set(row.id, slotNode);
            rowNode.append(patternNode, slotNode, answerHomeNode);
            game.rowsNode.append(rowNode);
        });
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

    static createPatternNode(game, row) {
        const patternNode = document.createElement("div");
        patternNode.className = "row-pattern";

        row.pattern.forEach((vehicleId) => {
            const vehicle = LookAtRowsGame.findVehicle(game.vehicles, vehicleId);
            const vehicleNode = LookAtRowsGame.createVehicleNode(vehicle);

            patternNode.append(vehicleNode);
        });

        return patternNode;
    }

    static createVehicleNode(vehicle) {
        const vehicleNode = document.createElement("span");
        vehicleNode.className = "row-vehicle";
        vehicleNode.dataset.vehicleId = vehicle.id;

        const image = document.createElement("img");
        image.src = vehicle.image;
        image.alt = vehicle.title;
        image.draggable = false;

        vehicleNode.append(image);

        return vehicleNode;
    }

    static createSlotNode(row) {
        const slotNode = document.createElement("div");
        slotNode.className = "answer-slot";
        slotNode.dataset.rowId = row.id;
        slotNode.setAttribute("aria-label", "Пустая клетка для ответа");

        return slotNode;
    }

    static createAnswerHomeNode(game, vehicleId) {
        const vehicle = LookAtRowsGame.findVehicle(game.vehicles, vehicleId);
        const answerHomeNode = document.createElement("div");
        const answerCard = LookAtRowsGame.createAnswerCard(game, vehicle);

        answerHomeNode.className = "answer-home";
        answerHomeNode.dataset.vehicleId = vehicle.id;
        answerHomeNode.append(answerCard);
        game.answerHomeNodes.set(vehicle.id, answerHomeNode);
        game.answerCards.set(vehicle.id, answerCard);

        return answerHomeNode;
    }

    static createAnswerCard(game, vehicle) {
        const answerCard = document.createElement("button");
        answerCard.className = "answer-card";
        answerCard.type = "button";
        answerCard.dataset.vehicleId = vehicle.id;
        answerCard.setAttribute("aria-label", `Ответ: ${vehicle.title}`);

        const image = document.createElement("img");
        image.src = vehicle.image;
        image.alt = "";
        image.draggable = false;

        answerCard.append(image);
        answerCard.addEventListener("pointerdown", (event) => {
            LookAtRowsGame.startPointerDrag(game, answerCard, vehicle.id, event);
        });

        return answerCard;
    }

    static acceptAnswer(game, vehicleId, rowId, placeholder) {
        if (!LookAtRowsGame.canUseSlot(game, rowId)) {
            LookAtRowsGame.rejectAnswer(game, vehicleId, placeholder);
            return false;
        }

        const row = LookAtRowsGame.findRow(game.rows, rowId);
        if (!LookAtRowsGame.isCorrectAnswer(row, vehicleId)) {
            LookAtRowsGame.rejectAnswer(game, vehicleId, placeholder);
            return false;
        }

        LookAtRowsGame.removeCardPlaceholder(placeholder);
        LookAtRowsGame.placeCorrectAnswer(game, vehicleId, rowId);
        LookAtRowsGame.awardScore(game);
        LookAtRowsGame.playAcceptedAnswerSound(game);
        LookAtRowsGame.updateCompletionMessage(game);

        return true;
    }

    static canUseSlot(game, rowId) {
        return !game.completedRows.has(rowId);
    }

    static isCorrectAnswer(row, vehicleId) {
        return row.answerId === vehicleId;
    }

    static rejectAnswer(game, vehicleId, placeholder) {
        LookAtRowsGame.returnCardToHome(game, vehicleId, placeholder);
        GameSounds.playError();
        LookAtRowsGame.updateMessage(game, RETRY_MESSAGE, "is-wrong");
    }

    static placeCorrectAnswer(game, vehicleId, rowId) {
        const answerCard = game.answerCards.get(vehicleId);
        const slotNode = game.slotNodes.get(rowId);

        game.completedRows.add(rowId);
        slotNode.append(answerCard);
        slotNode.classList.add("is-complete");
        answerCard.classList.add("is-complete");
        answerCard.disabled = true;
    }

    static awardScore(game) {
        game.score += 1;
        LookAtRowsGame.setScoreText(game);
        game.scorePanel.classList.add("is-score-awarded");
        LookAtRowsGame.defer(() => {
            game.scorePanel.classList.remove("is-score-awarded");
        }, 260);
    }

    static playAcceptedAnswerSound(game) {
        if (LookAtRowsGame.isGameComplete(game)) {
            GameSounds.playCompletionMusic();
            return;
        }

        GameSounds.playSuccess();
    }

    static updateCompletionMessage(game) {
        if (LookAtRowsGame.isGameComplete(game)) {
            LookAtRowsGame.updateMessage(game, FINAL_MESSAGE, "is-finished");
            return;
        }

        LookAtRowsGame.updateMessage(
            game,
            LookAtRowsGame.praiseMessage(game.score - 1),
            "is-success",
        );
    }

    static isGameComplete(game) {
        return game.completedRows.size === game.rows.length;
    }

    static praiseMessage(index) {
        return PRAISE_MESSAGES[index % PRAISE_MESSAGES.length];
    }

    static startPointerDrag(game, answerCard, vehicleId, event) {
        if (answerCard.disabled || event.button > 0) {
            return;
        }

        const rect = answerCard.getBoundingClientRect();
        const moveHandler = (moveEvent) => {
            LookAtRowsGame.movePointerDrag(game, moveEvent);
        };
        const finishHandler = (finishEvent) => {
            LookAtRowsGame.finishPointerDrag(game, finishEvent, true);
        };
        const cancelHandler = (cancelEvent) => {
            LookAtRowsGame.finishPointerDrag(game, cancelEvent, false);
        };

        game.pointerDrag = {
            answerCard,
            vehicleId,
            pointerId: event.pointerId,
            moveHandler,
            finishHandler,
            cancelHandler,
            placeholder: LookAtRowsGame.createCardPlaceholder(),
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
            LookAtRowsGame.prepareDraggedCard(drag);
        }

        event.preventDefault();
        LookAtRowsGame.positionDraggedCard(drag, event.clientX, event.clientY);
    }

    static prepareDraggedCard(drag) {
        drag.answerCard.classList.add("is-dragging");
        drag.answerCard.style.width = `${drag.width}px`;
        drag.answerCard.style.height = `${drag.height}px`;
        drag.answerCard.style.position = "fixed";
        drag.answerCard.style.zIndex = "30";
        drag.answerCard.style.pointerEvents = "none";
        LookAtRowsGame.placeDragPlaceholder(drag);
        document.body.append(drag.answerCard);
    }

    static createCardPlaceholder() {
        const placeholder = document.createElement("span");
        placeholder.className = "answer-card-placeholder";

        return placeholder;
    }

    static placeDragPlaceholder(drag) {
        const parentNode = drag.answerCard.parentNode;

        if (parentNode === undefined || parentNode === null) {
            return;
        }

        parentNode.insertBefore(drag.placeholder, drag.answerCard);
    }

    static positionDraggedCard(drag, clientX, clientY) {
        drag.answerCard.style.left = `${clientX - drag.offsetX}px`;
        drag.answerCard.style.top = `${clientY - drag.offsetY}px`;
    }

    static finishPointerDrag(game, event, shouldDrop) {
        const drag = game.pointerDrag;

        if (drag === null || drag.pointerId !== event.pointerId) {
            return;
        }

        game.pointerDrag = null;
        LookAtRowsGame.removePointerDragListeners(drag);

        if (!drag.hasMoved) {
            return;
        }

        const slotNode = shouldDrop
            ? LookAtRowsGame.findDropSlot(event.clientX, event.clientY)
            : null;

        LookAtRowsGame.clearDraggedCardStyles(drag.answerCard);

        if (slotNode === null) {
            LookAtRowsGame.returnCardToHome(
                game,
                drag.vehicleId,
                drag.placeholder,
            );
        } else {
            LookAtRowsGame.acceptAnswer(
                game,
                drag.vehicleId,
                slotNode.dataset.rowId,
                drag.placeholder,
            );
        }
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

        return target.closest(".answer-slot");
    }

    static clearDraggedCardStyles(answerCard) {
        answerCard.classList.remove("is-dragging");
        answerCard.style.width = "";
        answerCard.style.height = "";
        answerCard.style.left = "";
        answerCard.style.top = "";
        answerCard.style.position = "";
        answerCard.style.zIndex = "";
        answerCard.style.pointerEvents = "";
    }

    static returnCardToHome(game, vehicleId, placeholder) {
        const answerCard = game.answerCards.get(vehicleId);
        const homeNode = game.answerHomeNodes.get(vehicleId);

        if (placeholder !== undefined && placeholder.parentNode !== null) {
            placeholder.parentNode.insertBefore(answerCard, placeholder);
            LookAtRowsGame.removeCardPlaceholder(placeholder);
            return;
        }

        homeNode.append(answerCard);
    }

    static removeCardPlaceholder(placeholder) {
        if (placeholder !== undefined && placeholder.parentNode !== null) {
            placeholder.remove();
        }
    }

    static findRow(rows, rowId) {
        return rows.find((row) => row.id === rowId);
    }

    static findVehicle(vehicles, vehicleId) {
        return vehicles.find((vehicle) => vehicle.id === vehicleId);
    }

    static setScoreText(game) {
        game.scoreNode.textContent = String(game.score);
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

    static defer(handler, durationMs) {
        if (typeof window !== "undefined" && typeof window.setTimeout === "function") {
            return window.setTimeout(handler, durationMs);
        }

        return setTimeout(handler, durationMs);
    }
}

function main() {
    const game = new LookAtRowsGame({
        boardNode: document.querySelector("#rows-board"),
        rowsNode: document.querySelector("#rows-workspace"),
        scorePanel: document.querySelector(".score"),
        scoreNode: document.querySelector("#score"),
        messageNode: document.querySelector("#message"),
        statusPanel: document.querySelector(".status-panel"),
        rows: ROW_PATTERNS,
        answers: ANSWER_ITEMS,
        vehicles: VEHICLES,
    });

    game.start();
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
    main();
}

if (typeof module !== "undefined") {
    module.exports = {
        ANSWER_ITEMS,
        FINAL_MESSAGE,
        LookAtRowsGame,
        PRAISE_MESSAGES,
        RETRY_MESSAGE,
        ROW_PATTERNS,
        START_MESSAGE,
        VEHICLES,
        main,
    };
}
