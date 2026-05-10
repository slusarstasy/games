const CATEGORY_NAMES = [
    "Грузовой транспорт",
    "Подъёмная техника",
    "Землеройная техника",
    "Спецтехника для укладки и работ",
    "Транспорт для рабочих",
    "Техника для подачи материала",
];

const DETAIL_FIELDS = [
    {
        key: "workplace",
        label: "Где работает",
    },
    {
        key: "size",
        label: "Размер",
    },
    {
        key: "parts",
        label: "Части",
    },
    {
        key: "action",
        label: "Что делает",
    },
    {
        key: "process",
        label: "Как работает",
    },
    {
        key: "sound",
        label: "Звук / ощущение",
    },
    {
        key: "operator",
        label: "Кто работает",
    },
    {
        key: "purpose",
        label: "Для чего нужен",
    },
];

const VOICE_VOLUME = 1;
const GameSounds = (() => {
    if (typeof require !== "undefined") {
        return require("../shared/game-sounds.js").GameSounds;
    }

    return window.GameSounds;
})();

const EQUIPMENT_ITEMS = [
    {
        id: "dump-truck",
        title: "Самосвал",
        category: "Грузовой транспорт",
        image: "../data/images/самосвал.png",
        audio: "../data/Voice_information_about_construction_equipment/Самосвал.m4a",
        details: {
            workplace: "На стройке, в карьере.",
            size: "Большой.",
            parts: "Кабина, кузов, колёса...",
            action: "Перевозит песок, землю, камни.",
            process: "Едет → поднимает кузов → высыпает груз.",
            sound: "Гудит, шумит.",
            operator: "Водитель.",
            purpose: "Чтобы перевозить материалы.",
        },
    },
    {
        id: "concrete-mixer",
        title: "Бетономешалка",
        category: "Грузовой транспорт",
        image: "../data/images/бетономешалка.png",
        audio: "../data/Voice_information_about_construction_equipment/Бетономешалка.m4a",
        details: {
            workplace: "На стройке.",
            size: "Большая.",
            parts: "Кабина, барабан (бочка), колёса...",
            action: "Перевозит бетон.",
            process: "Бочка крутится, чтобы бетон не застыл.",
            sound: "Гудит, крутится.",
            operator: "Водитель.",
            purpose: "Чтобы привозить бетон.",
        },
    },
    {
        id: "truck",
        title: "Грузовик",
        category: "Грузовой транспорт",
        image: "../data/images/грузовик.png",
        audio: "../data/Voice_information_about_construction_equipment/Грузовик.m4a",
        details: {
            workplace: "На дороге, на стройке.",
            size: "Средний или большой.",
            parts: "Кабина, кузов, колёса...",
            action: "Перевозит разные грузы.",
            process: "Загружают → везёт → разгружают.",
            sound: "Гудит.",
            operator: "Водитель.",
            purpose: "Чтобы перевозить материалы.",
        },
    },
    {
        id: "tower-crane",
        title: "Башенный кран",
        category: "Подъёмная техника",
        image: "../data/images/башенный_кран.png",
        audio: "",
        details: {
            workplace: "На стройке.",
            size: "Очень высокий.",
            parts: "Башня, стрела, трос, крюк, кабина.",
            action: "Поднимает грузы вверх.",
            process: "Поднимает груз на тросе и переносит.",
            sound: "Жужжит, скрипит.",
            operator: "Крановщик.",
            purpose: "Чтобы поднимать тяжёлые грузы.",
        },
    },
    {
        id: "auto-crane",
        title: "Автокран",
        category: "Подъёмная техника",
        image: "../data/images/автокран.png",
        audio: "../data/Voice_information_about_construction_equipment/Автокран.m4a",
        details: {
            workplace: "На стройке.",
            size: "Большой.",
            parts: "Машина, стрела, крюк, опоры.",
            action: "Поднимает и переносит грузы.",
            process: "Выдвигает стрелу → поднимает груз.",
            sound: "Гудит.",
            operator: "Автокрановщик.",
            purpose: "Чтобы поднимать и переносить грузы.",
        },
    },
    {
        id: "lift",
        title: "Подъёмник",
        category: "Подъёмная техника",
        image: "../data/images/подъёмник.png",
        audio: "",
        details: {
            workplace: "На стройке, в зданиях.",
            size: "Средний.",
            parts: "Платформа, механизм, колёса.",
            action: "Поднимает людей.",
            process: "Платформа поднимается и опускается.",
            sound: "Жужжит.",
            operator: "Рабочий.",
            purpose: "Чтобы работать на высоте.",
        },
    },
    {
        id: "excavator",
        title: "Экскаватор",
        category: "Землеройная техника",
        image: "../data/images/экскаватор.png",
        audio: "../data/Voice_information_about_construction_equipment/Экскаватор.m4a",
        details: {
            workplace: "На стройке, в карьере.",
            size: "Большой.",
            parts: "Кабина, ковш, стрела, гусеницы.",
            action: "Копает землю.",
            process: "Ковш набирает землю и переносит.",
            sound: "Гудит, шумит.",
            operator: "Машинист.",
            purpose: "Чтобы копать и строить.",
        },
    },
    {
        id: "bulldozer",
        title: "Бульдозер",
        category: "Землеройная техника",
        image: "../data/images/бульдозер.png",
        audio: "",
        details: {
            workplace: "На стройке.",
            size: "Большой.",
            parts: "Кабина, отвал (нож), гусеницы.",
            action: "Толкает землю.",
            process: "Едет вперёд и сдвигает землю.",
            sound: "Гудит.",
            operator: "Машинист.",
            purpose: "Чтобы выравнивать землю.",
        },
    },
    {
        id: "front-loader",
        title: "Фронтальный погрузчик",
        category: "Землеройная техника",
        image: "../data/images/фронтальный_погрузчик.png",
        audio: "",
        details: {
            workplace: "На стройке.",
            size: "Средний.",
            parts: "Кабина, ковш, колёса.",
            action: "Загружает материалы.",
            process: "Набирает ковшом и поднимает.",
            sound: "Гудит.",
            operator: "Водитель.",
            purpose: "Чтобы грузить материалы.",
        },
    },
    {
        id: "roller",
        title: "Каток",
        category: "Спецтехника для укладки и работ",
        image: "../data/images/каток.png",
        audio: "",
        details: {
            workplace: "На дороге.",
            size: "Большой.",
            parts: "Кабина, валик...",
            action: "Утрамбовывает дорогу.",
            process: "Едет и прижимает поверхность.",
            sound: "Гудит.",
            operator: "Водитель.",
            purpose: "Чтобы сделать дорогу ровной.",
        },
    },
    {
        id: "asphalt-paver",
        title: "Асфальтоукладчик",
        category: "Спецтехника для укладки и работ",
        image: "../data/images/асфальтоукладчик.png",
        audio: "",
        details: {
            workplace: "На дороге.",
            size: "Большой.",
            parts: "Кабина, бункер, механизм, гусеницы.",
            action: "Кладёт асфальт.",
            process: "Разравнивает горячий асфальт.",
            sound: "Гудит.",
            operator: "Рабочий.",
            purpose: "Чтобы строить дороги.",
        },
    },
    {
        id: "crew-bus",
        title: "Вахтовый автобус",
        category: "Транспорт для рабочих",
        image: "../data/images/вахтовый_автобус.png",
        audio: "",
        details: {
            workplace: "На дороге.",
            size: "Большой.",
            parts: "Кабина, салон, колёса...",
            action: "Перевозит рабочих.",
            process: "Едет и везёт людей.",
            sound: "Гудит.",
            operator: "Водитель.",
            purpose: "Чтобы доставлять рабочих.",
        },
    },
    {
        id: "microbus",
        title: "Микроавтобус",
        category: "Транспорт для рабочих",
        image: "../data/images/микроавтобус.png",
        audio: "",
        details: {
            workplace: "На дороге.",
            size: "Маленький или средний.",
            parts: "Кабина, салон, колёса...",
            action: "Перевозит людей.",
            process: "Едет по дороге.",
            sound: "Гудит.",
            operator: "Водитель.",
            purpose: "Чтобы перевозить людей.",
        },
    },
    {
        id: "concrete-pump",
        title: "Бетононасос",
        category: "Техника для подачи материала",
        image: "../data/images/бетононасос.png",
        audio: "",
        details: {
            workplace: "На стройке.",
            size: "Большой.",
            parts: "Машина, стрела, труба...",
            action: "Подаёт бетон.",
            process: "Перекачивает бетон по трубе.",
            sound: "Гудит.",
            operator: "Рабочий.",
            purpose: "Чтобы подавать бетон на высоту.",
        },
    },
    {
        id: "mortar-pump",
        title: "Растворонасос",
        category: "Техника для подачи материала",
        image: "../data/images/растворонасос.png",
        audio: "",
        details: {
            workplace: "На стройке.",
            size: "Средний.",
            parts: "Корпус, насос, шланг.",
            action: "Подаёт раствор.",
            process: "Перекачивает раствор через шланг.",
            sound: "Жужжит.",
            operator: "Рабочий.",
            purpose: "Чтобы подавать раствор.",
        },
    },
];

