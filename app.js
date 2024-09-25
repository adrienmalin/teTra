import * as THREE from 'three'
import { scheduler } from './jsm/scheduler.js'
import { TRANSLATION, ROTATION, environment, Mino, Playfield, HoldQueue, NextQueue } from './jsm/Tetrominoes.js'
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
        stats.init()

        gui.startButton.hide()
        gui.settings.close()
        gui.stats.show()

        Mino.meshes.clear()

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
        gui.settings.domElement.onclick = game.pause

        document.body.classList.remove("pause")
        gui.resumeButton.hide()
        gui.pauseButton.show()

        stats.clock.start()
        stats.clock.elapsedTime = stats.elapsedTime
        
        if (settings.musicVolume) scene.music.play()

        if (playfield.piece) {
            scheduler.setInterval(game.fall, stats.fallPeriod)
        } else {
            this.generate()
        }
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
        gui.settings.domElement.onclick = null

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
        gui.pauseButton.hide()
        gui.resumeButton.show()
    },

    over: function() {
        playfield.piece.locking = false

        document.onkeydown = null
        window.onblur = null
        renderer.domElement.onfocus = null
        gui.settings.domElement.onfocus = null
        game.playing = false
        scene.music.pause()
        stats.clock.stop()
        messagesSpan.addNewChild("div", { className: "show-level-animation", innerHTML: `<h1>GAME<br/>OVER</h1>` })

        gui.pauseButton.hide()
        gui.startButton.name("Rejouer")
        gui.startButton.show()
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
        loaddingCircle.style.display = "none"
        gui.startButton.show()
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
    loaddingCircle.style.display = "block"
}

const stats     = new Stats()
const settings  = new Settings()
const scene = new TetraScene(settings, loadingManager)
const controls = new TetraControls(scene.camera, renderer.domElement)

scene.add(Mino.meshes)
const holdQueue = new HoldQueue()
scene.add(holdQueue)
const playfield = new Playfield(loadingManager)
scene.add(playfield)
const nextQueue = new NextQueue()
scene.add(nextQueue)

const gui = new TetraGUI(game, settings, stats, scene, controls, playfield)
gui.load()

messagesSpan.onanimationend = function (event) {
    event.target.remove()
}


const clock = new THREE.Clock()

function animate() {
    const delta = clock.getDelta()
    scene.updateMatrixWorld()
    scene.update(delta)
    playfield.update(delta)
    Mino.meshes.update()
    controls.update()
    gui.update()

    renderer.render(scene, scene.camera)
    environment.camera.update(renderer, scene)
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