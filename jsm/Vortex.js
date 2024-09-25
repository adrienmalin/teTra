import * as THREE from 'three'


export class Vortex extends THREE.Group {
    constructor(loadingManager) {
        super()

        this.loadingManager = loadingManager

        this.globalRotation = 0.028
        
        this.darkTextureRotation = 0.006
        this.darkMoveForward = 0.009
        
        this.colorFullTextureRotation = 0.006
        this.colorFullMoveForward = 0.025

        const commonCylinderGeometry = new THREE.CylinderGeometry(35, 35, 500, 12, 1, true)
        
        this.darkCylinder = new THREE.Mesh(
            commonCylinderGeometry,
            new THREE.MeshLambertMaterial({
                side: THREE.BackSide,
                blending: THREE.AdditiveBlending,
            })
        )
        this.add(this.darkCylinder)
        
        this.colorFullCylinder = new THREE.Mesh(
            commonCylinderGeometry,
            new THREE.MeshBasicMaterial({
                side: THREE.BackSide,
                blending: THREE.AdditiveBlending,
            })
        )
        this.add(this.colorFullCylinder)

        this.position.set(5, 10, -10)
    }

    set theme(theme) {
        switch (theme) {
            case "Plasma":
                new THREE.TextureLoader(this.loadingManager).load("./images/plasma.jpg", texture => {
                    texture.wrapS = THREE.RepeatWrapping
                    texture.wrapT = THREE.MirroredRepeatWrapping
                    texture.repeat.set(1, 1)
                    this.darkCylinder.material.map = texture
                })
                this.darkCylinder.material.opacity = 0.17

                new THREE.TextureLoader(this.loadingManager).load("./images/plasma2.jpg", texture => {
                    texture.wrapS = THREE.RepeatWrapping
                    texture.wrapT = THREE.MirroredRepeatWrapping
                    texture.repeat.set(2, 1)
                    this.colorFullCylinder.material.map = texture
                })
                this.colorFullCylinder.material.opacity = 0.7

                this.globalRotation           = 0.028
                this.darkTextureRotation      = 0.005
                this.darkMoveForward          = 0.009
                this.colorFullTextureRotation = 0.006
                this.colorFullMoveForward     = 0.025
            break
            
            case "Espace":
                new THREE.TextureLoader(this.loadingManager).load("./images/dark.jpg", texture => {
                    texture.wrapS = THREE.RepeatWrapping
                    texture.wrapT = THREE.MirroredRepeatWrapping
                    texture.repeat.set(2, 2)
                    this.darkCylinder.material.map = texture
                })
                this.darkCylinder.material.opacity = 0.05

                new THREE.TextureLoader(this.loadingManager).load("./images/colorfull.jpg", texture => {
                    texture.wrapS = THREE.RepeatWrapping
                    texture.wrapT = THREE.MirroredRepeatWrapping
                    texture.repeat.set(2, 2)
                    this.colorFullCylinder.material.map = texture
                })
                this.colorFullCylinder.material.opacity = 0.34

                this.globalRotation = 0.028
                this.darkTextureRotation = 0.006
                this.darkMoveForward = 0.03
                this.colorFullTextureRotation = 0.006
                this.colorFullMoveForward = 0.012
            break
        }
    }

    update(delta) {
        this.rotation.y += this.globalRotation * delta

        this.darkCylinder.material.map.offset.y += this.darkMoveForward * delta
        this.darkCylinder.material.map.offset.x += this.darkTextureRotation * delta

        this.colorFullCylinder.material.map.offset.y += this.colorFullMoveForward * delta
        this.colorFullCylinder.material.map.offset.x += this.colorFullTextureRotation * delta
    }
}