import * as THREE from 'three'
import { scheduler } from './scheduler.js'
import { TileMaterial } from './TileMaterial.js'


Array.prototype.pick = function () { return this.splice(Math.floor(Math.random() * this.length), 1)[0] }

let P = (x, y, z=0) => new THREE.Vector3(x, y, z)

const GRAVITY = -30

const COLORS = {
    I: 0xafeff9,
    J: 0xb8b4ff,
    L: 0xfdd0b7,
    O: 0xffedac,
    S: 0xC8FBA8,
    T: 0xedb2ff,
    Z: 0xffb8c5,
    LOCKING: 0xffffff,
    GHOST: 0x99a9b2,
    EDGE: 0x88abe0,
    RETRO: 0xd0d4c1,
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
const environment = envRenderTarget.texture
environment.type = THREE.HalfFloatType
environment.camera = new THREE.CubeCamera(1, 1000, envRenderTarget)
environment.camera.position.set(5, 10, 0)


const sideMaterial = new THREE.MeshStandardMaterial({
    color: 0x222222,
    roughness: 0.8,
    metalness: 0.8,
})


export class InstancedMino extends THREE.InstancedMesh {
    constructor() {
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
        const geometry = new THREE.ExtrudeGeometry(minoFaceShape, minoExtrudeSettings)
        super(geometry, undefined, 2*ROWS*COLUMNS)
        this.offsets = new Uint8Array(2*this.count)
        this.count = 0
    }

    set theme(theme) {
        if (theme == "Rétro") {
            this.resetColor()
            this.update = this.updateOffset
            if (this.materials["Rétro"]) {
                this.material = this.materials["Rétro"]
            } else {
                this.materials["Rétro"] = []
                const loadingManager = new THREE.LoadingManager(() => this.material = this.materials["Rétro"])
                new THREE.TextureLoader(loadingManager).load("images/sprites.png", (texture) => {
                    this.materials.Rétro[0] = this.materials.Rétro[2] = new TileMaterial({
                        color: COLORS.RETRO,
                        map: texture,
                        bumpMap: texture,
                        bumpScale: 1.4,
                        roughness: 0.25,
                        metalness: 0.9,
                        transparent: true,
                    }, 8, 8)
                })
                new THREE.TextureLoader(loadingManager).load("images/edges.png", (texture) => {
                    this.materials.Rétro[1] = this.materials.Rétro[3] = this.materials.Rétro[4] = this.materials.Rétro[5] = new TileMaterial({
                        color: COLORS.RETRO,
                        map: texture,
                        bumpMap: texture,
                        bumpScale: 1.4,
                        roughness: 0.25,
                        metalness: 0.9,
                        transparent: true,
                    }, 1, 1)
                })
            }
        } else {
            this.update = this.updateColor
            this.material = this.materials[theme]
        }
    }

    setOffsetAt(index, offset) {
        this.offsets[2*index] = offset.x
        this.offsets[2*index + 1] = offset.y
    }

    resetColor() {
        this.instanceColor = null
    }

    updateColor() {
        this.count = 0
        Mino.instances.forEach(mino => {
            if (mino.parent?.visible) {
                this.setMatrixAt(this.count, mino.matrixWorld)
                this.setColorAt(this.count, mino.color)
                this.count++
            }
        })
        if (this.count) {
            this.instanceMatrix.needsUpdate = true
            this.instanceColor.needsUpdate = true
        }
    }

    updateOffset() {
        this.count = 0
        Mino.instances.forEach(mino => {
            if (mino.parent?.visible) {
                this.setMatrixAt(this.count, mino.matrixWorld)
                this.setOffsetAt(this.count, mino.offset)
                this.count++
            }
        })
        if (this.count) {
            this.instanceMatrix.needsUpdate = true
            this.geometry.setAttribute('offset', new THREE.InstancedBufferAttribute(this.offsets, 2))
        }
    }
}
InstancedMino.prototype.materials = {
    Plasma: new THREE.MeshStandardMaterial({
        envMap: environment,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7,
        roughness: 0.6,
        metalness: 1,
    }),
    Espace: new THREE.MeshStandardMaterial({
        envMap: environment,
        side: THREE.DoubleSide,
        transparent: true,
        opacity:   0.8,
        roughness: 0.1,
        metalness: 0.99,
    })
}


class Mino extends THREE.Object3D {
    static instances = new Set()

    constructor(color, offset) {
        super()
        this.color = color
        this.offset = offset
        this.velocity = P(50 - 100 * Math.random(), 60 - 100 * Math.random(), 50 - 100 * Math.random())
        this.rotationAngle = P(Math.random(), Math.random(), Math.random()).normalize()
        this.angularVelocity = 5 - 10 * Math.random()
        this.constructor.instances.add(this)
    }

    explode(delta) {
        this.velocity.y += delta * GRAVITY
        this.position.addScaledVector(this.velocity, delta)
        this.rotateOnWorldAxis(this.rotationAngle, delta * this.angularVelocity)
        if (Math.sqrt(this.position.x * this.position.x + this.position.z * this.position.z) > 40 || this.position.y < -50) {
            this.dispose()
            return true
        } else {
            return false
        }
    }

    dispose() {
        this.constructor.instances.delete(this)
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
        this.offset             = this.offset.clone()
        this.minoesPosition[FACING.NORTH].forEach(() => this.add(new Mino(this.freeColor, this.offset)))
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
            this.offset.y = 2
        } else {
            this.color = this.freeColor
            this.offset.y = 0
        }
    }

    set color(color) {
        this.children.forEach((mino) => mino.color = color)
    }

    canMove(translation, facing=this.facing) {
        let testPosition = this.position.clone().add(translation)
        return this.minoesPosition[facing].every(minoPosition => this.parent?.cellIsEmpty(minoPosition.clone().add(testPosition)))
    }

    move(translation, rotatedFacing) {
        if (this.canMove(translation, rotatedFacing)) {
            this.position.add(translation)
            this.rotatedLast = rotatedFacing
            if (rotatedFacing != undefined) {
                this.facing = rotatedFacing
            }
            if (this.canMove(TRANSLATION.DOWN)) {
                this.locking = false
                this.parent?.ghost.copy(this)
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
                scheduler.resetTimeout(this.onLockDown, this.lockDelay)
        }

    }

    rotate(rotation) {
        let testFacing = (this.facing + rotation) % 4
        return this.srs[this.facing][rotation].some((translation, rotationPoint) => {
            if (this.move(translation, testFacing)) {
                if (rotationPoint == 4) this.rotationPoint4Used = true
                return true
            }
        })
    }

    get tSpin() {
        return T_SPIN.NONE
    }
}
Tetromino.prototype.lockingColor = new THREE.Color(COLORS.LOCKING)
// Super Rotation System
// freedom of movement = srs[this.facing][rotation]
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
        this.children.forEach(mino => {mino.offset = piece.ghostOffset})
        this.facing = piece.facing
        this.visible = true
        while (this.canMove(TRANSLATION.DOWN)) this.position.y--
    }
}
Ghost.prototype.freeColor = new THREE.Color(COLORS.GHOST)
Ghost.prototype.minoesPosition = [
    [P(0, 0, 0), P(0, 0, 0), P(0, 0, 0), P(0, 0, 0)],
]
Ghost.prototype.offset = P(0, 1)


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
I.prototype.offset = P(0, 0)
I.prototype.ghostOffset = P(0, 1)

