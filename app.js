import * as THREE from 'three'
import { scheduler } from './jsm/scheduler.js'
import { TRANSLATION, ROTATION, environnement, Mino, Playfield, HoldQueue, NextQueue } from './jsm/gamelogic.js'
import { Settings } from './jsm/Settings.js'
import { Stats } from './jsm/Stats.js'
import { TetraGUI } from './jsm/TetraGUI.js'
import { TetraControls } from './jsm/TetraControls.js'
import { TetraScene } from './jsm/TetraScene.js'


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
        gui.startButton.hide()
        stats.init()
        gui.stats.show()
        gui.settings.close()

        Mino.mesh.clear()
        
        holdQueue.remove(holdQueue.piece)
        holdQueue.piece = undefined
        if (nextQueue.pieces) nextQueue.pieces.forEach(piece => nextQueue.remove(piece))
        playfield.init()
        
        scene.remove(playfield.piece)
        if (playfield.piece) playfield.remove(playfield.piece)
        playfield.piece = null
        scene.music.currentTime = 0
        playfield.visible = true

        this.playing = true
        stats.clock.start()

        renderer.domElement.tabIndex = 1
        gui.domElement.tabIndex = 1

        nextQueue.init()

        stats.level = settings.startLevel
        this.resume()
    },

    resume: function() {
        document.onkeydown = onkeydown
        document.onkeyup = onkeyup
        window.onblur = game.pause
        if (!gui.debug) gui.domElement.onfocus = game.pause

        document.body.classList.remove("pause")
        gui.resumeButton.hide()
        gui.pauseButton.show()

        stats.clock.start()
        stats.clock.elapsedTime = stats.elapsedTime
        scene.music.play()

        if (playfield.piece) scheduler.setInterval(game.fall, stats.fallPeriod)
        else this.generate()
    },

    generate: function(nextPiece=nextQueue.shift()) {
        nextPiece.lockDelay = stats.lockDelay
        playfield.piece = nextPiece
        playfield.piece.onLockDown = game.lockDown
    
        if (playfield.piece.canMove(TRANSLATION.NONE)) {
            scheduler.setInterval(game.fall, stats.fallPeriod)
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
            playfield.remove(playfield.piece)
            if (settings.sfxVolume) {
                if (nbClearedLines == 4 || (tSpin && nbClearedLines)) {
                    scene.tetrisSound.currentTime = 0
                    scene.tetrisSound.play()
                } else if (nbClearedLines || tSpin) {
                    scene.lineClearSound.currentTime = 0
                    scene.lineClearSound.play()
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
    
        scene.music.pause()
        document.onkeydown = null
        window.onblur = null
        
        pauseSpan.onfocus = game.resume
        document.body.classList.add("pause")
        gui.pauseButton.hide()
        gui.resumeButton.show()
    },

    over: function() {
        playfield.piece.locking = false

        document.onkeydown = null
        window.onblur = null
        renderer.domElement.onfocus = null
        gui.domElement.onfocus = null
        game.playing = false
        scene.music.pause()
        stats.clock.stop()
        messagesSpan.addNewChild("div", { className: "show-level-animation", innerHTML: `<h1>GAME<br/>OVER</h1>` })

        gui.pauseButton.hide()
        gui.startButton.name("Rejouer")
        gui.startButton.show()
    },
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
        scene.hardDropSound.play()
        if (settings.sfxVolume) {
            scene.hardDropSound.currentTime = 0
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


/* Scene */

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


const renderer = new THREE.WebGLRenderer({
    powerPreference: "high-performance",
    antialias: true,
    stencil: false
})
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setClearColor(0x000000, 10)
renderer.toneMapping = THREE.ACESFilmicToneMapping
document.body.appendChild(renderer.domElement)


const stats     = new Stats()
const settings  = new Settings()

const scene = new TetraScene(loadingManager, settings)

const gui = new TetraGUI(game, settings, stats, scene)

const clock = new THREE.Clock()

scene.add(Mino.mesh)

const holdQueue = new HoldQueue()
scene.add(holdQueue)
const playfield = new Playfield()
scene.add(playfield)
const nextQueue = new NextQueue()
scene.add(nextQueue)

const controls = new TetraControls(scene.camera, renderer.domElement)

messagesSpan.onanimationend = function (event) {
    event.target.remove()
}


function animate() {

    const delta = clock.getDelta()
    scene.updateMatrixWorld()
    scene.update(delta)
    playfield.update(delta)
    Mino.mesh.update()
    controls.update()
    gui.update()

    renderer.render(scene, scene.camera)
    environnement.camera.update(renderer, scene)
}

window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight)
    scene.camera.aspect = window.innerWidth / window.innerHeight
    scene.camera.updateProjectionMatrix()
})

window.onbeforeunload = function (event) {
    gui.save()
    localStorage["teTraHighScore"] = stats.highScore
    return !game.playing
}

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./jsm/service-worker.js');
}