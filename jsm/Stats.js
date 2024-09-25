import { Clock } from 'three'
import { T_SPIN } from './Tetrominoes.js'


// score = AWARDED_LINE_CLEARS[tSpin][nbClearedLines]
const AWARDED_LINE_CLEARS = {
    [T_SPIN.NONE]  : [0, 1, 3, 5, 8],
    [T_SPIN.MINI]  : [1, 2],
    [T_SPIN.T_SPIN]: [4, 8, 12, 16]
}
  
const CLEARED_LINES_NAMES = [
    "",
    "SOLO",
    "DUO",
    "TRIO",
    "TETRA",
]

const DELAY = {
    LOCK: 500,
    FALL: 1000,
}
  
  
class Stats {
    constructor() {
        this.clock = new Clock(false)
        this.timeFormat = new Intl.DateTimeFormat("fr-FR", {
            hour: "numeric",
            minute: "2-digit",
            second: "2-digit",
            timeZone: "UTC"
        })
        this.elapsedTime = 0

        this.init()
    }

    init() {
        this._level = 0
        this._score = 0
        this.goal = 0
        this.highScore = Number(localStorage["teTraHighScore"]) || 0
        this.combo = 0
        this.b2b = 0
        this.startTime = new Date()
        this.lockDelay = DELAY.LOCK
        this.totalClearedLines = 0
        this.nbTetra = 0
        this.nbTSpin = 0
        this.maxCombo = 0
        this.maxB2B = 0
    }

    set score(score) {
        this._score = score
        if (score > this.highScore) {
            this.highScore = score
        }
    }

    get score() {
        return this._score
    }

    set level(level) {
        this._level = level
        this.goal += level * 5
        if (level <= 20) this.fallPeriod = 1000 * Math.pow(0.8 - ((level - 1) * 0.007), level - 1)
        if (level > 15) this.lockDelay = 500 * Math.pow(0.9, level - 15)
        messagesSpan.addNewChild("div", { className: "show-level-animation", innerHTML: `<h1>NIVEAU<br/>${this.level}</h1>` })
    }

    get level() {
        return this._level
    }

    set combo(combo) {
        this._combo = combo
        if (combo > this.maxCombo) this.maxCombo = combo
    }

    get combo() {
        return this._combo
    }

    set b2b(b2b) {
        this._b2b = b2b
        if (b2b > this.maxB2B) this.maxB2B = b2b
    }

    get b2b() {
        return this._b2b
    }

    get time() {
        return this.timeFormat.format(this.clock.getElapsedTime() * 1000)
    }

    lockDown(nbClearedLines, tSpin) {
        this.totalClearedLines += nbClearedLines
        if (nbClearedLines == 4) this.nbTetra++
        if (tSpin == T_SPIN.T_SPIN) this.nbTSpin++

        // Cleared lines & T-Spin
        let awardedLineClears = AWARDED_LINE_CLEARS[tSpin][nbClearedLines]
        let patternScore = 100 * this.level * awardedLineClears
        if (tSpin) messagesSpan.addNewChild("div", {
            className: "rotate-in-animation",
            innerHTML: tSpin
        })
        if (nbClearedLines) messagesSpan.addNewChild("div", {
            className: "zoom-in-animation",
            innerHTML: CLEARED_LINES_NAMES[nbClearedLines]
        })
        if (patternScore) {
            messagesSpan.addNewChild("div", {
                className: "zoom-in-animation",
                style: "animation-delay: .2s",
                innerHTML: patternScore
            })
            this.score += patternScore
        }

        // Combo
        if (nbClearedLines) {
            this.combo++
            if (this.combo >= 1) {
                let comboScore = (nbClearedLines == 1 ? 20 : 50) * this.combo * this.level
                if (this.combo == 1) {
                    messagesSpan.addNewChild("div", {
                        className: "zoom-in-animation",
                        style: "animation-delay: .4s",
                        innerHTML: `COMBO<br/>${comboScore}`
                    })
                } else {
                    messagesSpan.addNewChild("div", {
                        className: "zoom-in-animation",
                        style: "animation-delay: .4s",
                        innerHTML: `COMBO x${this.combo}<br/>${comboScore}`
                    })
                }
                this.score += comboScore
            }
        } else {
            this.combo = -1
        }

        // Back to back sequence
        if ((nbClearedLines == 4) || (tSpin && nbClearedLines)) {
            this.b2b++
            if (this.b2b >= 1) {
                let b2bScore = patternScore / 2
                if (this.b2b == 1) {
                    messagesSpan.addNewChild("div", {
                        className: "zoom-in-animation",
                        style: "animation-delay: .4s",
                        innerHTML: `BOUT À BOUT<br/>${b2bScore}`
                    })
                } else {
                    messagesSpan.addNewChild("div", {
                        className: "zoom-in-animation",
                        style: "animation-delay: .4s",
                        innerHTML: `BOUT À BOUT x${this.b2b}<br/>${b2bScore}`
                    })
                }
                this.score += b2bScore
            }
        } else if (nbClearedLines && !tSpin) {
            if (this.b2b >= 1) {
                messagesSpan.addNewChild("div", {
                    className: "zoom-in-animation",
                    style: "animation-delay: .4s",
                    innerHTML: `FIN DU BOUT À BOUT`
                })
            }
            this.b2b = -1
        }

        this.goal -= awardedLineClears
        if (this.goal <= 0) this.level++
    }
}


export { Stats }