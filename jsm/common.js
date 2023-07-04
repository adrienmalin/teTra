const DELAY = {
  LOCK: 500,
  FALL: 1000,
}

const T_SPIN = {
  NONE: "",
  MINI: "PETITE<br/>PIROUETTE",
  T_SPIN: "PIROUETTE"
}

// score = AWARDED_LINE_CLEARS[tSpin][nbClearedLines]
const AWARDED_LINE_CLEARS = {
  [T_SPIN.NONE]: [0, 1, 3, 5, 8],
  [T_SPIN.MINI]: [1, 2],
  [T_SPIN.T_SPIN]: [4, 8, 12, 16]
}

const CLEARED_LINES_NAMES = [
  "",
  "SOLO",
  "DUO",
  "TRIO",
  "TETRA",
]


export { DELAY, T_SPIN, AWARDED_LINE_CLEARS, CLEARED_LINES_NAMES }