import CoreGraphics
import CryptoKit
import Foundation
import UIKit

@available(iOS 13.0, *)
struct InvisibleWatermarkDetection {
    let detected: Bool
    let payload: String?
    let confidence: Double
    let bitErrorRate: Double?

    func json() throws -> String {
        var value: [String: Any] = [
            "detected": detected,
            "confidence": confidence,
            "algorithm": InvisibleWatermark.algorithm,
        ]
        if let payload { value["payload"] = payload }
        if let bitErrorRate { value["bitErrorRate"] = bitErrorRate }
        let data = try JSONSerialization.data(withJSONObject: value)
        guard let output = String(data: data, encoding: .utf8) else {
            throw NSError(domain: ErrorDomainEnum.BASE.rawValue, code: 1)
        }
        return output
    }
}

/** Native implementation of RFC 0003's versioned DCT-QIM pixel format. */
@available(iOS 13.0, *)
enum InvisibleWatermark {
    static let algorithm = "dct-qim-v1"
    static let minimumWidth = 128
    static let minimumHeight = 88
    static let maximumPayloadBytes = 12
    static let minimumKeyBytes = 16

    private static let blockSize = 8
    private static let tileWidth = 16
    private static let tileHeight = 11
    private static let frameBytes = 22
    private static let frameBits = frameBytes * 8
    private static let payloadOffset = 4
    private static let crcOffset = 16
    private static let authOffset = 18
    private static let coefficientPairs = [
        [1, 2, 2, 1],
        [2, 3, 3, 2],
        [1, 3, 3, 1],
        [2, 4, 4, 2],
    ]
    private static let basisCache: [[[Double]]] = (0...4).map { u in
        (0...4).map { v in createBasis(u: u, v: v) }
    }

    private struct Observation {
        let differences: [Double]
        let blockX: Int
        let blockY: Int
    }

    private struct Candidate {
        let payload: String
        let confidence: Double
        let bitErrorRate: Double
    }

    private struct PixelImage {
        var bytes: [UInt8]
        let width: Int
        let height: Int
        let scale: CGFloat

        init(image: UIImage) throws {
            guard let cgImage = image.cgImage else {
                throw NSError(
                    domain: ErrorDomainEnum.BASE.rawValue,
                    code: 1,
                    userInfo: [NSLocalizedDescriptionKey: "Failed to read image pixels"]
                )
            }
            width = cgImage.width
            height = cgImage.height
            scale = image.scale
            bytes = [UInt8](repeating: 0, count: width * height * 4)
            guard let colorSpace = CGColorSpace(name: CGColorSpace.sRGB) else {
                throw NSError(domain: ErrorDomainEnum.BASE.rawValue, code: 1)
            }
            let created = bytes.withUnsafeMutableBytes { rawBuffer -> Bool in
                guard let context = CGContext(
                    data: rawBuffer.baseAddress,
                    width: width,
                    height: height,
                    bitsPerComponent: 8,
                    bytesPerRow: width * 4,
                    space: colorSpace,
                    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue |
                        CGBitmapInfo.byteOrder32Big.rawValue
                ) else { return false }
                context.draw(cgImage, in: CGRect(x: 0, y: 0, width: width, height: height))
                return true
            }
            if !created {
                throw NSError(
                    domain: ErrorDomainEnum.BASE.rawValue,
                    code: 1,
                    userInfo: [NSLocalizedDescriptionKey: "Failed to create image pixel context"]
                )
            }
        }

        func image() throws -> UIImage {
            let data = Data(bytes)
            guard
                let provider = CGDataProvider(data: data as CFData),
                let colorSpace = CGColorSpace(name: CGColorSpace.sRGB),
                let cgImage = CGImage(
                    width: width,
                    height: height,
                    bitsPerComponent: 8,
                    bitsPerPixel: 32,
                    bytesPerRow: width * 4,
                    space: colorSpace,
                    bitmapInfo: CGBitmapInfo(
                        rawValue: CGImageAlphaInfo.premultipliedLast.rawValue |
                            CGBitmapInfo.byteOrder32Big.rawValue
                    ),
                    provider: provider,
                    decode: nil,
                    shouldInterpolate: true,
                    intent: .defaultIntent
                )
            else {
                throw NSError(
                    domain: ErrorDomainEnum.BASE.rawValue,
                    code: 1,
                    userInfo: [NSLocalizedDescriptionKey: "Failed to create marked image"]
                )
            }
            return UIImage(cgImage: cgImage, scale: scale, orientation: .up)
        }
    }