class J extends Tetromino { }
J.prototype.minoesPosition = [
    [P(-1, 1), P(-1, 0), P(0, 0), P(1, 0)],
    [P(0, 1), P(1, 1), P(0, 0), P(0, -1)],
    [P(1, -1), P(-1, 0), P(0, 0), P(1, 0)],
    [P(0, 1), P(-1, -1), P(0, 0), P(0, -1)],
]
J.prototype.freeColor = new THREE.Color(COLORS.J)
J.prototype.offset = P(1, 0)
J.prototype.ghostOffset = P(1, 1)

class L extends Tetromino {
}
L.prototype.minoesPosition = [
    [P(-1, 0), P(0, 0), P(1, 0), P(1, 1)],
    [P(0, 1), P(0, 0), P(0, -1), P(1, -1)],
    [P(-1, 0), P(0, 0), P(1, 0), P(-1, -1)],
    [P(0, 1), P(0, 0), P(0, -1), P(-1, 1)],
]
L.prototype.freeColor = new THREE.Color(COLORS.L)
L.prototype.offset = P(2, 0)
L.prototype.ghostOffset = P(2, 1)

class O extends Tetromino { }
O.prototype.minoesPosition = [
    [P(0, 0), P(1, 0), P(0, 1), P(1, 1)]
]
O.prototype.srs = [
    { [ROTATION.CW]: [], [ROTATION.CCW]: [] }
]
O.prototype.freeColor = new THREE.Color(COLORS.O)
O.prototype.offset = P(3, 0)
O.prototype.ghostOffset = P(3, 1)

