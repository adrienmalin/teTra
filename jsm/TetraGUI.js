import * as THREE from 'three'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'
import * as FPS from 'three/addons/libs/stats.module.js'
import { Mino, environnement } from './gamelogic.js'


export class TetraGUI extends GUI {
    constructor(game, settings, stats, scene) {
        super({title: "teTra"})
        this.domElement.tabIndex = 1

        this.startButton = this.add(game, "start").name("Jouer").hide()
        this.pauseButton = this.add(game, "pause").name("Pause").hide()
        this.resumeButton = this.add(game, "resume").name("Reprendre").hide()

        this.stats = this.addFolder("Stats").hide()
        this.stats.add(stats, "time").name("Temps").disable().listen()
        this.stats.add(stats, "score").name("Score").disable().listen()
        this.stats.add(stats, "highScore").name("Meilleur score").disable().listen()
        this.stats.add(stats, "level").name("Niveau").disable().listen()
        this.stats.add(stats, "totalClearedLines").name("Lignes").disable().listen()
        this.stats.add(stats, "goal").name("Objectif").disable().listen()
        this.stats.add(stats, "nbTetra").name("teTras").disable().listen()
        this.stats.add(stats, "nbTSpin").name("Pirouettes").disable().listen()
        this.stats.add(stats, "maxCombo").name("Combos max").disable().listen()
        this.stats.add(stats, "maxB2B").name("BàB max").disable().listen()

        this.settings = this.addFolder("Options").open()

        this.settings.add(settings, "startLevel").name("Niveau initial").min(1).max(15).step(1)
        this.settings.add(scene.vortex, "background", ["Plasma", "Espace"]).name("Fond").onChange(background => {
            const loadingManager = new THREE.LoadingManager()
            let darkTexture, colorfullTexture
            switch (background) {
                case "Plasma":
                    darkTexture = new THREE.TextureLoader(loadingManager).load("./images/plasma.jpg", texture => {
                        texture.wrapS = THREE.RepeatWrapping
                        texture.wrapT = THREE.MirroredRepeatWrapping
                        texture.repeat.set(1, 1)
                    })
                    colorfullTexture = new THREE.TextureLoader(loadingManager).load("./images/plasma2.jpg", texture => {
                        texture.wrapS = THREE.RepeatWrapping
                        texture.wrapT = THREE.MirroredRepeatWrapping
                        texture.repeat.set(2, 1)
                    })
                    loadingManager.onLoad = function() {
                        scene.vortex.darkCylinder.material.map = darkTexture
                        scene.vortex.darkCylinder.material.opacity = 0.006
                        scene.vortex.colorFullCylinder.material.map = colorfullTexture
                        scene.vortex.colorFullCylinder.material.opacity = 0.7
                        
                        scene.vortex.globalRotation = 0.028
                        scene.vortex.darkTextureRotation = 0.005
                        scene.vortex.darkMoveForward = 0.009
                        scene.vortex.colorFullTextureRotation = 0.006
                        scene.vortex.colorFullMoveForward = 0.015

                        scene.ambientLight.intensity = 1
                        scene.directionalLight.intensity = 1
                    }
                break
                case "Espace":
                    darkTexture = new THREE.TextureLoader(loadingManager).load("./images/dark.jpg", texture => {
                        texture.wrapS = THREE.RepeatWrapping
                        texture.wrapT = THREE.MirroredRepeatWrapping
                        texture.repeat.set(2, 4)
                    })
                    colorfullTexture = new THREE.TextureLoader(loadingManager).load("./images/colorfull.jpg", texture => {
                        texture.wrapS = THREE.RepeatWrapping
                        texture.wrapT = THREE.MirroredRepeatWrapping
                        texture.repeat.set(1, 2)
                    })
                    loadingManager.onLoad = function() {
                        scene.vortex.darkCylinder.material.map = darkTexture
                        scene.vortex.darkCylinder.material.opacity = 0.2
                        scene.vortex.colorFullCylinder.material.map = colorfullTexture
                        scene.vortex.colorFullCylinder.material.opacity = 0.2
                        
                        scene.vortex.globalRotation = 0.028
                        scene.vortex.darkTextureRotation = 0.006
                        scene.vortex.darkMoveForward = 0.007
                        scene.vortex.colorFullTextureRotation = 0.006
                        scene.vortex.colorFullMoveForward = 0.02

                        scene.ambientLight.intensity = 2
                        scene.directionalLight.intensity = 3
                    }
                break
            }
        })

        this.settings.key = this.settings.addFolder("Commandes").open()
        let moveLeftKeyController = this.settings.key.add(settings.key, "moveLeft").name('Gauche')
        moveLeftKeyController.domElement.onclick = this.changeKey.bind(moveLeftKeyController)
        let moveRightKeyController = this.settings.key.add(settings.key, "moveRight").name('Droite')
        moveRightKeyController.domElement.onclick = this.changeKey.bind(moveRightKeyController)
        let rotateCWKeyController = this.settings.key.add(settings.key, "rotateCW").name('Rotation horaire')
        rotateCWKeyController.domElement.onclick = this.changeKey.bind(rotateCWKeyController)
        let rotateCCWKeyController = this.settings.key.add(settings.key, "rotateCCW").name('anti-horaire')
        rotateCCWKeyController.domElement.onclick = this.changeKey.bind(rotateCCWKeyController)
        let softDropKeyController = this.settings.key.add(settings.key, "softDrop").name('Chute lente')
        softDropKeyController.domElement.onclick = this.changeKey.bind(softDropKeyController)
        let hardDropKeyController = this.settings.key.add(settings.key, "hardDrop").name('Chute rapide')
        hardDropKeyController.domElement.onclick = this.changeKey.bind(hardDropKeyController)
        let holdKeyController = this.settings.key.add(settings.key, "hold").name('Garder')
        holdKeyController.domElement.onclick = this.changeKey.bind(holdKeyController)
        let pauseKeyController = this.settings.key.add(settings.key, "pause").name('Pause')
        pauseKeyController.domElement.onclick = this.changeKey.bind(pauseKeyController)

        this.settings.delay = this.settings.addFolder("Répétition automatique").open()
        this.settings.delay.add(settings,"arrDelay").name("ARR (ms)").min(2).max(200).step(1);
        this.settings.delay.add(settings,"dasDelay").name("DAS (ms)").min(100).max(500).step(5);

        this.settings.volume = this.settings.addFolder("Volume").open()
        this.settings.volume.add(settings,"musicVolume").name("Musique").min(0).max(100).step(1).onChange(volume => {
            scene.music.setVolume(volume/100)
            if (game.playing) {
                if (volume) scene.music.play()
            } else {
                scene.music.pause()
            }
        })
        this.settings.volume.add(settings,"sfxVolume").name("Effets").min(0).max(100).step(1).onChange(volume => {
            scene.lineClearSound.setVolume(volume/100)
            scene.tetrisSound.setVolume(volume/100)
            scene.hardDropSound.setVolume(volume/100)
        })

        if (window.location.search.includes("dev")) {
            let dev = this.addFolder("dev")
            let cameraPosition = dev.addFolder("camera.position").close()
            cameraPosition.add(scene.camera.position, "x")
            cameraPosition.add(scene.camera.position, "y")
            cameraPosition.add(scene.camera.position, "z")
        
            let light = dev.addFolder("lights intensity").close()
            light.add(scene.ambientLight, "intensity").name("ambient").min(0).max(20)
            light.add(scene.directionalLight, "intensity").name("directional").min(0).max(20)
            
            let directionalLightPosition = dev.addFolder("directionalLight.position").close()
            directionalLightPosition.add(scene.directionalLight.position, "x")
            directionalLightPosition.add(scene.directionalLight.position, "y")
            directionalLightPosition.add(scene.directionalLight.position, "z")
        
            let vortex = dev.addFolder("vortex opacity").close()
            vortex.add(scene.vortex.darkCylinder.material, "opacity").name("dark").min(0).max(1)
            vortex.add(scene.vortex.colorFullCylinder.material, "opacity").name("colorFull").min(0).max(1)

            let material
            function changeMaterial(type) {
                material?.destroy()
                material = dev.addFolder("minoes material")
                material.add(Mino.mesh.material, "constructor", ["MeshBasicMaterial", "MeshStandardMaterial", "MeshPhysicalMaterial"]).name("type").onChange(changeMaterial)
                switch(type) {
                    case "MeshBasicMaterial":
                        Mino.mesh.material = new THREE.MeshBasicMaterial({
                            envMap: environnement,
                            side: THREE.DoubleSide,
                            transparent: true,
                            opacity: 0.5,
                            reflectivity: 0.9,
                        })
                    break
                    case "MeshStandardMaterial":
                        Mino.mesh.material = new THREE.MeshStandardMaterial({
                            envMap: environnement,
                            side: THREE.DoubleSide,
                            transparent: true,
                            opacity: 0.6,
                            roughness: 0.4,
                            metalness: 0.95,
                        })
                    break
                    case "MeshPhysicalMaterial":
                        Mino.mesh.material = new THREE.MeshPhysicalMaterial({
                            envMap: environnement,
                            side: THREE.DoubleSide,
                            transparent: true,
                            opacity: 0.6,
                            roughness: 0.5,
                            metalness: 0.9,
                            attenuationDistance: 0.5,
                            ior: 2,
                            sheen: 0,
                            sheenRoughness: 1,
                            specularIntensity: 1,
                            thickness: 5,
                            transmission: 1,
                        })
                    break
                }
                if ("opacity"             in Mino.mesh.material) material.add(Mino.mesh.material, "opacity").min(0).max(1)
                if ("reflectivity"        in Mino.mesh.material) material.add(Mino.mesh.material, "reflectivity").min(0).max(1)
                if ("roughness"           in Mino.mesh.material) material.add(Mino.mesh.material, "roughness").min(0).max(1)
                if ("metalness"           in Mino.mesh.material) material.add(Mino.mesh.material, "metalness").min(0).max(1)
                if ("attenuationDistance" in Mino.mesh.material) material.add(Mino.mesh.material, "attenuationDistance").min(0)
                if ("ior"                 in Mino.mesh.material) material.add(Mino.mesh.material, "ior").min(1).max(2)
                if ("sheen"               in Mino.mesh.material) material.add(Mino.mesh.material, "sheen").min(0).max(1)
                if ("sheenRoughness"      in Mino.mesh.material) material.add(Mino.mesh.material, "sheenRoughness").min(0).max(1)
                if ("specularIntensity"   in Mino.mesh.material) material.add(Mino.mesh.material, "specularIntensity").min(0).max(1)
                if ("thickness"           in Mino.mesh.material) material.add(Mino.mesh.material, "thickness").min(0).max(5)
                if ("transmission"        in Mino.mesh.material) material.add(Mino.mesh.material, "transmission").min(0).max(1)
            }
            changeMaterial(this.materialType)
            material.close()

            this.fps = new FPS.default()
            document.body.appendChild(this.fps.dom)
        }

        this.load()
    }

    load() {
        if (localStorage["teTraSettings"]) {
            this.settings.load(JSON.parse(localStorage["teTraSettings"]))
        }
    }

    save() {
        localStorage["teTraSettings"] = JSON.stringify(this.settings.save())
    }

    changeKey() {
        let controller = this
        let input = controller.domElement.getElementsByTagName("input")[0]
        input.select()
        input.onkeydown = function (event) {
            controller.setValue(event.key)
            input.blur()
        }
    }

    update() {
        this.fps?.update()
    }
}