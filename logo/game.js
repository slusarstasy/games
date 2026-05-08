const VEHICLES = [
    {
        id: "1",
        image: "data/images/1.PNG",
        shadow: "data/shadows/1.png",
    },
    {
        id: "2",
        image: "data/images/2.PNG",
        shadow: "data/shadows/2.png",
    },
    {
        id: "3",
        image: "data/images/3.PNG",
        shadow: "data/shadows/3.png",
    },
    {
        id: "4",
        image: "data/images/4.PNG",
        shadow: "data/shadows/4.png",
    },
    {
        id: "5",
        image: "data/images/5.PNG",
        shadow: "data/shadows/5.png",
    },
    {
        id: "6",
        image: "data/images/6.PNG",
        shadow: "data/shadows/6.png",
    },
];

const PRAISE_MESSAGES = [
    "Отлично!",
    "Верно!",
    "Здорово получилось!",
    "Молодец!",
];

const FINAL_MESSAGE = "Ура! Все тени найдены!";
const RETRY_MESSAGE = "Попробуй еще раз";
const START_MESSAGE = "Выбери картинку и ее тень";
const MATCH_MOVE_ANIMATION_DURATION_MS = 1500;
const MATCH_MOVE_ANIMATION_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

class MatchingGame {
    constructor(config) {
        this.board = config.board;
        this.imageColumn = config.imageColumn;
        this.shadowColumn = config.shadowColumn;
        this.connectionLayer = config.connectionLayer;
        this.scoreNode = config.scoreNode;
        this.messageNode = config.messageNode;
        this.statusPanel = config.statusPanel;
        this.items = config.items;
        this.selectedImageId = "";
        this.selectedShadowId = "";
        this.matchedIds = new Set();
        this.score = 0;
        this.linesById = new Map();
        this.isPairMoving = false;
    }

    start() {
        MatchingGame.renderCards(
            this.imageColumn,
            this.items,
            "image",
            MatchingGame.handleImageChoice,
            this,
        );
        MatchingGame.renderCards(
            this.shadowColumn,
            MatchingGame.shuffle(this.items),
            "shadow",
            MatchingGame.handleShadowChoice,
            this,
        );
        MatchingGame.updateMessage(this, START_MESSAGE, "");
        window.addEventListener("resize", () => MatchingGame.redrawLines(this));
    }

    static renderCards(column, items, kind, handler, game) {
        items.forEach((item) => {
            const button = document.createElement("button");
            button.className = "match-card";
            button.type = "button";
            button.dataset.id = item.id;
            button.dataset.kind = kind;
            button.setAttribute(
                "aria-label",
                MatchingGame.buildAriaLabel(kind, item.id),
            );

            const image = document.createElement("img");
            image.src = kind === "image" ? item.image : item.shadow;
            image.alt = "";
            image.draggable = false;

            button.append(image);
            button.addEventListener("click", () => handler(game, button));
            column.append(button);
        });
    }

    static buildAriaLabel(kind, id) {
        if (kind === "image") {
            return `Картинка техники ${id}`;
        }

        return `Тень техники ${id}`;
    }

    static handleImageChoice(game, button) {
        const id = button.dataset.id;

        if (game.isPairMoving || MatchingGame.isAlreadyMatched(game, id)) {
            return Promise.resolve();
        }

        game.selectedImageId = id;
        MatchingGame.clearSelection(game.imageColumn);
        button.classList.add("is-selected");
        return MatchingGame.checkPair(game);
    }

    static handleShadowChoice(game, button) {
        const id = button.dataset.id;

        if (game.isPairMoving || MatchingGame.isAlreadyMatched(game, id)) {
            return Promise.resolve();
        }

        game.selectedShadowId = id;
        MatchingGame.clearSelection(game.shadowColumn);
        button.classList.add("is-selected");
        return MatchingGame.checkPair(game);
    }

    static isAlreadyMatched(game, id) {
        return game.matchedIds.has(id);
    }

    static checkPair(game) {
        if (game.selectedImageId === "" || game.selectedShadowId === "") {
            return Promise.resolve();
        }

        if (game.selectedImageId === game.selectedShadowId) {
            return MatchingGame.acceptPair(game, game.selectedImageId);
        }

        MatchingGame.rejectPair(game);
        return Promise.resolve();
    }

    static async acceptPair(game, id) {
        game.matchedIds.add(id);
        game.score += 1;
        game.scoreNode.textContent = String(game.score);
        game.isPairMoving = true;

        const imageCard = MatchingGame.findCard(game.imageColumn, id);
        const shadowCard = MatchingGame.findCard(game.shadowColumn, id);
        imageCard.classList.add("is-matched");
        shadowCard.classList.add("is-matched");
        imageCard.disabled = true;
        shadowCard.disabled = true;

        MatchingGame.resetSelection(game);

        if (game.matchedIds.size === game.items.length) {
            MatchingGame.updateMessage(game, FINAL_MESSAGE, "is-finished");
        } else {
            MatchingGame.updateMessage(
                game,
                MatchingGame.randomPraiseMessage(),
                "is-success",
            );
        }

        await MatchingGame.movePairToBottom(game, imageCard, shadowCard);
        MatchingGame.drawLine(game, id, imageCard, shadowCard);
        MatchingGame.redrawLines(game);
        game.isPairMoving = false;
    }

    static rejectPair(game) {
        MatchingGame.updateMessage(game, RETRY_MESSAGE, "is-wrong");
        MatchingGame.resetSelection(game);
    }

    static resetSelection(game) {
        game.selectedImageId = "";
        game.selectedShadowId = "";
        MatchingGame.clearSelection(game.imageColumn);
        MatchingGame.clearSelection(game.shadowColumn);
    }

