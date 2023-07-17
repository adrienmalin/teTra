let jsKeyRenamer = new Proxy({
    ["←"]: "arrowleft",
    ["→"]: "arrowright",
    ["↑"]: "arrowup",
    ["↓"]: "arrowdown",
    ["Espace"]:  " ",
    ["Échap."]: "escape",
    ["Ret. arrière"]: "backspace",
    ["Entrée"]: "enter",
}, {
    get(obj, keyName) {
        return keyName in obj ? obj[keyName] : keyName.toLowerCase()
    }
})
let friendyKeyRenamer = new Proxy({
    ["arrowleft"]: "←",
    ["arrowright"]: "→",
    ["arrowup"]: "↑",
    ["arrowdown"]: "↓",
    [" "]: "Espace",
    ["escape"]: "Échap.",
    ["backspace"]: "Ret. arrière",
    ["enter"]: "Entrée",
}, {
    get(obj, keyName) {
        return keyName.toLowerCase() in obj ? obj[keyName] : keyName.toUpperCase()
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
                key = key.toLowerCase()
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
                key = key.toLowerCase()
                km.key[action] = key
                return km.action[key] = action
            },
            has(km, key) {
                return key.toLowerCase() in km.action
            },
            get(km, key) {
                return km.action[key.toLowerCase()]
            }
        })

        this.key.moveLeft = "ArrowLeft"
        this.key.moveRight = "ArrowRight"
        this.key.rotateCCW = "w"
        this.key.rotateCW = "ArrowUp"
        this.key.softDrop = "ArrowDown"
        this.key.hardDrop = " "
        this.key.hold = "c"
        this.key.pause = "Escape"

        this.arrDelay = 50
        this.dasDelay = 300

        this.musicVolume = 50
        this.sfxVolume = 50
    }
}


export { Settings }