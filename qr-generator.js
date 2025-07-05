// Pure JavaScript QR Code Generator - No external dependencies!
class QRCodeGenerator {
  constructor() {
    this.errorCorrectionLevels = {
      L: 1, // Low
      M: 0, // Medium
      Q: 3, // Quartile
      H: 2, // High
    }
  }

  // Generate QR Code matrix
  generate(text, errorCorrectionLevel = "M") {
    const qr = this.createQRCode(this.errorCorrectionLevels[errorCorrectionLevel], "Byte")
    qr.addData(text)
    qr.make()
    return qr
  }

  // Render QR Code to canvas
  toCanvas(canvas, text, options = {}) {
    const {
      width = 300,
      height = 300,
      margin = 4,
      color = { dark: "#000000", light: "#ffffff" },
      errorCorrectionLevel = "M",
    } = options

    try {
      const qr = this.generate(text, errorCorrectionLevel)
      const ctx = canvas.getContext("2d")
      const moduleCount = qr.getModuleCount()
      const cellSize = Math.floor((Math.min(width, height) - margin * 2) / moduleCount)
      const qrSize = cellSize * moduleCount
      const offsetX = Math.floor((width - qrSize) / 2)
      const offsetY = Math.floor((height - qrSize) / 2)

      canvas.width = width
      canvas.height = height

      // Fill background
      ctx.fillStyle = color.light
      ctx.fillRect(0, 0, width, height)

      // Draw QR modules
      ctx.fillStyle = color.dark
      for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount; col++) {
          if (qr.isDark(row, col)) {
            ctx.fillRect(offsetX + col * cellSize, offsetY + row * cellSize, cellSize, cellSize)
          }
        }
      }

      return true
    } catch (error) {
      console.error("QR Code generation error:", error)
      return false
    }
  }

  // Create QR Code object
  createQRCode(typeNumber, errorCorrectionLevel) {
    const qr = new QRCodeModel(typeNumber, errorCorrectionLevel)
    return qr
  }
}

// QR Code Model
class QRCodeModel {
  constructor(typeNumber, errorCorrectionLevel) {
    this.typeNumber = typeNumber
    this.errorCorrectionLevel = errorCorrectionLevel
    this.modules = null
    this.moduleCount = 0
    this.dataCache = null
    this.dataList = []
  }

  addData(data) {
    const newData = new QR8bitByte(data)
    this.dataList.push(newData)
    this.dataCache = null
  }

  isDark(row, col) {
    if (row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col) {
      throw new Error(row + "," + col)
    }
    return this.modules[row][col]
  }

  getModuleCount() {
    return this.moduleCount
  }

  make() {
    this.makeImpl(false, this.getBestMaskPattern())
  }

  makeImpl(test, maskPattern) {
    this.moduleCount = this.typeNumber * 4 + 17
    this.modules = new Array(this.moduleCount)

    for (let row = 0; row < this.moduleCount; row++) {
      this.modules[row] = new Array(this.moduleCount)
      for (let col = 0; col < this.moduleCount; col++) {
        this.modules[row][col] = null
      }
    }

    this.setupPositionProbePattern(0, 0)
    this.setupPositionProbePattern(this.moduleCount - 7, 0)
    this.setupPositionProbePattern(0, this.moduleCount - 7)
    this.setupPositionAdjustPattern()
    this.setupTimingPattern()
    this.setupTypeInfo(test, maskPattern)

    if (this.typeNumber >= 7) {
      this.setupTypeNumber(test)
    }

    if (this.dataCache == null) {
      this.dataCache = QRCodeModel.createData(this.typeNumber, this.errorCorrectionLevel, this.dataList)
    }

    this.mapData(this.dataCache, maskPattern)
  }

  setupPositionProbePattern(row, col) {
    for (let r = -1; r <= 7; r++) {
      if (row + r <= -1 || this.moduleCount <= row + r) continue

      for (let c = -1; c <= 7; c++) {
        if (col + c <= -1 || this.moduleCount <= col + c) continue

        if (
          (0 <= r && r <= 6 && (c == 0 || c == 6)) ||
          (0 <= c && c <= 6 && (r == 0 || r == 6)) ||
          (2 <= r && r <= 4 && 2 <= c && c <= 4)
        ) {
          this.modules[row + r][col + c] = true
        } else {
          this.modules[row + r][col + c] = false
        }
      }
    }
  }