    static clearSelection(column) {
        column.querySelectorAll(".is-selected").forEach((card) => {
            card.classList.remove("is-selected");
        });
    }

    static findCard(column, id) {
        return column.querySelector(`[data-id="${id}"]`);
    }

    static async movePairToBottom(game, imageCard, shadowCard) {
        const imageStartRect = imageCard.getBoundingClientRect();
        const shadowStartRect = shadowCard.getBoundingClientRect();

        game.imageColumn.append(imageCard);
        game.shadowColumn.append(shadowCard);
        MatchingGame.redrawLines(game);

        const imageEndRect = imageCard.getBoundingClientRect();
        const shadowEndRect = shadowCard.getBoundingClientRect();

        if (!MatchingGame.shouldAnimatePairMove(imageCard, shadowCard)) {
            return;
        }

        game.board.classList.add("is-moving-match");
        imageCard.classList.add("is-moving-match");
        shadowCard.classList.add("is-moving-match");

        const imageAnimation = MatchingGame.animateCardMove(
            imageCard,
            imageStartRect,
            imageEndRect,
            "image",
        );
        const shadowAnimation = MatchingGame.animateCardMove(
            shadowCard,
            shadowStartRect,
            shadowEndRect,
            "shadow",
        );

        await Promise.all([
            imageAnimation.finished,
            shadowAnimation.finished,
        ]);

        imageCard.classList.remove("is-moving-match");
        shadowCard.classList.remove("is-moving-match");
        game.board.classList.remove("is-moving-match");
    }

    static shouldAnimatePairMove(imageCard, shadowCard) {
        if (typeof imageCard.animate !== "function") {
            return false;
        }

        if (typeof shadowCard.animate !== "function") {
            return false;
        }

        return !MatchingGame.prefersReducedMotion();
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

    static animateCardMove(card, startRect, endRect, kind) {
        const deltaX = startRect.left - endRect.left;
        const deltaY = startRect.top - endRect.top;
        const rotateY = kind === "image" ? -72 : 72;
        const keyframes = [
            {
                offset: 0,
                transform: MatchingGame.buildMoveTransform(deltaX, deltaY, 0, 0),
            },
            {
                offset: 0.48,
                transform: MatchingGame.buildMoveTransform(
                    deltaX / 2,
                    deltaY / 2,
                    10,
                    rotateY,
                ),
            },
            {
                offset: 1,
                transform: MatchingGame.buildMoveTransform(0, 0, 0, 0),
            },
        ];

        return card.animate(keyframes, {
            duration: MATCH_MOVE_ANIMATION_DURATION_MS,
            easing: MATCH_MOVE_ANIMATION_EASING,
            fill: "both",
        });
    }

    static buildMoveTransform(deltaX, deltaY, rotateX, rotateY) {
        return [
            "perspective(900px)",
            `translate(${deltaX}px, ${deltaY}px)`,
            `rotateX(${rotateX}deg)`,
            `rotateY(${rotateY}deg)`,
        ].join(" ");
    }

    static drawLine(game, id, imageCard, shadowCard) {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.dataset.id = id;
        game.connectionLayer.append(line);
        game.linesById.set(id, {
            line,
            imageCard,
            shadowCard,
        });
        MatchingGame.updateLinePosition(game, line, imageCard, shadowCard);
    }

    static redrawLines(game) {
        game.linesById.forEach((connection) => {
            MatchingGame.updateLinePosition(
                game,
                connection.line,
                connection.imageCard,
                connection.shadowCard,
            );
        });
    }

    static updateLinePosition(game, line, imageCard, shadowCard) {
        const boardRect = game.board.getBoundingClientRect();
        const imageRect = imageCard.getBoundingClientRect();
        const shadowRect = shadowCard.getBoundingClientRect();
        const imagePoint = MatchingGame.connectionPoint(boardRect, imageRect, "right");
        const shadowPoint = MatchingGame.connectionPoint(boardRect, shadowRect, "left");

        line.setAttribute("x1", String(imagePoint.x));
        line.setAttribute("y1", String(imagePoint.y));
        line.setAttribute("x2", String(shadowPoint.x));
        line.setAttribute("y2", String(shadowPoint.y));
    }

    static connectionPoint(boardRect, cardRect, side) {
        const x = side === "right" ? cardRect.right : cardRect.left;

        return {
            x: x - boardRect.left,
            y: cardRect.top + cardRect.height / 2 - boardRect.top,
        };
    }

    static updateMessage(game, message, stateClass) {
        game.messageNode.textContent = message;
        game.statusPanel.className = "status-panel";

        if (stateClass !== "") {
            game.statusPanel.classList.add(stateClass);
        }
    }

    static randomPraiseMessage() {
        const index = Math.floor(Math.random() * PRAISE_MESSAGES.length);
        return PRAISE_MESSAGES[index];
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
}

function main() {
    const game = new MatchingGame({
        board: document.querySelector("#game-board"),
        imageColumn: document.querySelector("#image-column"),
        shadowColumn: document.querySelector("#shadow-column"),
        connectionLayer: document.querySelector("#connection-layer"),
        scoreNode: document.querySelector("#score"),
        messageNode: document.querySelector("#message"),
        statusPanel: document.querySelector(".status-panel"),
        items: VEHICLES,
    });

    game.start();
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
    main();
}

if (typeof module !== "undefined") {
    module.exports = {
        FINAL_MESSAGE,
        MatchingGame,
        PRAISE_MESSAGES,
        RETRY_MESSAGE,
        START_MESSAGE,
        VEHICLES,
        main,
    };
}
