(function () {
    const MATCH_MOVE_ANIMATION_DURATION_MS = 1500;
    const MATCH_MOVE_ANIMATION_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
    const SCORE_FLASH_ANIMATION_DURATION_MS = 420;
    const SCORE_FLIGHT_DELAY_MS = 240;
    const SCORE_FLIGHT_ANIMATION_DURATION_MS = 3200;
    const SCORE_FLIGHT_MIDDLE_OFFSET = 0.42;
    const SCORE_PANEL_BUMP_ANIMATION_DURATION_MS = 360;
    const SCORE_AWARD_ANIMATION_EASING = "cubic-bezier(0.2, 0.86, 0.32, 1)";
    const SCORE_FLIGHT_FINISH_EASING = "cubic-bezier(0.35, 0, 1, 1)";

    class GameAnimations {
        static async movePairToBottom(config) {
            const board = config.board;
            const imageCard = config.imageCard;
            const imageColumn = config.imageColumn;
            const redrawLines = config.redrawLines;
            const shadowCard = config.shadowCard;
            const shadowColumn = config.shadowColumn;
            const imageStartRect = imageCard.getBoundingClientRect();
            const shadowStartRect = shadowCard.getBoundingClientRect();

            imageColumn.append(imageCard);
            shadowColumn.append(shadowCard);
            redrawLines();

            const imageEndRect = imageCard.getBoundingClientRect();
            const shadowEndRect = shadowCard.getBoundingClientRect();

            if (!GameAnimations.shouldAnimatePairMove(imageCard, shadowCard)) {
                return;
            }

            board.classList.add("is-moving-match");
            imageCard.classList.add("is-moving-match");
            shadowCard.classList.add("is-moving-match");

            const imageAnimation = GameAnimations.animateCardMove(
                imageCard,
                imageStartRect,
                imageEndRect,
                "image",
            );
            const shadowAnimation = GameAnimations.animateCardMove(
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
            board.classList.remove("is-moving-match");
        }

        static shouldAnimatePairMove(imageCard, shadowCard) {
            if (typeof imageCard.animate !== "function") {
                return false;
            }

            if (typeof shadowCard.animate !== "function") {
                return false;
            }

            return !GameAnimations.prefersReducedMotion();
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
                    transform: GameAnimations.buildMoveTransform(
                        deltaX,
                        deltaY,
                        0,
                        0,
                    ),
                },
                {
                    offset: 0.48,
                    transform: GameAnimations.buildMoveTransform(
                        deltaX / 2,
                        deltaY / 2,
                        10,
                        rotateY,
                    ),
                },
                {
                    offset: 1,
                    transform: GameAnimations.buildMoveTransform(0, 0, 0, 0),
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

        static async playScoreAward(scorePanel, imageCard, shadowCard) {
            if (!GameAnimations.canCreateScoreImpulse()) {
                return;
            }

            if (!GameAnimations.canAnimateScoreAward(
                scorePanel,
                imageCard,
                shadowCard,
            )) {
                return;
            }

            const impulse = GameAnimations.createScoreImpulse();

            if (typeof impulse.animate !== "function") {
                return;
            }

            const startPoint = GameAnimations.scoreAwardStartPoint(imageCard, shadowCard);
            const endPoint = GameAnimations.rectCenter(scorePanel.getBoundingClientRect());

            GameAnimations.positionScoreImpulse(impulse, startPoint);
            document.body.append(impulse);

            const flashAnimation = GameAnimations.animateScoreFlash(impulse);
            await flashAnimation.finished;
            await GameAnimations.wait(SCORE_FLIGHT_DELAY_MS);

            const flightAnimation = GameAnimations.animateScoreFlight(
                impulse,
                startPoint,
                endPoint,
            );
            await flightAnimation.finished;
            impulse.remove();
        }

        static canCreateScoreImpulse() {
            if (typeof document === "undefined") {
                return false;
            }

            if (typeof document.createElement !== "function") {
                return false;
            }

            if (document.body === undefined) {
                return false;
            }

            return typeof document.body.append === "function";
        }

        static canAnimateScoreAward(scorePanel, imageCard, shadowCard) {
            if (GameAnimations.prefersReducedMotion()) {
                return false;
            }

            if (typeof scorePanel.animate !== "function") {
                return false;
            }

            if (typeof scorePanel.getBoundingClientRect !== "function") {
                return false;
            }

            if (typeof imageCard.getBoundingClientRect !== "function") {
                return false;
            }

            return typeof shadowCard.getBoundingClientRect === "function";
        }

        static createScoreImpulse() {
            const impulse = document.createElement("span");
            impulse.className = "score-impulse";
            impulse.setAttribute("aria-hidden", "true");

            return impulse;
        }

        static positionScoreImpulse(impulse, point) {
            impulse.style.left = `${point.x}px`;
            impulse.style.top = `${point.y}px`;
        }

        static scoreAwardStartPoint(imageCard, shadowCard) {
            const imagePoint = GameAnimations.rectCenter(
                imageCard.getBoundingClientRect(),
            );
            const shadowPoint = GameAnimations.rectCenter(
                shadowCard.getBoundingClientRect(),
            );

            return {
                x: (imagePoint.x + shadowPoint.x) / 2,
                y: (imagePoint.y + shadowPoint.y) / 2,
            };
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
                    transform: "translate(-50%, -50%) scale(2.15)",
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
            const middlePoint = {
                x: (startPoint.x + endPoint.x) / 2,
                y: Math.min(startPoint.y, endPoint.y) - 54,
            };

            return impulse.animate([
                {
                    easing: SCORE_AWARD_ANIMATION_EASING,
                    left: `${startPoint.x}px`,
                    opacity: 0.95,
                    top: `${startPoint.y}px`,
                    transform: "translate(-50%, -50%) scale(1)",
                },
                {
                    easing: SCORE_FLIGHT_FINISH_EASING,
                    left: `${middlePoint.x}px`,
                    offset: SCORE_FLIGHT_MIDDLE_OFFSET,
                    opacity: 1,
                    top: `${middlePoint.y}px`,
                    transform: "translate(-50%, -50%) scale(0.82)",
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

        static async bumpScorePanel(scorePanel) {
            if (!GameAnimations.canAnimateScorePanelBump(scorePanel)) {
                return;
            }

            scorePanel.classList.add("is-score-awarded");

            const animation = scorePanel.animate([
                {
                    transform: "scale(1)",
                },
                {
                    transform: "scale(1.08)",
                },
                {
                    transform: "scale(1)",
                },
            ], {
                duration: SCORE_PANEL_BUMP_ANIMATION_DURATION_MS,
                easing: SCORE_AWARD_ANIMATION_EASING,
            });

            await animation.finished;
            scorePanel.classList.remove("is-score-awarded");
        }

        static canAnimateScorePanelBump(scorePanel) {
            if (GameAnimations.prefersReducedMotion()) {
                return false;
            }

            if (typeof scorePanel.animate !== "function") {
                return false;
            }

            return scorePanel.classList !== undefined;
        }

        static wait(durationMs) {
            return new Promise((resolve) => {
                setTimeout(resolve, durationMs);
            });
        }
    }

    if (typeof window !== "undefined") {
        window.GameAnimations = GameAnimations;
    }

    if (typeof module !== "undefined") {
        module.exports = {
            GameAnimations,
        };
    }
}());
