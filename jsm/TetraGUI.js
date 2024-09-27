import * as THREE from 'three'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'
import * as FPS from 'three/addons/libs/stats.module.js'
import { Mino, environment } from './Tetrominoes.js'


export class TetraGUI extends GUI {
    constructor(game, settings, stats, scene, controls, playfield) {
        super({title: "teTra"})
        
        this.startButton  = this.add(game, "start").name("Jouer").hide()
        this.pauseButton  = this.add(game, "pause").name("Pause").hide()
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

        this.settings.add(settings, "theme", ["Plasma", "Espace", "Rétro"]).name("Thème").onChange(theme => {
            scene.theme = theme
            Mino.meshes.material = Mino.materials[theme]
            if (theme == "Rétro") {
                playfield.edge.visible = false
                playfield.retroEdge.visible = true
                Mino.meshes.resetColor()
                Mino.meshes.update = Mino.meshes.updateOffset
                music.src = "audio/Tetris_MkVaffQuasi_Ultimix_OC_ReMix.mp3"
            } else {
                playfield.edge.visible = true
                playfield.retroEdge.visible = false
                Mino.meshes.update = Mino.meshes.updateColor
                music.src = "audio/benevolence.m4a"
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
            scene.music.volume = settings.musicVolume / 100
        })
        this.settings.volume.add(settings,"sfxVolume").name("Effets").min(0).max(100).step(1).onChange(volume => {
            scene.lineClearSound.setVolume(volume/100)
            scene.tetrisSound.setVolume(volume/100)
            scene.hardDropSound.setVolume(volume/100)
        })

        this.dev = window.location.search.includes("dev")
        if (this.dev) {
            let dev = this.addFolder("dev")
            let cameraPosition = dev.addFolder("camera").close()
            cameraPosition.add(scene.camera.position, "x")
            cameraPosition.add(scene.camera.position, "y")
            cameraPosition.add(scene.camera.position, "z")
            cameraPosition.add(scene.camera, "fov", 0, 200).onChange(() => scene.camera.updateProjectionMatrix())
        
            let light = dev.addFolder("lights intensity").close()
            light.add(scene.ambientLight, "intensity").name("ambient").min(0).max(20).listen()
            light.add(scene.directionalLight, "intensity").name("directional").min(0).max(20).listen()
            
            let directionalLightPosition = dev.addFolder("directionalLight.position").close()
            directionalLightPosition.add(scene.directionalLight.position, "x").listen()
            directionalLightPosition.add(scene.directionalLight.position, "y").listen()
            directionalLightPosition.add(scene.directionalLight.position, "z").listen()
        
            let vortex = dev.addFolder("vortex opacity").close()
            vortex.add(scene.vortex.darkCylinder.material, "opacity").name("dark").min(0).max(1)
            vortex.add(scene.vortex.colorFullCylinder.material, "opacity").name("colorFull").min(0).max(1)

            let material
            function changeMaterial(type) {
                material?.destroy()
                material = dev.addFolder("minoes material")
                material.add(Mino.meshes.material, "constructor", ["MeshBasicMaterial", "MeshStandardMaterial", "MeshPhysicalMaterial"]).name("type").onChange(changeMaterial)
                switch(type) {
                    case "MeshBasicMaterial":
                        Mino.meshes.material = new THREE.MeshBasicMaterial({
                            envMap: environment,
                            side: THREE.DoubleSide,
                            transparent: true,
                            opacity: 0.5,
                            reflectivity: 0.9,
                        })
                    break
                    case "MeshStandardMaterial":
                        Mino.meshes.material = new THREE.MeshStandardMaterial({
                            envMap: environment,
                            side: THREE.DoubleSide,
                            transparent: true,
                            opacity:   0.7,
                            roughness: 0.48,
                            metalness: 0.67,
                        })
                    break
                    case "MeshPhysicalMaterial":
                        Mino.meshes.material = new THREE.MeshPhysicalMaterial({
                            envMap: environment,
                            side: THREE.DoubleSide,
                            transparent: true,
                            opacity: 0.7,
                            roughness: 0.6,
                            ior: 1.8,
                            metalness: 0.6,
                            sheen: 0,
                            sheenRoughness: 1,
                            specularIntensity: 1,
                            thickness: 5,
                            transmission: 1,
                        })
                    break
                }
                if ("opacity"             in Mino.meshes.material) material.add(Mino.meshes.material, "opacity"            ).min(0).max(1).listen()
                if ("reflectivity"        in Mino.meshes.material) material.add(Mino.meshes.material, "reflectivity"       ).min(0).max(1).listen()
                if ("roughness"           in Mino.meshes.material) material.add(Mino.meshes.material, "roughness"          ).min(0).max(1).listen()
                if ("metalness"           in Mino.meshes.material) material.add(Mino.meshes.material, "metalness"          ).min(0).max(1).listen()
                if ("attenuationDistance" in Mino.meshes.material) material.add(Mino.meshes.material, "attenuationDistance").min(0).listen()
                if ("ior"                 in Mino.meshes.material) material.add(Mino.meshes.material, "ior"                ).min(1).max(2).listen()
                if ("sheen"               in Mino.meshes.material) material.add(Mino.meshes.material, "sheen"              ).min(0).max(1).listen()
                if ("sheenRoughness"      in Mino.meshes.material) material.add(Mino.meshes.material, "sheenRoughness"     ).min(0).max(1).listen()
                if ("specularIntensity"   in Mino.meshes.material) material.add(Mino.meshes.material, "specularIntensity"  ).min(0).max(1).listen()
                if ("thickness"           in Mino.meshes.material) material.add(Mino.meshes.material, "thickness"          ).min(0).max(5).listen()
                if ("transmission"        in Mino.meshes.material) material.add(Mino.meshes.material, "transmission"       ).min(0).max(1).listen()
            }
            changeMaterial(this.materialType)
            material.close()

            controls.addEventListener("change", () => cameraPosition.controllersRecursive().forEach((control) => {
                control.updateDisplay()
            }))

        }

        if (window.location.search.includes("fps")) {
            let fps = new FPS.default()
            document.body.appendChild(fps.dom)

            this.update = function() {
                fps.update()
            }
        }
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

    update() {}
}