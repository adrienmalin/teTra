import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import * as FPS from 'three/addons/libs/stats.module.js';

let P = (x, y, z=0) => new THREE.Vector3(x, y, z)

Array.prototype.pick = function() { return this.splice(Math.floor(Math.random()*this.length), 1)[0] }

HTMLElement.prototype.addNewChild = function(tag, properties) {
    let child = document.createElement(tag)
    for (let key in properties) {
        child[key] = properties[key]
    }
    this.appendChild(child)
}


/* Contants */

const ROWS = 24
const SKYLINE = 20
const COLUMNS = 10

const DELAY = {
    LOCK: 500,
    FALL: 1000,
}

const FACING = {
    NORTH: 0,
    EAST:  1,
    SOUTH: 2,
    WEST:  3,
}

const TRANSLATION = {
    NONE:  P( 0,  0),
    LEFT:  P(-1,  0),
    RIGHT: P( 1,  0),
    DOWN:  P( 0, -1),
}

const ROTATION = {
    CW:   1,  // ClockWise
    CCW: -1,  // CounterClockWise
}

const T_SPIN = {
    NONE:   "",
    MINI:   "PETITE<br/>PIROUETTE",
    T_SPIN: "PIROUETTE"
}

// score = AWARDED_LINE_CLEARS[tSpin][nbClearedLines]
const AWARDED_LINE_CLEARS = {
    [T_SPIN.NONE]:   [0, 1, 3, 5, 8],
    [T_SPIN.MINI]:   [1, 2],
    [T_SPIN.T_SPIN]: [4, 8, 12, 16]
}

const KEY_NAMES = {
    ["ArrowLeft"]:  "←",
    ["ArrowRight"]: "→",
    ["ArrowUp"]:    "↑",
    ["ArrowDown"]:  "↓",
    [" "]:          "Espace",
    ["Escape"]:     "Échap",
    ["Enter"]:      "Entrée",
    ["←"]:          "ArrowLeft",
    ["→"]:          "ArrowRight",
    ["↑"]:          "ArrowUp",
    ["↓"]:          "ArrowDown",
    ["Espace"]:     " ",
    ["Échap"]:      "Escape",
    ["Entrée"]:     "Enter",
}

const CLEARED_LINES_NAMES = [
    "",  
    "SOLO",
    "DUO",
    "TRIO",
    "TETRA",
]


/* Classes */

class Scheduler {
    constructor() {
        this.intervalTasks = new Map()
        this.timeoutTasks = new Map()
    }

    setInterval(func, delay, ...args) {
        this.intervalTasks.set(func, window.setInterval(func, delay, ...args))
    }

    setTimeout(func, delay, ...args) {
        this.timeoutTasks.set(func, window.setTimeout(func, delay, ...args))
    }

    clearInterval(func) {
        if (this.intervalTasks.has(func))
            window.clearInterval(this.intervalTasks.get(func))
            this.intervalTasks.delete(func)
    }

    clearTimeout(func) {
        if (this.timeoutTasks.has(func))
            window.clearTimeout(this.timeoutTasks.get(func))
            this.timeoutTasks.delete(func)
    }
}


class Matrix extends THREE.Group {
    init() {
        this.cells = Array(ROWS).fill().map(() => Array(COLUMNS))
        this.unlockedMinoes = new Set()
    }

    cellIsEmpty(p) {
        return 0 <= p.x && p.x < COLUMNS &&
               0 <= p.y && p.y < ROWS &&
               !this.cells[p.y][p.x]
    }

    lock(piece) {
        let minoes = Array.from(piece.children)
        minoes.forEach(mino => {
            mino.position.add(piece.position)
            mino.material = piece.material
            this.add(mino)
            if (this.cellIsEmpty(mino.position)) {
                this.cells[mino.position.y][mino.position.x] = mino
            }
        })
        return minoes.some(mino => mino.position.y < SKYLINE)
    }

    clearLines() {
        let nbClearedLines = 0
        for (let y=ROWS-1; y>=0; y--) {
            let row = this.cells[y]
            if (row.filter(mino => mino).length == COLUMNS) {
                nbClearedLines++
                row.forEach(mino => this.unlockedMinoes.add(mino))
                this.cells.splice(y, 1)
                this.cells.push(Array(COLUMNS))
            }
        }
        if (nbClearedLines) {
            this.cells.forEach((rows, y) => {
                rows.forEach((mino, x) => {
                    mino.position.set(x, y)
                })
            })
        }
        return nbClearedLines
    }

