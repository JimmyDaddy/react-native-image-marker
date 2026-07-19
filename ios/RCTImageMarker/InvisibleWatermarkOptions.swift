import Foundation
import React

@available(iOS 13.0, *)
final class InvisibleWatermarkOptions: Options {
    let payload: String?
    let key: String
    let strength: String
    let search: String

    override init(dicOpts opts: [AnyHashable: Any]) throws {
        self.payload = opts["payload"] as? String
        self.key = opts["key"] as? String ?? ""
        self.strength = opts["strength"] as? String ?? "balanced"
        self.search = opts["search"] as? String ?? "fast"
        try super.init(dicOpts: opts)

        guard key.utf8.count >= InvisibleWatermark.minimumKeyBytes else {
            throw NSError(
                domain: ErrorDomainEnum.PARAMS_INVALID.rawValue,
                code: 0,
                userInfo: [NSLocalizedDescriptionKey: "key must contain at least \(InvisibleWatermark.minimumKeyBytes) UTF-8 bytes"]
            )
        }
        guard ["subtle", "balanced", "robust"].contains(strength) else {
            throw NSError(
                domain: ErrorDomainEnum.PARAMS_INVALID.rawValue,
                code: 0,
                userInfo: [NSLocalizedDescriptionKey: "Unsupported invisible watermark strength: \(strength)"]
            )
        }
        guard ["fast", "robust"].contains(search) else {
            throw NSError(
                domain: ErrorDomainEnum.PARAMS_INVALID.rawValue,
                code: 0,
                userInfo: [NSLocalizedDescriptionKey: "Unsupported invisible watermark search mode: \(search)"]
            )
        }
    }

    func requiredPayload() throws -> String {
        guard let payload else {
            throw NSError(
                domain: ErrorDomainEnum.PARAMS_REQUIRED.rawValue,
                code: 0,
                userInfo: [NSLocalizedDescriptionKey: "payload is required"]
            )
        }
        guard (1...InvisibleWatermark.maximumPayloadBytes).contains(payload.utf8.count) else {
            throw NSError(
                domain: ErrorDomainEnum.PARAMS_INVALID.rawValue,
                code: 0,
                userInfo: [NSLocalizedDescriptionKey: "payload must contain between 1 and \(InvisibleWatermark.maximumPayloadBytes) UTF-8 bytes"]
            )
        }
        return payload
    }

    static func checkEmbed(
        _ opts: [AnyHashable: Any],
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) -> InvisibleWatermarkOptions? {
        check(opts, rejecter: reject, needsPayload: true)
    }

    static func checkDetect(
        _ opts: [AnyHashable: Any],
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) -> InvisibleWatermarkOptions? {
        check(opts, rejecter: reject, needsPayload: false)
    }

    private static func check(
        _ opts: [AnyHashable: Any],
        rejecter reject: @escaping RCTPromiseRejectBlock,
        needsPayload: Bool
    ) -> InvisibleWatermarkOptions? {
        do {
            let options = try InvisibleWatermarkOptions(dicOpts: opts)
            if needsPayload { _ = try options.requiredPayload() }
            return options
        } catch let error as NSError {
            reject(error.domain, error.localizedDescription, error)
            return nil
        }
    }
}