    static func embed(
        image: UIImage,
        payload: String,
        key: String,
        strength: String
    ) throws -> UIImage {
        var pixels = try PixelImage(image: image)
        try embedPixels(
            &pixels.bytes,
            width: pixels.width,
            height: pixels.height,
            payload: payload,
            key: key,
            strength: strength
        )
        return try pixels.image()
    }

    static func detect(
        image: UIImage,
        key: String,
        strength: String,
        search: String
    ) throws -> InvisibleWatermarkDetection {
        let pixels = try PixelImage(image: image)
        return try detectPixels(
            pixels.bytes,
            width: pixels.width,
            height: pixels.height,
            key: key,
            strength: strength,
            search: search
        )
    }

    static func frameForTesting(payload: String, key: String) throws -> [UInt8] {
        try buildFrame(payload: payload, key: key)
    }

    static func permutationForTesting(key: String) throws -> [Int] {
        try permutation(key: key)
    }

    private static func validatePixels(_ bytes: [UInt8], width: Int, height: Int) throws {
        guard width >= minimumWidth, height >= minimumHeight else {
            throw NSError(
                domain: ErrorDomainEnum.PARAMS_INVALID.rawValue,
                code: 0,
                userInfo: [NSLocalizedDescriptionKey: "invisible watermark images must be at least \(minimumWidth)x\(minimumHeight) pixels"]
            )
        }
        guard bytes.count >= width * height * 4 else {
            throw NSError(domain: ErrorDomainEnum.PARAMS_INVALID.rawValue, code: 0)
        }
    }

    private static func embedPixels(
        _ bytes: inout [UInt8],
        width: Int,
        height: Int,
        payload: String,
        key: String,
        strength: String
    ) throws {
        try validatePixels(bytes, width: width, height: height)
        let frame = try buildFrame(payload: payload, key: key)
        let bits = bytesToBits(frame)
        let keyBytes = Array(key.utf8)
        let seed = hmacSeed(keyBytes)
        let order = try permutation(key: key)
        let delta = try strengthDelta(strength)
        for blockY in 0..<(height / blockSize) {
            for blockX in 0..<(width / blockSize) {
                let slot = (blockY % tileHeight) * tileWidth + (blockX % tileWidth)
                let mixed = mixSlot(seed: seed, slot: slot)
                let pair = coefficientPairs[Int(mixed & 3)]
                let dither = (Double((mixed >> 8) & 0x00ff_ffff) / 16_777_216.0 - 0.5) * delta
                embedBlock(
                    &bytes,
                    width: width,
                    startX: blockX * blockSize,
                    startY: blockY * blockSize,
                    bit: bits[order[slot]],
                    pair: pair,
                    dither: dither,
                    delta: delta
                )
            }
        }
    }

    private static func detectPixels(
        _ bytes: [UInt8],
        width: Int,
        height: Int,
        key: String,
        strength: String,
        search: String
    ) throws -> InvisibleWatermarkDetection {
        try validatePixels(bytes, width: width, height: height)
        let keyBytes = Array(key.utf8)
        guard keyBytes.count >= minimumKeyBytes else {
            throw NSError(domain: ErrorDomainEnum.PARAMS_INVALID.rawValue, code: 0)
        }
        let delta = try strengthDelta(strength)
        guard search == "fast" || search == "robust" else {
            throw NSError(domain: ErrorDomainEnum.PARAMS_INVALID.rawValue, code: 0)
        }
        let order = try permutation(key: key)
        let seed = hmacSeed(keyBytes)
        let offsets = search == "robust" ? blockSize : 1
        let phaseXs = search == "robust" ? tileWidth : 1
        let phaseYs = search == "robust" ? tileHeight : 1
        var best: Candidate?

        for offsetY in 0..<offsets {
            for offsetX in 0..<offsets {
                let observations = observeGrid(
                    bytes,
                    width: width,
                    height: height,
                    offsetX: offsetX,
                    offsetY: offsetY
                )
                for phaseY in 0..<phaseYs {
                    for phaseX in 0..<phaseXs {
                        guard let candidate = decodeCandidate(
                            observations,
                            keyBytes: keyBytes,
                            permutation: order,
                            seed: seed,
                            delta: delta,
                            phaseX: phaseX,
                            phaseY: phaseY
                        ) else { continue }
                        if best == nil || candidate.confidence > best!.confidence {
                            best = candidate
                            if search == "fast" || candidate.confidence >= 0.98 {
                                return detection(candidate)
                            }
                        }
                    }
                }
            }
        }
        return best.map(detection) ?? InvisibleWatermarkDetection(
            detected: false,
            payload: nil,
            confidence: 0,
            bitErrorRate: nil
        )
    }