  getBestMaskPattern() {
    let minLostPoint = 0
    let pattern = 0

    for (let i = 0; i < 8; i++) {
      this.makeImpl(true, i)
      const lostPoint = QRUtil.getLostPoint(this)

      if (i == 0 || minLostPoint > lostPoint) {
        minLostPoint = lostPoint
        pattern = i
      }
    }

    return pattern
  }

  setupTimingPattern() {
    for (let r = 8; r < this.moduleCount - 8; r++) {
      if (this.modules[r][6] != null) {
        continue
      }
      this.modules[r][6] = r % 2 == 0
    }

    for (let c = 8; c < this.moduleCount - 8; c++) {
      if (this.modules[6][c] != null) {
        continue
      }
      this.modules[6][c] = c % 2 == 0
    }
  }

  setupPositionAdjustPattern() {
    const pos = QRUtil.getPatternPosition(this.typeNumber)

    for (let i = 0; i < pos.length; i++) {
      for (let j = 0; j < pos.length; j++) {
        const row = pos[i]
        const col = pos[j]

        if (this.modules[row][col] != null) {
          continue
        }

        for (let r = -2; r <= 2; r++) {
          for (let c = -2; c <= 2; c++) {
            if (r == -2 || r == 2 || c == -2 || c == 2 || (r == 0 && c == 0)) {
              this.modules[row + r][col + c] = true
            } else {
              this.modules[row + r][col + c] = false
            }
          }
        }
      }
    }
  }

  setupTypeNumber(test) {
    const bits = QRUtil.getBCHTypeNumber(this.typeNumber)

    for (let i = 0; i < 18; i++) {
      const mod = !test && ((bits >> i) & 1) == 1
      this.modules[Math.floor(i / 3)][(i % 3) + this.moduleCount - 8 - 3] = mod
    }

    for (let i = 0; i < 18; i++) {
      const mod = !test && ((bits >> i) & 1) == 1
      this.modules[(i % 3) + this.moduleCount - 8 - 3][Math.floor(i / 3)] = mod
    }
  }

  setupTypeInfo(test, maskPattern) {
    const data = (this.errorCorrectionLevel << 3) | maskPattern
    const bits = QRUtil.getBCHTypeInfo(data)

    // vertical
    for (let i = 0; i < 15; i++) {
      const mod = !test && ((bits >> i) & 1) == 1

      if (i < 6) {
        this.modules[i][8] = mod
      } else if (i < 8) {
        this.modules[i + 1][8] = mod
      } else {
        this.modules[this.moduleCount - 15 + i][8] = mod
      }
    }

    // horizontal
    for (let i = 0; i < 15; i++) {
      const mod = !test && ((bits >> i) & 1) == 1

      if (i < 8) {
        this.modules[8][this.moduleCount - i - 1] = mod
      } else if (i < 9) {
        this.modules[8][15 - i - 1 + 1] = mod
      } else {
        this.modules[8][15 - i - 1] = mod
      }
    }

    // fixed module
    this.modules[this.moduleCount - 8][8] = !test
  }

  mapData(data, maskPattern) {
    let inc = -1
    let row = this.moduleCount - 1
    let bitIndex = 7
    let byteIndex = 0

    for (let col = this.moduleCount - 1; col > 0; col -= 2) {
      if (col == 6) col--

      while (true) {
        for (let c = 0; c < 2; c++) {
          if (this.modules[row][col - c] == null) {
            let dark = false

            if (byteIndex < data.length) {
              dark = ((data[byteIndex] >>> bitIndex) & 1) == 1
            }

            const mask = QRUtil.getMask(maskPattern, row, col - c)

            if (mask) {
              dark = !dark
            }

            this.modules[row][col - c] = dark
            bitIndex--

            if (bitIndex == -1) {
              byteIndex++
              bitIndex = 7
            }
          }
        }

        row += inc

        if (row < 0 || this.moduleCount <= row) {
          row -= inc
          inc = -inc
          break
        }
      }
    }
  }

  static createData(typeNumber, errorCorrectionLevel, dataList) {
    const rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectionLevel)
    const buffer = new QRBitBuffer()

