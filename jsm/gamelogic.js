import * as THREE from 'three'
import { scheduler } from './scheduler.js'


Array.prototype.pick = function () { return this.splice(Math.floor(Math.random() * this.length), 1)[0] }

let P = (x, y, z = 0) => new THREE.Vector3(x, y, z)

const GRAVITY = -30

const COLORS = {
    I: 0xafeff9,
    J: 0xb8b4ff,
    L: 0xfdd0b7,
    O: 0xffedac,
    S: 0xC8FBA8,
    T: 0xedb2ff,
    Z: 0xffb8c5,
    LOCKING: "white",
    GHOST: 0x99a9b2,
    EDGE: 0x88abe0
}

const TRANSLATION = {
    NONE : P( 0,  0),
    LEFT : P(-1,  0),
    RIGHT: P( 1,  0),
    UP   : P( 0,  1),
    DOWN : P( 0, -1),
}

const ROTATION = {
    CW:  1,  // ClockWise
    CCW: 3,  // CounterClockWise
}

const T_SPIN = {
    NONE: "",
    MINI: "PETITE<br/>PIROUETTE",
    T_SPIN: "PIROUETTE"
}

const FACING = {
    NORTH: 0,
    EAST: 1,
    SOUTH: 2,
    WEST: 3,
}


const ROWS = 24
const SKYLINE = 20
const COLUMNS = 10


const envRenderTarget = new THREE.WebGLCubeRenderTarget(256)
const environnement = envRenderTarget.texture
environnement.type = THREE.HalfFloatType
environnement.camera = new THREE.CubeCamera(1, 1000, envRenderTarget)
environnement.camera.position.set(5, 10, 0)


class InstancedMino extends THREE.InstancedMesh {
    constructor(geometry, material, count) {
        super(geometry, material, count)
        this.instances = new Set()
        this.count = 0
    }

    add(instance) {
        this.instances.add(instance)
    }

    delete(instance) {
        this.instances.delete(instance)
    }

    clear() {
        this.instances.clear()
    }

    update() {
        this.count = 0
        this.instances.forEach(mino => {
            if (mino.parent?.visible) {
                this.setColorAt(this.count, mino.color)
                this.setMatrixAt(this.count, mino.matrixWorld)
                this.count++
            }
        })
        if (this.count) {
            this.instanceColor.needsUpdate = true
            this.instanceMatrix.needsUpdate = true
        }
    }
}


class Mino extends THREE.Object3D {
    static instances = new Set()
    static mesh
    static {
        let minoFaceShape = new THREE.Shape()
        minoFaceShape.moveTo(.1, .1)
        minoFaceShape.lineTo(.1, .9)
        minoFaceShape.lineTo(.9, .9)
        minoFaceShape.lineTo(.9, .1)
        minoFaceShape.lineTo(.1, .1)
        let minoExtrudeSettings = {
            steps: 1,
            depth: .8,
            bevelEnabled: true,
            bevelThickness: .1,
            bevelSize: .1,
            bevelOffset: 0,
            bevelSegments: 1
        }
        let minoGeometry = new THREE.ExtrudeGeometry(minoFaceShape, minoExtrudeSettings)
        let minoMaterial = new THREE.MeshStandardMaterial({
            envMap: environnement,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8,
            roughness: 0.2,
            metalness: 0.9,
        })
        this.mesh = new InstancedMino(minoGeometry, minoMaterial, 2*ROWS*COLUMNS)
    }

    constructor(color) {
        super()
        this.color = color
        this.velocity = P(50 - 100 * Math.random(), 50 - 100 * Math.random(), 50 - 100 * Math.random())
        this.rotationAngle = P(Math.random(), Math.random(), Math.random()).normalize()
        this.angularVelocity = 5 - 10 * Math.random()
        this.constructor.mesh.add(this)
    }

    explode(delta) {
        this.velocity.y += delta * GRAVITY
        this.position.addScaledVector(this.velocity, delta)
        this.rotateOnWorldAxis(this.rotationAngle, delta * this.angularVelocity)
        if (Math.sqrt(this.position.x * this.position.x + this.position.z * this.position.z) > 40 || this.position.y < -50) {
            this.dispose()
            return false
        } else {
            return true
        }
    }

