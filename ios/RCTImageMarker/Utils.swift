//
//  Utils.swift
//  RCTImageMarker
//
//  Created by Jimmydaddy on 2023/6/22.
//  Copyright © 2023 Jimmy. All rights reserved.
//

import Foundation
import ImageIO
import UIKit
import React

struct ImageMarkerImageLoadRequest {
    let size: CGSize
    let scale: CGFloat
    let resizeMode: RCTResizeMode
}

actor ImageMarkerAsyncLimiter {
    private struct Waiter {
        let id: UUID
        let continuation: CheckedContinuation<Void, Error>
    }

    private let limit: Int
    private var activeCount = 0
    private var waiters: [Waiter] = []

    init(limit: Int) {
        precondition(limit > 0)
        self.limit = limit
    }

    var waitingCount: Int {
        return waiters.count
    }

    func withPermit<Value>(_ operation: () async throws -> Value) async throws -> Value {
        try await acquire()
        defer {
            release()
        }
        try Task.checkCancellation()
        return try await operation()
    }

    private func acquire() async throws {
        try Task.checkCancellation()
        if activeCount < limit {
            activeCount += 1
            return
        }

        let id = UUID()
        try await withTaskCancellationHandler(operation: {
            try await withCheckedThrowingContinuation { continuation in
                waiters.append(Waiter(id: id, continuation: continuation))
            }
        }, onCancel: {
            Task {
                await self.cancelWaiter(id)
            }
        })
    }

    private func cancelWaiter(_ id: UUID) {
        guard let index = waiters.firstIndex(where: { $0.id == id }) else {
            return
        }
        let waiter = waiters.remove(at: index)
        waiter.continuation.resume(throwing: CancellationError())
    }

    private func release() {
        if waiters.isEmpty {
            activeCount -= 1
            return
        }
        let next = waiters.removeFirst()
        next.continuation.resume()
    }
}

private final class ImageMarkerCancellableContinuationState<Value>: @unchecked Sendable {
    private enum Terminal {
        case result(Result<Value, Error>)
        case cancelled
    }

    private let lock = NSLock()
    private var continuation: CheckedContinuation<Value, Error>?
    private var cancellationBlock: (() -> Void)?
    private var terminal: Terminal?

    func installContinuation(_ continuation: CheckedContinuation<Value, Error>) {
        lock.lock()
        if let terminal {
            lock.unlock()
            resume(continuation, with: terminal)
        } else {
            self.continuation = continuation
            lock.unlock()
        }
    }

    func canStart() -> Bool {
        lock.lock()
        defer { lock.unlock() }
        return terminal == nil
    }

    func installCancellationBlock(_ block: (() -> Void)?) {
        guard let block else {
            return
        }
        var shouldCancel = false
        lock.lock()
        if terminal == nil {
            cancellationBlock = block
        } else if case .cancelled = terminal {
            shouldCancel = true
        }
        lock.unlock()
        if shouldCancel {
            block()
        }
    }

    func complete(_ result: Result<Value, Error>) {
        var continuationToResume: CheckedContinuation<Value, Error>?
        lock.lock()
        if terminal == nil {
            terminal = .result(result)
            continuationToResume = continuation
            continuation = nil
            cancellationBlock = nil
        }
        lock.unlock()
        continuationToResume?.resume(with: result)
    }

    func cancel() {
        var continuationToResume: CheckedContinuation<Value, Error>?
        var blockToCall: (() -> Void)?
        lock.lock()
        if terminal == nil {
            terminal = .cancelled
            continuationToResume = continuation
            continuation = nil
            blockToCall = cancellationBlock
            cancellationBlock = nil
        }
        lock.unlock()
        continuationToResume?.resume(throwing: CancellationError())
        blockToCall?()
    }

    private func resume(_ continuation: CheckedContinuation<Value, Error>, with terminal: Terminal) {
        switch terminal {
        case let .result(result):
            continuation.resume(with: result)
        case .cancelled:
            continuation.resume(throwing: CancellationError())
        }
    }
}

enum ImageMarkerCancellableContinuation {
    static func run<Value>(
        start: (@escaping (Result<Value, Error>) -> Void) -> (() -> Void)?
    ) async throws -> Value {
        try Task.checkCancellation()
        let state = ImageMarkerCancellableContinuationState<Value>()
        return try await withTaskCancellationHandler(operation: {
            try await withCheckedThrowingContinuation { continuation in
                state.installContinuation(continuation)
                guard state.canStart() else {
                    return
                }
                let cancellationBlock = start { result in
                    state.complete(result)
                }
                state.installCancellationBlock(cancellationBlock)
            }
        }, onCancel: {
            state.cancel()
        })
    }
}

class Utils: NSObject {
    static func imageLoadRequest(for source: RNImageSRC, maxSize: Int) -> ImageMarkerImageLoadRequest {
        let width = source.width
        let height = source.height
        let sourceScale = source.scale
        let hasKnownSize = width.isFinite && height.isFinite && sourceScale.isFinite
            && width > 0 && height > 0 && sourceScale > 0

        guard hasKnownSize else {
            let boundedSize = CGFloat(maxSize)
            return ImageMarkerImageLoadRequest(
                size: CGSize(width: boundedSize, height: boundedSize),
                scale: 1,
                resizeMode: .contain
            )
        }

        let pixelWidth = width * sourceScale
        let pixelHeight = height * sourceScale
        let largestPixelDimension = max(pixelWidth, pixelHeight)
        if largestPixelDimension <= CGFloat(maxSize) {
            return ImageMarkerImageLoadRequest(
                size: CGSize(width: width, height: height),
                scale: sourceScale,
                resizeMode: .cover
            )
        }

        let ratio = CGFloat(maxSize) / largestPixelDimension
        return ImageMarkerImageLoadRequest(
            size: CGSize(
                width: max((pixelWidth * ratio).rounded(), 1),
                height: max((pixelHeight * ratio).rounded(), 1)
            ),
            scale: 1,
            resizeMode: .contain
        )
    }