class EquipmentInfoGame {
    constructor(config) {
        this.cardsNode = config.cardsNode;
        this.emptyStateNode = config.emptyStateNode;
        this.detailsNode = config.detailsNode;
        this.categoryNode = config.categoryNode;
        this.titleNode = config.titleNode;
        this.imageNode = config.imageNode;
        this.factsNode = config.factsNode;
        this.listenAudioButton = config.listenAudioButton;
        this.pauseAudioButton = config.pauseAudioButton;
        this.items = config.items;
        this.selectedItemId = "";
        this.activeAudio = null;
    }

    start() {
        EquipmentInfoGame.renderCards(this);
        EquipmentInfoGame.bindListen(this);
        EquipmentInfoGame.bindPause(this);
    }

    static renderCards(game) {
        EquipmentInfoGame.clearNode(game.cardsNode);

        CATEGORY_NAMES.forEach((category) => {
            const categoryItems = game.items.filter((item) => item.category === category);

            if (categoryItems.length === 0) {
                return;
            }

            game.cardsNode.append(EquipmentInfoGame.buildCategorySection(
                category,
                categoryItems,
                game,
            ));
        });
    }

    static buildCategorySection(category, items, game) {
        const section = document.createElement("section");
        section.className = "equipment-category";

        const heading = document.createElement("h2");
        heading.textContent = category;

        const cards = document.createElement("div");
        cards.className = "equipment-cards";

        items.forEach((item) => {
            cards.append(EquipmentInfoGame.buildCard(item, game));
        });

        section.append(heading, cards);

        return section;
    }

