import * as THREE from 'three'
import { Vortex } from './Vortex.js'


export class TetraScene extends THREE.Scene {
    constructor(settings, loadingManager) {
        super()

        this.camera = new THREE.PerspectiveCamera(100, window.innerWidth / window.innerHeight, 0.1, 1000)
        this.camera.position.set(5, 3, 12)

        this.vortex = new Vortex(loadingManager)
        this.add(this.vortex)
        
        this.ambientLight = new THREE.AmbientLight(0xffffff, 1)
        this.add(this.ambientLight)
        
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 5)
        this.directionalLight.position.set(5, -20, 20)
        this.add(this.directionalLight)


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
    }

    update(delta) {
        this.vortex.update(delta)
    }
}