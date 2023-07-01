import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'
import * as FPS from 'three/addons/libs/stats.module.js';

let P = (x, y, z = 0) => new THREE.Vector3(x, y, z)

Array.prototype.pick = function () { return this.splice(Math.floor(Math.random() * this.length), 1)[0] }

HTMLElement.prototype.addNewChild = function (tag, properties) {
    let child = document.createElement(tag)
    for (let key in properties) {
        child[key] = properties[key]
    }
    this.appendChild(child)
}


/* Constants */

const ROWS = 24
const SKYLINE = 20
const COLUMNS = 10

const DELAY = {
    LOCK: 500,
    FALL: 1000,
}

const COLORS = {
    I: 0xafeff9,
    J: 0xb8b4ff,
    L: 0xfdd0b7,
    O: 0xffedac,
    S: 0xC8FBA8,
    T: 0xedb2ff,
    Z: 0xffb8c5,
}

const FACING = {
    NORTH: 0,
    EAST: 1,
    SOUTH: 2,
    WEST: 3,
}

const TRANSLATION = {
    NONE: P(0, 0),
    LEFT: P(-1, 0),
    RIGHT: P(1, 0),
    DOWN: P(0, -1),
}

const ROTATION = {
    CW: 1,  // ClockWise
    CCW: -1,  // CounterClockWise
}

const T_SPIN = {
    NONE: "",
    MINI: "PETITE<br/>PIROUETTE",
    T_SPIN: "PIROUETTE"
}

// score = AWARDED_LINE_CLEARS[tSpin][nbClearedLines]
const AWARDED_LINE_CLEARS = {
    [T_SPIN.NONE]: [0, 1, 3, 5, 8],
    [T_SPIN.MINI]: [1, 2],
    [T_SPIN.T_SPIN]: [4, 8, 12, 16]
}