    static buildCard(item, game) {
        const button = document.createElement("button");
        button.className = "equipment-card";
        button.type = "button";
        button.dataset.id = item.id;
        button.setAttribute("aria-label", `Открыть: ${item.title}`);

        const image = document.createElement("img");
        image.src = item.image;
        image.alt = "";
        image.draggable = false;

        const title = document.createElement("span");
        title.textContent = item.title;

        button.append(image, title);
        button.addEventListener("click", () => EquipmentInfoGame.selectItem(
            game,
            item.id,
        ));

        return button;
    }

    static bindListen(game) {
        game.listenAudioButton.addEventListener("click", () => {
            EquipmentInfoGame.playSelectedAudio(game);
        });
    }

    static bindPause(game) {
        game.pauseAudioButton.addEventListener("click", () => {
            EquipmentInfoGame.pauseSelectedAudio(game);
        });
    }

    static selectItem(game, itemId) {
        const item = EquipmentInfoGame.findItem(game.items, itemId);

        game.selectedItemId = item.id;
        EquipmentInfoGame.stopActiveAudio(game);
        EquipmentInfoGame.playSelectionSound();
        EquipmentInfoGame.showItem(game, item);
        EquipmentInfoGame.setActiveCard(game, item.id);

        return EquipmentInfoGame.playItemAudio(game, item);
    }

