import * as THREE from 'three'
import { scheduler } from './jsm/scheduler.js'
import { TRANSLATION, ROTATION, environment, InstancedMino, Mino, Playfield, HoldQueue, NextQueue } from './jsm/Tetrominoes.js'
import Settings from './jsm/Settings.js'
import { Stats } from './jsm/Stats.js'
import { Menu } from './jsm/Menu.js'
import CameraControls from './jsm/CameraControls.js'
import { TetraScene } from './jsm/TetraScene.js'
import * as FPS from 'three/addons/libs/stats.module.js'


HTMLElement.prototype.addNewChild = function (tag, properties) {
    let child = document.createElement(tag)
    for (let key in properties) {
        child[key] = properties[key]
    }
    this.appendChild(child)
}


/* Game logic */

let game = {
    playing: false,

    start: function() {
        stats.init()

        menu.startButton.hide()
        menu.stats.show()
        menu.settings.close()

        Mino.instances.clear()

        nextQueue.init()
        holdQueue.piece = undefined
        holdQueue.clear()
        playfield.init()

        scene.music.currentTime = 0

        this.playing = true
        stats.clock.start()

        stats.level = settings.startLevel
        this.resume()
    },

    resume: function() {
        document.onkeydown = onkeydown
        document.onkeyup = onkeyup
        window.onblur = game.pause
        menu.settings.domElement.onclick = game.pause

        document.body.classList.remove("pause")
        menu.resumeButton.hide()
        menu.pauseButton.show()

        stats.clock.start()
        stats.clock.elapsedTime = stats.elapsedTime
        
        if (settings.musicVolume) scene.music.play()

        if (playfield.piece) {
            scheduler.resetInterval(game.fall, stats.fallPeriod)
        } else {
            this.generate()
        }
    },

    generate: function(nextPiece=nextQueue.shift()) {
        nextPiece.lockDelay = stats.lockDelay
        playfield.piece = nextPiece
        playfield.piece.onLockDown = game.lockDown
    
        if (playfield.piece.canMove(TRANSLATION.NONE)) {
            scheduler.resetInterval(game.fall, stats.fallPeriod)
        } else {
            game.over() // block out
        }
    },

    fall: function() {
        playfield.piece.move(TRANSLATION.DOWN)
    },
    
    lockDown: function() {
        scheduler.clearTimeout(game.lockDown)
        scheduler.clearInterval(game.fall)
    
        if (playfield.lock(playfield.piece)) {
            let tSpin = playfield.piece.tSpin
            let nbClearedLines = playfield.clearLines()
            stats.lockDown(nbClearedLines, tSpin)
            if (settings.sfxVolume) {
                if (nbClearedLines == 4 || (tSpin && nbClearedLines)) {
                    playSound(scene.tetrisSound, stats.combo)
                } else if (nbClearedLines || tSpin) {
                    playSound(scene.lineClearSound, stats.combo)
                }
            }
    
            game.generate()
        } else {
            game.over() // lock out
        }
    },

    pause: function() {
        menu.settings.domElement.onclick = null

        stats.elapsedTime = stats.clock.elapsedTime
        stats.clock.stop()
    
        scheduler.clearInterval(game.fall)
        scheduler.clearTimeout(game.lockDown)
        scheduler.clearTimeout(repeat)
        scheduler.clearInterval(autorepeat)
    
        scene.music.pause()
        document.onkeydown = resumeOnKeyDown
        document.onkeyup = null
        window.onblur = null
        
        pauseSpan.onfocus = game.resume
        document.body.classList.add("pause")
        menu.pauseButton.hide()
        menu.resumeButton.show()
    },

    over: function() {
        playfield.piece.locking = false

        document.onkeydown = null
        window.onblur = null
        renderer.domElement.onfocus = null
        menu.settings.domElement.onfocus = null
        game.playing = false
        scene.music.pause()
        stats.clock.stop()
        messagesSpan.addNewChild("div", { className: "show-level-animation", innerHTML: `<h1>GAME<br/>OVER</h1>` })

        menu.pauseButton.hide()
        menu.startButton.name("Rejouer")
        menu.startButton.show()
    },
}