const KEY_NAMES = {
    ["ArrowLeft"]   : "←",
    ["ArrowRight"]  : "→",
    ["ArrowUp"]     : "↑",
    ["ArrowDown"]   : "↓",
    [" "]           : "Espace",
    ["Escape"]      : "Échap.",
    ["Backspace"]   : "Ret. arrière",
    ["Enter"]       : "Entrée",
    ["←"]           : "ArrowLeft",
    ["→"]           : "ArrowRight",
    ["↑"]           : "ArrowUp",
    ["↓"]           : "ArrowDown",
    ["Espace"]      : " ",
    ["Échap."]      : "Escape",
    ["Ret. arrière"]: "Backspace",
    ["Entrée"]      : "Enter",
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
        for (let y = ROWS - 1; y >= 0; y--) {
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
            if (Math.sqrt(mino.position.x * mino.position.x + mino.position.z * mino.position.z) > 25) {
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
NextQueue.prototype.positions = [P(0, 0), P(0, -3), P(0, -6), P(0, -9), P(0, -12), P(0, -16)]

const GRAVITY = -20

class Mino extends THREE.Mesh {
    constructor() {
        super(Mino.prototype.geometry)
        this.velocity = P(50 - 100 * Math.random(), 50 - 100 * Math.random(), 50 - 100 * Math.random())
        this.rotationAngle = P(Math.random(), Math.random(), Math.random()).normalize()
        this.angularVelocity = 5 - 10 * Math.random()
        scene.add(this)
    }

    update(delta) {
        this.velocity.y += delta * GRAVITY
        this.position.addScaledVector(this.velocity, delta)
        this.rotateOnWorldAxis(this.rotationAngle, delta * this.angularVelocity)
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

    constructor(color) {
        super({
            side: THREE.DoubleSide,
            color: color,
            reflectivity: 0.95,
            envMap: minoRenderTarget.texture,
            roughness: 0.1,
            metalness: 0.25
        })
    }

}

class GhostMaterial extends THREE.MeshBasicMaterial {

    constructor(color) {
        super({
            side: THREE.DoubleSide,
            color: color,
            envMap: minoRenderTarget.texture,
            reflectivity: 0.9,
            transparent: true,
            opacity: 0.25
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
        for (let i = 0; i < 4; i++) {
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

    canMove(translation, facing = this.facing) {
        let testPosition = this.position.clone().add(translation)
        return this.minoesPosition[facing].every(minoPosition => matrix.cellIsEmpty(minoPosition.clone().add(testPosition)))
    }

    move(translation, testFacing) {
        if (this.canMove(translation, testFacing)) {
            scheduler.clearTimeout(game.lockDown)
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
                scheduler.setTimeout(game.lockDown, stats.lockDelay)
            }
            return true
        } else if (translation == TRANSLATION.DOWN) {
            this.locked = true
            if (!scheduler.timeoutTasks.has(game.lockDown))
                scheduler.setTimeout(game.lockDown, stats.lockDelay)
        }
    }

    rotate(rotation) {
        let testFacing = (this.facing + rotation + 4) % 4
        return this.srs[this.facing][rotation].some((translation, rotationPoint) => {
            if (this.move(translation, testFacing)) {
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
    { [ROTATION.CW]: [P(0, 0), P(-1, 0), P(-1, 1), P(0, -2), P(-1, -2)], [ROTATION.CCW]: [P(0, 0), P(1, 0), P(1, 1), P(0, -2), P(1, -2)] },
    { [ROTATION.CW]: [P(0, 0), P(1, 0), P(1, -1), P(0, 2), P(1, 2)], [ROTATION.CCW]: [P(0, 0), P(1, 0), P(1, -1), P(0, 2), P(1, 2)] },
    { [ROTATION.CW]: [P(0, 0), P(1, 0), P(1, 1), P(0, -2), P(1, -2)], [ROTATION.CCW]: [P(0, 0), P(-1, 0), P(-1, 1), P(0, -2), P(-1, -2)] },
    { [ROTATION.CW]: [P(0, 0), P(-1, 0), P(-1, -1), P(0, 2), P(-1, 2)], [ROTATION.CCW]: [P(0, 0), P(-1, 0), P(-1, -1), P(0, 2), P(-1, 2)] },
]
const minoRenderTarget = new THREE.WebGLCubeRenderTarget(256)
minoRenderTarget.texture.type = THREE.HalfFloatType
const minoCamera = new THREE.CubeCamera(1, 1000, minoRenderTarget)
minoCamera.position.set(5, 10)
Tetromino.prototype.lockedMaterial = new MinoMaterial(0xffffff)

class I extends Tetromino { }
I.prototype.minoesPosition = [
    [P(-1, 0), P(0, 0), P(1, 0), P(2, 0)],
    [P(1, 1), P(1, 0), P(1, -1), P(1, -2)],
    [P(-1, -1), P(0, -1), P(1, -1), P(2, -1)],
    [P(0, 1), P(0, 0), P(0, -1), P(0, -2)],
]
I.prototype.srs = [
    { [ROTATION.CW]: [P(0, 0), P(-2, 0), P(1, 0), P(-2, -1), P(1, 2)], [ROTATION.CCW]: [P(0, 0), P(-1, 0), P(2, 0), P(-1, 2), P(2, -1)] },
    { [ROTATION.CW]: [P(0, 0), P(-1, 0), P(2, 0), P(-1, 2), P(2, -1)], [ROTATION.CCW]: [P(0, 0), P(2, 0), P(-1, 0), P(2, 1), P(-1, -2)] },
    { [ROTATION.CW]: [P(0, 0), P(2, 0), P(-1, 0), P(2, 1), P(-1, -2)], [ROTATION.CCW]: [P(0, 0), P(1, 0), P(-2, 0), P(1, -2), P(-2, 1)] },
    { [ROTATION.CW]: [P(0, 0), P(1, 0), P(-2, 0), P(1, -2), P(-2, 1)], [ROTATION.CCW]: [P(0, 0), P(-2, 0), P(1, 0), P(-2, -1), P(1, 2)] },
]
I.prototype.material = new MinoMaterial(COLORS.I)
I.prototype.ghostMaterial = new GhostMaterial(COLORS.I)

class J extends Tetromino { }
J.prototype.minoesPosition = [
    [P(-1, 1), P(-1, 0), P(0, 0), P(1, 0)],
    [P(0, 1), P(1, 1), P(0, 0), P(0, -1)],
    [P(1, -1), P(-1, 0), P(0, 0), P(1, 0)],
    [P(0, 1), P(-1, -1), P(0, 0), P(0, -1)],
]
J.prototype.material = new MinoMaterial(COLORS.J)
J.prototype.ghostMaterial = new GhostMaterial(COLORS.J)

class L extends Tetromino { }
L.prototype.minoesPosition = [
    [P(-1, 0), P(0, 0), P(1, 0), P(1, 1)],
    [P(0, 1), P(0, 0), P(0, -1), P(1, -1)],
    [P(-1, 0), P(0, 0), P(1, 0), P(-1, -1)],
    [P(0, 1), P(0, 0), P(0, -1), P(-1, 1)],
]
L.prototype.material = new MinoMaterial(COLORS.L)
L.prototype.ghostMaterial = new GhostMaterial(COLORS.L)

class O extends Tetromino { }
O.prototype.minoesPosition = [
    [P(0, 0), P(1, 0), P(0, 1), P(1, 1)]
]
O.prototype.srs = [
    { [ROTATION.CW]: [], [ROTATION.CCW]: [] }
]
O.prototype.material = new MinoMaterial(COLORS.O)
O.prototype.ghostMaterial = new GhostMaterial(COLORS.O)

class S extends Tetromino { }
S.prototype.minoesPosition = [
    [P(-1, 0), P(0, 0), P(0, 1), P(1, 1)],
    [P(0, 1), P(0, 0), P(1, 0), P(1, -1)],
    [P(-1, -1), P(0, 0), P(1, 0), P(0, -1)],
    [P(-1, 1), P(0, 0), P(-1, 0), P(0, -1)],
]
S.prototype.material = new MinoMaterial(COLORS.S)
S.prototype.ghostMaterial = new GhostMaterial(COLORS.S)

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
    [P(-1, 0), P(0, 0), P(1, 0), P(0, 1)],
    [P(0, 1), P(0, 0), P(1, 0), P(0, -1)],
    [P(-1, 0), P(0, 0), P(1, 0), P(0, -1)],
    [P(0, 1), P(0, 0), P(0, -1), P(-1, 0)],
]
T.prototype.tSlots = [
    [P(-1, 1), P(1, 1), P(1, -1), P(-1, -1)],
    [P(1, 1), P(1, -1), P(-1, -1), P(-1, 1)],
    [P(1, -1), P(-1, -1), P(-1, 1), P(1, 1)],
    [P(-1, -1), P(-1, 1), P(1, 1), P(1, -1)],
]
T.prototype.material = new MinoMaterial(COLORS.T)
T.prototype.ghostMaterial = new GhostMaterial(COLORS.T)

class Z extends Tetromino { }
Z.prototype.minoesPosition = [
    [P(-1, 1), P(0, 1), P(0, 0), P(1, 0)],
    [P(1, 1), P(1, 0), P(0, 0), P(0, -1)],
    [P(-1, 0), P(0, 0), P(0, -1), P(1, -1)],
    [P(0, 1), P(-1, 0), P(0, 0), P(-1, -1)]
]
Z.prototype.material = new MinoMaterial(COLORS.Z)
Z.prototype.ghostMaterial = new GhostMaterial(COLORS.Z)

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

function changeKey() {
    let controller = this
    let input = controller.domElement.getElementsByTagName("input")[0]
    input.select()
    input.onkeydown = function (event) {
        controller.setValue(KEY_NAMES[event.key] || event.key)
        input.blur()
    }
    input.onblur = function (event) {
        input.onkeydown = null
        input.onblur = null
        settings.bindKeys()
    }
}


class Settings {
    constructor(gui) {
        this.startLevel = 1

        this.moveLeft  = "←"
        this.moveRight = "→"
        this.rotateCCW = "w"
        this.rotateCW  = "↑"
        this.softDrop  = "↓"
        this.hardDrop  = "Espace"
        this.hold      = "c"
        this.pause     = "Échap."

        this.arrDelay = 50
        this.dasDelay = 300
        
        this.musicVolume = 50
        this.sfxVolume   = 50

        this.gui = gui.addFolder("Options").close()

        this.gui.add(this, "startLevel").name("Niveau initial").min(1).max(15).step(1)

        this.gui.keyFolder = this.gui.addFolder("Commandes").open()
        let moveLeftController = this.gui.keyFolder.add(this,"moveLeft").name('Gauche')
        moveLeftController.domElement.onclick = changeKey.bind(moveLeftController)
        let moveRightController = this.gui.keyFolder.add(this,"moveRight").name('Droite')
        moveRightController.domElement.onclick = changeKey.bind(moveRightController)
        let rotateCWController = this.gui.keyFolder.add(this,"rotateCW").name('Rotation horaire')
        rotateCWController.domElement.onclick = changeKey.bind(rotateCWController)
        let rotateCCWController = this.gui.keyFolder.add(this,"rotateCCW").name('anti-horaire')
        rotateCCWController.domElement.onclick = changeKey.bind(rotateCCWController)
        let softDropController = this.gui.keyFolder.add(this,"softDrop").name('Chute lente')
        softDropController.domElement.onclick = changeKey.bind(softDropController)
        let hardDropController = this.gui.keyFolder.add(this,"hardDrop").name('Chute rapide')
        hardDropController.domElement.onclick = changeKey.bind(hardDropController)
        let holdController = this.gui.keyFolder.add(this,"hold").name('Garder')
        holdController.domElement.onclick = changeKey.bind(holdController)
        let pauseController = this.gui.keyFolder.add(this,"pause").name('Pause')
        pauseController.domElement.onclick = changeKey.bind(pauseController)

        this.gui.delayFolder = this.gui.addFolder("Répétition automatique").open()
        this.gui.delayFolder.add(this,"arrDelay").name("ARR (ms)").min(2).max(200).step(1);
        this.gui.delayFolder.add(this,"dasDelay").name("DAS (ms)").min(100).max(500).step(5);

        this.gui.volumeFolder = this.gui.addFolder("Volume").open()
        this.gui.volumeFolder.add(this,"musicVolume").name("Musique").min(0).max(100).step(1).onChange((volume) => {
            music.setVolume(volume/100)
        })
        this.gui.volumeFolder.add(this,"sfxVolume").name("SFX").min(0).max(100).step(1).onChange((volume) => {
            lineClearSound.setVolume(volume/100)
            tetrisSound.setVolume(volume/100)
            hardDropSound.setVolume(volume/100)
        })

        this.load()
        this.bindKeys()
    }

    bindKeys() {
        this.keyBind = {}
        for (let actionName in playerActions) {
            this.keyBind[KEY_NAMES[this[actionName]] || this[actionName]] = playerActions[actionName]
        }
    }

    load() {
        if (localStorage["teTraSettings"]) this.gui.load(JSON.parse(localStorage["teTraSettings"]))
    }

    save() {
        localStorage["teTraSettings"] = JSON.stringify(this.gui.save())
    }
}


class Stats {
    constructor(parentGui) {
        this.clock = new THREE.Clock(false)
        this.clock.timeFormat = new Intl.DateTimeFormat("fr-FR", {
            hour: "numeric",
            minute: "2-digit",
            second: "2-digit",
            timeZone: "UTC"
        })
        this.elapsedTime = 0

        this.init()

        this.gui = parentGui.addFolder("Stats")
        this.gui.add(this, "level").name("Niveau").disable().listen()
        this.gui.add(this, "goal").name("Objectif").disable().listen()
        this.gui.add(this, "score").name("Score").disable().listen()
        this.gui.add(this, "highScore").name("Meilleur score").disable().listen()
        this.gui.timeController = this.gui.add(this, "time").name("Temps").disable().listen()
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
        return this.clock.timeFormat.format(this.clock.elapsedTime * 1000)
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


/* Scene */

const loadManager = new THREE.LoadingManager()
loadManager.onStart = function (url, itemsLoaded, itemsTotal) {
    loadingPercent.innerText = "0%"
}
loadManager.onProgress = function (url, itemsLoaded, itemsTotal) {
    loadingPercent.innerText = 100 * itemsLoaded / itemsTotal + '%'
}
loadManager.onLoad = function () {
    loaddingCircle.remove()
    renderer.setAnimationLoop(animate)
}
loadManager.onError = function (url) {
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
renderer.toneMapping = THREE.ACESFilmicToneMapping
document.body.appendChild(renderer.domElement)

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.set(5, 0, 16)
window.camera = camera

const controls = new OrbitControls(camera, renderer.domElement)
controls.autoRotate
controls.enableDamping   = true
controls.dampingFactor   = 0.04
controls.maxDistance     = 21
controls.keys            = {}
controls.minPolarAngle   = 0.9
controls.maxPolarAngle   = 2.14
controls.minAzimuthAngle = 0.9 - Math.PI / 2
controls.maxAzimuthAngle = 2.14 - Math.PI / 2
controls.target          = P(5, 9)
controls.update()

controls.addEventListener("start", () => renderer.domElement.style.cursor = "grabbing")
controls.addEventListener("end", () => renderer.domElement.style.cursor = "grab")

const showFPS = window.location.search.includes("fps")
const fps = new FPS.default();
if (showFPS) document.body.appendChild(fps.dom);


const GLOBAL_ROTATION = 0.15625

const darkTextureRotation = 0.0375
const darkMoveForward = -0.04375
const darkOpacity = 0.2

const colorFullTextureRotation = 0.0375
const colorFullMoveForward = -0.075
const colorFullOpacity = 0.2

const commonCylinderGeometry = new THREE.CylinderGeometry(25, 25, 500, 12, 1, true)

// dark space full of stars - background cylinder
const darkCylinderTexture = new THREE.TextureLoader(loadManager).load("images/dark.jpg")
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
const colorFullCylinderTexture = new THREE.TextureLoader(loadManager).load("images/colorfull.jpg")
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

const ambientLight = new THREE.AmbientLight(0xffffff, 2)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 3)
directionalLight.position.set(5, -30, 0)
scene.add(directionalLight)

const edgeMaterial = new THREE.MeshBasicMaterial({
    color: 0x88abe0,
    transparent: true,
    opacity: 0.5,
    reflectivity: 0.9,
    envMap: minoRenderTarget.texture
})

const edgeShape = new THREE.Shape()
edgeShape.moveTo(-.3, SKYLINE)
edgeShape.lineTo(0, SKYLINE)
edgeShape.lineTo(0, 0)
edgeShape.lineTo(COLUMNS, 0)
edgeShape.lineTo(COLUMNS, SKYLINE)
edgeShape.lineTo(COLUMNS + .3, SKYLINE)
edgeShape.lineTo(COLUMNS + .3, -.3)
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
holdQueue.position.set(-4, SKYLINE - 2)
scene.add(holdQueue)
const matrix = new Matrix()
scene.add(matrix)
const nextQueue = new NextQueue()
nextQueue.position.set(13, SKYLINE - 2)
scene.add(nextQueue)
let ghost = new Ghost()

const positionKF = new THREE.VectorKeyframeTrack('.position', [0, 1, 2], [0, 0, 0, 0, -0.2, 0, 0, 0, 0])
const clip = new THREE.AnimationClip('HardDrop', 3, [positionKF])
const animationGroup = new THREE.AnimationObjectGroup()
animationGroup.add(matrix)
animationGroup.add(edge)
const mixer = new THREE.AnimationMixer(animationGroup)
const hardDroppedMatrix = mixer.clipAction(clip)
hardDroppedMatrix.loop = THREE.LoopOnce
hardDroppedMatrix.setDuration(0.2)

let clock = new THREE.Clock()

function animate() {

    const delta = clock.getDelta()

    darkCylinder.rotation.y      += GLOBAL_ROTATION * delta
    darkCylinderTexture.offset.y -= darkMoveForward * delta
    darkCylinderTexture.offset.x -= darkTextureRotation * delta

    colorFullCylinder.rotation.y      += GLOBAL_ROTATION * delta
    colorFullCylinderTexture.offset.y -= colorFullMoveForward * delta
    colorFullCylinderTexture.offset.x -= colorFullTextureRotation * delta

    controls.update()

    matrix.updateUnlockedMinoes(delta)
    if (mixer) mixer.update(delta)

    renderer.render(scene, camera)
    minoCamera.update(renderer, scene)

    if (showFPS) fps.update();
}

window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight)
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
})


/* Game logic */

messagesSpan.onanimationend = function (event) {
    event.target.remove()
}

let piece = null

let game = {
    init: function() {
        this.playing = false

        stats.init()
        
        holdQueue.remove(holdQueue.piece)
        holdQueue.piece = null
        if (nextQueue.pieces) nextQueue.pieces.forEach(piece => nextQueue.remove(piece))
        Array.from(matrix.children).forEach(mino => matrix.remove(mino))
        matrix.init()
        scene.remove(piece)
        piece = null
        scene.remove(ghost)
        music.currentTime = 0
    },

    start: function() {
        startButton.hide()

        this.playing = true
        stats.clock.start()

        onblur = this.pause

        nextQueue.init()

        stats.level = settings.startLevel
        this.resume()
    },

    resume: function(event) {
        document.onkeydown = onkeydown
        document.onkeyup = onkeyup

        stats.clock.start()
        stats.clock.elapsedTime = stats.elapsedTime
        music.play()

        if (piece) scheduler.setInterval(game.fall, stats.fallPeriod)
        else this.generate()
    },

    generate: function(heldPiece) {
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
            scheduler.setInterval(game.fall, stats.fallPeriod)
        } else {
            game.over() // block out
        }
    },

    fall: function() {
        piece.move(TRANSLATION.DOWN)
    },
    
    lockDown: function() {
        scheduler.clearTimeout(game.lockDown)
        scheduler.clearInterval(game.fall)
    
        if (matrix.lock(piece)) {
            scene.remove(piece)
            let tSpin = piece.tSpin
            let nbClearedLines = matrix.clearLines()
            if (settings.sfxVolume) {
                if (nbClearedLines == 4 || (tSpin && nbClearedLines)) {
                    tetrisSound.currentTime = 0
                    tetrisSound.play()
                } else if (nbClearedLines || tSpin) {
                    lineClearSound.currentTime = 0
                    lineClearSound.play()
                }
            }
            stats.lockDown(nbClearedLines, tSpin)
    
            game.generate()
        } else {
            game.over() // lock out
        }
    },

    pause: function() {
        stats.elapsedTime = stats.clock.elapsedTime
        stats.clock.stop()
    
        scheduler.clearInterval(game.fall)
        scheduler.clearTimeout(game.lockDown)
        scheduler.clearTimeout(repeat)
        scheduler.clearInterval(autorepeat)
    
        music.pause()
        document.onkeydown = null
        renderer.domElement.tabIndex = 1
        renderer.domElement.onfocus = game.resume

        messagesSpan.addNewChild("div", { className: "show-level-animation", innerHTML: `<h1>PAUSE</h1>` })
    },

    over: function() {
        piece.locked = false

        document.onkeydown = null
        renderer.domElement.onblur = null
        renderer.domElement.onfocus = null
        game.playing = false
        music.pause()
        stats.clock.stop()
        localStorage["teTraHighScore"] = stats.highScore
        messagesSpan.addNewChild("div", { className: "show-level-animation", innerHTML: `<h1>GAME<br/>OVER</h1>` })
    },
}

let playerActions = {
    moveLeft: () => piece.move(TRANSLATION.LEFT),

    moveRight: () => piece.move(TRANSLATION.RIGHT),

    rotateCW: () => piece.rotate(ROTATION.CW),

    rotateCCW: () => piece.rotate(ROTATION.CCW),

    softDrop: function () {
        if (piece.move(TRANSLATION.DOWN)) stats.score++
    },

    hardDrop: function () {
        scheduler.clearTimeout(game.lockDown)
        hardDropSound.play()
        if (settings.sfxVolume) {
            hardDropSound.currentTime = 0
            hardDropSound.play()
        }
        while (piece.move(TRANSLATION.DOWN)) stats.score += 2
        game.lockDown()
        hardDroppedMatrix.reset()
        hardDroppedMatrix.play()
    },

    hold: function () {
        if (piece.holdEnabled) {
            scheduler.clearInterval(game.fall)
            scheduler.clearTimeout(game.lockDown)

            let heldpiece = holdQueue.piece
            holdQueue.piece = piece
            holdQueue.piece.holdEnabled = false
            holdQueue.piece.locked = false
            holdQueue.piece.position.set(0, 0)
            holdQueue.piece.facing = FACING.NORTH
            holdQueue.add(holdQueue.piece)
            game.generate(heldpiece)
        }
    },

    pause: game.pause,
}

// Sounds
const listener = new THREE.AudioListener()
camera.add( listener )
const audioLoader = new THREE.AudioLoader()
const music = new THREE.Audio(listener)
audioLoader.load('audio/Tetris_CheDDer_OC_ReMix.mp3', function( buffer ) {
	music.setBuffer(buffer)
	music.setLoop(true)
    music.setVolume(settings.musicVolume/100)
	music.play()
})
const lineClearSound = new THREE.Audio(listener)
audioLoader.load('audio/line-clear.wav', function( buffer ) {
    lineClearSound.setBuffer(buffer)
    lineClearSound.setVolume(settings.sfxVolume/100)
})
const tetrisSound = new THREE.Audio(listener)
audioLoader.load('audio/tetris.wav', function( buffer ) {
    tetrisSound.setBuffer(buffer)
    tetrisSound.setVolume(settings.sfxVolume/100)
})
const hardDropSound = new THREE.Audio(listener)
audioLoader.load('audio/hard-drop.wav', function( buffer ) {
    hardDropSound.setBuffer(buffer)
    hardDropSound.setVolume(settings.sfxVolume/100)
})

let scheduler = new Scheduler()
var gui = new GUI().title("teTra")
let startButton = gui.add(game, "start").name("Démarrer")
let settings  = new Settings(gui)
let stats = new Stats(gui)

game.init()

// Handle player inputs
const REPEATABLE_ACTIONS = [
    playerActions.moveLeft,
    playerActions.moveRight,
    playerActions.softDrop
]
let pressedKeys = new Set()
let actionsQueue = []

function onkeydown(event) {
    let key = event.key
    if (key in settings.keyBind) {
        event.preventDefault()
        if (!pressedKeys.has(key)) {
            pressedKeys.add(key)
            let action = settings.keyBind[key]
            action()
            if (REPEATABLE_ACTIONS.includes(action)) {
                actionsQueue.unshift(action)
                scheduler.clearTimeout(repeat)
                scheduler.clearInterval(autorepeat)
                if (action == playerActions.softDrop) scheduler.setInterval(autorepeat, settings.fallPeriod / 20)
                else scheduler.setTimeout(repeat, settings.dasDelay)
            }
        }
    }
}

function repeat() {
    if (actionsQueue.length) {
        actionsQueue[0]()
        scheduler.setInterval(autorepeat, settings.arrDelay)
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
    let key = event.key
    if (key in settings.keyBind) {
        event.preventDefault()
        pressedKeys.delete(key)
        let action = settings.keyBind[key]
        if (actionsQueue.includes(action)) {
            actionsQueue.splice(actionsQueue.indexOf(action), 1)
            if (!actionsQueue.length) {
                scheduler.clearTimeout(repeat)
                scheduler.clearInterval(autorepeat)
            }
        }
    }
}

window.onbeforeunload = function (event) {
    settings.save()
    if (game.playing) return false
}


if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js');
}