    for (let i = 0; i < dataList.length; i++) {
      const data = dataList[i]
      buffer.put(data.mode, 4)
      buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber))
      data.write(buffer)
    }

    // calc num max data.
    let totalDataCount = 0
    for (let i = 0; i < rsBlocks.length; i++) {
      totalDataCount += rsBlocks[i].dataCount
    }

    if (buffer.getLengthInBits() > totalDataCount * 8) {
      throw new Error("code length overflow. (" + buffer.getLengthInBits() + ">" + totalDataCount * 8 + ")")
    }

    // end code
    if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
      buffer.put(0, 4)
    }

    // padding
    while (buffer.getLengthInBits() % 8 != 0) {
      buffer.putBit(false)
    }

    // padding
    while (true) {
      if (buffer.getLengthInBits() >= totalDataCount * 8) {
        break
      }
      buffer.put(QRCodeModel.PAD0, 8)

      if (buffer.getLengthInBits() >= totalDataCount * 8) {
        break
      }
      buffer.put(QRCodeModel.PAD1, 8)
    }

    return QRCodeModel.createBytes(buffer, rsBlocks)
  }

  static createBytes(buffer, rsBlocks) {
    let offset = 0
    let maxDcCount = 0
    let maxEcCount = 0
    const dcdata = new Array(rsBlocks.length)
    const ecdata = new Array(rsBlocks.length)

    for (let r = 0; r < rsBlocks.length; r++) {
      const dcCount = rsBlocks[r].dataCount
      const ecCount = rsBlocks[r].totalCount - dcCount

      maxDcCount = Math.max(maxDcCount, dcCount)
      maxEcCount = Math.max(maxEcCount, ecCount)

      dcdata[r] = new Array(dcCount)

      for (let i = 0; i < dcdata[r].length; i++) {
        dcdata[r][i] = 0xff & buffer.buffer[i + offset]
      }
      offset += dcCount

      const rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount)
      const rawPoly = new QRPolynomial(dcdata[r], rsPoly.getLength() - 1)

      const modPoly = rawPoly.mod(rsPoly)
      ecdata[r] = new Array(rsPoly.getLength() - 1)
      for (let i = 0; i < ecdata[r].length; i++) {
        const modIndex = i + modPoly.getLength() - ecdata[r].length
        ecdata[r][i] = modIndex >= 0 ? modPoly.get(modIndex) : 0
      }
    }

    let totalCodeCount = 0
    for (let i = 0; i < rsBlocks.length; i++) {
      totalCodeCount += rsBlocks[i].totalCount
    }

    const data = new Array(totalCodeCount)
    let index = 0

    for (let i = 0; i < maxDcCount; i++) {
      for (let r = 0; r < rsBlocks.length; r++) {
        if (i < dcdata[r].length) {
          data[index++] = dcdata[r][i]
        }
      }
    }

    for (let i = 0; i < maxEcCount; i++) {
      for (let r = 0; r < rsBlocks.length; r++) {
        if (i < ecdata[r].length) {
          data[index++] = ecdata[r][i]
        }
      }
    }

    return data
  }
}

QRCodeModel.PAD0 = 0xec
QRCodeModel.PAD1 = 0x11

// QR 8-bit Byte
class QR8bitByte {
  constructor(data) {
    this.mode = QRMode.MODE_8BIT_BYTE
    this.data = data
  }

  getLength() {
    return this.data.length
  }

  write(buffer) {
    for (let i = 0; i < this.data.length; i++) {
      buffer.put(this.data.charCodeAt(i), 8)
    }
  }
}

// QR Mode
const QRMode = {
  MODE_NUMBER: 1 << 0,
  MODE_ALPHA_NUM: 1 << 1,
  MODE_8BIT_BYTE: 1 << 2,
  MODE_KANJI: 1 << 3,
}

// QR Bit Buffer
class QRBitBuffer {
  constructor() {
    this.buffer = []
    this.length = 0
  }

  get(index) {
    const bufIndex = Math.floor(index / 8)
    return ((this.buffer[bufIndex] >>> (7 - (index % 8))) & 1) == 1
  }

  put(num, length) {
    for (let i = 0; i < length; i++) {
      this.putBit(((num >>> (length - i - 1)) & 1) == 1)
    }
  }

