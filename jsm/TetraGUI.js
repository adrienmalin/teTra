import * as THREE from 'three'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'
import * as FPS from 'three/addons/libs/stats.module.js'
import { COLORS, environnement, I, J, L, O, S, T, Z } from './gamelogic.js'


class TetraGUI extends GUI {
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
                        scene.vortex.darkCylinder.material.opacity = 0.1
                        scene.vortex.colorFullCylinder.material.map = colorfullTexture
                        scene.vortex.colorFullCylinder.material.opacity = 0.6
                        
                        scene.vortex.globalRotation = 0.028
                        scene.vortex.darkTextureRotation = 0.006
                        scene.vortex.darkMoveForward = 0.007
                        scene.vortex.colorFullTextureRotation = 0.006
                        scene.vortex.colorFullMoveForward = 0.02

                        scene.ambientLight.intensity     = 0.1
                        scene.directionalLight.intensity = 15
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
            if (volume) {
                scene.music.setVolume(volume/100)
                if (game.playing) scene.music.play()
            } else {
                scene.music.pause()
            }
        })
        this.settings.volume.add(settings,"sfxVolume").name("Effets").min(0).max(100).step(1).onChange(volume => {
            scene.lineClearSound.setVolume(volume/100)
            scene.tetrisSound.setVolume(volume/100)
            scene.hardDropSound.setVolume(volume/100)
        })

        this.debug = window.location.search.includes("debug")
        if (this.debug) {
            this.debug = this.addFolder("debug")
            let cameraPosition = this.debug.addFolder("camera.position").close()
            cameraPosition.add(scene.camera.position, "x")
            cameraPosition.add(scene.camera.position, "y")
            cameraPosition.add(scene.camera.position, "z")
            
            let directionalLightPosition = this.debug.addFolder("directionalLight.position").close()
            directionalLightPosition.add(scene.directionalLight.position, "x")
            directionalLightPosition.add(scene.directionalLight.position, "y")
            directionalLightPosition.add(scene.directionalLight.position, "z")
        
            let light = this.debug.addFolder("lights intensity").close()
            light.add(scene.ambientLight, "intensity").name("ambient").min(0).max(20)
            light.add(scene.directionalLight, "intensity").name("directional").min(0).max(20)
        
            let vortex = this.debug.addFolder("vortex opacity").close()
            vortex.add(scene.vortex.darkCylinder.material, "opacity").name("dark").min(0).max(1)
            vortex.add(scene.vortex.colorFullCylinder.material, "opacity").name("colorFull").min(0).max(1)

            let materialParams = {
                type: "MeshBasicMaterial",
                opacity: 0.95,
                reflectivity: 0.8,
                roughness: 0.1,
                metalness: 0.5,
                attenuationDistance: 0.5,
                ior: 2,
                sheen: 0,
                sheenRoughness: 1,
                specularIntensity: 1,
                thickness: 5,
                transmission: 1,
            }
            let material = this.debug.addFolder("minoes material").close()
            let type = material.add(materialParams, "type", ["MeshBasicMaterial", "MeshStandardMaterial", "MeshPhysicalMaterial"])
            let opacity = material.add(materialParams, "opacity").min(0).max(1)
            let reflectivity = material.add(materialParams, "reflectivity").min(0).max(1)
            let roughness = material.add(materialParams, "roughness").min(0).max(1).hide()
            let metalness = material.add(materialParams, "metalness").min(0).max(1).hide()
            let attenuationDistance = material.add(materialParams, "attenuationDistance").min(0).max(1).hide()
            let ior = material.add(materialParams, "ior").min(1).max(2).hide()
            let sheen = material.add(materialParams, "sheen").min(0).max(1).hide()
            let sheenRoughness = material.add(materialParams, "sheenRoughness").min(0).max(1).hide()
            let specularIntensity = material.add(materialParams, "specularIntensity").min(0).max(1).hide()
            let thickness = material.add(materialParams, "thickness").min(0).max(5).hide()
            let transmission = material.add(materialParams, "transmission").min(0).max(1).hide()
            type.onChange(type => {
                switch(type) {
                    case "MeshBasicMaterial":
                        reflectivity.show()
                        roughness.hide()
                        metalness.hide()
                        attenuationDistance.hide()
                        ior.hide()
                        sheen.hide()
                        sheenRoughness.hide()
                        specularIntensity.hide()
                        thickness.hide()
                        transmission.hide()
                    break
                    case "MeshStandardMaterial":
                        reflectivity.hide()
                        roughness.show()
                        metalness.show()
                        attenuationDistance.hide()
                        ior.hide()
                        sheen.hide()
                        sheenRoughness.hide()
                        specularIntensity.hide()
                        thickness.hide()
                        transmission.hide()
                    break
                    case "MeshPhysicalMaterial":
                        reflectivity.hide()
                        roughness.show()
                        metalness.show()
                        attenuationDistance.show()
                        ior.show()
                        sheen.show()
                        sheenRoughness.show()
                        specularIntensity.show()
                        thickness.show()
                        transmission.show()
                    break
                }
            })
            material.onChange(() => {
                let minoMaterialFactory
                switch(materialParams.type) {
                    case "MeshBasicMaterial":
                        minoMaterialFactory = color => new THREE.MeshBasicMaterial({
                            color       : color,
                            envMap      : environnement,
                            reflectivity: materialParams.reflectivity,
                            transparent : true,
                            opacity     : materialParams.opacity,
                            side        : THREE.DoubleSide,
                        })
                    break
                    case "MeshStandardMaterial":
                        minoMaterialFactory = color => new THREE.MeshStandardMaterial({
                            color      : color,
                            envMap     : environnement,
                            transparent: true,
                            opacity    : materialParams.opacity,
                            side       : THREE.DoubleSide,
                            roughness  : materialParams.roughness,
                            metalness  : materialParams.metalness,
                        })
                    break
                    case "MeshPhysicalMaterial":
                        minoMaterialFactory = color => new THREE.MeshPhysicalMaterial({
                            color              : "white",
                            envMap             : environnement,
                            transparent        : true,
                            opacity            : materialParams.opacity,
                            side               : THREE.DoubleSide,
                            roughness          : materialParams.roughness,
                            metalness          : materialParams.metalness,
                            attenuationColor   : color,
                            attenuationDistance: materialParams.attenuationDistance,
                            ior                : materialParams.ior,
                            sheen              : materialParams.sheen,
                            sheenRoughness     : materialParams.sheenRoughness,
                            specularIntensity  : materialParams.specularIntensity,
                            thickness          : materialParams.thickness,
                            transmission       : materialParams.transmission,
                        })
                    break
                }
                I.prototype.material = minoMaterialFactory(COLORS.I)
                J.prototype.material = minoMaterialFactory(COLORS.J)
                L.prototype.material = minoMaterialFactory(COLORS.L)
                O.prototype.material = minoMaterialFactory(COLORS.O)
                S.prototype.material = minoMaterialFactory(COLORS.S)
                T.prototype.material = minoMaterialFactory(COLORS.T)
                Z.prototype.material = minoMaterialFactory(COLORS.Z)
            })

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


export { TetraGUI }