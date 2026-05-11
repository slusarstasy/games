const START_MESSAGE = "Реши подсвеченный пример и нажми ответ";
const RETRY_MESSAGE = "Попробуй еще раз";
const FINAL_MESSAGE = "Ура! Пазл открыт!";
const PUZZLE_ROWS = 3;
const PUZZLE_COLUMNS = 4;
const SCORE_FLASH_DURATION_MS = 260;
const TIMER_TICK_MS = 1000;
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

const COUNT_PUZZLE = {
    title: "Каток",
    image: "../data/images/каток.png",
    width: 755,
    height: 578,
    rows: PUZZLE_ROWS,
    columns: PUZZLE_COLUMNS,
};

const COUNT_TASKS = [
    {
        id: "task-1",
        firstNumber: 7,
        operator: "+",
        secondNumber: 3,
        answer: 10,
    },
    {
        id: "task-2",
        firstNumber: 5,
        operator: "+",
        secondNumber: 3,
        answer: 8,
    },
    {
        id: "task-3",
        firstNumber: 6,
        operator: "-",
        secondNumber: 1,
        answer: 5,
    },
    {
        id: "task-4",
        firstNumber: 3,
        operator: "-",
        secondNumber: 2,
        answer: 1,
    },
    {
        id: "task-5",
        firstNumber: 6,
        operator: "+",
        secondNumber: 2,
        answer: 8,
    },
    {
        id: "task-6",
        firstNumber: 2,
        operator: "+",
        secondNumber: 3,
        answer: 5,
    },
    {
        id: "task-7",
        firstNumber: 5,
        operator: "-",
        secondNumber: 2,
        answer: 3,
    },
    {
        id: "task-8",
        firstNumber: 7,
        operator: "+",
        secondNumber: 2,
        answer: 9,
    },
    {
        id: "task-9",
        firstNumber: 10,
        operator: "-",
        secondNumber: 5,
        answer: 5,
    },
    {
        id: "task-10",
        firstNumber: 8,
        operator: "+",
        secondNumber: 2,
        answer: 10,
    },
    {
        id: "task-11",
        firstNumber: 4,
        operator: "+",
        secondNumber: 3,
        answer: 7,
    },
    {
        id: "task-12",
        firstNumber: 5,
        operator: "-",
        secondNumber: 1,
        answer: 4,
    },
];

class CountPuzzleGame {
    constructor(config) {
        this.taskGridNode = config.taskGridNode;
        this.answerGridNode = config.answerGridNode;
        this.scorePanel = config.scorePanel;
        this.scoreNode = config.scoreNode;
        this.timerNode = config.timerNode;
        this.messageNode = config.messageNode;
        this.statusPanel = config.statusPanel;
        this.puzzle = config.puzzle;
        this.tasks = CountPuzzleGame.shuffle(config.tasks);
        this.answerTiles = CountPuzzleGame.buildAnswerTiles(
            CountPuzzleGame.shuffle(config.tasks),
        );
        this.score = 0;
        this.completedTaskIds = new Set();
        this.revealedTileIds = new Set();
        this.taskNodes = new Map();
        this.answerTileNodes = new Map();
        this.activeTaskId = CountPuzzleGame.firstTaskId(this.tasks);
        this.isComplete = false;
        this.elapsedSeconds = 0;
        this.timerId = 0;
    }

    start() {
        CountPuzzleGame.setScoreText(this);
        CountPuzzleGame.resetTimer(this);
        CountPuzzleGame.updateMessage(this, START_MESSAGE, "");
        CountPuzzleGame.renderTasks(this);
        CountPuzzleGame.renderAnswerTiles(this);
        CountPuzzleGame.updateTaskStates(this);
    }

    static firstTaskId(tasks) {
        if (tasks.length === 0) {
            return "";
        }

        return tasks[0].id;
    }

