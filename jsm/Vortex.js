import * as THREE from 'three'


class Vortex extends THREE.Group {
    constructor(loadingManager) {
        super()

        const commonCylinderGeometry = new THREE.CylinderGeometry(35, 35, 500, 12, 1, true)


        this.globalRotation = 0.028
        
        this.darkTextureRotation = 0.006
        this.darkMoveForward = 0.007
        
        this.colorFullTextureRotation = 0.006
        this.colorFullMoveForward = 0.02

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
        this.darkCylinder.rotation.y            += this.globalRotation * delta
        this.darkCylinder.material.map.offset.y += this.darkMoveForward * delta
        this.darkCylinder.material.map.offset.x += this.darkTextureRotation * delta

        this.colorFullCylinder.rotation.y            += this.globalRotation * delta
        this.colorFullCylinder.material.map.offset.y += this.colorFullMoveForward * delta
        this.colorFullCylinder.material.map.offset.x += this.colorFullTextureRotation * delta
    }
}


export { Vortex }