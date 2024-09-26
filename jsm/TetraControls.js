
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'


class TetraControls extends OrbitControls {
  constructor(camera, domElement) {
      super(camera, domElement)
      this.autoRotate
      this.enableDamping   = true
      this.dampingFactor   = 0.04
      this.maxDistance     = 21
      this.keys            = {}
      this.minPolarAngle   = 1
      this.maxPolarAngle   = 2.1
      this.minAzimuthAngle = 0.9 - Math.PI / 2
      this.maxAzimuthAngle = 2.14 - Math.PI / 2
      this.target.set(5, 7.5, 0)
      
      this.addEventListener("start", () => domElement.style.cursor = "grabbing")
      this.addEventListener("end", () => domElement.style.cursor = "grab")
  }
}

export { TetraControls }