    static buildAnswerTiles(tasks) {
        return tasks.map((task, index) => {
            return {
                id: `answer-${index + 1}`,
                taskId: task.id,
                answer: task.answer,
            };
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

    static renderTasks(game) {
        CountPuzzleGame.clearNode(game.taskGridNode);
        game.taskNodes = new Map();

        game.tasks.forEach((task) => {
            const taskNode = document.createElement("div");

            taskNode.className = "count-task";
            taskNode.dataset.taskId = task.id;
            taskNode.textContent = CountPuzzleGame.expression(task);
            taskNode.setAttribute("aria-label", `Пример ${CountPuzzleGame.expression(task)}`);
            game.taskNodes.set(task.id, taskNode);
            game.taskGridNode.append(taskNode);
        });
    }

    static renderAnswerTiles(game) {
        CountPuzzleGame.clearNode(game.answerGridNode);
        game.answerTileNodes = new Map();
        game.answerGridNode.style.aspectRatio = `${game.puzzle.width} / ${game.puzzle.height}`;

        game.answerTiles.forEach((tile, index) => {
            const tileNode = CountPuzzleGame.createAnswerTileNode(game, tile, index);

            game.answerTileNodes.set(tile.id, tileNode);
            game.answerGridNode.append(tileNode);
        });
    }

    static createAnswerTileNode(game, tile, index) {
        const tileNode = document.createElement("button");
        const valueNode = document.createElement("span");

        tileNode.className = "count-answer-tile";
        tileNode.type = "button";
        tileNode.dataset.tileId = tile.id;
        tileNode.dataset.answer = String(tile.answer);
        tileNode.style.backgroundImage = `url("${game.puzzle.image}")`;
        tileNode.style.backgroundSize = `${game.puzzle.columns * 100}% ${game.puzzle.rows * 100}%`;
        tileNode.style.backgroundPosition = CountPuzzleGame.backgroundPosition(
            index,
            game.puzzle,
        );
        tileNode.setAttribute("aria-label", `Ответ ${tile.answer}`);
        valueNode.className = "count-answer-value";
        valueNode.textContent = String(tile.answer);
        tileNode.append(valueNode);
        tileNode.addEventListener("click", () => {
            CountPuzzleGame.handleAnswerClick(game, tile.id);
        });

        return tileNode;
    }

    static backgroundPosition(index, puzzle) {
        const row = Math.floor(index / puzzle.columns);
        const column = index % puzzle.columns;
        const x = CountPuzzleGame.backgroundPercent(column, puzzle.columns);
        const y = CountPuzzleGame.backgroundPercent(row, puzzle.rows);

        return `${x}% ${y}%`;
    }

    static backgroundPercent(index, count) {
        if (count === 1) {
            return 0;
        }

        return (index / (count - 1)) * 100;
    }

    static handleAnswerClick(game, tileId) {
        if (game.isComplete || game.revealedTileIds.has(tileId)) {
            return false;
        }

        const tile = CountPuzzleGame.findAnswerTile(game.answerTiles, tileId);
        const task = CountPuzzleGame.activeTask(game);

        CountPuzzleGame.startTimer(game);

        if (!CountPuzzleGame.isCorrectAnswer(task, tile)) {
            CountPuzzleGame.rejectAnswer(game);
            return false;
        }

        CountPuzzleGame.acceptAnswer(game, task, tile);

        return true;
    }

    static isCorrectAnswer(task, tile) {
        return task.answer === tile.answer;
    }

    static acceptAnswer(game, task, tile) {
        game.completedTaskIds.add(task.id);
        game.revealedTileIds.add(tile.id);
        CountPuzzleGame.revealTile(game, tile.id);
        CountPuzzleGame.awardScore(game);

        if (CountPuzzleGame.isGameComplete(game)) {
            CountPuzzleGame.completeGame(game);
            return;
        }

        GameSounds.playSuccess();
        game.activeTaskId = CountPuzzleGame.nextActiveTaskId(game);
        CountPuzzleGame.updateTaskStates(game);
        CountPuzzleGame.updateMessage(
            game,
            CountPuzzleGame.praiseMessage(game.score - 1),
            "is-success",
        );
    }

    static rejectAnswer(game) {
        GameSounds.playError();
        CountPuzzleGame.updateMessage(game, RETRY_MESSAGE, "is-wrong");
    }

    static revealTile(game, tileId) {
        const tileNode = game.answerTileNodes.get(tileId);

        tileNode.disabled = true;
        tileNode.classList.add("is-revealed");
        tileNode.setAttribute("aria-pressed", "true");
    }

    static awardScore(game) {
        game.score += 1;
        CountPuzzleGame.setScoreText(game);
        game.scorePanel.classList.add("is-score-awarded");
        CountPuzzleGame.defer(() => {
            game.scorePanel.classList.remove("is-score-awarded");
        }, SCORE_FLASH_DURATION_MS);
    }

    static completeGame(game) {
        game.isComplete = true;
        game.activeTaskId = "";
        CountPuzzleGame.stopTimer(game);
        game.answerTiles.forEach((tile) => {
            game.revealedTileIds.add(tile.id);
            CountPuzzleGame.revealTile(game, tile.id);
        });
        CountPuzzleGame.updateTaskStates(game);
        GameSounds.playCompletionMusic();
        CountPuzzleGame.updateMessage(game, FINAL_MESSAGE, "is-finished");
    }

    static updateTaskStates(game) {
        game.taskNodes.forEach((taskNode, taskId) => {
            const isComplete = game.completedTaskIds.has(taskId);
            const isActive = taskId === game.activeTaskId;

            taskNode.classList.toggle("is-active", isActive);
            taskNode.classList.toggle("is-complete", isComplete);
            taskNode.setAttribute("aria-current", String(isActive));
        });
    }

    static nextActiveTaskId(game) {
        const nextTask = game.tasks.find((task) => {
            return !game.completedTaskIds.has(task.id);
        });

        if (nextTask === undefined) {
            return "";
        }

        return nextTask.id;
    }

    static activeTask(game) {
        return game.tasks.find((task) => {
            return task.id === game.activeTaskId;
        });
    }

    static findAnswerTile(answerTiles, tileId) {
        return answerTiles.find((tile) => {
            return tile.id === tileId;
        });
    }

    static isGameComplete(game) {
        return game.completedTaskIds.size === game.tasks.length;
    }

    static expression(task) {
        return `${task.firstNumber} ${task.operator} ${task.secondNumber}`;
    }

    static calculateAnswer(task) {
        if (task.operator === "+") {
            return task.firstNumber + task.secondNumber;
        }

        return task.firstNumber - task.secondNumber;
    }

    static praiseMessage(index) {
        return PRAISE_MESSAGES[index % PRAISE_MESSAGES.length];
    }

    static setScoreText(game) {
        game.scoreNode.textContent = String(game.score);
    }

    static resetTimer(game) {
        CountPuzzleGame.stopTimer(game);
        game.elapsedSeconds = 0;
        CountPuzzleGame.setTimerText(game);
    }

    static startTimer(game) {
        if (game.timerId !== 0) {
            return;
        }

        game.timerId = CountPuzzleGame.setRepeatingTimer(() => {
            CountPuzzleGame.tickTimer(game);
        }, TIMER_TICK_MS);
    }

    static stopTimer(game) {
        if (game.timerId === 0) {
            return;
        }

        CountPuzzleGame.clearRepeatingTimer(game.timerId);
        game.timerId = 0;
    }

    static tickTimer(game) {
        if (game.isComplete) {
            return;
        }

        game.elapsedSeconds += 1;
        CountPuzzleGame.setTimerText(game);
    }

    static setTimerText(game) {
        game.timerNode.textContent = CountPuzzleGame.formatTime(game.elapsedSeconds);
    }

    static formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        const paddedMinutes = CountPuzzleGame.paddedTime(minutes);
        const paddedSeconds = CountPuzzleGame.paddedTime(remainingSeconds);

        return `${paddedMinutes}:${paddedSeconds}`;
    }

    static paddedTime(value) {
        return String(value).padStart(2, "0");
    }

    static setRepeatingTimer(handler, durationMs) {
        if (
            typeof window !== "undefined"
            && typeof window.setInterval === "function"
        ) {
            return window.setInterval(handler, durationMs);
        }

        return setInterval(handler, durationMs);
    }

    static clearRepeatingTimer(timerId) {
        if (
            typeof window !== "undefined"
            && typeof window.clearInterval === "function"
        ) {
            window.clearInterval(timerId);
            return;
        }

        clearInterval(timerId);
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
    const game = new CountPuzzleGame({
        taskGridNode: document.querySelector("#task-grid"),
        answerGridNode: document.querySelector("#answer-grid"),
        scorePanel: document.querySelector(".score"),
        scoreNode: document.querySelector("#score"),
        timerNode: document.querySelector("#timer"),
        messageNode: document.querySelector("#message"),
        statusPanel: document.querySelector(".status-panel"),
        puzzle: COUNT_PUZZLE,
        tasks: COUNT_TASKS,
    });

    game.start();
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
    main();
}

if (typeof module !== "undefined") {
    module.exports = {
        COUNT_TASKS,
        CountPuzzleGame,
        FINAL_MESSAGE,
        PRAISE_MESSAGES,
        RETRY_MESSAGE,
        START_MESSAGE,
        main,
    };
}
