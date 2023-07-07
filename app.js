import * as THREE from 'three'
import { scheduler } from './jsm/scheduler.js'
import { TRANSLATION, ROTATION, environnement, Matrix, HoldQueue, NextQueue } from './jsm/gamelogic.js'
import { Settings } from './jsm/Settings.js'
import { Stats } from './jsm/Stats.js'
import { TetraGUI } from './jsm/TetraGUI.js'
import { TetraControls } from './jsm/TetraControls.js'
import { Vortex } from './jsm/Vortex.js'


HTMLElement.prototype.addNewChild = function (tag, properties) {
    let child = document.createElement(tag)
    for (let key in properties) {
        child[key] = properties[key]
    }
    this.appendChild(child)
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

const scene = new THREE.Scene()

scene.vortex = new Vortex(loadingManager)
scene.add(scene.vortex)

const renderer = new THREE.WebGLRenderer({
    powerPreference: "high-performance",
    antialias: true,
    stencil: false
})
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setClearColor(0x000000, 10)
renderer.toneMapping = THREE.ACESFilmicToneMapping
document.body.appendChild(renderer.domElement)

scene.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
scene.camera.position.set(5, 0, 16)
        
scene.ambientLight = new THREE.AmbientLight(0xffffff, 0.1)
scene.add(scene.ambientLight)

scene.directionalLight = new THREE.DirectionalLight(0xffffff, 15)
scene.directionalLight.position.set(5, 100, -10)
scene.add(scene.directionalLight)

const holdQueue = new HoldQueue()
scene.add(holdQueue)
const matrix = new Matrix()
scene.add(matrix)
const nextQueue = new NextQueue()
scene.add(nextQueue)

messagesSpan.onanimationend = function (event) {
    event.target.remove()
}


/* Game logic */

let game = {
    playing: false,

    start: function() {
        gui.startButton.hide()
        stats.init()
        gui.stats.show()
        gui.settings.close()
        
        holdQueue.remove(holdQueue.piece)
        holdQueue.piece = undefined
        if (nextQueue.pieces) nextQueue.pieces.forEach(piece => nextQueue.remove(piece))
        matrix.init()
        
        scene.remove(matrix.piece)
        matrix.piece = null
        scene.music.currentTime = 0
        matrix.visible = true

        this.playing = true
        stats.clock.start()

        renderer.domElement.tabIndex = 1
        gui.domElement.tabIndex = 1
        gui.domElement.onfocus = game.pause

        nextQueue.init()

        stats.level = settings.startLevel
        this.resume()
    },

    resume: function() {
        document.onkeydown = onkeydown
        document.onkeyup = onkeyup
        window.onblur = game.pause

        document.body.classList.remove("pause")
        gui.resumeButton.hide()
        gui.pauseButton.show()

        stats.clock.start()
        stats.clock.elapsedTime = stats.elapsedTime
        scene.music.play()

        if (matrix.piece) scheduler.setInterval(game.fall, stats.fallPeriod)
        else this.generate()
    },

    generate: function(nextPiece=nextQueue.shift()) {
        nextPiece.lockDelay = stats.lockDelay
        matrix.piece = nextPiece
        matrix.piece.onlockdown = game.lockDown
    
        if (matrix.piece.canMove(TRANSLATION.NONE)) {
            scheduler.setInterval(game.fall, stats.fallPeriod)
        } else {
            game.over() // block out
        }
    },

    fall: function() {
        matrix.piece.move(TRANSLATION.DOWN)
    },
    
    lockDown: function() {
        scheduler.clearTimeout(game.lockDown)
        scheduler.clearInterval(game.fall)
    
        if (matrix.lock(matrix.piece)) {
            let tSpin = matrix.piece.tSpin
            let nbClearedLines = matrix.clearLines()
            matrix.remove(matrix.piece)
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
        matrix.piece.locking = false

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

const controls = new TetraControls(scene.camera, renderer.domElement)

let playerActions = {
    moveLeft: () => matrix.piece.move(TRANSLATION.LEFT),

    moveRight: () => matrix.piece.move(TRANSLATION.RIGHT),

    rotateCW: () => matrix.piece.rotate(ROTATION.CW),

    rotateCCW: () => matrix.piece.rotate(ROTATION.CCW),

    softDrop: function () {
        if (matrix.piece.move(TRANSLATION.DOWN)) stats.score++
    },

    hardDrop: function () {
        scheduler.clearTimeout(game.lockDown)
        scene.hardDropSound.play()
        if (settings.sfxVolume) {
            scene.hardDropSound.currentTime = 0
            scene.hardDropSound.play()
        }
        while (matrix.piece.move(TRANSLATION.DOWN)) stats.score += 2
        game.lockDown()
        matrix.hardDropAnimation.reset()
        matrix.hardDropAnimation.play()
    },

    hold: function () {
        if (matrix.piece.holdEnabled) {
            scheduler.clearInterval(game.fall)
            scheduler.clearTimeout(game.lockDown)

            let heldpiece = holdQueue.piece
            holdQueue.piece = matrix.piece
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


/* Sounds */

const listener = new THREE.AudioListener()
scene.camera.add( listener )
const audioLoader = new THREE.AudioLoader(loadingManager)

scene.music = new THREE.Audio(listener)
audioLoader.load('audio/Tetris_CheDDer_OC_ReMix.mp3', function( buffer ) {
	scene.music.setBuffer(buffer)
	scene.music.setLoop(true)
    scene.music.setVolume(settings.musicVolume/100)
	if (game.playing) scene.music.play()
})
scene.lineClearSound = new THREE.Audio(listener)
audioLoader.load('audio/line-clear.ogg', function( buffer ) {
    scene.lineClearSound.setBuffer(buffer)
    scene.lineClearSound.setVolume(settings.sfxVolume/100)
})
scene.tetrisSound = new THREE.Audio(listener)
audioLoader.load('audio/tetris.ogg', function( buffer ) {
    scene.tetrisSound.setBuffer(buffer)
    scene.tetrisSound.setVolume(settings.sfxVolume/100)
})
scene.hardDropSound = new THREE.Audio(listener)
audioLoader.load('audio/hard-drop.wav', function( buffer ) {
    scene.hardDropSound.setBuffer(buffer)
    scene.hardDropSound.setVolume(settings.sfxVolume/100)
})


let stats     = new Stats()
let settings  = new Settings()

var gui = new TetraGUI(game, settings, stats, scene)

const clock = new THREE.Clock()

function animate() {

    const delta = clock.getDelta()

    scene.vortex.update(delta)
    matrix.update(delta)
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