  getLengthInBits() {
    return this.length
  }

  putBit(bit) {
    const bufIndex = Math.floor(this.length / 8)
    if (this.buffer.length <= bufIndex) {
      this.buffer.push(0)
    }

    if (bit) {
      this.buffer[bufIndex] |= 0x80 >>> (this.length % 8)
    }

    this.length++
  }
}

// QR Utilities
const QRUtil = {
  PATTERN_POSITION_TABLE: [
    [],
    [6, 18],
    [6, 22],
    [6, 26],
    [6, 30],
    [6, 34],
    [6, 22, 38],
    [6, 24, 42],
    [6, 26, 46],
    [6, 28, 50],
    [6, 30, 54],
    [6, 32, 58],
    [6, 34, 62],
    [6, 26, 46, 66],
    [6, 26, 48, 70],
    [6, 26, 50, 74],
    [6, 30, 54, 78],
    [6, 30, 56, 82],
    [6, 30, 58, 86],
    [6, 34, 62, 90],
    [6, 28, 50, 72, 94],
    [6, 26, 50, 74, 98],
    [6, 30, 54, 78, 102],
    [6, 28, 54, 80, 106],
    [6, 32, 58, 84, 110],
    [6, 30, 58, 86, 114],
    [6, 34, 62, 90, 118],
    [6, 26, 50, 74, 98, 122],
    [6, 30, 54, 78, 102, 126],
    [6, 26, 52, 78, 104, 130],
    [6, 30, 56, 82, 108, 134],
    [6, 34, 60, 86, 112, 138],
    [6, 30, 58, 86, 114, 142],
    [6, 34, 62, 90, 118, 146],
    [6, 30, 54, 78, 102, 126, 150],
    [6, 24, 50, 76, 102, 128, 154],
    [6, 28, 54, 80, 106, 132, 158],
    [6, 32, 58, 84, 110, 136, 162],
    [6, 26, 54, 82, 110, 138, 166],
    [6, 30, 58, 86, 114, 142, 170],
  ],

  G15: (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0),
  G18: (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0),
  G15_MASK: (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1),

  getBCHTypeInfo(data) {
    let d = data << 10
    while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15) >= 0) {
      d ^= QRUtil.G15 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15))
    }
    return ((data << 10) | d) ^ QRUtil.G15_MASK
  },

  getBCHTypeNumber(data) {
    let d = data << 12
    while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18) >= 0) {
      d ^= QRUtil.G18 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18))
    }
    return (data << 12) | d
  },

  getBCHDigit(data) {
    let digit = 0
    while (data != 0) {
      digit++
      data >>>= 1
    }
    return digit
  },

  getPatternPosition(typeNumber) {
    return QRUtil.PATTERN_POSITION_TABLE[typeNumber - 1]
  },

  getMask(maskPattern, i, j) {
    switch (maskPattern) {
      case 0:
        return (i + j) % 2 == 0
      case 1:
        return i % 2 == 0
      case 2:
        return j % 3 == 0
      case 3:
        return (i + j) % 3 == 0
      case 4:
        return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 == 0
      case 5:
        return ((i * j) % 2) + ((i * j) % 3) == 0
      case 6:
        return (((i * j) % 2) + ((i * j) % 3)) % 2 == 0
      case 7:
        return (((i * j) % 3) + ((i + j) % 2)) % 2 == 0
      default:
        throw new Error("bad maskPattern:" + maskPattern)
    }
  },

  getErrorCorrectPolynomial(errorCorrectLength) {
    let a = new QRPolynomial([1], 0)
    for (let i = 0; i < errorCorrectLength; i++) {
      a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0))
    }
    return a
  },

  getLengthInBits(mode, type) {
    if (1 <= type && type < 10) {
      switch (mode) {
        case QRMode.MODE_NUMBER:
          return 10
        case QRMode.MODE_ALPHA_NUM:
          return 9
        case QRMode.MODE_8BIT_BYTE:
          return 8
        case QRMode.MODE_KANJI:
          return 8
        default:
          throw new Error("mode:" + mode)
      }
    } else if (type < 27) {
      switch (mode) {
        case QRMode.MODE_NUMBER:
          return 12
        case QRMode.MODE_ALPHA_NUM:
          return 11
        case QRMode.MODE_8BIT_BYTE:
          return 16
        case QRMode.MODE_KANJI:
          return 10
        default:
          throw new Error("mode:" + mode)
      }
    } else if (type < 41) {
      switch (mode) {
        case QRMode.MODE_NUMBER:
          return 14
        case QRMode.MODE_ALPHA_NUM:
          return 13
        case QRMode.MODE_8BIT_BYTE:
          return 16
        case QRMode.MODE_KANJI:
          return 12
        default:
          throw new Error("mode:" + mode)
      }
    } else {
      throw new Error("type:" + type)
    }
  },

  getLostPoint(qrCode) {
    const moduleCount = qrCode.getModuleCount()
    let lostPoint = 0

    // LEVEL1
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        let sameCount = 0
        const dark = qrCode.isDark(row, col)

        for (let r = -1; r <= 1; r++) {
          if (row + r < 0 || moduleCount <= row + r) {
            continue
          }

          for (let c = -1; c <= 1; c++) {
            if (col + c < 0 || moduleCount <= col + c) {
              continue
            }

            if (r == 0 && c == 0) {
              continue
            }

            if (dark == qrCode.isDark(row + r, col + c)) {
              sameCount++
            }
          }
        }

        if (sameCount > 5) {
          lostPoint += 3 + sameCount - 5
        }
      }
    }

    // LEVEL2
    for (let row = 0; row < moduleCount - 1; row++) {
      for (let col = 0; col < moduleCount - 1; col++) {
        let count = 0
        if (qrCode.isDark(row, col)) count++
        if (qrCode.isDark(row + 1, col)) count++
        if (qrCode.isDark(row, col + 1)) count++
        if (qrCode.isDark(row + 1, col + 1)) count++
        if (count == 0 || count == 4) {
          lostPoint += 3
        }
      }
    }

    // LEVEL3
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount - 6; col++) {
        if (
          qrCode.isDark(row, col) &&
          !qrCode.isDark(row, col + 1) &&
          qrCode.isDark(row, col + 2) &&
          qrCode.isDark(row, col + 3) &&
          qrCode.isDark(row, col + 4) &&
          !qrCode.isDark(row, col + 5) &&
          qrCode.isDark(row, col + 6)
        ) {
          lostPoint += 40
        }
      }
    }

    for (let col = 0; col < moduleCount; col++) {
      for (let row = 0; row < moduleCount - 6; row++) {
        if (
          qrCode.isDark(row, col) &&
          !qrCode.isDark(row + 1, col) &&
          qrCode.isDark(row + 2, col) &&
          qrCode.isDark(row + 3, col) &&
          qrCode.isDark(row + 4, col) &&
          !qrCode.isDark(row + 5, col) &&
          qrCode.isDark(row + 6, col)
        ) {
          lostPoint += 40
        }
      }
    }

    // LEVEL4
    let darkCount = 0

    for (let col = 0; col < moduleCount; col++) {
      for (let row = 0; row < moduleCount; row++) {
        if (qrCode.isDark(row, col)) {
          darkCount++
        }
      }
    }

    const ratio = Math.abs((100 * darkCount) / moduleCount / moduleCount - 50) / 5
    lostPoint += ratio * 10

    return lostPoint
  },
}