    updateUnlockedMinoes(delta) {
        this.unlockedMinoes.forEach(mino => {
            mino.update(delta)
            if (Math.sqrt(mino.position.x*mino.position.x + mino.position.z*mino.position.z) > 25) {
                this.remove(mino)
                this.unlockedMinoes.delete(mino)
            }
        })
    }
}


class NextQueue extends THREE.Group {
    init() {
        this.pieces = this.positions.map((position) => {
            let piece = new Tetromino.random()
            piece.position.copy(position)
            this.add(piece)
            return piece
        })
    }

    shift() {
        let fistPiece = this.pieces.shift()
        let lastPiece = new Tetromino.random()
        this.add(lastPiece)
        this.pieces.push(lastPiece)
        this.positions.forEach((position, i) => {
            this.pieces[i].position.copy(position)
        })
        return fistPiece
    }

}
NextQueue.prototype.positions = [P(0, 0), P(0, 3), P(0, 6), P(0, 9), P(0, 12)]


const GRAVITY = -20

class Mino extends THREE.Mesh {
    constructor() {
        super(Mino.prototype.geometry)
        this.velocity        = P(50-100*Math.random(), 50-100*Math.random(), 50-100*Math.random())
        this.rotationAngle   = P(Math.random(), Math.random(), Math.random()).normalize()
        this.angularVelocity = 5-10*Math.random()
        scene.add(this)
    }

    update(delta) {
        this.velocity.y += delta * GRAVITY
        this.position.addScaledVector(this.velocity, delta)
        this.rotateOnWorldAxis(this.rotationAngle, delta*this.angularVelocity)
    }
}
const minoFaceShape = new THREE.Shape()
minoFaceShape.moveTo(.1, .1)
minoFaceShape.lineTo(.1, .9)
minoFaceShape.lineTo(.9, .9)
minoFaceShape.lineTo(.9, .1)
minoFaceShape.lineTo(.1, .1)
const minoExtrudeSettings = {
	steps: 1,
	depth: .8,
	bevelEnabled: true,
	bevelThickness: .1,
	bevelSize: .1,
	bevelOffset: 0,
	bevelSegments: 1
}
Mino.prototype.geometry = new THREE.ExtrudeGeometry(minoFaceShape, minoExtrudeSettings)


class MinoMaterial extends THREE.MeshBasicMaterial {

    constructor( color ) {
        super({
            color: color,
            reflectivity: 0.9,
            envMap: minoRenderTarget.texture
            /*side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8*/
        })
    }

}

class GhostMaterial extends THREE.MeshBasicMaterial {
    
    constructor( color ) {
        super({
            side: THREE.DoubleSide,
            color: color,
            envMap: minoRenderTarget.texture,
            transparent: true,
            opacity: 0.4
        })
    }

}


class Tetromino extends THREE.Group {
    static randomBag = []
    static get random() {
        if (!this.randomBag.length) this.randomBag = [I, J, L, O, S, T, Z]
        return this.randomBag.pick()
    }

    constructor() {
        super()
        this.rotatedLast = false
        this.rotationPoint4Used = false
        this.holdEnabled = true
        for (let i=0; i<4; i++) {
            this.add(new Mino())
        }
        this.facing = 0 
        this.locked = false
    }

    set facing(facing) {
        this._facing = facing
        this.minoesPosition[this.facing].forEach(
            (position, i) => this.children[i].position.copy(position)
        )
    }

    get facing() {
        return this._facing
    }

    set locked(locked) {
        this._locked = locked
        if (locked) {
            this.children.forEach(mino => mino.material = this.lockedMaterial)
        } else {
            this.children.forEach(mino => mino.material = this.material)
        }
    }

    get locked() {
        return this._locked
    }

    canMove(translation, facing=this.facing) {
        let testPosition = this.position.clone().add(translation)
        return this.minoesPosition[facing].every(minoPosition => matrix.cellIsEmpty(minoPosition.clone().add(testPosition)))
    }
    
