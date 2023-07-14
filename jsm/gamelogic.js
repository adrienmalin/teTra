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
    LOCKING: "white",
    GHOST: "white",
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
let minoGeometry = new THREE.ExtrudeGeometry(minoFaceShape, minoExtrudeSettings)

let minoMaterial = new THREE.MeshStandardMaterial({
    envMap: environnement,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.8,
    //reflectivity: 0.8,
    roughness: 0.1,
    metalness: 0.9,
    //attenuationDistance: 0.5,
    //ior: 2,
    //sheen: 0,
    //sheenRoughness: 1,
    //specularIntensity: 1,
    //thickness: 5,
    //transmission: 1,
})


class Mino extends THREE.Object3D {
    constructor(color, x, y, z=0) {
        super()
        this.color = color
        this.position.set(x, y, z)
        this.velocity = P(50 - 100 * Math.random(), 50 - 100 * Math.random(), 50 - 100 * Math.random())
        this.rotationAngle = P(Math.random(), Math.random(), Math.random()).normalize()
        this.angularVelocity = 5 - 10 * Math.random()
    }

    update(delta) {
        this.velocity.y += delta * GRAVITY
        this.position.addScaledVector(this.velocity, delta)
        this.rotateOnWorldAxis(this.rotationAngle, delta * this.angularVelocity)
        this.updateMatrix()
    }
}


class Tetromino extends THREE.InstancedMesh {
    static randomBag = []
    static get random() {
        if (!this.randomBag.length) this.randomBag = [I, J, L, O, S, T, Z]
        return this.randomBag.pick()
    }

    constructor() {
        super(minoGeometry, undefined, 4)
        this.material           = this.minoMaterial
        this.facing             = FACING.NORTH
        this.rotatedLast        = false
        this.rotationPoint4Used = false
        this.holdEnabled        = true
        this.locking            = false
    }

    set facing(facing) {
        this._facing = facing
        let matrix4 = new THREE.Matrix4()
        this.minoesPosition[this.facing].forEach((position, i) => {
            matrix4.setPosition(position)
            this.setMatrixAt(i, matrix4)
        })
        this.instanceMatrix.needsUpdate = true
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
        for (let i = 0; i < this.count; i++) {
            this.setColorAt(i, color)
        }
        this.instanceColor.needsUpdate = true
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
                this.parent.ghost.visible = true
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

    copy(piece) {
        this.position.copy(piece.position)
        this.minoesPosition = piece.minoesPosition
        this.facing = piece.facing
        while (this.canMove(TRANSLATION.DOWN)) this.position.y--
    }
}
Tetromino.prototype.minoMaterial = minoMaterial
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


class Ghost extends Tetromino {}
Ghost.prototype.minoMaterial = new THREE.MeshBasicMaterial({
    envMap: environnement,
    reflectivity: 0.9,
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide,
})
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


const ROWS = 24
const SKYLINE = 20
const COLUMNS = 10


class Playfield extends THREE.Group {
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

        this.ghost = new Ghost()
        this.add(this.ghost)
        this.ghost.visible = false

        this.lockedMeshes = new THREE.InstancedMesh(minoGeometry, minoMaterial, 200)
        this.add(this.lockedMeshes)

        this.freedMinoes = []
        this.freedMeshes = new THREE.InstancedMesh(minoGeometry, minoMaterial, 200)
        this.freedMeshes.count = 0
        this.add(this.freedMeshes)

        this.init()
    }

    init() {
        this.cells = Array(ROWS).fill().map(() => Array(COLUMNS))
        this.lockedMeshes.count = 0
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
            this.ghost.color = piece.freeColor
            this.ghost.copy(piece)
            this.ghost.visible = true
        }
        this._piece = piece
    }

    get piece() {
        return this._piece
    }

    lock() {
        this.piece.minoesPosition[this.piece.facing].forEach(position => {
            position = position.clone()
            position.add(this.piece.position)
            if (this.cellIsEmpty(position)) {
                this.cells[position.y][position.x] = this.piece.freeColor
            }
        })
        this.updateLockedMinoes()
        return this.piece.minoesPosition[this.piece.facing].every(position => position.y + this.piece.position.y < SKYLINE)
    }

    clearLines() {
        let nbClearedLines = this.cells.reduceRight((nbClearedLines, row, y) => {
            if (row.filter(color => color).length == COLUMNS) {
                row.forEach((color, x) => {
                    this.freedMinoes.push(new Mino(color, x, y))
                })
                this.cells.splice(y, 1)
                this.cells.push(Array(COLUMNS))
                return ++nbClearedLines
            }
            return nbClearedLines
        }, 0)
        this.updateLockedMinoes()
        return nbClearedLines
    }

    updateLockedMinoes() {
        let i = 0
        let matrix4 = new THREE.Matrix4()
        this.cells.forEach((row, y) => row.forEach((color, x) => {
            matrix4.setPosition(x, y, 0)
            this.lockedMeshes.setMatrixAt(i, matrix4)
            this.lockedMeshes.setColorAt(i, color)
            i++
        }))
        this.lockedMeshes.count = i
        this.lockedMeshes.instanceMatrix.needsUpdate = true
        this.lockedMeshes.instanceColor.needsUpdate = true
    }

    updateFreedMinoes(delta) {
        this.freedMinoes.forEach(mino => mino.update(delta))
        this.freedMinoes = this.freedMinoes.filter(mino => 
            Math.sqrt(mino.position.x * mino.position.x + mino.position.z * mino.position.z) <= 40 && mino.position.y > -50
        ) || []
        
        this.freedMeshes.count = this.freedMinoes.length
        if (this.freedMeshes.count) {
            this.freedMinoes.forEach((mino, i) => {
                this.freedMeshes.setMatrixAt(i, mino.matrix)
                this.freedMeshes.setColorAt(i, mino.color)
            })
            this.freedMeshes.instanceMatrix.needsUpdate = true
            this.freedMeshes.instanceColor.needsUpdate = true
        }
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


export { T_SPIN, FACING, TRANSLATION, ROTATION, COLORS, environnement, minoMaterial, Tetromino, I, J, L, O, S, T, Z, Playfield, HoldQueue, NextQueue }