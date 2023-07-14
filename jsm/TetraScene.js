import * as THREE from 'three'
import { Vortex } from './Vortex.js'


export class TetraScene extends THREE.Scene {
    constructor(loadingManager, settings) {
        super()

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
        this.camera.position.set(5, 0, 16)

        this.vortex = new Vortex(loadingManager)
        this.add(this.vortex)
        
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
        this.add(this.ambientLight)
        
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 6)
        this.directionalLight.position.set(5, -20, 0)
        this.add(this.directionalLight)
        this.directionalLight.target = new THREE.Object3D()
        this.directionalLight.target.position.set(5, -10, 20)
        this.add(this.directionalLight.target)


        /* Sounds */
        
        const listener = new THREE.AudioListener()
        this.camera.add( listener )
        const audioLoader = new THREE.AudioLoader(loadingManager)
        
        this.music = new THREE.Audio(listener)
        audioLoader.load('audio/Tetris_T-Spin_OC_ReMix.mp3', function( buffer ) {
            this.music.setBuffer(buffer)
            this.music.setLoop(true)
            this.music.setVolume(settings.musicVolume/100)
            //if (game.playing) this.music.play()
        }.bind(this))
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
    }

    update(delta) {
        this.vortex.update(delta)
    }
}