    move(translation, testFacing) {
        if (this.canMove(translation, testFacing)) {
            scheduler.clearTimeout(lockDown)
            this.position.add(translation)
            if (!testFacing) {
                this.rotatedLast = false
                ghost.copy(this)
            }
            if (this.canMove(TRANSLATION.DOWN)) {
                this.locked = false
                scene.add(ghost)
            } else {
                this.locked = true
                scene.remove(ghost)
                scheduler.setTimeout(lockDown, stats.lockDelay)
            }
            return true
        } else if (translation == TRANSLATION.DOWN) {
            this.locked = true
            if (!scheduler.timeoutTasks.has(lockDown))
                scheduler.setTimeout(lockDown, stats.lockDelay)
        }
    }
    
    rotate(rotation) {
        let testFacing = (this.facing + rotation + 4) % 4
        return this.srs[this.facing][rotation].some((translation, rotationPoint) => {
            if (this.move(translation, testFacing)) {
                //rotateSound.play()
                this.facing = testFacing
                this.rotatedLast = true
                if (rotationPoint == 4) this.rotationPoint4Used = true
                //favicon.href = this.favicon_href
                ghost.copy(this)
                return true
            }
        })
    }

    get tSpin() {
        return T_SPIN.NONE
    }
}
// Super Rotation System
// freedom of movement = srs[piece.facing][rotation]
Tetromino.prototype.srs = [
    { [ROTATION.CW]: [P(0, 0), P(-1, 0), P(-1,  1), P(0, -2), P(-1, -2)], [ROTATION.CCW]: [P(0, 0), P( 1, 0), P( 1,  1), P(0, -2), P( 1, -2)] },
    { [ROTATION.CW]: [P(0, 0), P( 1, 0), P( 1, -1), P(0,  2), P( 1,  2)], [ROTATION.CCW]: [P(0, 0), P( 1, 0), P( 1, -1), P(0,  2), P( 1,  2)] },
    { [ROTATION.CW]: [P(0, 0), P( 1, 0), P( 1,  1), P(0, -2), P( 1, -2)], [ROTATION.CCW]: [P(0, 0), P(-1, 0), P(-1,  1), P(0, -2), P(-1, -2)] },
    { [ROTATION.CW]: [P(0, 0), P(-1, 0), P(-1, -1), P(0,  2), P(-1,  2)], [ROTATION.CCW]: [P(0, 0), P(-1, 0), P(-1, -1), P(0,  2), P(-1,  2)] },
]
const minoRenderTarget = new THREE.WebGLCubeRenderTarget(256)
minoRenderTarget.texture.type = THREE.HalfFloatType
const minoCamera = new THREE.CubeCamera(1, 1000, minoRenderTarget)
minoCamera.position.set(5, 10)
Tetromino.prototype.lockedMaterial = new MinoMaterial( 0xffffff )

class I extends Tetromino {}
I.prototype.minoesPosition = [
    [P(-1,  0), P(0,  0), P(1,  0), P(2,  0)],
    [P( 1,  1), P(1,  0), P(1, -1), P(1, -2)],
    [P(-1, -1), P(0, -1), P(1, -1), P(2, -1)],
    [P( 0,  1), P(0,  0), P(0, -1), P(0, -2)],
]
I.prototype.srs = [
    { [ROTATION.CW]: [P(0, 0), P(-2, 0), P( 1, 0), P(-2, -1), P( 1,  2)], [ROTATION.CCW]: [P(0, 0), P(-1, 0), P( 2, 0), P(-1,  2), P( 2, -1)] },
    { [ROTATION.CW]: [P(0, 0), P(-1, 0), P( 2, 0), P(-1,  2), P( 2, -1)], [ROTATION.CCW]: [P(0, 0), P( 2, 0), P(-1, 0), P( 2,  1), P(-1, -2)] },
    { [ROTATION.CW]: [P(0, 0), P( 2, 0), P(-1, 0), P( 2,  1), P(-1, -2)], [ROTATION.CCW]: [P(0, 0), P( 1, 0), P(-2, 0), P( 1, -2), P(-2,  1)] },
    { [ROTATION.CW]: [P(0, 0), P( 1, 0), P(-2, 0), P( 1, -2), P(-2,  1)], [ROTATION.CCW]: [P(0, 0), P(-2, 0), P( 1, 0), P(-2, -1), P( 1,  2)] },
]
I.prototype.material      = new MinoMaterial( 0xafeff9 )
I.prototype.ghostMaterial = new GhostMaterial( 0xafeff9 )

