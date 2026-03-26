import * as THREE from 'three'
import CameraControls from './CameraControls.js'
import { Vortex } from './Vortex.js'
import { Playfield, InstancedMino } from './Tetrominoes.js'


export class TetraScene extends THREE.Scene {
    constructor(settings, loadingManager) {
        super()

        this.renderer = new THREE.WebGLRenderer({
            powerPreference: "high-performance",
            antialias: true,
            stencil: false
        })
        this.renderer.setSize(window.innerWidth, window.innerHeight)
        this.renderer.setClearColor(0x000000, 10)
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping
        this.renderer.toneMappingExposure = .8
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        document.body.appendChild(this.renderer.domElement)
        this.renderer.domElement.tabIndex = 1

        this.camera = new THREE.PerspectiveCamera(100, window.innerWidth / window.innerHeight, 0.1, 1000)
        this.camera.position.set(5, 4, 13)

        this.controls = new CameraControls(this.camera, this.renderer.domElement)

        this.vortex = new Vortex(loadingManager)
        this.add(this.vortex)
        
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
        this.add(this.ambientLight)
        
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 11)
        this.add(this.directionalLight)

        this.fog = new THREE.Fog(0xffffff, 0, 200)

        /* Sounds */
        this.music = music

        const listener = new THREE.AudioListener()
        this.camera.add( listener )
        const audioLoader = new THREE.AudioLoader(loadingManager)

        this.lineClearSound = new THREE.Audio(listener)
        audioLoader.load('audio/line-clear.ogg', function( buffer ) {
            this.lineClearSound.setBuffer(buffer)
            this.lineClearSound.setVolume(settings.sfxVolume/100)
        }.bind(this))
        this.tetrisSound = new THREE.Audio(listener)
        audioLoader.load('audio/tetris.ogg', function( buffer ) {
            this.tetrisSound.setBuffer(buffer)
            this.tetrisSound.setVolume(settings.sfxVolume/100)
        }.bind(this))
        this.hardDropSound = new THREE.Audio(listener)
        audioLoader.load('audio/hard-drop.wav', function( buffer ) {
            this.hardDropSound.setBuffer(buffer)
            this.hardDropSound.setVolume(settings.sfxVolume/100)
        }.bind(this))
        this.hitSound = new THREE.Audio(listener)
        audioLoader.load('audio/hit.mp3', function( buffer ) {
            this.hitSound.setBuffer(buffer)
            this.hitSound.setVolume(settings.sfxVolume/100)
        }.bind(this))
        this.floorSound = new THREE.Audio(listener)
        audioLoader.load('audio/floor.ogg', function( buffer ) {
            this.floorSound.setBuffer(buffer)
            this.floorSound.setVolume(settings.sfxVolume/100)
        }.bind(this))
        this.moveSound = new THREE.Audio(listener)
        audioLoader.load('audio/move.ogg', function( buffer ) {
            this.moveSound.setBuffer(buffer)
            this.moveSound.setVolume(settings.sfxVolume/100)
        }.bind(this))
        this.rotateSound = new THREE.Audio(listener)
        audioLoader.load('audio/rotate.ogg', function( buffer ) {
            this.rotateSound.setBuffer(buffer)
            this.rotateSound.setVolume(settings.sfxVolume/100)
        }.bind(this))

        this.playfield = new Playfield(loadingManager)
        this.add(this.playfield)
        this.minoes = new InstancedMino()
        this.add(this.minoes)

        this.theme = settings.theme
    }

    set theme(theme) {
        switch (theme) {
            case "Plasma":
                this.ambientLight.intensity     = 1
                this.directionalLight.intensity = 3
                this.directionalLight.position.set(5, 50, -20)
                this.music.src = "audio/Moon-Over-Moscow-DJ-ResiDance-Mix-2022.mp3"
                this.background = new THREE.Color(0xffffff)
                this.fog.color.set(0xffffff)
                this.playfield.edge.visible = true
                this.playfield.retroEdge.visible = false
                break
            case "Space":
                this.ambientLight.intensity     = 3
                this.directionalLight.intensity = 10
                this.directionalLight.position.set(2, 15, -20)
                this.music.src = "audio/benevolence.m4a"
                this.background = new THREE.Color(0x000000)
                this.fog.color.set(0x000000)
                this.playfield.edge.visible = false
                this.playfield.retroEdge.visible = true
            break
        }
        this.vortex.theme = theme
        this.minoes.theme = theme
    }

    get fogColor() {
        return this.fog.color.getHexString()
    }
    set fogColor(color) {
        this.fog.color.set(color)
    }

    update(delta) {
        this.controls.update()
        this.updateMatrixWorld()
        this.vortex.update(delta)
        this.playfield.update(delta)
        this.minoes.update(delta)
        this.renderer.render(this, this.camera)
    }
}