    private static func detection(_ candidate: Candidate) -> InvisibleWatermarkDetection {
        InvisibleWatermarkDetection(
            detected: true,
            payload: candidate.payload,
            confidence: candidate.confidence,
            bitErrorRate: candidate.bitErrorRate
        )
    }

    private static func buildFrame(payload: String, key: String) throws -> [UInt8] {
        let payloadBytes = Array(payload.utf8)
        let keyBytes = Array(key.utf8)
        guard (1...maximumPayloadBytes).contains(payloadBytes.count) else {
            throw NSError(domain: ErrorDomainEnum.PARAMS_INVALID.rawValue, code: 0)
        }
        guard keyBytes.count >= minimumKeyBytes else {
            throw NSError(domain: ErrorDomainEnum.PARAMS_INVALID.rawValue, code: 0)
        }
        var frame = [UInt8](repeating: 0, count: frameBytes)
        frame[0] = 0x49
        frame[1] = 0x4d
        frame[2] = 1
        frame[3] = UInt8(payloadBytes.count)
        frame.replaceSubrange(payloadOffset..<(payloadOffset + payloadBytes.count), with: payloadBytes)
        let crc = crc16(Array(frame[0..<crcOffset]))
        frame[crcOffset] = UInt8(crc >> 8)
        frame[crcOffset + 1] = UInt8(crc & 0xff)
        let tag = hmac(keyBytes, Array(frame[0..<authOffset]))
        frame.replaceSubrange(authOffset..<(authOffset + 4), with: tag.prefix(4))
        return frame
    }

    private static func parseFrame(_ frame: [UInt8], keyBytes: [UInt8]) -> String? {
        guard
            frame.count == frameBytes,
            frame[0] == 0x49,
            frame[1] == 0x4d,
            frame[2] == 1,
            (1...maximumPayloadBytes).contains(Int(frame[3]))
        else { return nil }
        let expectedCRC = crc16(Array(frame[0..<crcOffset]))
        let actualCRC = UInt16(frame[crcOffset]) << 8 | UInt16(frame[crcOffset + 1])
        guard expectedCRC == actualCRC else { return nil }
        let tag = Array(hmac(keyBytes, Array(frame[0..<authOffset])).prefix(4))
        guard constantTimeEqual(tag, Array(frame[authOffset..<frameBytes])) else { return nil }
        return String(bytes: frame[payloadOffset..<(payloadOffset + Int(frame[3]))], encoding: .utf8)
    }

    private static func hmac(_ key: [UInt8], _ message: [UInt8]) -> [UInt8] {
        let code = HMAC<SHA256>.authenticationCode(
            for: Data(message),
            using: SymmetricKey(data: Data(key))
        )
        return Array(code)
    }

    private static func hmacSeed(_ key: [UInt8]) -> UInt32 {
        let digest = hmac(key, Array("react-native-image-marker:dct-qim-v1".utf8))
        let seed = digest.prefix(4).reduce(UInt32(0)) { ($0 << 8) | UInt32($1) }
        return seed == 0 ? 0x6d2b79f5 : seed
    }

    private static func permutation(key: String) throws -> [Int] {
        let keyBytes = Array(key.utf8)
        guard keyBytes.count >= minimumKeyBytes else {
            throw NSError(domain: ErrorDomainEnum.PARAMS_INVALID.rawValue, code: 0)
        }
        var output = Array(0..<frameBits)
        var state = hmacSeed(keyBytes)
        for index in stride(from: output.count - 1, through: 1, by: -1) {
            state = xorshift32(state)
            let swapIndex = Int(state % UInt32(index + 1))
            output.swapAt(index, swapIndex)
        }
        return output
    }