// QR Math
const QRMath = {
  glog(n) {
    if (n < 1) {
      throw new Error("glog(" + n + ")")
    }
    return QRMath.LOG_TABLE[n]
  },

  gexp(n) {
    while (n < 0) {
      n += 255
    }
    while (n >= 256) {
      n -= 255
    }
    return QRMath.EXP_TABLE[n]
  },

  EXP_TABLE: new Array(256),
  LOG_TABLE: new Array(256),
}

for (let i = 0; i < 8; i++) {
  QRMath.EXP_TABLE[i] = 1 << i
}
for (let i = 8; i < 256; i++) {
  QRMath.EXP_TABLE[i] =
    QRMath.EXP_TABLE[i - 4] ^ QRMath.EXP_TABLE[i - 5] ^ QRMath.EXP_TABLE[i - 6] ^ QRMath.EXP_TABLE[i - 8]
}
for (let i = 0; i < 255; i++) {
  QRMath.LOG_TABLE[QRMath.EXP_TABLE[i]] = i
}

// QR Polynomial
class QRPolynomial {
  constructor(num, shift) {
    if (num.length == undefined) {
      throw new Error(num.length + "/" + shift)
    }

    let offset = 0

    while (offset < num.length && num[offset] == 0) {
      offset++
    }

    this.num = new Array(num.length - offset + shift)
    for (let i = 0; i < num.length - offset; i++) {
      this.num[i] = num[i + offset]
    }
  }

