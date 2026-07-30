import Foundation
import ImageIO
import React

private struct ImageMarkerImageInfo: Encodable {
    let width: Int
    let height: Int
    let encodedWidth: Int
    let encodedHeight: Int
    let format: String
    let mimeType: String?
    let orientation: Int
    let rotationDegrees: Int
    let mirrored: Bool
    let requiresNormalization: Bool

    init(
        encodedWidth: Int,
        encodedHeight: Int,
        format: String,
        mimeType: String?,
        orientation: Int
    ) {
        let normalizedOrientation = (1...8).contains(orientation) ? orientation : 1
        let swapsDimensions = (5...8).contains(normalizedOrientation)
        self.encodedWidth = encodedWidth
        self.encodedHeight = encodedHeight
        self.width = swapsDimensions ? encodedHeight : encodedWidth
        self.height = swapsDimensions ? encodedWidth : encodedHeight
        self.format = format
        self.mimeType = mimeType
        self.orientation = normalizedOrientation
        switch normalizedOrientation {
        case 3, 4:
            self.rotationDegrees = 180
        case 5, 6:
            self.rotationDegrees = 90
        case 7, 8:
            self.rotationDegrees = 270
        default:
            self.rotationDegrees = 0
        }
        self.mirrored = [2, 4, 5, 7].contains(normalizedOrientation)
        self.requiresNormalization = normalizedOrientation != 1
    }

    func json() throws -> String {
        let encoder = JSONEncoder()
        guard let result = String(data: try encoder.encode(self), encoding: .utf8) else {
            throw ImageInfoReader.error("Unable to serialize image metadata")
        }
        return result
    }
}

enum ImageInfoReader {
    static func read(_ source: [AnyHashable: Any]) throws -> String {
        guard let uri = source["uri"] as? String,
              !uri.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            throw error("image source uri is required")
        }
        let imageSource: CGImageSource
        if let data = dataUri(uri) {
            guard let created = CGImageSourceCreateWithData(
                data as CFData,
                [kCGImageSourceShouldCache: false] as CFDictionary
            ) else {
                throw error("Unable to read image metadata")
            }
            imageSource = created
        } else {
            let url: URL
            if let request = RCTConvert.nsurlRequest(source), let requestUrl = request.url {
                url = requestUrl
            } else if let directUrl = URL(string: uri), directUrl.scheme != nil {
                url = directUrl
            } else if FileManager.default.fileExists(atPath: uri) {
                url = URL(fileURLWithPath: uri)
            } else {
                throw error("Unable to resolve image source: \(uri)")
            }
            guard let created = CGImageSourceCreateWithURL(
                url as CFURL,
                [kCGImageSourceShouldCache: false] as CFDictionary
            ) else {
                throw error("Unable to read image metadata from source: \(uri)")
            }
            imageSource = created
        }

        guard let rawProperties = CGImageSourceCopyPropertiesAtIndex(
            imageSource,
            0,
            nil
        ) as? [CFString: Any] else {
            throw error("Unable to read image metadata")
        }
        guard let encodedWidth = integer(rawProperties[kCGImagePropertyPixelWidth]),
              let encodedHeight = integer(rawProperties[kCGImagePropertyPixelHeight]),
              encodedWidth > 0,
              encodedHeight > 0 else {
            throw error("Image metadata does not contain valid dimensions")
        }
        let orientation = integer(rawProperties[kCGImagePropertyOrientation]) ?? 1
        let type = CGImageSourceGetType(imageSource) as String?
        let descriptor = formatDescriptor(type)
        return try ImageMarkerImageInfo(
            encodedWidth: encodedWidth,
            encodedHeight: encodedHeight,
            format: descriptor.format,
            mimeType: descriptor.mimeType,
            orientation: orientation
        ).json()
    }

    private static func integer(_ value: Any?) -> Int? {
        if let number = value as? NSNumber {
            return number.intValue
        }
        return value as? Int
    }

    private static func dataUri(_ value: String) -> Data? {
        guard value.lowercased().hasPrefix("data:image/"),
              let separator = value.firstIndex(of: ",") else {
            return nil
        }
        let metadata = String(value[..<separator])
        let payload = String(value[value.index(after: separator)...])
        if metadata.lowercased().hasSuffix(";base64") {
            return Data(base64Encoded: payload, options: .ignoreUnknownCharacters)
        }
        return payload.removingPercentEncoding?.data(using: .isoLatin1)
    }

    private static func formatDescriptor(
        _ type: String?
    ) -> (format: String, mimeType: String?) {
        let value = type?.lowercased() ?? ""
        if value.contains("jpeg") || value.contains("jpg") {
            return ("jpeg", "image/jpeg")
        }
        if value.contains("png") {
            return ("png", "image/png")
        }
        if value.contains("webp") {
            return ("webp", "image/webp")
        }
        if value.contains("gif") {
            return ("gif", "image/gif")
        }
        if value.contains("heic") || value.contains("heif") || value.contains("avif") {
            return ("heif", "image/heif")
        }
        if value.contains("bmp") {
            return ("bmp", "image/bmp")
        }
        return ("unknown", nil)
    }

    fileprivate static func error(_ message: String) -> NSError {
        return NSError(
            domain: ErrorDomainEnum.BASE.rawValue,
            code: 1,
            userInfo: [NSLocalizedDescriptionKey: message]
        )
    }
}
