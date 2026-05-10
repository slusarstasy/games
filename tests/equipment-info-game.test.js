const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
    CATEGORY_NAMES,
    EQUIPMENT_ITEMS,
    EquipmentInfoGame,
    VOICE_VOLUME,
} = require("../equipment_info_game/game.js");
const { SOUND_FILES } = require("../shared/game-sounds.js");

class FakeClassList {
    constructor() {
        this.__classes = new Set();
    }

    toggle(className, force) {
        if (force) {
            this.__classes.add(className);
            return true;
        }

        this.__classes.delete(className);
        return false;
    }

    contains(className) {
        return this.__classes.has(className);
    }
}

class FakeNode {
    constructor() {
        this.alt = "";
        this.children = [];
        this.classList = new FakeClassList();
        this.dataset = {};
        this.hidden = false;
        this.parentNode = null;
        this.src = "";
        this.textContent = "";
    }

    get firstChild() {
        return this.children.length === 0 ? null : this.children[0];
    }

    append(...nodes) {
        nodes.forEach((node) => {
            node.parentNode = this;
            this.children.push(node);
        });
    }

    remove() {
        if (this.parentNode === null) {
            return;
        }

        this.parentNode.children = this.parentNode.children.filter((node) => {
            return node !== this;
        });
        this.parentNode = null;
    }

    querySelectorAll() {
        return [];
    }
}

class FakeDocument {
    createElement() {
        return new FakeNode();
    }
}

class FakeAudio {
    constructor(src) {
        this.currentTime = 12;
        this.paused = false;
        this.played = false;
        this.src = src;
        this.volume = 0;
        FakeAudio.instances.push(this);
    }

    play() {
        this.played = true;

        return Promise.resolve(true);
    }

    pause() {
        this.paused = true;
    }
}

FakeAudio.instances = [];

function withFakeDocument(callback) {
    const originalDocument = global.document;
    global.document = new FakeDocument();

    try {
        callback();
    } finally {
        global.document = originalDocument;
    }
}

async function withFakeAudio(callback) {
    const originalAudio = global.Audio;
    FakeAudio.instances = [];
    global.Audio = FakeAudio;

    try {
        await callback(FakeAudio.instances);
    } finally {
        global.Audio = originalAudio;
    }
}

function buildGame() {
    return new EquipmentInfoGame({
        cardsNode: new FakeNode(),
        emptyStateNode: new FakeNode(),
        detailsNode: new FakeNode(),
        categoryNode: new FakeNode(),
        titleNode: new FakeNode(),
        imageNode: new FakeNode(),
        factsNode: new FakeNode(),
        repeatAudioButton: new FakeNode(),
        items: EQUIPMENT_ITEMS,
    });
}

test("equipment data contains all construction vehicles", () => {
    assert.equal(EQUIPMENT_ITEMS.length, 15);
    assert.equal(new Set(EQUIPMENT_ITEMS.map((item) => item.id)).size, 15);
    assert.deepEqual(
        [...new Set(EQUIPMENT_ITEMS.map((item) => item.category))],
        CATEGORY_NAMES,
    );
});

test("equipment image and voice assets exist", () => {
    const gameDirectory = path.join(__dirname, "..", "equipment_info_game");

    EQUIPMENT_ITEMS.forEach((item) => {
        const imagePath = path.resolve(gameDirectory, item.image);

        assert.equal(item.image, item.image.normalize("NFC"));
        assert.equal(fs.existsSync(imagePath), true, item.image);

        if (item.audio !== "") {
            const audioPath = path.resolve(gameDirectory, item.audio);

            assert.equal(item.audio, item.audio.normalize("NFC"));
            assert.equal(fs.existsSync(audioPath), true, item.audio);
        }
    });
});

test("selectItem shows vehicle text for parent reading", () => {
    withFakeDocument(() => {
        const game = buildGame();

        EquipmentInfoGame.selectItem(game, "bulldozer");

        assert.equal(game.emptyStateNode.hidden, true);
        assert.equal(game.detailsNode.hidden, false);
        assert.equal(game.categoryNode.textContent, "Землеройная техника");
        assert.equal(game.titleNode.textContent, "Бульдозер");
        assert.equal(game.imageNode.src, "../data/images/бульдозер.png");
        assert.equal(game.imageNode.alt, "Бульдозер");
        assert.equal(game.repeatAudioButton.hidden, true);
        assert.equal(game.factsNode.children[0].textContent, "Где работает:");
        assert.equal(game.factsNode.children[1].textContent, "На стройке.");
        assert.equal(game.factsNode.children[14].textContent, "Для чего нужен:");
        assert.equal(
            game.factsNode.children[15].textContent,
            "Чтобы выравнивать землю.",
        );
    });
});

test("selectItem plays available parent voice recording", async () => {
    await withFakeAudio(async (audioInstances) => {
        withFakeDocument(() => {
            const game = buildGame();

            EquipmentInfoGame.selectItem(game, "excavator");

            assert.equal(audioInstances.length, 2);
            assert.equal(audioInstances[0].src, SOUND_FILES.menuClick);
            assert.equal(audioInstances[0].played, true);
            assert.equal(
                audioInstances[1].src,
                "../data/Voice_information_about_construction_equipment/Экскаватор.m4a",
            );
            assert.equal(audioInstances[1].volume, VOICE_VOLUME);
            assert.equal(audioInstances[1].played, true);
            assert.equal(game.activeAudio, audioInstances[1]);
            assert.equal(game.repeatAudioButton.hidden, false);
        });
    });
});

test("selectItem plays click sound for silent vehicles without voice", async () => {
    await withFakeAudio(async (audioInstances) => {
        withFakeDocument(() => {
            const game = buildGame();

            EquipmentInfoGame.selectItem(game, "front-loader");

            assert.equal(audioInstances.length, 1);
            assert.equal(audioInstances[0].src, SOUND_FILES.menuClick);
            assert.equal(audioInstances[0].played, true);
            assert.equal(game.activeAudio, null);
            assert.equal(game.repeatAudioButton.hidden, true);
        });
    });
});

test("selectItem stops previous voice before changing vehicles", async () => {
    await withFakeAudio(async (audioInstances) => {
        withFakeDocument(() => {
            const game = buildGame();

            EquipmentInfoGame.selectItem(game, "truck");
            EquipmentInfoGame.selectItem(game, "roller");

            assert.equal(audioInstances.length, 3);
            assert.equal(audioInstances[0].src, SOUND_FILES.menuClick);
            assert.equal(
                audioInstances[1].src,
                "../data/Voice_information_about_construction_equipment/Грузовик.m4a",
            );
            assert.equal(audioInstances[1].paused, true);
            assert.equal(audioInstances[1].currentTime, 0);
            assert.equal(audioInstances[2].src, SOUND_FILES.menuClick);
            assert.equal(game.activeAudio, null);
        });
    });
});

test("equipment info game is the first menu card", () => {
    const hubHtml = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
    const gameHrefs = [...hubHtml.matchAll(/<a class="game-card[^"]*" href="([^"]+)"/g)]
        .map((match) => match[1]);

    assert.equal(gameHrefs[0], "equipment_info_game/index.html");
});