    static func downsampleImageData(_ data: Data, maxSize: Int) -> UIImage? {
        let sourceOptions = [
            kCGImageSourceShouldCache: false,
        ] as CFDictionary
        guard let source = CGImageSourceCreateWithData(data as CFData, sourceOptions) else {
            return nil
        }
        let thumbnailOptions = [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceCreateThumbnailWithTransform: true,
            kCGImageSourceThumbnailMaxPixelSize: maxSize,
            kCGImageSourceShouldCacheImmediately: true,
        ] as CFDictionary
        guard let thumbnail = CGImageSourceCreateThumbnailAtIndex(source, 0, thumbnailOptions) else {
            return nil
        }
        return UIImage(cgImage: thumbnail, scale: 1, orientation: .up)
    }

    static func downsampleBase64Image(_ value: String, maxSize: Int) -> UIImage? {
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let comma = trimmed.firstIndex(of: ","),
              trimmed[..<comma].lowercased().contains(";base64") else {
            return nil
        }
        let encoded = String(trimmed[trimmed.index(after: comma)...])
        let decodedValue = encoded.removingPercentEncoding ?? encoded
        guard let data = Data(base64Encoded: decodedValue, options: .ignoreUnknownCharacters) else {
            return nil
        }
        return downsampleImageData(data, maxSize: maxSize)
    }

    static func resolvedTextColor(_ value: String?) -> UIColor {
        guard let value else {
            return .black
        }
        return UIColor(hex: value) ?? .clear
    }

    static func getShadowStyle(_ shadowStyle: [AnyHashable: Any]?) throws -> NSShadow? {
        if let shadowStyle = shadowStyle {
            guard let colorValue = shadowStyle["color"] as? String,
                  let color = UIColor(hex: colorValue) else {
                throw NSError(
                    domain: ErrorDomainEnum.PARAMS_INVALID.rawValue,
                    code: 0,
                    userInfo: [NSLocalizedDescriptionKey: "shadow color is invalid"]
                )
            }
            let shadow = NSShadow()
            shadow.shadowBlurRadius = CGFloat(truncating: RCTConvert.nsNumber(shadowStyle["radius"]))
            shadow.shadowOffset = CGSize(width: CGFloat(truncating: RCTConvert.nsNumber(shadowStyle["dx"])), height: CGFloat(truncating: RCTConvert.nsNumber(shadowStyle["dy"])))
            shadow.shadowColor = color
            return shadow
        } else {
            return nil
        }
    }

    static func isPng(_ saveFormat: String?) -> Bool {
        return saveFormat?.caseInsensitiveCompare("png") == .orderedSame
    }

    static func getExt(_ saveFormat: String?) -> String {
        return isPng(saveFormat) ? ".png" : ".jpg"
    }

    static func canonicalOutputFilename(_ filename: String, ext: String) -> String {
        let lowercased = filename.lowercased()
        let knownExtension = [".jpeg", ".jpg", ".png"].first { lowercased.hasSuffix($0) }
        let stem = knownExtension.map { String(filename.dropLast($0.count)) } ?? filename
        return "\(stem)\(ext)"
    }

    static func isSafeOutputFilename(_ filename: String) -> Bool {
        let trimmed = filename.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            return true
        }
        let lowercased = trimmed.lowercased()
        guard trimmed != ".", trimmed != "..",
              ![".jpeg", ".jpg", ".png"].contains(lowercased),
              !filename.contains("/"), !filename.contains("\\"),
              filename.rangeOfCharacter(from: .controlCharacters) == nil else {
            return false
        }
        return true
    }

    static func sequentialAsyncMap<Input, Output>(
        _ values: [Input],
        transform: (Input) async throws -> Output
    ) async throws -> [Output] {
        var results: [Output] = []
        results.reserveCapacity(values.count)
        for value in values {
            try Task.checkCancellation()
            results.append(try await transform(value))
            try Task.checkCancellation()
        }
        return results
    }

    static func renderAndReleaseSources<Source, Output>(
        _ sources: inout [Source],
        render: ([Source]) throws -> Output
    ) rethrows -> Output {
        defer {
            sources.removeAll(keepingCapacity: false)
        }
        return try render(sources)
    }

    static func isBase64(_ uri: String?) -> Bool {
        return uri?.hasPrefix("data:") ?? false
    }

    static func isNULL(_ obj: Any?) -> Bool {
        return obj == nil || obj is NSNull
    }

    static func checkSpreadValue(str: String?, maxLength: Int = 1) -> Bool {
        if str == nil { return false }
        let pattern = #"^((\d+|\d+%)\s?){1,\#(maxLength)}$"#
        if (str?.range(of: pattern, options: .regularExpression)) != nil {
            return true
        } else {
            return false
        }
    }

    static func parseSpreadValue(v: String?, relativeTo length: CGFloat) -> CGFloat? {
        guard let v else { return nil }
        if v.hasSuffix("%") {
            let percent = CGFloat(Double(v.dropLast()) ?? 0) / 100
            return length * percent
        } else {
            return CGFloat(Double(v) ?? 0)
        }
    }

    static func handleDynamicToString(v: Any?) -> String {
        if (isNULL(v)) { return "0" }
        else {
            switch v {
                case is NSString: return RCTConvert.nsString(v)
                case is NSNumber: return RCTConvert.nsNumber(v).stringValue
                default: return "0"
            }
        }
    }
}
