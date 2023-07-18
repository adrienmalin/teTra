import * as THREE from 'three'


export class Vortex extends THREE.Group {
    constructor(loadingManager) {
        super()

        this.globalRotation = 0.028
        
        this.darkTextureRotation = 0.006
        this.darkMoveForward = 0.009
        
        this.colorFullTextureRotation = 0.006
        this.colorFullMoveForward = 0.015

        const commonCylinderGeometry = new THREE.CylinderGeometry(35, 35, 500, 12, 1, true)

        this.background = "Plasma"
        
        this.darkCylinder = new THREE.Mesh(
            commonCylinderGeometry,
            new THREE.MeshLambertMaterial({
                side: THREE.BackSide,
                map: new THREE.TextureLoader(loadingManager).load("./images/plasma.jpg", (texture) => {
                    texture.wrapS = THREE.RepeatWrapping
                    texture.wrapT = THREE.MirroredRepeatWrapping
                    texture.repeat.set(1, 1)
                }),
                blending: THREE.AdditiveBlending,
                opacity: 0.03
            })
        )
        this.add(this.darkCylinder)
        
        this.colorFullCylinder = new THREE.Mesh(
            commonCylinderGeometry,
            new THREE.MeshBasicMaterial({
                side: THREE.BackSide,
                map: new THREE.TextureLoader(loadingManager).load("./images/plasma2.jpg", (texture) => {
                    texture.wrapS = THREE.RepeatWrapping
                    texture.wrapT = THREE.MirroredRepeatWrapping
                    texture.repeat.set(2, 1)
                }),
                blending: THREE.AdditiveBlending,
                opacity: 0.7
            })
        )
        this.add(this.colorFullCylinder)

        this.position.set(5, 10, -10)
    }

    update(delta) {
        this.rotation.y += this.globalRotation * delta

        this.darkCylinder.material.map.offset.y += this.darkMoveForward * delta
        this.darkCylinder.material.map.offset.x += this.darkTextureRotation * delta

        this.colorFullCylinder.material.map.offset.y += this.colorFullMoveForward * delta
        this.colorFullCylinder.material.map.offset.x += this.colorFullTextureRotation * delta
    }
}