class J extends Tetromino {}
J.prototype.minoesPosition = [
    [P(-1,  1), P(-1,  0), P(0, 0), P(1,  0)],
    [P( 0,  1), P( 1,  1), P(0, 0), P(0, -1)],
    [P( 1, -1), P(-1,  0), P(0, 0), P(1,  0)],
    [P( 0,  1), P(-1, -1), P(0, 0), P(0, -1)],
]
J.prototype.material      = new MinoMaterial( 0xb8b4ff )
J.prototype.ghostMaterial = new GhostMaterial( 0xb8b4ff )

class L extends Tetromino {}
L.prototype.minoesPosition = [
    [P(-1, 0), P(0, 0), P(1,  0), P( 1,  1)],
    [P(0,  1), P(0, 0), P(0, -1), P( 1, -1)],
    [P(-1, 0), P(0, 0), P(1,  0), P(-1, -1)],
    [P(0,  1), P(0, 0), P(0, -1), P(-1,  1)],
]
L.prototype.material      = new MinoMaterial( 0xfdd0b7 )
L.prototype.ghostMaterial = new GhostMaterial( 0xfdd0b7 )

class O extends Tetromino {}
O.prototype.minoesPosition = [
    [P(0, 0), P(1, 0), P(0, 1), P(1, 1)]
]
O.prototype.srs = [
    {[ROTATION.CW]: [], [ROTATION.CCW]: []}
]
O.prototype.material      = new MinoMaterial( 0xffedac )
O.prototype.ghostMaterial = new GhostMaterial( 0xffedac )

class S extends Tetromino {}
S.prototype.minoesPosition = [
    [P(-1,  0), P(0, 0), P( 0, 1), P(1,  1)],
    [P( 0,  1), P(0, 0), P( 1, 0), P(1, -1)],
    [P(-1, -1), P(0, 0), P( 1, 0), P(0, -1)],
    [P(-1,  1), P(0, 0), P(-1, 0), P(0, -1)],
]
S.prototype.material      = new MinoMaterial( 0xC8FBA8 )
S.prototype.ghostMaterial = new GhostMaterial( 0xC8FBA8 )

class T extends Tetromino {
    get tSpin() {
        if (this.rotatedLast) {
            let [a, b, c, d] = this.tSlots[piece.facing]
                .map(p => !matrix.cellIsEmpty(p.clone().add(this.position)))
            if (a && b && (c || d))
                return T_SPIN.T_SPIN
            else if (c && d && (a || b))
                return this.rotationPoint4Used ? T_SPIN.T_SPIN : T_SPIN.MINI
        }
        return T_SPIN.NONE
    }
}
T.prototype.minoesPosition = [
    [P(-1, 0), P(0, 0), P(1,  0), P( 0,  1)],
    [P( 0, 1), P(0, 0), P(1,  0), P( 0, -1)],
    [P(-1, 0), P(0, 0), P(1,  0), P( 0, -1)],
    [P( 0, 1), P(0, 0), P(0, -1), P(-1,  0)],
]
T.prototype.tSlots = [
    [P(-1,  1), P( 1,  1), P( 1, -1), P(-1, -1)],
    [P( 1,  1), P( 1, -1), P(-1, -1), P(-1,  1)],
    [P( 1, -1), P(-1, -1), P(-1,  1), P( 1,  1)],
    [P(-1, -1), P(-1,  1), P( 1,  1), P( 1, -1)],
]
T.prototype.material      = new MinoMaterial( 0xedb2ff )
T.prototype.ghostMaterial = new GhostMaterial( 0xedb2ff )

class Z extends Tetromino {}
Z.prototype.minoesPosition = [
    [P(-1,  1), P( 0, 1), P(0,  0), P( 1,  0)],
    [P( 1,  1), P( 1, 0), P(0,  0), P( 0, -1)],
    [P(-1,  0), P( 0, 0), P(0, -1), P( 1, -1)],
    [P( 0,  1), P(-1, 0), P(0,  0), P(-1, -1)]
]
Z.prototype.material      = new MinoMaterial( 0xffb8c5 )
Z.prototype.ghostMaterial = new GhostMaterial( 0xffb8c5 )