    private static func xorshift32(_ value: UInt32) -> UInt32 {
        var output = value
        output ^= output << 13
        output ^= output >> 17
        output ^= output << 5
        return output
    }

    private static func mixSlot(seed: UInt32, slot: Int) -> UInt32 {
        var mixed = seed ^ (UInt32(slot + 1) &* 0x9e3779b1)
        mixed ^= mixed >> 16
        mixed = mixed &* 0x85ebca6b
        mixed ^= mixed >> 13
        mixed = mixed &* 0xc2b2ae35
        mixed ^= mixed >> 16
        return mixed
    }

    private static func crc16(_ bytes: [UInt8]) -> UInt16 {
        var crc = UInt16(0xffff)
        for byte in bytes {
            crc ^= UInt16(byte) << 8
            for _ in 0..<8 {
                crc = (crc << 1) ^ ((crc & 0x8000) != 0 ? 0x1021 : 0)
            }
        }
        return crc
    }

    private static func constantTimeEqual(_ left: [UInt8], _ right: [UInt8]) -> Bool {
        guard left.count == right.count else { return false }
        return zip(left, right).reduce(UInt8(0)) { $0 | ($1.0 ^ $1.1) } == 0
    }

    private static func bytesToBits(_ bytes: [UInt8]) -> [Int] {
        (0..<(bytes.count * 8)).map { index in
            Int((bytes[index >> 3] >> UInt8(7 - (index & 7))) & 1)
        }
    }

    private static func bitsToBytes(_ bits: [Int]) -> [UInt8] {
        var bytes = [UInt8](repeating: 0, count: (bits.count + 7) / 8)
        for index in bits.indices {
            bytes[index >> 3] |= UInt8(bits[index] << (7 - (index & 7)))
        }
        return bytes
    }

    private static func strengthDelta(_ strength: String) throws -> Double {
        switch strength {
        case "subtle": return 18
        case "balanced": return 28
        case "robust": return 42
        default: throw NSError(domain: ErrorDomainEnum.PARAMS_INVALID.rawValue, code: 0)
        }
    }

    private static func createBasis(u: Int, v: Int) -> [Double] {
        let alphaU = u == 0 ? sqrt(1.0 / Double(blockSize)) : sqrt(2.0 / Double(blockSize))
        let alphaV = v == 0 ? sqrt(1.0 / Double(blockSize)) : sqrt(2.0 / Double(blockSize))
        return (0..<(blockSize * blockSize)).map { index in
            let x = index % blockSize
            let y = index / blockSize
            return alphaU * alphaV *
                cos(Double((2 * x + 1) * u) * .pi / Double(2 * blockSize)) *
                cos(Double((2 * y + 1) * v) * .pi / Double(2 * blockSize))
        }
    }

    private static func luminanceBlock(
        _ bytes: [UInt8],
        width: Int,
        startX: Int,
        startY: Int
    ) -> ([Double], Bool) {
        var opaque = 0
        var luminance = [Double](repeating: 0, count: blockSize * blockSize)
        for y in 0..<blockSize {
            for x in 0..<blockSize {
                let pixel = ((startY + y) * width + startX + x) * 4
                if bytes[pixel + 3] >= 224 { opaque += 1 }
                luminance[y * blockSize + x] =
                    Double(bytes[pixel]) * 0.299 +
                    Double(bytes[pixel + 1]) * 0.587 +
                    Double(bytes[pixel + 2]) * 0.114
            }
        }
        return (luminance, opaque >= 56)
    }

    private static func coefficient(_ luminance: [Double], _ basis: [Double]) -> Double {
        zip(luminance, basis).reduce(0) { $0 + $1.0 * $1.1 }
    }

