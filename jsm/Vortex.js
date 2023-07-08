import * as THREE from 'three'


const GLOBAL_ROTATION = 0.028

const darkTextureRotation = 0.006
const darkMoveForward = 0.007

const colorFullTextureRotation = 0.006
const colorFullMoveForward = 0.02


class Vortex extends THREE.Group {
    constructor(loadingManager) {
        super()

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
                opacity: 0.1
            })
        )
        this.darkCylinder.position.set(5, 10, -10)
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
                opacity: 0.6
            })
        )
        this.colorFullCylinder.position.set(5, 10, -10)
        this.add(this.colorFullCylinder)
    }

    update(delta) {
        this.darkCylinder.rotation.y            += GLOBAL_ROTATION * delta
        this.darkCylinder.material.map.offset.y += darkMoveForward * delta
        this.darkCylinder.material.map.offset.x += darkTextureRotation * delta

        this.colorFullCylinder.rotation.y            += GLOBAL_ROTATION * delta
        this.colorFullCylinder.material.map.offset.y += colorFullMoveForward * delta
        this.colorFullCylinder.material.map.offset.x += colorFullTextureRotation * delta
    }
}


export { Vortex }