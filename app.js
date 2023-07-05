import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { T_SPIN } from './jsm/common.js'
import { Settings } from './jsm/settings.js'
import { Stats } from './jsm/stats.js'
import { Scheduler } from './jsm/utils.js'
import { TetraGUI } from './jsm/gui.js'

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
    NONE : P( 0,  0),
    LEFT : P(-1,  0),
    RIGHT: P( 1,  0),
    DOWN : P( 0, -1),
}

const ROTATION = {
    CW: 1,  // ClockWise
    CCW: -1,  // CounterClockWise
}


class Matrix extends THREE.Group {
    constructor() {
        super()
        this.init()
    }

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
        let nbClearedLines = this.cells.reduceRight((nbClearedLines, row, y) => {
            if (row.filter(mino => mino).length == COLUMNS) {
                row.forEach(mino => this.unlockedMinoes.add(mino))
                this.cells.splice(y, 1)
                this.cells.push(Array(COLUMNS))
                return ++nbClearedLines
            }
            return nbClearedLines
        }, 0)
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


const envRenderTarget = new THREE.WebGLCubeRenderTarget(256)
envRenderTarget.texture.type = THREE.HalfFloatType
const envCamera = new THREE.CubeCamera(1, 1000, envRenderTarget)
envCamera.position.set(5, 10)

class MinoMaterial extends THREE.MeshBasicMaterial {
    constructor(color) {
        super({
            side: THREE.DoubleSide,
            color: color,
            envMap: envRenderTarget.texture,
            reflectivity: 0.9,
        })
    }
}

class GhostMaterial extends THREE.MeshBasicMaterial {
    constructor(color) {
        super({
            side: THREE.DoubleSide,
            color: color,
            envMap: envRenderTarget.texture,
            reflectivity: 0.9,
            transparent: true,
            opacity: 0.2
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


/* world */

const loadingManager = new THREE.LoadingManager()
loadingManager.onStart = function (url, itemsLoaded, itemsTotal) {
    loadingPercent.innerText = "0%"
}
loadingManager.onProgress = function (url, itemsLoaded, itemsTotal) {
    loadingPercent.innerText = Math.floor(100 * itemsLoaded / itemsTotal) + '%'
}
loadingManager.onLoad = function () {
    loaddingCircle.remove()
    renderer.setAnimationLoop(animate)
    gui.startButton.show()
}
loadingManager.onError = function (url) {
    loadingPercent.innerText = "Erreur"
}

const world = {}

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

world.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
world.camera.position.set(5, 0, 16)

const controls = new OrbitControls(world.camera, renderer.domElement)
controls.autoRotate
controls.enableDamping   = true
controls.dampingFactor   = 0.04
controls.maxDistance     = 21
controls.keys            = {}
controls.minPolarAngle   = 0.9
controls.maxPolarAngle   = 2.14
controls.minAzimuthAngle = 0.9 - Math.PI / 2
controls.maxAzimuthAngle = 2.14 - Math.PI / 2
controls.target.set(5, 9, 0)
controls.update()

controls.addEventListener("start", () => renderer.domElement.style.cursor = "grabbing")
controls.addEventListener("end", () => renderer.domElement.style.cursor = "grab")


const GLOBAL_ROTATION = 0.028

const darkTextureRotation = 0.006
const darkMoveForward = 0.007

const colorFullTextureRotation = 0.006
const colorFullMoveForward = 0.02

const commonCylinderGeometry = new THREE.CylinderGeometry(25, 25, 500, 12, 1, true)

world.darkCylinder = new THREE.Mesh(
    commonCylinderGeometry,
    new THREE.MeshLambertMaterial({
        side: THREE.BackSide,
        map: new THREE.TextureLoader(loadingManager).load("images/plasma.jpg", (texture) => {
            texture.wrapS = THREE.RepeatWrapping
            texture.wrapT = THREE.MirroredRepeatWrapping
            texture.repeat.set(1, 1)
        }),
        blending: THREE.AdditiveBlending,
        opacity: 0.1
    })
)
world.darkCylinder.position.set(5, 10, -10)
scene.add(world.darkCylinder)

world.colorFullCylinder = new THREE.Mesh(
    commonCylinderGeometry,
    new THREE.MeshBasicMaterial({
        side: THREE.BackSide,
        map: new THREE.TextureLoader(loadingManager).load("images/plasma2.jpg", (texture) => {
            texture.wrapS = THREE.RepeatWrapping
            texture.wrapT = THREE.MirroredRepeatWrapping
            texture.repeat.set(2, 1)
        }),
        blending: THREE.AdditiveBlending,
        opacity: 0.6
    })
)
world.colorFullCylinder.position.set(5, 10, -10)
scene.add(world.colorFullCylinder)

world.ambientLight = new THREE.AmbientLight(0xffffff, 0.2)
scene.add(world.ambientLight)

world.directionalLight = new THREE.DirectionalLight(0xffffff, 20)
world.directionalLight.position.set(5, -100, -16)
scene.add(world.directionalLight)

const holdQueue = new THREE.Group()
holdQueue.position.set(-4, SKYLINE - 2)
scene.add(holdQueue)
const matrix = new Matrix()
scene.add(matrix)
const nextQueue = new NextQueue()
nextQueue.position.set(13, SKYLINE - 2)
scene.add(nextQueue)
let ghost = new Ghost()

const edgeMaterial = new THREE.MeshBasicMaterial({
    color: 0x88abe0,
    envMap: envRenderTarget.texture,
    transparent: true,
    opacity: 0.4,
    reflectivity: 0.9,
    refractionRatio: 0.5
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
matrix.edge = new THREE.Mesh(
    new THREE.ExtrudeGeometry(edgeShape, {
        depth: 1,
        bevelEnabled: false,
    }),
    edgeMaterial
)
matrix.edge.visible = false
scene.add(matrix.edge)

const positionKF = new THREE.VectorKeyframeTrack('.position', [0, 1, 2], [0, 0, 0, 0, -0.2, 0, 0, 0, 0])
const clip = new THREE.AnimationClip('HardDrop', 3, [positionKF])
const animationGroup = new THREE.AnimationObjectGroup()
animationGroup.add(matrix)
animationGroup.add(matrix.edge)
matrix.mixer = new THREE.AnimationMixer(animationGroup)
const hardDroppedMatrix = matrix.mixer.clipAction(clip)
hardDroppedMatrix.loop = THREE.LoopOnce
hardDroppedMatrix.setDuration(0.2)

let clock = new THREE.Clock()

function animate() {

    const delta = clock.getDelta()

    world.darkCylinder.rotation.y            += GLOBAL_ROTATION * delta
    world.darkCylinder.material.map.offset.y += darkMoveForward * delta
    world.darkCylinder.material.map.offset.x += darkTextureRotation * delta

    world.colorFullCylinder.rotation.y            += GLOBAL_ROTATION * delta
    world.colorFullCylinder.material.map.offset.y += colorFullMoveForward * delta
    world.colorFullCylinder.material.map.offset.x += colorFullTextureRotation * delta

    controls.update()

    matrix.updateUnlockedMinoes(delta)
    matrix.mixer?.update(delta)

    renderer.render(scene, world.camera)
    envCamera.update(renderer, scene)

    gui.update();
}

window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight)
    world.camera.aspect = window.innerWidth / window.innerHeight
    world.camera.updateProjectionMatrix()
})


/* Game logic */

messagesSpan.onanimationend = function (event) {
    event.target.remove()
}

let piece = null

let game = {
    playing: false,

    start: function() {
        gui.startButton.hide()
        stats.init()
        gui.stats.show()
        gui.settings.close()
        
        holdQueue.remove(holdQueue.piece)
        holdQueue.piece = null
        if (nextQueue.pieces) nextQueue.pieces.forEach(piece => nextQueue.remove(piece))
        Array.from(matrix.children).forEach(mino => matrix.remove(mino))
        matrix.init()
        scene.remove(piece)
        piece = null
        scene.remove(ghost)
        world.music.currentTime = 0
        matrix.edge.visible = true

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

        pauseSpan.className = ""
        stats.clock.start()
        stats.clock.elapsedTime = stats.elapsedTime
        world.music.play()

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
        //world.directionalLight.target = piece
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
                    world.tetrisSound.currentTime = 0
                    world.tetrisSound.play()
                } else if (nbClearedLines || tSpin) {
                    world.lineClearSound.currentTime = 0
                    world.lineClearSound.play()
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
    
        world.music.pause()
        document.onkeydown = null
        
        pauseSpan.onfocus = game.resume
        pauseSpan.className = "pause"
    },

    over: function() {
        piece.locked = false

        document.onkeydown = null
        renderer.domElement.onblur = null
        renderer.domElement.onfocus = null
        game.playing = false
        world.music.pause()
        stats.clock.stop()
        localStorage["teTraHighScore"] = stats.highScore
        messagesSpan.addNewChild("div", { className: "show-level-animation", innerHTML: `<h1>GAME<br/>OVER</h1>` })

        gui.startButton.name("Rejouer")
        gui.startButton.show()
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
        world.hardDropSound.play()
        if (settings.sfxVolume) {
            world.hardDropSound.currentTime = 0
            world.hardDropSound.play()
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
world.camera.add( listener )
const audioLoader = new THREE.AudioLoader(loadingManager)
world.music = new THREE.Audio(listener)
audioLoader.load('audio/Tetris_CheDDer_OC_ReMix.mp3', function( buffer ) {
	world.music.setBuffer(buffer)
	world.music.setLoop(true)
    world.music.setVolume(settings.musicVolume/100)
	if (game.playing) world.music.play()
})
world.lineClearSound = new THREE.Audio(listener)
audioLoader.load('audio/line-clear.ogg', function( buffer ) {
    world.lineClearSound.setBuffer(buffer)
    world.lineClearSound.setVolume(settings.sfxVolume/100)
})
world.tetrisSound = new THREE.Audio(listener)
audioLoader.load('audio/tetris.ogg', function( buffer ) {
    world.tetrisSound.setBuffer(buffer)
    world.tetrisSound.setVolume(settings.sfxVolume/100)
})
world.hardDropSound = new THREE.Audio(listener)
audioLoader.load('audio/hard-drop.wav', function( buffer ) {
    world.hardDropSound.setBuffer(buffer)
    world.hardDropSound.setVolume(settings.sfxVolume/100)
})

let scheduler = new Scheduler()
let stats = new Stats()
let settings  = new Settings(playerActions)

var gui = new TetraGUI(game, settings, stats, world)

gui.load()

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
    if (key in settings.action) {
        event.preventDefault()
        if (!pressedKeys.has(key)) {
            pressedKeys.add(key)
            let action = playerActions[settings.action[key]]
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
    if (key in settings.action) {
        event.preventDefault()
        pressedKeys.delete(key)
        let action = playerActions[settings.action[key]]
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
    gui.save()
    if (game.playing) return false
}


if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('jsm/service-worker.js');
}