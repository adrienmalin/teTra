import * as THREE from 'three'
import { scheduler } from './jsm/scheduler.js'
import { TRANSLATION, ROTATION, environment, Mino, HoldQueue, NextQueue } from './jsm/Tetrominoes.js'
import Settings from './jsm/Settings.js'
import { Stats } from './jsm/Stats.js'
import { Menu } from './jsm/Menu.js'
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
        scene.playfield.init()

        scene.music.currentTime = 0

        this.playing = true
        stats.clock.start()

        stats.level = settings.startLevel
        this.resume()
    },

    resume: function() {
        pauseSpan.innerHTML = "3"
        setTimeout(() => pauseSpan.innerHTML = "2", 1000)
        setTimeout(() => pauseSpan.innerHTML = "1", 2000)
        setTimeout(() => {
            pauseSpan.innerHTML = ""
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
    
            if (scene.playfield.piece) {
                scheduler.resetInterval(game.fall, stats.fallPeriod)
            } else {
                this.generate()
            }
        }, 3000)
    },

    generate: function(nextPiece=nextQueue.shift()) {
        nextPiece.lockDelay = stats.lockDelay
        scene.playfield.piece = nextPiece
        scene.playfield.piece.onLockDown = game.lockDown
    
        if (scene.playfield.piece.canMove(TRANSLATION.NONE)) {
            scheduler.resetInterval(game.fall, stats.fallPeriod)
        } else {
            game.over() // block out
        }
    },

    fall: function() {
        scene.playfield.piece.move(TRANSLATION.DOWN)
    },
    
    lockDown: function() {
        scheduler.clearTimeout(game.lockDown)
        scheduler.clearInterval(game.fall)
    
        if (scene.playfield.lock(scene.playfield.piece)) {
            let tSpin = scene.playfield.piece.tSpin
            let nbClearedLines = scene.playfield.clearLines()
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
        pauseSpan.innerHTML = "II"
        document.body.classList.add("pause")
        menu.pauseButton.hide()
        menu.resumeButton.show()
    },

    over: function() {
        scene.playfield.piece.locking = false

        document.onkeydown = null
        window.onblur = null
        scene.renderer.domElement.onfocus = null
        menu.settings.domElement.onfocus = null
        this.playing = false
        scene.music.pause()
        stats.clock.stop()
        messagesSpan.addNewChild("div", { className: "show-level-animation", innerHTML: `<h1>GAME<br/>OVER</h1>` })
        stats.speak("Game Over", 'en-US')

        menu.pauseButton.hide()
        menu.startButton.name("Rejouer")
        menu.startButton.show()
    },

    fullscreen: function() {
        if (document.fullscreenElement) {
            if (document.exitFullscreen) {
                document.exitFullscreen()
            }
        } else {
            document.body.requestFullscreen()
        }
    }
}

document.onfullscreenchange = function() {
    if (document.fullscreenElement) {
        menu.settings.fullscreenButton.name("Quitter le plein écran")
    } else {
        menu.settings.fullscreenButton.name("Plein écran")
        if (game.playing) game.pause()
    }
}

function playSound(sound, note=0) {
    sound.stop()
    sound.currentTime = 0
    sound.playbackRate = Math.pow(5/4, note)
    sound.play()
}


/* Handle player inputs */

let playerActions = {
    moveLeft: () => scene.playfield.piece.move(TRANSLATION.LEFT)? scene.moveSound.play() : scene.hitSound.stop() && scene.hitSound.play(),

    moveRight: () => scene.playfield.piece.move(TRANSLATION.RIGHT)? scene.moveSound.play() : scene.hitSound.stop() && scene.hitSound.play(),

    rotateCW: () => scene.playfield.piece.rotate(ROTATION.CW)? scene.rotateSound.stop() && scene.rotateSound.play() : scene.spinEndSound.stop() && scene.spinEndSound.play(),

    rotateCCW: () => scene.playfield.piece.rotate(ROTATION.CCW)? scene.rotateSound.stop() && scene.rotateSound.play() : scene.spinEndSound.stop() && scene.spinEndSound.play(),

    softDrop: function () {
        if (scene.playfield.piece.move(TRANSLATION.DOWN)) {
            stats.score++
            scene.moveSound.play()
        } else {
            scene.floorSound.play()
        }
    },

    hardDrop: function () {
        scheduler.clearTimeout(game.lockDown)
        if (settings.sfxVolume) {
            scene.hardDropSound.stop()
            scene.hardDropSound.play()
        }
        while (scene.playfield.piece.move(TRANSLATION.DOWN)) stats.score += 2
        game.lockDown()
        scene.playfield.hardDropAnimation.reset()
        scene.playfield.hardDropAnimation.play()
    },

    hold: function () {
        if (scene.playfield.piece.holdEnabled) {
            scheduler.clearInterval(game.fall)
            scheduler.clearTimeout(game.lockDown)

            let heldpiece = holdQueue.piece
            holdQueue.piece = scene.playfield.piece
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

let loadingManager = new THREE.LoadingManager(
    function() {
        loadingDiv.style.display = "none"
        if (!game.playing) menu.startButton.show()
        scene.renderer.setAnimationLoop(animate)
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

const settings  = new Settings()
const stats     = new Stats(settings)
const scene = new TetraScene(settings, loadingManager)

const holdQueue = new HoldQueue()
scene.add(holdQueue)
const nextQueue = new NextQueue()
scene.add(nextQueue)

const menu = new Menu(game, settings, stats, scene)
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
    scene.update(delta)

    environment.camera.update(scene.renderer, scene)

    fps?.update()
}

window.addEventListener("resize", () => {
    scene.renderer.setSize(window.innerWidth, window.innerHeight)
    scene.camera.aspect = window.innerWidth / window.innerHeight
    scene.camera.updateProjectionMatrix()
})

window.onbeforeunload = function (event) {
    menu.save()
    localStorage["teTraHighScore"] = stats.highScore
    if (game.playing) return false;
}