    private static func embedBlock(
        _ bytes: inout [UInt8],
        width: Int,
        startX: Int,
        startY: Int,
        bit: Int,
        pair: [Int],
        dither: Double,
        delta: Double
    ) {
        let (luminance, usable) = luminanceBlock(bytes, width: width, startX: startX, startY: startY)
        if !usable { return }
        let first = basisCache[pair[0]][pair[1]]
        let second = basisCache[pair[2]][pair[3]]
        let difference = coefficient(luminance, first) - coefficient(luminance, second)
        let normalized = (difference - dither) / delta
        let rounded = jsRound(normalized)
        let quantized: Int
        if rounded & 1 == bit {
            quantized = rounded
        } else {
            let lower = rounded - 1
            let upper = rounded + 1
            quantized = abs(normalized - Double(lower)) <= abs(normalized - Double(upper)) ? lower : upper
        }
        let shift = (Double(quantized) * delta + dither - difference) / 2
        for y in 0..<blockSize {
            for x in 0..<blockSize {
                let pixel = ((startY + y) * width + startX + x) * 4
                if bytes[pixel + 3] < 224 { continue }
                let index = y * blockSize + x
                let luminanceShift = shift * (first[index] - second[index])
                bytes[pixel] = clampByte(Double(bytes[pixel]) + luminanceShift)
                bytes[pixel + 1] = clampByte(Double(bytes[pixel + 1]) + luminanceShift)
                bytes[pixel + 2] = clampByte(Double(bytes[pixel + 2]) + luminanceShift)
            }
        }
    }

    private static func jsRound(_ value: Double) -> Int { Int(floor(value + 0.5)) }

    private static func clampByte(_ value: Double) -> UInt8 {
        UInt8(max(0, min(255, jsRound(value))))
    }

    private static func observeGrid(
        _ bytes: [UInt8],
        width: Int,
        height: Int,
        offsetX: Int,
        offsetY: Int
    ) -> [Observation] {
        let blocksX = (width - offsetX) / blockSize
        let blocksY = (height - offsetY) / blockSize
        var output: [Observation] = []
        output.reserveCapacity(blocksX * blocksY)
        for blockY in 0..<blocksY {
            for blockX in 0..<blocksX {
                let (luminance, usable) = luminanceBlock(
                    bytes,
                    width: width,
                    startX: offsetX + blockX * blockSize,
                    startY: offsetY + blockY * blockSize
                )
                if !usable { continue }
                let differences = coefficientPairs.map { pair in
                    coefficient(luminance, basisCache[pair[0]][pair[1]]) -
                        coefficient(luminance, basisCache[pair[2]][pair[3]])
                }
                output.append(Observation(differences: differences, blockX: blockX, blockY: blockY))
            }
        }
        return output
    }

    private static func decodeCandidate(
        _ observations: [Observation],
        keyBytes: [UInt8],
        permutation: [Int],
        seed: UInt32,
        delta: Double,
        phaseX: Int,
        phaseY: Int
    ) -> Candidate? {
        var votes = [Double](repeating: 0, count: frameBits)
        var counts = [Int](repeating: 0, count: frameBits)
        var hardBits = [Int](repeating: 0, count: observations.count)
        var frameIndexes = [Int](repeating: 0, count: observations.count)
        for (index, observation) in observations.enumerated() {
            let slot = ((observation.blockY + phaseY) % tileHeight) * tileWidth +
                ((observation.blockX + phaseX) % tileWidth)
            let mixed = mixSlot(seed: seed, slot: slot)
            let dither = (Double((mixed >> 8) & 0x00ff_ffff) / 16_777_216.0 - 0.5) * delta
            let normalized = (observation.differences[Int(mixed & 3)] - dither) / delta
            let bit = abs(jsRound(normalized) % 2)
            let reliability = max(0, min(1, abs(normalized - floor(normalized) - 0.5) * 2))
            let frameIndex = permutation[slot]
            votes[frameIndex] += bit == 1 ? reliability : -reliability
            counts[frameIndex] += 1
            hardBits[index] = bit
            frameIndexes[index] = frameIndex
        }
        if counts.contains(0) { return nil }
        let decodedBits = votes.map { $0 >= 0 ? 1 : 0 }
        guard let payload = parseFrame(bitsToBytes(decodedBits), keyBytes: keyBytes) else { return nil }
        let mismatches = hardBits.indices.reduce(0) {
            $0 + (hardBits[$1] == decodedBits[frameIndexes[$1]] ? 0 : 1)
        }
        let bitErrorRate = observations.isEmpty ? 1 : Double(mismatches) / Double(observations.count)
        let margin = votes.indices.reduce(0) {
            $0 + min(1, abs(votes[$1]) / Double(counts[$1]))
        } / Double(frameBits)
        let confidence = max(0, min(1, margin * 0.6 + (1 - bitErrorRate) * 0.4))
        return Candidate(payload: payload, confidence: confidence, bitErrorRate: bitErrorRate)
    }
}