class S extends Tetromino { }
S.prototype.minoesPosition = [
    [P(-1, 0), P(0, 0), P(0, 1), P(1, 1)],
    [P(0, 1), P(0, 0), P(1, 0), P(1, -1)],
    [P(-1, -1), P(0, 0), P(1, 0), P(0, -1)],
    [P(-1, 1), P(0, 0), P(-1, 0), P(0, -1)],
]
S.prototype.freeColor = new THREE.Color(COLORS.S)
S.prototype.offset = P(4, 0)
S.prototype.ghostOffset = P(4, 1)

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
T.prototype.offset = P(5, 0)
T.prototype.ghostOffset = P(5, 1)

class Z extends Tetromino { }
Z.prototype.minoesPosition = [
    [P(-1, 1), P(0, 1), P(0, 0), P(1, 0)],
    [P(1, 1), P(1, 0), P(0, 0), P(0, -1)],
    [P(-1, 0), P(0, 0), P(0, -1), P(1, -1)],
    [P(0, 1), P(-1, 0), P(0, 0), P(-1, -1)]
]
Z.prototype.freeColor = new THREE.Color(COLORS.Z)
Z.prototype.offset = P(6, 0)
Z.prototype.ghostOffset = P(6, 1)


class Playfield extends THREE.Group {
    constructor(loadingManager) {
        super()
        //this.visible = false

        const edgeMaterial = new THREE.MeshStandardMaterial({
            color: COLORS.EDGE,
            envMap: environment,
            transparent: true,
            opacity: 0.3,
            roughness: 0.1,
            metalness: 0.67,
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
        this.edge = new THREE.Mesh(
            new THREE.ExtrudeGeometry(edgeShape, {
                depth: 1,
                bevelEnabled: false,
            }),
            edgeMaterial
        )
        this.add(this.edge)

        const retroEdgeShape = new THREE.Shape()
            .moveTo(-1, SKYLINE)
            .lineTo(0, SKYLINE)
            .lineTo(0, 0)
            .lineTo(COLUMNS, 0)
            .lineTo(COLUMNS, SKYLINE)
            .lineTo(COLUMNS + 1, SKYLINE)
            .lineTo(COLUMNS + 1, -1/3)
            .lineTo(-1, -1/3)
            .moveTo(-1, SKYLINE)
        const retroEdgeTexture = new THREE.TextureLoader(loadingManager).load("images/edge.png", (texture) => {
            texture.wrapS = THREE.RepeatWrapping
            texture.wrapT = THREE.RepeatWrapping
        })
        const retroEdgeMaterial = new THREE.MeshStandardMaterial({
            color: COLORS.RETRO,
            map: retroEdgeTexture,
            bumpMap: retroEdgeTexture,
            bumpScale: 1.5,
            roughness: 0.25,
            metalness: 0.9,
        })
        this.retroEdge = new THREE.Mesh(
            new THREE.ExtrudeGeometry(retroEdgeShape, {
                depth: 1,
                bevelEnabled: false,
            }),
            [retroEdgeMaterial, sideMaterial, sideMaterial, sideMaterial, sideMaterial, sideMaterial],
        )
        const back = new THREE.Mesh(
          new THREE.PlaneGeometry(COLUMNS, SKYLINE),
          new THREE.MeshStandardMaterial({
              color: 0xc5d0a1,
              roughness: 0.9,
              metalness: 0.9,
          })
        )
        back.position.set(COLUMNS/2, SKYLINE/2)
        this.retroEdge.add(back)
        this.retroEdge.visible = false
        this.add(this.retroEdge)

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

        // this.visible = true
    }

    cellIsEmpty(p) {
        return 0 <= p.x && p.x < COLUMNS &&
            0 <= p.y && p.y < ROWS &&
            !this.cells[p.y][p.x]
    }

    set piece(piece) {
        if (piece) {
            this.remove(this.piece)
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
            if (mino.explode(delta)) {
                this.remove(mino)
                this.freedMinoes.delete(mino)
            }
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
        this.position.set(-5, SKYLINE - 2)
    }

    set piece(piece) {
        if(piece) {
            this.remove(this.piece)
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
        this.position.set(14, SKYLINE - 2)
    }

    init() {
        this.clear()
        this.positions.forEach(position => this.add(new Tetromino.random(position)))
    }

    shift() {
        let fistPiece = this.children.shift()
        this.remove(fistPiece)
        this.add(new Tetromino.random())
        this.positions.forEach((position, i) => this.children[i].position.copy(position))
        return fistPiece
    }

}
NextQueue.prototype.positions = [P(0, 0), P(0, -3), P(0, -6), P(0, -9), P(0, -12), P(0, -15), P(0, -18)]


export { T_SPIN, FACING, TRANSLATION, ROTATION, COLORS, environment, Mino, Tetromino, Playfield, HoldQueue, NextQueue }