    dispose() {
        this.constructor.mesh.delete(this)
    }
}


class Tetromino extends THREE.Group {
    static randomBag = []
    static get random() {
        if (!this.randomBag.length) this.randomBag = [I, J, L, O, S, T, Z]
        return this.randomBag.pick()
    }

    constructor(position) {
        super()
        if (position) this.position.copy(position)
        this.minoesPosition[FACING.NORTH].forEach(() => this.add(new Mino(this.freeColor)))
        this.facing             = FACING.NORTH
        this.rotatedLast        = false
        this.rotationPoint4Used = false
        this.holdEnabled        = true
        this.locking            = false
    }

    set facing(facing) {
        this._facing = facing
        this.children.forEach((mino, i) => mino.position.copy(this.minoesPosition[facing][i]))
    }

    get facing() {
        return this._facing
    }

    set locking(locking) {
        if (locking) {
            this.color = this.lockingColor
        } else {
            this.color = this.freeColor
        }
    }

    set color(color) {
        this.children.forEach((mino) => mino.color = color)
    }

    canMove(translation, facing=this.facing) {
        let testPosition = this.position.clone().add(translation)
        return this.minoesPosition[facing].every(minoPosition => this.parent.cellIsEmpty(minoPosition.clone().add(testPosition)))
    }

    move(translation, rotatedFacing, rotationPoint) {
        if (this.canMove(translation, rotatedFacing)) {
            this.position.add(translation)
            this.rotatedLast = rotatedFacing
            if (rotatedFacing != undefined) {
                this.facing = rotatedFacing
                if (rotationPoint == 4) this.rotationPoint4Used = true
            }
            if (this.canMove(TRANSLATION.DOWN)) {
                this.locking = false
                this.parent.ghost.copy(this)
                scheduler.clearTimeout(this.onLockDown)
            } else {
                scheduler.resetTimeout(this.onLockDown, this.lockDelay)
                this.locking = true
                this.parent.ghost.visible = false
            }
            return true
        } else if (translation == TRANSLATION.DOWN) {
            this.locked = true
            if (!scheduler.timeoutTasks.has(this.onLockDown))
                scheduler.setTimeout(this.onLockDown, this.lockDelay)
        }

    }

    rotate(rotation) {
        let testFacing = (this.facing + rotation) % 4
        return this.srs[this.facing][rotation].some(
            (translation, rotationPoint) => this.move(translation, testFacing, rotationPoint)
        )
    }

    get tSpin() {
        return T_SPIN.NONE
    }
}
Tetromino.prototype.lockingColor = new THREE.Color(COLORS.LOCKING)
// Super Rotation System
// freedom of movement = srs[this.parent.piece.facing][rotation]
Tetromino.prototype.srs = [
    { [ROTATION.CW]: [P(0, 0), P(-1, 0), P(-1, 1), P(0, -2), P(-1, -2)], [ROTATION.CCW]: [P(0, 0), P(1, 0), P(1, 1), P(0, -2), P(1, -2)] },
    { [ROTATION.CW]: [P(0, 0), P(1, 0), P(1, -1), P(0, 2), P(1, 2)], [ROTATION.CCW]: [P(0, 0), P(1, 0), P(1, -1), P(0, 2), P(1, 2)] },
    { [ROTATION.CW]: [P(0, 0), P(1, 0), P(1, 1), P(0, -2), P(1, -2)], [ROTATION.CCW]: [P(0, 0), P(-1, 0), P(-1, 1), P(0, -2), P(-1, -2)] },
    { [ROTATION.CW]: [P(0, 0), P(-1, 0), P(-1, -1), P(0, 2), P(-1, 2)], [ROTATION.CCW]: [P(0, 0), P(-1, 0), P(-1, -1), P(0, 2), P(-1, 2)] },
]
Tetromino.prototype.lockDelay = 500