class Ghost extends Tetromino {
    copy(piece) {
        this.position.copy(piece.position)
        this.facing = piece.facing
        this.minoesPosition = piece.minoesPosition
        piece.children.forEach((mino, i) => {
            this.children[i].position.copy(mino.position)
            this.children[i].material = piece.ghostMaterial
        })
        while (this.canMove(TRANSLATION.DOWN)) this.position.y--
    }
}
Ghost.prototype.minoesPosition = [
    [P(0, 0, 0), P(0, 0, 0), P(0, 0, 0), P(0, 0, 0)],
]


class Settings {
    constructor() {
        this.form = settingsForm
        this.load()
        this.modal = new bootstrap.Modal('#settingsModal')
        settingsModal.addEventListener('shown.bs.modal', () => {
            resumeButton.focus()
        })
    }

    load() {
        for (let element of settingsForm.elements) {
            if (element.name) {
                if (localStorage[element.name]) element.value = localStorage[element.name]
            }
        }
    }

    save() {
        for (let element of settingsForm.elements) {
            if (element.name) {
                localStorage[element.name] = element.value
            }
        }
    }

    init() {
        this.form.onsubmit = newGame
        levelInput.name = "startLevel"
        levelInput.disabled = false
        titleHeader.innerHTML = "teTra"
        resumeButton.innerHTML = "Jouer"
    }

    show() {
        resumeButton.disabled = false
        settings.form.classList.remove('was-validated')
        settings.modal.show()
        settings.form.reportValidity()
    }

    getInputs() {
        for (let input of this.form.querySelectorAll("input[type='text']")) {
            this[input.name] = KEY_NAMES[input.value] || input.value
        }
        for (let input of this.form.querySelectorAll("input[type='number'], input[type='range']")) {
            this[input.name] = input.valueAsNumber
        }
        for (let input of this.form.querySelectorAll("input[type='checkbox']")) {
            this[input.name] = input.checked == true
        }
    
        this.keyBind = {}
        for (let actionName in playerActions) {
            this.keyBind[settings[actionName]] = playerActions[actionName]
        }
    }
}

function changeKey(input) {
    prevValue = input.value
    input.value = ""
    input.onkeydown = function (event) {
        event.preventDefault()
        input.value = KEY_NAMES[event.key] || event.key
        input.blur()
    }
    input.onblur = function (event) {
        if (input.value == "") input.value = prevValue
        input.onkeydown = null
        input.onblur = null
    }
}


class Stats {
    constructor() {
        this.modal = new bootstrap.Modal('#statsModal')
        restartButton.onclick = restart
        this.load()
    }

    load() {
        this.highScore = Number(localStorage["highScore"]) || 0
    }

    init() {
        this.score = 0
        this.goal = 0
        this.combo = 0
        this.b2b = 0
        this.startTime = new Date()
        this.lockDelay = DELAY.LOCK
        this.totalClearedLines = 0
        this.nbQuatris = 0
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
        if (level <= 20){
            this.fallPeriod = 1000 * Math.pow(0.8 - ((level - 1) * 0.007), level - 1)
        }
        if (level > 15)
            this.lockDelay = 500 * Math.pow(0.9, level - 15)
        levelInput.value = level
        messagesSpan.addNewChild("div", { className: "show-level-animation", innerHTML: `<h1>NIVEAU<br/>${this.level}</h1>` })
    }

    get level() {
        return this._level
    }

    set time(time) {
        this.startTime = new Date() - time
    }

    get time() {
        return new Date() - this.startTime
    }

    lockDown(nbClearedLines, tSpin) {
        this.totalClearedLines += nbClearedLines
        if (nbClearedLines == 4) this.nbQuatris++
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
            if (this.combo > this.maxCombo) this.maxCombo = this.combo
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
            if (this.b2b > this.maxB2B) this.maxB2B = this.b2b
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
        } else if (nbClearedLines && !tSpin ) {
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

    show() {
        let time = stats.time
        statsModalScoreCell.innerText           = this.score.toLocaleString()
        statsModalHighScoreCell.innerText       = this.highScore.toLocaleString()
        statsModalLevelCell.innerText           = this.level
        statsModalTimeCell.innerText            = this.timeFormat.format(time)
        statsModaltotalClearedLines.innerText   = this.totalClearedLines
        statsModaltotalClearedLinesPM.innerText = (stats.totalClearedLines * 60000 / time).toFixed(2)
        statsModalNbQuatris.innerText           = this.nbQuatris
        statsModalNbTSpin.innerText             = this.nbTSpin
        statsModalMaxCombo.innerText            = this.maxCombo
        statsModalMaxB2B.innerText              = this.maxB2B
        this.modal.show()
    }

    save() {
        localStorage["highScore"] = this.highScore
    }
}
Stats.prototype.timeFormat = new Intl.DateTimeFormat("fr-FR", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "UTC"
})