function playSound(sound, note=0) {
    sound.stop()
    sound.currentTime = 0
    sound.playbackRate = Math.pow(5/4, note)
    sound.play()
}


/* Handle player inputs */

let playerActions = {
    moveLeft: () => playfield.piece.move(TRANSLATION.LEFT),

    moveRight: () => playfield.piece.move(TRANSLATION.RIGHT),

    rotateCW: () => playfield.piece.rotate(ROTATION.CW),

    rotateCCW: () => playfield.piece.rotate(ROTATION.CCW),

    softDrop: function () {
        if (playfield.piece.move(TRANSLATION.DOWN)) stats.score++
    },

    hardDrop: function () {
        scheduler.clearTimeout(game.lockDown)
        if (settings.sfxVolume) {
            scene.hardDropSound.stop()
            scene.hardDropSound.play()
        }
        while (playfield.piece.move(TRANSLATION.DOWN)) stats.score += 2
        game.lockDown()
        playfield.hardDropAnimation.reset()
        playfield.hardDropAnimation.play()
    },

    hold: function () {
        if (playfield.piece.holdEnabled) {
            scheduler.clearInterval(game.fall)
            scheduler.clearTimeout(game.lockDown)

            let heldpiece = holdQueue.piece
            holdQueue.piece = playfield.piece
            game.generate(heldpiece)
        }
    },

    pause: game.pause,
}

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
                if (action == playerActions.softDrop) scheduler.resetInterval(autorepeat, settings.fallPeriod / 20)
                else scheduler.resetTimeout(repeat, settings.dasDelay)
            }
        }
    }
}

function repeat() {
    if (actionsQueue.length) {
        actionsQueue[0]()
        scheduler.resetInterval(autorepeat, settings.arrDelay)
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

function resumeOnKeyDown(event) {
    let key = event.key
    if(playerActions[settings.action[key]] == playerActions.pause) {
        event.preventDefault()
        game.resume()
    }
}


/* Scene */

const renderer = new THREE.WebGLRenderer({
    powerPreference: "high-performance",
    antialias: true,
    stencil: false
})
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setClearColor(0x000000, 10)
renderer.toneMapping = THREE.ACESFilmicToneMapping
document.body.appendChild(renderer.domElement)
renderer.domElement.tabIndex = 1

let loadingManager = new THREE.LoadingManager(
    function() {
        loadingDiv.style.display = "none"
        menu.startButton.show()
        renderer.setAnimationLoop(animate)
    },
    function (url, itemsLoaded, itemsTotal) {
        loadingPercent.innerText = Math.floor(100 * itemsLoaded / itemsTotal) + '%'
    },
    function (url) {
        loadingPercent.innerText = "Erreur"
    }
)
loadingManager.onStart = function (url, itemsLoaded, itemsTotal) {
    loadingPercent.innerText = "0%"
    loadingDiv.style.display = "flex"
}

const stats     = new Stats()
const settings  = new Settings()
const scene = new TetraScene(settings, loadingManager)
const controls = new CameraControls(scene.camera, renderer.domElement)

const minoes = new InstancedMino()
scene.add(minoes)
const holdQueue = new HoldQueue()
scene.add(holdQueue)
const playfield = new Playfield(loadingManager)
scene.add(playfield)
const nextQueue = new NextQueue()
scene.add(nextQueue)

const menu = new Menu(game, settings, stats, scene, minoes, playfield)
menu.load()

let fps
if (window.location.search.includes("fps")) {
    let fps = new FPS.default()
    document.body.appendChild(fps.dom)
}

messagesSpan.onanimationend = function (event) {
    event.target.remove()
}


const clock = new THREE.Clock()

function animate() {
    const delta = clock.getDelta()
    scene.updateMatrixWorld()
    scene.update(delta)
    playfield.update(delta)
    minoes.update()
    controls.update()

    renderer.render(scene, scene.camera)
    environment.camera.update(renderer, scene)

    fps?.update()
}

window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight)
    scene.camera.aspect = window.innerWidth / window.innerHeight
    scene.camera.updateProjectionMatrix()
})

window.onbeforeunload = function (event) {
    menu.save()
    localStorage["teTraHighScore"] = stats.highScore
    return !game.playing
}