class Ghost extends Tetromino {
    copy(piece) {
        this.position.copy(piece.position)
        this.minoesPosition = piece.minoesPosition
        this.facing = piece.facing
        this.visible = true
        while (this.canMove(TRANSLATION.DOWN)) this.position.y--
    }
}
Ghost.prototype.freeColor = new THREE.Color(COLORS.GHOST)
Ghost.prototype.minoesPosition = [
    [P(0, 0, 0), P(0, 0, 0), P(0, 0, 0), P(0, 0, 0)],
]


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
I.prototype.freeColor = new THREE.Color(COLORS.I)

class J extends Tetromino { }
J.prototype.minoesPosition = [
    [P(-1, 1), P(-1, 0), P(0, 0), P(1, 0)],
    [P(0, 1), P(1, 1), P(0, 0), P(0, -1)],
    [P(1, -1), P(-1, 0), P(0, 0), P(1, 0)],
    [P(0, 1), P(-1, -1), P(0, 0), P(0, -1)],
]
J.prototype.freeColor = new THREE.Color(COLORS.J)

class L extends Tetromino { }
L.prototype.minoesPosition = [
    [P(-1, 0), P(0, 0), P(1, 0), P(1, 1)],
    [P(0, 1), P(0, 0), P(0, -1), P(1, -1)],
    [P(-1, 0), P(0, 0), P(1, 0), P(-1, -1)],
    [P(0, 1), P(0, 0), P(0, -1), P(-1, 1)],
]
L.prototype.freeColor = new THREE.Color(COLORS.L)

class O extends Tetromino { }
O.prototype.minoesPosition = [
    [P(0, 0), P(1, 0), P(0, 1), P(1, 1)]
]
O.prototype.srs = [
    { [ROTATION.CW]: [], [ROTATION.CCW]: [] }
]
O.prototype.freeColor = new THREE.Color(COLORS.O)

class S extends Tetromino { }
S.prototype.minoesPosition = [
    [P(-1, 0), P(0, 0), P(0, 1), P(1, 1)],
    [P(0, 1), P(0, 0), P(1, 0), P(1, -1)],
    [P(-1, -1), P(0, 0), P(1, 0), P(0, -1)],
    [P(-1, 1), P(0, 0), P(-1, 0), P(0, -1)],
]
S.prototype.freeColor = new THREE.Color(COLORS.S)

