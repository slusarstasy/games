const VEHICLES = [
    {
        id: "front-loader",
        image: "../data/images/фронтальный_погрузчик.png",
        shadow: "../data/shadows/фронтальный_погрузчик.png",
    },
    {
        id: "concrete-pump",
        image: "../data/images/бетононасос.png",
        shadow: "../data/shadows/бетононасос.png",
    },
    {
        id: "asphalt-paver",
        image: "../data/images/асфальтоукладчик.png",
        shadow: "../data/shadows/асфальтоукладчик.png",
    },
    {
        id: "crew-bus",
        image: "../data/images/вахтовый_автобус.png",
        shadow: "../data/shadows/вахтовый_автобус.png",
    },
    {
        id: "mortar-pump",
        image: "../data/images/растворонасос.png",
        shadow: "../data/shadows/растворонасос.png",
    },
    {
        id: "tower-crane",
        image: "../data/images/башенный_кран.png",
        shadow: "../data/shadows/башенный_кран.png",
    },
];

const PRAISE_MESSAGES = [
    "Отлично!",
    "Верно!",
    "Здорово получилось!",
    "Молодец!",
    "Супер!",
    "Класс!",
];

const FINAL_MESSAGE = "Ура! Все тени найдены!";
const RETRY_MESSAGE = "Попробуй еще раз";
const START_MESSAGE = "Выбери картинку и ее тень. Скажи, для чего нужна каждая машина";
const GameAnimations = (() => {
    if (typeof require !== "undefined") {
        return require("./game-animations.js").GameAnimations;
    }

    return window.GameAnimations;
})();
const GameSounds = (() => {
    if (typeof require !== "undefined") {
        return require("../shared/game-sounds.js").GameSounds;
    }

    return window.GameSounds;
})();

class MatchingGame {
    constructor(config) {
        this.board = config.board;
        this.imageColumn = config.imageColumn;
        this.shadowColumn = config.shadowColumn;
        this.connectionLayer = config.connectionLayer;
        this.scorePanel = config.scorePanel;
        this.scoreNode = config.scoreNode;
        this.messageNode = config.messageNode;
        this.statusPanel = config.statusPanel;
        this.items = config.items;
        this.selectedImageId = "";
        this.selectedShadowId = "";
        this.matchedIds = new Set();
        this.score = 0;
        this.praiseMessageIndex = 0;
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
        game.isPairMoving = true;
        GameSounds.playSuccess();

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
                MatchingGame.nextPraiseMessage(game),
                "is-success",
            );
        }

        await GameAnimations.movePairToBottom({
            board: game.board,
            imageColumn: game.imageColumn,
            imageCard,
            redrawLines: () => MatchingGame.redrawLines(game),
            shadowCard,
            shadowColumn: game.shadowColumn,
        });
        MatchingGame.drawLine(game, id, imageCard, shadowCard);
        MatchingGame.redrawLines(game);
        MatchingGame.awardScore(game, imageCard, shadowCard);
        game.isPairMoving = false;
    }

    static rejectPair(game) {
        GameSounds.playError();
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

    static async awardScore(game, imageCard, shadowCard) {
        await GameAnimations.playScoreAward(
            game.scorePanel,
            game.scoreNode,
            imageCard,
            shadowCard,
        );
        MatchingGame.incrementScore(game);
        await GameAnimations.bumpScorePanel(game.scorePanel);
    }

    static incrementScore(game) {
        game.score += 1;
        game.scoreNode.textContent = String(game.score);
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
        MatchingGame.resetMessageAnimation(game.messageNode);

        if (stateClass !== "") {
            game.statusPanel.classList.add(stateClass);
        }

        if (MatchingGame.shouldAnimateMessage(stateClass)) {
            MatchingGame.startMessageAnimation(game.messageNode);
        }
    }

    static shouldAnimateMessage(stateClass) {
        return ["is-success", "is-wrong", "is-finished"].includes(stateClass);
    }

    static startMessageAnimation(messageNode) {
        MatchingGame.resetMessageAnimation(messageNode);

        if (messageNode.offsetWidth !== undefined) {
            void messageNode.offsetWidth;
        }

        if (messageNode.classList !== undefined) {
            messageNode.classList.add("is-message-animated");
        }
    }

    static resetMessageAnimation(messageNode) {
        if (messageNode.classList !== undefined) {
            messageNode.classList.remove("is-message-animated");
        }
    }

    static nextPraiseMessage(game) {
        const message = PRAISE_MESSAGES[game.praiseMessageIndex];
        game.praiseMessageIndex = (game.praiseMessageIndex + 1) % PRAISE_MESSAGES.length;

        return message;
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
        scorePanel: document.querySelector(".score"),
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
