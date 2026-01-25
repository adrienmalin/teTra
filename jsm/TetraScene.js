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
        this.camera.position.set(5.5, 15, 13)

        this.controls = new CameraControls(this.camera, this.renderer.domElement)

        this.vortex = new Vortex(loadingManager)
        this.add(this.vortex)
        
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
        this.add(this.ambientLight)
        
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 11)
        this.add(this.directionalLight)

        this.fog = new THREE.Fog(0xffffff, 50, 150)

        /* Sounds */
        this.music = music

        const listener = new THREE.AudioListener()
        this.camera.add( listener )
        const audioLoader = new THREE.AudioLoader(loadingManager)

        this.lineClearSound = new THREE.Audio(listener)
        audioLoader.load('audio/line-clear.ogg', function( buffer ) {
            this.lineClearSound.setBuffer(buffer)
        }.bind(this))
        this.tetrisSound = new THREE.Audio(listener)
        audioLoader.load('audio/tetris.ogg', function( buffer ) {
            this.tetrisSound.setBuffer(buffer)
            this.lineClearSound.setVolume(settings.sfxVolume/100)
            this.tetrisSound.setVolume(settings.sfxVolume/100)
            this.hardDropSound.setVolume(settings.sfxVolume/100)
        }.bind(this))
        this.hardDropSound = new THREE.Audio(listener)
        audioLoader.load('audio/hard-drop.wav', function( buffer ) {
            this.hardDropSound.setBuffer(buffer)
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
                this.ambientLight.intensity     = 0
                this.directionalLight.intensity = 1.75
                this.directionalLight.position.set(5, -20, 20)
                this.music.src = "audio/benevolence.m4a"
                this.background = new THREE.Color(0xffffff);
                this.fog.color.set(0xffffff)
                this.playfield.edge.visible = true
                this.playfield.retroEdge.visible = false
                break
            case "Espace":
                this.ambientLight.intensity     = 7
                this.directionalLight.intensity = 5
                this.directionalLight.position.set(2, -3, 20)
                this.music.src = "audio/benevolence.m4a"
                this.background = new THREE.Color(0x000000);
                this.fog.color.set(0x000000)
                this.playfield.edge.visible = true
                this.playfield.retroEdge.visible = false
            break
            case "Rétro":
                this.ambientLight.intensity     = 1
                this.directionalLight.intensity = 10
                this.directionalLight.position.set(19, 120, 200)
                this.music.src = "audio/Tetris_MkVaffQuasi_Ultimix_OC_ReMix.mp3"
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