class T extends Tetromino {
    get tSpin() {
        if (this.rotatedLast) {
            let [a, b, c, d] = this.tSlots[this.facing]
                .map(p => !this.parent.cellIsEmpty(p.clone().add(this.position)))
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
T.prototype.freeColor = new THREE.Color(COLORS.T)

class Z extends Tetromino { }
Z.prototype.minoesPosition = [
    [P(-1, 1), P(0, 1), P(0, 0), P(1, 0)],
    [P(1, 1), P(1, 0), P(0, 0), P(0, -1)],
    [P(-1, 0), P(0, 0), P(0, -1), P(1, -1)],
    [P(0, 1), P(-1, 0), P(0, 0), P(-1, -1)]
]
Z.prototype.freeColor = new THREE.Color(COLORS.Z)


class Playfield extends THREE.Group {
    constructor() {
        super()
        this.visible = false

        const edgeMaterial = new THREE.MeshStandardMaterial({
            color: COLORS.EDGE,
            envMap: environnement,
            transparent: true,
            opacity: 0.2,
            roughness: 0.1,
            metalness: 0.9,
        })
        const edgeShape = new THREE.Shape()
            .moveTo(-.3, SKYLINE)
            .lineTo(0, SKYLINE)
            .lineTo(0, 0)
            .lineTo(COLUMNS, 0)
            .lineTo(COLUMNS, SKYLINE)
            .lineTo(COLUMNS + .3, SKYLINE)
            .lineTo(COLUMNS + .3, -.3)
            .lineTo(-.3, -.3)
            .moveTo(-.3, SKYLINE)
        const edge = new THREE.Mesh(
            new THREE.ExtrudeGeometry(edgeShape, {
                depth: 1,
                bevelEnabled: false,
            }),
            edgeMaterial
        )
        this.add(edge)

        const positionKF = new THREE.VectorKeyframeTrack('.position', [0, 1, 2], [0, 0, 0, 0, -0.2, 0, 0, 0, 0])
        const clip = new THREE.AnimationClip('HardDrop', 3, [positionKF])
        const animationGroup = new THREE.AnimationObjectGroup()
        animationGroup.add(this)
        this.mixer = new THREE.AnimationMixer(animationGroup)
        this.hardDropAnimation = this.mixer.clipAction(clip)
        this.hardDropAnimation.loop = THREE.LoopOnce
        this.hardDropAnimation.setDuration(0.2)

        this.freedMinoes = new Set()
    }

    init() {
        this.cells = Array(ROWS).fill().map(() => Array(COLUMNS))
        if (this.piece) this.remove(this.piece)
        this.piece = undefined

        this.ghost = new Ghost()
        this.ghost.visible = false
        this.add(this.ghost)

        this.visible = true
    }

    cellIsEmpty(p) {
        return 0 <= p.x && p.x < COLUMNS &&
            0 <= p.y && p.y < ROWS &&
            !this.cells[p.y][p.x]
    }

    set piece(piece) {
        if (piece) {
            this.add(piece)
            piece.position.set(4, SKYLINE)
            this.ghost.copy(piece)
        }
        this._piece = piece
    }

    get piece() {
        return this._piece
    }

    lock() {
        this.piece.locking = false
        let minoes = Array.from(this.piece.children)
        minoes.forEach(mino => {
            this.add(mino)
            mino.position.add(this.piece.position)
        })
        if (minoes.every(mino => mino.position.y >= SKYLINE)) return false
        return minoes.every(mino => {
            if (this.cellIsEmpty(mino.position)) {
                this.cells[mino.position.y][mino.position.x] = mino
                return true
            } else {
                return false
            }
        })
    }

    clearLines() {
        let nbClearedLines = this.cells.reduceRight((nbClearedLines, row, y) => {
            if (row.filter(color => color).length == COLUMNS) {
                row.forEach(mino => this.freedMinoes.add(mino))
                this.cells.splice(y, 1)
                this.cells.push(Array(COLUMNS))
                return ++nbClearedLines
            }
            return nbClearedLines
        }, 0)
        if (nbClearedLines) this.cells.forEach((row, y) => row.forEach((mino, x) => mino.position.set(x, y, 0)))
        return nbClearedLines
    }

    updateFreedMinoes(delta) {
        this.freedMinoes.forEach(mino => {
            if (mino.explode(delta)) this.freedMinoes.delete(this)
        })
    }

    update(delta) {
        this.updateFreedMinoes(delta)
        this.mixer?.update(delta)
    }
}


class HoldQueue extends THREE.Group {
    constructor() {
        super()
        this.position.set(-4, SKYLINE - 2)
    }

    set piece(piece) {
        if(piece) {
            piece.holdEnabled = false
            piece.locking = false
            piece.position.set(0, 0)
            piece.facing = FACING.NORTH
            this.add(piece)
        }
        this._piece = piece
    }

    get piece() {
        return this._piece
    }
}


class NextQueue extends THREE.Group {
    constructor() {
        super()
        this.position.set(13, SKYLINE - 2)
    }

    init() {
        this.clear()
        this.positions.forEach(position => this.add(new Tetromino.random(position)))
    }

    shift() {
        let fistPiece = this.children.shift()
        this.add(new Tetromino.random())
        this.positions.forEach((position, i) => this.children[i].position.copy(position))
        return fistPiece
    }

}
NextQueue.prototype.positions = [P(0, 0), P(0, -3), P(0, -6), P(0, -9), P(0, -12), P(0, -15), P(0, -18)]


export { T_SPIN, FACING, TRANSLATION, ROTATION, COLORS, environnement, Mino, Tetromino, Playfield, HoldQueue, NextQueue }