  get(index) {
    return this.num[index]
  }

  getLength() {
    return this.num.length
  }

  multiply(e) {
    const num = new Array(this.getLength() + e.getLength() - 1)

    for (let i = 0; i < this.getLength(); i++) {
      for (let j = 0; j < e.getLength(); j++) {
        num[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i)) + QRMath.glog(e.get(j)))
      }
    }

    return new QRPolynomial(num, 0)
  }

  mod(e) {
    if (this.getLength() - e.getLength() < 0) {
      return this
    }

    const ratio = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0))
    const num = new Array(this.getLength())

    for (let i = 0; i < this.getLength(); i++) {
      num[i] = this.get(i)
    }

    for (let i = 0; i < e.getLength(); i++) {
      num[i] ^= QRMath.gexp(QRMath.glog(e.get(i)) + ratio)
    }

    return new QRPolynomial(num, 0).mod(e)
  }
}

// QR RS Block
class QRRSBlock {
  constructor(totalCount, dataCount) {
    this.totalCount = totalCount
    this.dataCount = dataCount
  }

  static getRSBlocks(typeNumber, errorCorrectionLevel) {
    const rsBlock = QRRSBlock.getRsBlockTable(typeNumber, errorCorrectionLevel)

    if (rsBlock == undefined) {
      throw new Error("bad rs block @ typeNumber:" + typeNumber + "/errorCorrectionLevel:" + errorCorrectionLevel)
    }

    const length = rsBlock.length / 3
    const list = []

    for (let i = 0; i < length; i++) {
      const count = rsBlock[i * 3 + 0]
      const totalCount = rsBlock[i * 3 + 1]
      const dataCount = rsBlock[i * 3 + 2]

      for (let j = 0; j < count; j++) {
        list.push(new QRRSBlock(totalCount, dataCount))
      }
    }

    return list
  }

  static getRsBlockTable(typeNumber, errorCorrectionLevel) {
    switch (errorCorrectionLevel) {
      case 1: // L
        return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0]
      case 0: // M
        return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1]
      case 3: // Q
        return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2]
      case 2: // H
        return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3]
      default:
        return undefined
    }
  }
}

QRRSBlock.RS_BLOCK_TABLE = [
  // L, M, Q, H
  // 1
  [1, 26, 19],
  [1, 26, 16],
  [1, 26, 13],
  [1, 26, 9],

  // 2
  [1, 44, 34],
  [1, 44, 28],
  [1, 44, 22],
  [1, 44, 16],

  // 3
  [1, 70, 55],
  [1, 70, 44],
  [2, 35, 17],
  [2, 35, 13],

  // 4
  [1, 100, 80],
  [2, 50, 32],
  [2, 50, 24],
  [4, 25, 9],

  // 5
  [1, 134, 108],
  [2, 67, 43],
  [2, 33, 15, 2, 34, 16],
  [2, 33, 11, 2, 34, 12],

  // 6
  [2, 86, 68],
  [4, 43, 27],
  [4, 43, 19],
  [4, 43, 15],

  // 7
  [2, 98, 78],
  [4, 49, 31],
  [2, 32, 14, 4, 33, 15],
  [4, 39, 13, 1, 40, 14],

  // 8
  [2, 121, 97],
  [2, 60, 38, 2, 61, 39],
  [4, 40, 18, 2, 41, 19],
  [4, 40, 14, 2, 41, 15],

  // 9
  [2, 146, 116],
  [3, 58, 36, 2, 59, 37],
  [4, 36, 16, 4, 37, 17],
  [4, 36, 12, 4, 37, 13],

  // 10
  [2, 86, 68, 2, 87, 69],
  [4, 69, 43, 1, 70, 44],
  [6, 43, 19, 2, 44, 20],
  [6, 43, 15, 2, 44, 16],
]

// Export the QR Code Generator
window.QRCodeGenerator = QRCodeGenerator