/* Scene */

const manager = new THREE.LoadingManager()
manager.onStart = function ( url, itemsLoaded, itemsTotal ) {
	messagesSpan.innerHTML = 'Chargement : 0%...'
}
manager.onLoad = function ( ) {
	restart()
    messagesSpan.innerHTML = ""
    animate()
}
manager.onProgress = function ( url, itemsLoaded, itemsTotal ) {
	messagesSpan.innerHTML = 'Chargement : ' + 100 * itemsLoaded / itemsTotal + '%...'
}
manager.onError = function ( url ) {
	messagesSpan.innerHTML = 'Erreur de chargement'
}

const scene = new THREE.Scene()

const renderer = new THREE.WebGLRenderer({
    powerPreference: "high-performance",
    antialias: true,
    stencil: false
})
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setClearColor(0x000000, 10)
document.body.appendChild(renderer.domElement)

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.set(5, 1, 16)

const controls = new OrbitControls( camera, renderer.domElement )
controls.autoRotate
controls.enableDamping
controls.maxDistance = 21
controls.keys = {}
controls.minPolarAngle = 0.9
controls.maxPolarAngle = 2.14
controls.minAzimuthAngle = 0.9 - Math.PI/2
controls.maxAzimuthAngle = 2.14 - Math.PI/2
controls.target = P(5, 10)
controls.update()

const showFPS = window.location.search.includes("fps")
const fps = new FPS.default();
if (showFPS) document.body.appendChild(fps.dom);


const GLOBAL_ROTATION = 0.0025

const darkTextureRotation = 0.0006
const darkMoveForward     = -0.0007
const darkOpacity         = 0.3

const colorFullTextureRotation = 0.0006
const colorFullMoveForward     = -0.0012
const colorFullOpacity         = 0.3

const commonCylinderGeometry = new THREE.CylinderGeometry(25, 25, 500, 12, 1, true)

// dark space full of stars - background cylinder
const darkCylinderTexture = new THREE.TextureLoader(manager).load("images/dark.jpg")
darkCylinderTexture.wrapS = THREE.RepeatWrapping
darkCylinderTexture.wrapT = THREE.MirroredRepeatWrapping
darkCylinderTexture.repeat.set(1, 1)
const darkCylinderMaterial = new THREE.MeshLambertMaterial({
    side: THREE.BackSide,
    map: darkCylinderTexture,
    blending: THREE.AdditiveBlending,
    opacity: darkOpacity
})
const darkCylinder = new THREE.Mesh(
    commonCylinderGeometry,
    darkCylinderMaterial
)
darkCylinder.position.set(5, 10, -10)
scene.add(darkCylinder)

// colourfull space full of nebulas - main universe cylinder
const colorFullCylinderTexture = new THREE.TextureLoader(manager).load("images/colorfull.jpg")
colorFullCylinderTexture.wrapS = THREE.RepeatWrapping
colorFullCylinderTexture.wrapT = THREE.MirroredRepeatWrapping
colorFullCylinderTexture.repeat.set(1, 1)
const colorFullCylinderMaterial = new THREE.MeshBasicMaterial({
    side: THREE.BackSide,
    map: colorFullCylinderTexture,
    blending: THREE.AdditiveBlending,
    opacity: colorFullOpacity
})
const colorFullCylinder = new THREE.Mesh(
    commonCylinderGeometry,
    colorFullCylinderMaterial
)
colorFullCylinder.position.set(5, 10, -10)
scene.add(colorFullCylinder)

const light = new THREE.AmbientLight(0xffffff, 2)
scene.add(light)

const edgeMaterial = new THREE.MeshBasicMaterial({
    color: 0x88abe0,
    transparent: true,
    opacity: 0.5,
    reflectivity: 0.9,
    envMap: minoRenderTarget.texture
})

