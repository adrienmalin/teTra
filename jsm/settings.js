let jsKeyRenamer = new Proxy({
  ["←"]           : "ArrowLeft",
  ["→"]           : "ArrowRight",
  ["↑"]           : "ArrowUp",
  ["↓"]           : "ArrowDown",
  ["Espace"]      : " ",
  ["Échap."]      : "Escape",
  ["Ret. arrière"]: "Backspace",
  ["Entrée"]      : "Enter",
}, {
  get(obj, keyName) {
      return keyName in obj? obj[keyName] : keyName
  }
})
let friendyKeyRenamer = new Proxy({
  ["ArrowLeft"]   : "←",
  ["ArrowRight"]  : "→",
  ["ArrowUp"]     : "↑",
  ["ArrowDown"]   : "↓",
  [" "]           : "Espace",
  ["Escape"]      : "Échap.",
  ["Backspace"]   : "Ret. arrière",
  ["Enter"]       : "Entrée",
}, {
  get(obj, keyName) {
      return keyName in obj? obj[keyName] : keyName
  }
})

class Settings {
  constructor() {
      this.startLevel = 1

      let keyMaps = {
    key: {},
    action: {}
  }

      this.key = new Proxy(keyMaps, {
    set(km, action, key) {
      km.action[key] = action
              return km.key[action] = jsKeyRenamer[key]
    },
          has(km, action) {
              return action in km.key
          },
    get(km, action) {
      return friendyKeyRenamer[km.key[action]]
    }
  })
  this.action = new Proxy(keyMaps, {
    set(km, key, action) {
      km.key[action] = key
              return km.action[key] = action
    },
          has(km, key) {
              return key in km.action
          },
    get(km, key) {
      return km.action[key]
    }
  })

      this.key.moveLeft  = "ArrowLeft"
      this.key.moveRight = "ArrowRight"
      this.key.rotateCCW = "w"
      this.key.rotateCW  = "ArrowUp"
      this.key.softDrop  = "ArrowDown"
      this.key.hardDrop  = " "
      this.key.hold      = "c"
      this.key.pause     = "Escape"

      this.arrDelay = 50
      this.dasDelay = 300
      
      this.musicVolume = 50
      this.sfxVolume   = 50
  }
}


export { Settings }