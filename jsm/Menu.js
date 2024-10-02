import * as THREE from 'three'
import { GUI } from 'three/addons/libs/lil-gui.module.min.js'
import { Mino, environment } from './Tetrominoes.js'


export class Menu extends GUI {
    constructor(game, settings, stats, scene, controls, playfield) {
        super({title: "ᵀᴱTᴿᴬ"})
        
        this.startButton  = this.add(game, "start").name("Jouer").hide()
        this.pauseButton  = this.add(game, "pause").name("Pause").hide()
        this.resumeButton = this.add(game, "resume").name("Reprendre").hide()

        this.stats = this.addFolder("Statistiques").hide()
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

        this.settings = this.addFolder("Options")
        this.settings.add(settings, "startLevel").name("Niveau initial").min(1).max(15).step(1)

        this.settings.add(settings, "theme", ["Plasma", "Espace", "Rétro"]).name("Thème").onChange(theme => {
            scene.theme = theme
            Mino.meshes.theme = theme
            if (theme == "Rétro") {
                playfield.edge.visible = false
                playfield.retroEdge.visible = true
                music.src = "audio/Tetris_MkVaffQuasi_Ultimix_OC_ReMix.mp3"
            } else {
                playfield.edge.visible = true
                playfield.retroEdge.visible = false
                music.src = "audio/benevolence.m4a"
            }
            if (dev) changeMaterial()
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
        
        let material
        function changeMaterial() {
            material?.destroy()
            material = dev.addFolder("minoes material")
            material.add(Mino.meshes.material, "constructor", ["MeshBasicMaterial", "MeshStandardMaterial", "MeshPhysicalMaterial"]).listen().onChange(type => {
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
                            roughness: 0.5,
                            ior: 1.8,
                            metalness: 0.9,
                            transmission: 1,
                        })
                    break
                }
                Mino.meshes.update = Mino.meshes.updateColor
                changeMaterial()
            })

            let minoMaterial = Mino.meshes.material instanceof Array ? Mino.meshes.material[0] : Mino.meshes.material
            if ("opacity"             in minoMaterial) material.add(minoMaterial, "opacity"            ).min(0).max(1)
            if ("reflectivity"        in minoMaterial) material.add(minoMaterial, "reflectivity"       ).min(0).max(1)
            if ("roughness"           in minoMaterial) material.add(minoMaterial, "roughness"          ).min(0).max(1)
            if ("bumpScale"           in minoMaterial) material.add(minoMaterial, "bumpScale"          ).min(0).max(5)
            if ("metalness"           in minoMaterial) material.add(minoMaterial, "metalness"          ).min(0).max(1)
            if ("attenuationDistance" in minoMaterial) material.add(minoMaterial, "attenuationDistance").min(0)
            if ("ior"                 in minoMaterial) material.add(minoMaterial, "ior"                ).min(1).max(2)
            if ("sheen"               in minoMaterial) material.add(minoMaterial, "sheen"              ).min(0).max(1)
            if ("sheenRoughness"      in minoMaterial) material.add(minoMaterial, "sheenRoughness"     ).min(0).max(1)
            if ("specularIntensity"   in minoMaterial) material.add(minoMaterial, "specularIntensity"  ).min(0).max(1)
            if ("thickness"           in minoMaterial) material.add(minoMaterial, "thickness"          ).min(0).max(5)
            if ("transmission"        in minoMaterial) material.add(minoMaterial, "transmission"       ).min(0).max(1)
        }

        let dev
        if (window.location.search.includes("dev")) {
            dev = this.addFolder("dev")
            let cameraPosition = dev.addFolder("camera").close()
            cameraPosition.add(scene.camera.position, "x").listen()
            cameraPosition.add(scene.camera.position, "y").listen()
            cameraPosition.add(scene.camera.position, "z").listen()
            cameraPosition.add(scene.camera, "fov", 0, 200).onChange(() => scene.camera.updateProjectionMatrix()).listen()
        
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

            changeMaterial(Mino.meshes.material.constructor.name)
            material.close()
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
        let controller = this.settings
        let input = controller.domElement.getElementsByTagName("input")[0]
        input.select()
        input.onkeydown = function (event) {
            controller.setValue(event.key)
            input.blur()
        }
    }
}