import * as THREE from 'three'


export class Vortex extends THREE.Group {
    constructor(loadingManager) {
        super()

        this.loadingManager = loadingManager

        this.globalRotation = 0.028
        
        this.transparentTextureRotation = 0.006
        this.transparentMoveForward = 0.009

        this.opaqueTextureRotation = 0.006
        this.opaqueMoveForward = 0.025
        
        this.opaqueCylinder = new THREE.Mesh(
            new THREE.CylinderGeometry(40, 40, 1000, 12, 1, true),
            new THREE.MeshBasicMaterial({
                side: THREE.BackSide,
                blending: THREE.NormalBlending
            })
        )
        this.add(this.opaqueCylinder)
        
        this.transparentCylinder = new THREE.Mesh(
            new THREE.CylinderGeometry(30, 30, 1000, 12, 1, true),
            new THREE.MeshLambertMaterial({
                side: THREE.BackSide,
                blending: THREE.AdditiveBlending
            })
        )
        this.add(this.transparentCylinder)

        this.position.set(5, 100, -10)
    }

    set theme(theme) {
        const loader = new THREE.TextureLoader(this.loadingManager);

        switch (theme) {
            case "Plasma":
                new THREE.TextureLoader(this.loadingManager).load("./images/plasma.jpg", texture => {
                    texture.wrapS = THREE.RepeatWrapping
                    texture.wrapT = THREE.MirroredRepeatWrapping
                    texture.repeat.set(1, 2)
                    this.transparentCylinder.material.map = texture
                })
                this.transparentCylinder.material.opacity = 0.05

                new THREE.TextureLoader(this.loadingManager).load("./images/plasma2.jpg", texture => {
                    texture.wrapS = THREE.RepeatWrapping
                    texture.wrapT = THREE.MirroredRepeatWrapping
                    texture.repeat.set(2, 2)
                    this.opaqueCylinder.material.map = texture
                })

                this.globalRotation           = 0.028
                this.transparentTextureRotation      = 0.005
                this.transparentMoveForward          = 0.009
                this.opaqueTextureRotation = 0.006
                this.opaqueMoveForward     = 0.025

                this.visible = true
            break
            
            case "Espace":
                new THREE.TextureLoader(this.loadingManager).load("./images/colorfull.jpg", texture => {
                    texture.wrapS = THREE.RepeatWrapping
                    texture.wrapT = THREE.MirroredRepeatWrapping
                    texture.repeat.set(2, 8)
                    this.transparentCylinder.material.map = texture
                })
                this.transparentCylinder.material.opacity = 0.11

                new THREE.TextureLoader(this.loadingManager).load("./images/stars_space.jpg", texture => {
                    texture.wrapS = THREE.RepeatWrapping
                    texture.wrapT = THREE.RepeatWrapping
                    texture.repeat.set(3, 6)
                    this.opaqueCylinder.material.map = texture
                })

                this.globalRotation = 0.028
                this.opaqueTextureRotation = 0.006
                this.opaqueMoveForward = 0.03
                this.transparentTextureRotation = 0.006
                this.transparentMoveForward = 0.012

                this.visible = true
            break

            case "Rétro":
                this.visible = false
            break
        }
    }

    update(delta) {
        if (this.visible) {
            this.rotation.y += this.globalRotation * delta
    
            if (this.transparentCylinder.material.map) {
                this.transparentCylinder.material.map.offset.y += this.transparentMoveForward * delta
                this.transparentCylinder.material.map.offset.x += this.transparentTextureRotation * delta
            }
    
            if (this.opaqueCylinder.material.map) {
                this.opaqueCylinder.material.map.offset.y += this.opaqueMoveForward * delta
                this.opaqueCylinder.material.map.offset.x += this.opaqueTextureRotation * delta
            }
        }
    }
}