const edgeShape = new THREE.Shape()
edgeShape.moveTo(-.3, SKYLINE)
edgeShape.lineTo( 0, SKYLINE)
edgeShape.lineTo( 0,  0)
edgeShape.lineTo(COLUMNS,  0)
edgeShape.lineTo(COLUMNS, SKYLINE)
edgeShape.lineTo(COLUMNS+.3, SKYLINE)
edgeShape.lineTo(COLUMNS+.3, -.3)
edgeShape.lineTo(-.3, -.3)
edgeShape.moveTo(-.3, SKYLINE)
const edgeExtrudeSettings = {
	depth: 1,
	bevelEnabled: false,
}
const edge = new THREE.Mesh(
    new THREE.ExtrudeGeometry(edgeShape, edgeExtrudeSettings),
    edgeMaterial
)
scene.add(edge)

const holdQueue = new THREE.Group()
holdQueue.position.set(-5, SKYLINE)
scene.add(holdQueue)
const matrix = new Matrix()
scene.add(matrix)
const nextQueue = new NextQueue()
nextQueue.position.set(4, SKYLINE + 3)
scene.add(nextQueue)
let ghost = new Ghost()

const lineClearSound = new Audio("audio/line_clear.ogg")
const tetrisSound    = new Audio("audio/tetris.ogg")
const music          = new Audio("https://iterations.org/files/music/remixes/Tetris_CheDDer_OC_ReMix.mp3")
music.loop = true

window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight)
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
})

let clock = new THREE.Clock()

function animate() {
    requestAnimationFrame(animate)

    darkCylinder.rotation.y += GLOBAL_ROTATION
    darkCylinderTexture.offset.y -= darkMoveForward
    darkCylinderTexture.offset.x -= darkTextureRotation

    colorFullCylinder.rotation.y += GLOBAL_ROTATION
    colorFullCylinderTexture.offset.y -= colorFullMoveForward
    colorFullCylinderTexture.offset.x -= colorFullTextureRotation

    controls.update()

    matrix.updateUnlockedMinoes(clock.getDelta())

    renderer.render(scene, camera)
    minoCamera.update(renderer, scene)

    if (showFPS) fps.update();

}


/* Game logic */

messagesSpan.onanimationend = function(event) {
    event.target.remove() 
}

let scheduler = new Scheduler()
let settings = new Settings()
let stats = new Stats()
let playing = false
//let favicon = document.querySelector("link[rel~='icon']")

function restart() {
    stats.modal.hide()
    stats.init()
    settings.init()
    holdQueue.remove(holdQueue.piece)
    holdQueue.piece = null
    if (nextQueue.pieces) nextQueue.pieces.forEach(piece => nextQueue.remove(piece))
    Array.from(matrix.children).forEach(mino => matrix.remove(mino))
    matrix.init()
    scene.remove(piece)
    piece = null
    scene.remove(ghost)
    music.currentTime = 0
    pauseSettings()
}

function pauseSettings() {
    stats.pauseTime = stats.time

    scheduler.clearInterval(fall)
    scheduler.clearTimeout(lockDown)
    scheduler.clearTimeout(repeat)
    scheduler.clearInterval(autorepeat)

    music.pause()
    document.onkeydown = null
    renderer.domElement.style.cursor = "auto"

    settings.show()
}

function newGame(event) {
    if (!settings.form.checkValidity()) {
        event.preventDefault()
        event.stopPropagation()
        settings.form.reportValidity()
        settings.form.classList.add('was-validated')
    } else {
        levelInput.name = "level"
        levelInput.disabled = true
        titleHeader.innerHTML = "PAUSE"
        resumeButton.innerHTML = "Reprendre"
        event.target.onsubmit = resume
        nextQueue.init()
        stats.level = levelInput.valueAsNumber
        localStorage["startLevel"] = levelInput.value
        playing = true
        onblur = pauseSettings
        resume(event)
    }
}

function resume(event) {
    event.preventDefault()
    event.stopPropagation()

    settings.form.reportValidity()
    settings.form.classList.add('was-validated')

    if (settings.form.checkValidity()) {
        settings.modal.hide()
        settings.getInputs()

        document.onkeydown = onkeydown
        document.onkeyup = onkeyup
    
        stats.time = stats.pauseTime

        lineClearSound.volume = settings.sfxVolume
        tetrisSound.volume    = settings.sfxVolume
        if (settings.musicVolume > 0) {
            music.volume      = settings.musicVolume
            music.play()
        }

        renderer.domElement.style.cursor = "move"

        if (piece) scheduler.setInterval(fall, stats.fallPeriod)
        else generate()
    }
}

