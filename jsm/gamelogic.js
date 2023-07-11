import * as THREE from 'three'
import { scheduler } from './scheduler.js'


Array.prototype.pick = function () { return this.splice(Math.floor(Math.random() * this.length), 1)[0] }

let P = (x, y, z = 0) => new THREE.Vector3(x, y, z)

const GRAVITY = -20

const COLORS = {
    I: 0xafeff9,
    J: 0xb8b4ff,
    L: 0xfdd0b7,
    O: 0xffedac,
    S: 0xC8FBA8,
    T: 0xedb2ff,
    Z: 0xffb8c5,
}

const TRANSLATION = {
    NONE : P( 0,  0),
    LEFT : P(-1,  0),
    RIGHT: P( 1,  0),
    UP   : P( 0,  1),
    DOWN : P( 0, -1),
}

const ROTATION = {
    CW: 1,  // ClockWise
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


const envRenderTarget = new THREE.WebGLCubeRenderTarget(256)
const environnement = envRenderTarget.texture
environnement.type = THREE.HalfFloatType
environnement.camera = new THREE.CubeCamera(1, 1000, envRenderTarget)
environnement.camera.position.set(5, 10)


class Mino extends THREE.Mesh {
    constructor() {
        super(Mino.prototype.geometry)
        this.velocity = P(50 - 100 * Math.random(), 50 - 100 * Math.random(), 50 - 100 * Math.random())
        this.rotationAngle = P(Math.random(), Math.random(), Math.random()).normalize()
        this.angularVelocity = 5 - 10 * Math.random()
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
            color: color,
            envMap: environnement,
            reflectivity: 0.9,
            transparent: true,
            opacity: 0.95,
            side: THREE.DoubleSide,
        })
    }
}

class GhostMaterial extends THREE.MeshBasicMaterial {
    constructor(color) {
        super({
            color: color,
            envMap: environnement,
            reflectivity: 0.9,
            transparent: true,
            opacity: 0.15,
            side: THREE.DoubleSide,
        })
    }
}


class AbstractTetromino extends THREE.Group {
    constructor() {
        super()
        for (let i = 0; i < 4; i++) {
            this.add(new Mino())
        }
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

    canMove(translation, facing=this.facing) {
        let testPosition = this.position.clone().add(translation)
        return this.minoesPosition[facing].every(minoPosition => this.parent.cellIsEmpty(minoPosition.clone().add(testPosition)))
    }
}

class Ghost extends AbstractTetromino {}
Ghost.prototype.minoesPosition = [
    [P(0, 0, 0), P(0, 0, 0), P(0, 0, 0), P(0, 0, 0)],
]

class Tetromino extends AbstractTetromino {
    static randomBag = []
    static get random() {
        if (!this.randomBag.length) this.randomBag = [I, J, L, O, S, T, Z]
        return this.randomBag.pick()
    }

    constructor() {
        super()
        this.rotatedLast        = false
        this.rotationPoint4Used = false
        this.holdEnabled        = true
        this.facing             = 0
        this.locking            = false
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
                scheduler.clearTimeout(this.onLockDown)
            } else {
                scheduler.resetTimeout(this.onLockDown, this.lockDelay)
                this.locking = true
            }
            if (this.ghost.visible) this.updateGhost()
            return true
        } else {
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

    set locking(locking) {
        if (locking) {
            this.children.forEach(mino => mino.material = this.lockedMaterial)
            this.ghost.visible = false
        } else {
            this.children.forEach(mino => mino.material = this.material)
            this.ghost.visible = true
        }
    }

    updateGhost() {
        this.ghost.position.copy(this.position)
        this.ghost.minoesPosition = this.minoesPosition
        this.ghost.facing = this.facing
        while (this.ghost.canMove(TRANSLATION.DOWN)) this.ghost.position.y--
    }

    get tSpin() {
        return T_SPIN.NONE
    }
}
// Super Rotation System
// freedom of movement = srs[this.parent.piece.facing][rotation]
Tetromino.prototype.srs = [
    { [ROTATION.CW]: [P(0, 0), P(-1, 0), P(-1, 1), P(0, -2), P(-1, -2)], [ROTATION.CCW]: [P(0, 0), P(1, 0), P(1, 1), P(0, -2), P(1, -2)] },
    { [ROTATION.CW]: [P(0, 0), P(1, 0), P(1, -1), P(0, 2), P(1, 2)], [ROTATION.CCW]: [P(0, 0), P(1, 0), P(1, -1), P(0, 2), P(1, 2)] },
    { [ROTATION.CW]: [P(0, 0), P(1, 0), P(1, 1), P(0, -2), P(1, -2)], [ROTATION.CCW]: [P(0, 0), P(-1, 0), P(-1, 1), P(0, -2), P(-1, -2)] },
    { [ROTATION.CW]: [P(0, 0), P(-1, 0), P(-1, -1), P(0, 2), P(-1, 2)], [ROTATION.CCW]: [P(0, 0), P(-1, 0), P(-1, -1), P(0, 2), P(-1, 2)] },
]
Tetromino.prototype.lockedMaterial = new MinoMaterial(0xffffff)
Tetromino.prototype.lockDelay = 500
Tetromino.prototype.ghost = new Ghost()


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


const ROWS = 24
const SKYLINE = 20
const COLUMNS = 10


class Matrix extends THREE.Group {
    constructor() {
        super()
        this.visible = false

        const edgeMaterial = new THREE.MeshBasicMaterial({
            color: 0x88abe0,
            envMap: environnement,
            transparent: true,
            opacity: 0.4,
            reflectivity: 0.9,
            refractionRatio: 0.5
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

        this.init()
    }

    init() {
        while(this.children.length > 1 ) this.remove(this.children[1])
        this.cells = Array(ROWS).fill().map(() => Array(COLUMNS))
        this.unlockedMinoes = new Set()
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
            this.add(piece.ghost)
            piece.ghost.children.forEach((mino) => {
                mino.material = piece.ghostMaterial
            })
            piece.updateGhost()
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
            mino.position.add(this.piece.position)
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
            if (Math.sqrt(mino.position.x * mino.position.x + mino.position.z * mino.position.z) > 40 || mino.position.y < -50) {
                this.remove(mino)
                this.unlockedMinoes.delete(mino)
            }
        })
    }

    update(delta) {
        this.updateUnlockedMinoes(delta)
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
NextQueue.prototype.positions = [P(0, 0), P(0, -3), P(0, -6), P(0, -9), P(0, -12), P(0, -15), P(0, -18)]


export { T_SPIN, FACING, TRANSLATION, ROTATION, COLORS, environnement, Tetromino, I, J, L, O, S, T, Z, Matrix, HoldQueue, NextQueue }