    static findItem(items, itemId) {
        const item = items.find((candidate) => candidate.id === itemId);

        if (item === undefined) {
            throw new Error(`Unknown equipment item: ${itemId}`);
        }

        return item;
    }

    static showItem(game, item) {
        game.emptyStateNode.hidden = true;
        game.detailsNode.hidden = false;
        game.categoryNode.textContent = item.category;
        game.titleNode.textContent = item.title;
        game.imageNode.src = item.image;
        game.imageNode.alt = item.title;
        game.listenAudioButton.hidden = item.audio === "";
        game.pauseAudioButton.hidden = item.audio === "";
        EquipmentInfoGame.renderFacts(game.factsNode, item);
    }

    static renderFacts(factsNode, item) {
        EquipmentInfoGame.clearNode(factsNode);

        DETAIL_FIELDS.forEach((field) => {
            const term = document.createElement("dt");
            term.textContent = `${field.label}:`;

            const value = document.createElement("dd");
            value.textContent = item.details[field.key];

            factsNode.append(term, value);
        });
    }

    static setActiveCard(game, itemId) {
        game.cardsNode.querySelectorAll(".equipment-card").forEach((card) => {
            card.classList.toggle("is-selected", card.dataset.id === itemId);
        });
    }

    static playSelectedAudio(game) {
        if (game.selectedItemId === "") {
            return Promise.resolve(false);
        }

        const item = EquipmentInfoGame.findItem(game.items, game.selectedItemId);

        if (game.activeAudio !== null && game.activeAudio.ended !== true) {
            return EquipmentInfoGame.playAudio(game.activeAudio);
        }

        EquipmentInfoGame.stopActiveAudio(game);

        return EquipmentInfoGame.playItemAudio(game, item);
    }

    static pauseSelectedAudio(game) {
        if (game.activeAudio === null) {
            return false;
        }

        game.activeAudio.pause();
        return true;
    }

    static playSelectionSound() {
        return GameSounds.playMenuClick();
    }

    static playItemAudio(game, item) {
        if (item.audio === "" || typeof Audio === "undefined") {
            return Promise.resolve(false);
        }

        const audio = new Audio(item.audio);
        audio.volume = VOICE_VOLUME;
        game.activeAudio = audio;

        return EquipmentInfoGame.playAudio(audio);
    }

    static playAudio(audio) {
        const playback = audio.play();

        if (playback === undefined) {
            return Promise.resolve(true);
        }

        return playback
            .then(() => true)
            .catch(() => false);
    }

    static stopActiveAudio(game) {
        if (game.activeAudio === null) {
            return;
        }

        game.activeAudio.pause();
        game.activeAudio.currentTime = 0;
        game.activeAudio = null;
    }

    static clearNode(node) {
        while (node.firstChild !== null) {
            node.firstChild.remove();
        }
    }
}

function main() {
    const game = new EquipmentInfoGame({
        cardsNode: document.querySelector("#equipment-list"),
        emptyStateNode: document.querySelector("#empty-state"),
        detailsNode: document.querySelector("#equipment-details"),
        categoryNode: document.querySelector("#equipment-category"),
        titleNode: document.querySelector("#equipment-title"),
        imageNode: document.querySelector("#equipment-image"),
        factsNode: document.querySelector("#equipment-facts"),
        listenAudioButton: document.querySelector("#listen-audio"),
        pauseAudioButton: document.querySelector("#pause-audio"),
        items: EQUIPMENT_ITEMS,
    });

    game.start();
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
    main();
}

if (typeof module !== "undefined") {
    module.exports = {
        CATEGORY_NAMES,
        DETAIL_FIELDS,
        EQUIPMENT_ITEMS,
        EquipmentInfoGame,
        VOICE_VOLUME,
        main,
    };
}