var piece = null
function generate(heldPiece) {
    if (heldPiece) {
        piece = heldPiece
    } else {
        piece = nextQueue.shift()
    }
    piece.position.set(4, SKYLINE)
    scene.add(piece)
    ghost.copy(piece)
    scene.add(ghost)

    if (piece.canMove(TRANSLATION.NONE)) {
        scheduler.setInterval(fall, stats.fallPeriod)
    } else {
        gameOver() // block out
    }
}

let playerActions = {
    moveLeft: () => piece.move(TRANSLATION.LEFT),

    moveRight: () => piece.move(TRANSLATION.RIGHT),

    rotateClockwise: () => piece.rotate(ROTATION.CW),

    rotateCounterclockwise: () => piece.rotate(ROTATION.CCW),

    softDrop: function() {
        if (piece.move(TRANSLATION.DOWN)) stats.score++
    },

    hardDrop: function() {
        scheduler.clearTimeout(lockDown)
        //hardDropSound.play()
        while (piece.move(TRANSLATION.DOWN)) stats.score +=2
        lockDown()
    },

    hold: function() {
        if (piece.holdEnabled) {
            scheduler.clearInterval(fall)
            scheduler.clearTimeout(lockDown)
    
            let heldpiece = holdQueue.piece
            holdQueue.piece = piece
            holdQueue.piece.holdEnabled = false
            holdQueue.piece.locked = false
            holdQueue.piece.position.set(0, 0)
            holdQueue.piece.facing = FACING.NORTH
            holdQueue.add(holdQueue.piece)
            generate(heldpiece)
        }
    },
    
    pause: pauseSettings,
}

// Handle player inputs
const REPEATABLE_ACTIONS = [
    playerActions.moveLeft,
    playerActions.moveRight,
    playerActions.softDrop
]
let pressedKeys = new Set()
let actionsQueue = []

function onkeydown(event) {
    if (event.key in settings.keyBind) {
        event.preventDefault()
        if (!pressedKeys.has(event.key)) {
            pressedKeys.add(event.key)
            let action = settings.keyBind[event.key]
            action()
            if (REPEATABLE_ACTIONS.includes(action)) {
                actionsQueue.unshift(action)
                scheduler.clearTimeout(repeat)
                scheduler.clearInterval(autorepeat)
                if (action == playerActions.softDrop) scheduler.setInterval(autorepeat, settings.fallPeriod/20)
                else scheduler.setTimeout(repeat, settings.das)
            }
        }
    }
}

function repeat() {
    if (actionsQueue.length) {
        actionsQueue[0]()
        scheduler.setInterval(autorepeat, settings.arr)
    }
}

function autorepeat() {
    if (actionsQueue.length) {
        actionsQueue[0]()
    } else {
        scheduler.clearInterval(autorepeat)
    }
}

function onkeyup(event) {
    if (event.key in settings.keyBind) {
        event.preventDefault()
        pressedKeys.delete(event.key)
        let action = settings.keyBind[event.key]
        if (actionsQueue.includes(action)) {
            actionsQueue.splice(actionsQueue.indexOf(action), 1)
            if (!actionsQueue.length) {
                scheduler.clearTimeout(repeat)
                scheduler.clearInterval(autorepeat)
            }
        }
    }
}

function fall() {
    piece.move(TRANSLATION.DOWN)
}

function lockDown() {
    scheduler.clearTimeout(lockDown)
    scheduler.clearInterval(fall)

    if (matrix.lock(piece)) {
        scene.remove(piece)
        let tSpin = piece.tSpin
        let nbClearedLines = matrix.clearLines()
        if (nbClearedLines == 4 || (nbClearedLines && tSpin)) {
            tetrisSound.currentTime = 0
            if (tetrisSound.volume) tetrisSound.play()
        } else if (nbClearedLines || tSpin) {
            lineClearSound.currentTime = 0
            if(lineClearSound.volume) lineClearSound.play()
        }
        stats.lockDown(nbClearedLines, tSpin)

        generate()
    } else {
        gameOver() // lock out
    }
}

function gameOver() {
    piece.locked = false

    document.onkeydown = null
    onblur = null
    playing = false
    renderer.domElement.style.cursor = "auto"
    music.pause()

    stats.show()
}

window.onbeforeunload = function(event) {
    stats.save()
    settings.save()
    if (playing) return false
}

/*if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js')
}*/