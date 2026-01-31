import Foundation
import React
import UIKit
import CoreText
import CoreGraphics

@available(iOS 13.0, *)
@objc(ImageMarkerTurboModule)
class ImageMarkerTurboModule: NSObject, RCTTurboModule {
    
    // MARK: - TurboModule Protocol
    
    static func moduleName() -> String! {
        return "ImageMarker"
    }
    
    @objc
    static func requiresMainQueueSetup() -> Bool {
        return false
    }
    
    // MARK: - Private Properties
    
    private var bridge: RCTBridge?
    
    // MARK: - Initialization
    
    override init() {
        super.init()
        // Initialize TurboModule
    }
    
    // MARK: - JSI Communication Interface
    
    /// Sets the bridge for image loading operations
    /// This enables JSI communication with React Native bridge
    @objc
    func setBridge(_ bridge: RCTBridge) {
        self.bridge = bridge
    }
    
    // MARK: - TurboModule Methods with Enhanced Async Handling
    
    @objc
    func markWithText(_ options: [AnyHashable: Any], resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) -> Void {
        Task(priority: .userInitiated) {
            do {
                try self.validateTurboModuleSetup()
                
                // Validate input parameters asynchronously
                guard let markOpts = await self.validateAndParseTextOptions(options) else {
                    await MainActor.run {
                        rejecter("PARAMS_INVALID", "Invalid text marking options", nil)
                    }
                    return
                }
                
                // Load images asynchronously with proper error handling
                let images = try await self.loadImagesWithRetry(with: [markOpts.backgroundImage])
                
                // Process image marking asynchronously
                let scaledImage = await self.processTextMarking(images[0], markOpts)
                guard let scaledImage = scaledImage else {
                    await MainActor.run {
                        rejecter("PROCESSING_ERROR", "Failed to process text marking", nil)
                    }
                    return
                }
                
                // Save image asynchronously
                let result = await self.saveImageAsync(scaledImage, with: markOpts)
                
                await MainActor.run {
                    resolver(result)
                }
            } catch {
                await MainActor.run {
                    let nsError = error as NSError
                    rejecter(nsError.domain, nsError.localizedDescription, error)
                }
            }
        }
    }
    
    @objc
    func markWithImage(_ options: [AnyHashable: Any], resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) -> Void {
        Task(priority: .userInitiated) {
            do {
                try self.validateTurboModuleSetup()
                
                // Validate input parameters asynchronously
                guard let markOpts = await self.validateAndParseImageOptions(options) else {
                    await MainActor.run {
                        rejecter("PARAMS_INVALID", "Invalid image marking options", nil)
                    }
                    return
                }
                
                // Load all images (background + watermarks) asynchronously
                let waterImages = markOpts.watermarkImages.map { $0.imageOption }
                var images = try await self.loadImagesWithRetry(with: [markOpts.backgroundImage] + waterImages)
                
                // Process image marking asynchronously
                let scaledImage = await self.processImageMarking(with: images.remove(at: 0), waterImages: images, options: markOpts)
                guard let scaledImage = scaledImage else {
                    await MainActor.run {
                        rejecter("PROCESSING_ERROR", "Failed to process image marking", nil)
                    }
                    return
                }
                
                // Save image asynchronously
                let result = await self.saveImageAsync(scaledImage, with: markOpts)
                
                await MainActor.run {
                    resolver(result)
                }
            } catch {
                await MainActor.run {
                    let nsError = error as NSError
                    rejecter(nsError.domain, nsError.localizedDescription, error)
                }
            }
        }
    }
    
    // MARK: - Private Helper Methods
    
    /// Validates TurboModule is properly initialized
    private func validateTurboModuleSetup() throws {
        guard bridge != nil else {
            throw NSError(domain: "ImageMarkerTurboModule", code: -2, userInfo: [NSLocalizedDescriptionKey: "Bridge not set for TurboModule"])
        }
    }
    
    // MARK: - Enhanced Async Processing Methods
    
    /// Validates and parses text marking options asynchronously
    private func validateAndParseTextOptions(_ options: [AnyHashable: Any]) async -> MarkTextOptions? {
        return await withCheckedContinuation { continuation in
            let markOpts = MarkTextOptions.checkTextParams(options) { _, _, _ in
                continuation.resume(returning: nil)
            }
            continuation.resume(returning: markOpts)
        }
    }
    
    /// Validates and parses image marking options asynchronously
    private func validateAndParseImageOptions(_ options: [AnyHashable: Any]) async -> MarkImageOptions? {
        return await withCheckedContinuation { continuation in
            let markOpts = MarkImageOptions.checkImageParams(options) { _, _, _ in
                continuation.resume(returning: nil)
            }
            continuation.resume(returning: markOpts)
        }
    }
    
    /// Loads images with retry mechanism for better reliability
    private func loadImagesWithRetry(with imageOptions: [ImageOptions], maxRetries: Int = 3) async throws -> [UIImage] {
        var lastError: Error?
        
        for attempt in 1...maxRetries {
            do {
                return try await self.loadImages(with: imageOptions)
            } catch {
                lastError = error
                if attempt < maxRetries {
                    // Wait before retry with exponential backoff
                    let delay = TimeInterval(attempt * attempt) // 1s, 4s, 9s
                    try await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
                }
            }
        }
        
        throw lastError ?? NSError(domain: "ImageMarkerTurboModule", code: -3, userInfo: [NSLocalizedDescriptionKey: "Failed to load images after \(maxRetries) attempts"])
    }
    
    /// Processes text marking asynchronously on background queue
    private func processTextMarking(_ image: UIImage, _ options: MarkTextOptions) async -> UIImage? {
        return await withCheckedContinuation { continuation in
            DispatchQueue.global(qos: .userInitiated).async {
                let result = self.markImgWithText(image, options)
                continuation.resume(returning: result)
            }
        }
    }
    
    /// Processes image marking asynchronously on background queue
    private func processImageMarking(with image: UIImage, waterImages: [UIImage], options: MarkImageOptions) async -> UIImage? {
        return await withCheckedContinuation { continuation in
            DispatchQueue.global(qos: .userInitiated).async {
                let result = self.markImage(with: image, waterImages: waterImages, options: options)
                continuation.resume(returning: result)
            }
        }
    }
    
    /// Saves image asynchronously with proper error handling
    private func saveImageAsync(_ image: UIImage, with options: Options) async -> String? {
        return await withCheckedContinuation { continuation in
            DispatchQueue.global(qos: .utility).async {
                let result = self.saveImageForMarker(image, with: options)
                continuation.resume(returning: result)
            }
        }
    }
    
    /// Enhanced image loading with better error handling and cancellation support
    func loadImages(with imageOptions: [ImageOptions]) async throws -> [UIImage] {
        guard let bridge = self.bridge else {
            throw NSError(domain: "ImageMarkerTurboModule", code: -2, userInfo: [NSLocalizedDescriptionKey: "Bridge not available for image loading"])
        }
        
        // Check if Fabric is enabled for enhanced image loading
        let isFabricEnabled = self.isFabricEnabled()
        
        if isFabricEnabled {
            return try await self.loadImagesWithFabric(imageOptions)
        } else {
            return try await self.loadImagesWithLegacyBridge(imageOptions)
        }
    }
    
    /// Loads images using Fabric-compatible pipeline
    private func loadImagesWithFabric(_ imageOptions: [ImageOptions]) async throws -> [UIImage] {
        let images = try await withThrowingTaskGroup(of: (Int, UIImage).self) { group in
            for (index, img) in imageOptions.enumerated() {
                group.addTask {
                    try Task.checkCancellation()
                    
                    return try await withUnsafeThrowingContinuation { continuation -> Void in
                        // Handle Fabric-processed image sources
                        if let fabricSource = img.src as? [String: Any] {
                            self.loadFabricImageSource(fabricSource, at: index) { result in
                                switch result {
                                case .success(let image):
                                    continuation.resume(returning: (index, image))
                                case .failure(let error):
                                    continuation.resume(throwing: error)
                                }
                            }
                        } else {
                            // Fallback to legacy loading for non-Fabric sources
                            self.loadLegacyImageSource(img, at: index) { result in
                                switch result {
                                case .success(let image):
                                    continuation.resume(returning: (index, image))
                                case .failure(let error):
                                    continuation.resume(throwing: error)
                                }
                            }
                        }
                    }
                }
            }
            
            var imagesWithIndex: [(Int, UIImage)] = []
            for try await image in group {
                try Task.checkCancellation()
                imagesWithIndex.append(image)
            }
            
            let sortedImagesWithIndex = imagesWithIndex.sorted { $0.0 < $1.0 }
            return sortedImagesWithIndex.map { $0.1 }
        }
        return images
    }
    
    /// Loads images using legacy bridge (fallback)
    private func loadImagesWithLegacyBridge(_ imageOptions: [ImageOptions]) async throws -> [UIImage] {
        let className = "RCTImageLoader"
        let classType: AnyClass? = NSClassFromString(className)
        guard let imageLoader = bridge?.module(for: classType) as? RCTImageLoader else {
            throw NSError(domain: ErrorDomainEnum.BASE.rawValue, code: 1, userInfo: [NSLocalizedDescriptionKey: "Failed to get ImageLoader module"])
        }
        
        let images = try await withThrowingTaskGroup(of: (Int, UIImage).self) { group in
            for (index, img) in imageOptions.enumerated() {
                group.addTask {
                    try Task.checkCancellation()
                    
                    return try await withUnsafeThrowingContinuation { continuation -> Void in
                        if Utils.isBase64(img.uri) {
                            if let image = UIImage.transBase64(img.uri) {
                                continuation.resume(returning: (index, image))
                            } else {
                                let error = NSError(domain: ErrorDomainEnum.BASE.rawValue, code: 3, userInfo: [NSLocalizedDescriptionKey: "Failed to load base64 image at index \(index)"])
                                continuation.resume(throwing: error)
                            }
                        } else {
                            let request = RCTConvert.nsurlRequest(img.src)
                            imageLoader.loadImage(with: request!, size: CGSizeMake(img.rnSrc.width, img.rnSrc.height), scale: img.rnSrc.scale, clipped: false, resizeMode: RCTResizeMode.cover) { progress, total in
                                print("Loading image: \(img.uri) progress: \(progress) total: \(total)")
                            } partialLoad: { loadedImage in
                                // Handle partial load if needed
                            } completionBlock: { error, loadedImage in
                                print("Loaded image: \(img.uri)")

                                if let loadedImage = loadedImage {
                                    continuation.resume(returning: (index, loadedImage))
                                } else if let error = error {
                                    continuation.resume(throwing: error)
                                } else {
                                    let error = NSError(domain: ErrorDomainEnum.BASE.rawValue, code: 3, userInfo: [NSLocalizedDescriptionKey: "Failed to load remote image at index \(index): \(img.uri)"])
                                    continuation.resume(throwing: error)
                                }
                            }
                        }
                    }
                }
            }
            
            var imagesWithIndex: [(Int, UIImage)] = []
            for try await image in group {
                try Task.checkCancellation()
                imagesWithIndex.append(image)
            }
            
            let sortedImagesWithIndex = imagesWithIndex.sorted { $0.0 < $1.0 }
            return sortedImagesWithIndex.map { $0.1 }
        }
        return images
    }
    
    /// Detects if Fabric renderer is enabled
    private func isFabricEnabled() -> Bool {
        // Check for Fabric-specific classes or runtime flags
        if #available(iOS 13.0, *) {
            return NSClassFromString("RCTFabricSurface") != nil
        }
        return false
    }
    
    /// Loads image from Fabric-processed source
    private func loadFabricImageSource(_ fabricSource: [String: Any], at index: Int, completion: @escaping (Result<UIImage, Error>) -> Void) {
        guard let uri = fabricSource["uri"] as? String else {
            completion(.failure(NSError(domain: ErrorDomainEnum.BASE.rawValue, code: 3, userInfo: [NSLocalizedDescriptionKey: "Invalid Fabric image source: missing URI"])))
            return
        }
        
        // Handle different URI types
        if uri.hasPrefix("data:image/") {
            // Base64 image
            if let image = UIImage.transBase64(uri) {
                completion(.success(image))
            } else {
                completion(.failure(NSError(domain: ErrorDomainEnum.BASE.rawValue, code: 3, userInfo: [NSLocalizedDescriptionKey: "Failed to decode base64 image"])))
            }
        } else if uri.hasPrefix("http://") || uri.hasPrefix("https://") {
            // Remote image - use enhanced loading with caching
            self.loadRemoteImageWithCaching(uri: uri, fabricSource: fabricSource, completion: completion)
        } else if uri.hasPrefix("file://") {
            // Local file
            self.loadLocalImage(uri: uri, completion: completion)
        } else if fabricSource["__packager_asset"] as? Bool == true {
            // Packager asset
            self.loadPackagerAsset(fabricSource: fabricSource, completion: completion)
        } else {
            completion(.failure(NSError(domain: ErrorDomainEnum.BASE.rawValue, code: 3, userInfo: [NSLocalizedDescriptionKey: "Unsupported Fabric image URI: \(uri)"])))
        }
    }
    
    /// Loads image from legacy source (fallback)
    private func loadLegacyImageSource(_ imageOptions: ImageOptions, at index: Int, completion: @escaping (Result<UIImage, Error>) -> Void) {
        if Utils.isBase64(imageOptions.uri) {
            if let image = UIImage.transBase64(imageOptions.uri) {
                completion(.success(image))
            } else {
                completion(.failure(NSError(domain: ErrorDomainEnum.BASE.rawValue, code: 3, userInfo: [NSLocalizedDescriptionKey: "Failed to load base64 image at index \(index)"])))
            }
        } else {
            // Use legacy bridge loading
            guard let bridge = self.bridge,
                  let imageLoader = bridge.module(for: NSClassFromString("RCTImageLoader")) as? RCTImageLoader else {
                completion(.failure(NSError(domain: ErrorDomainEnum.BASE.rawValue, code: 1, userInfo: [NSLocalizedDescriptionKey: "ImageLoader not available"])))
                return
            }
            
            let request = RCTConvert.nsurlRequest(imageOptions.src)
            imageLoader.loadImage(with: request!, size: CGSizeMake(imageOptions.rnSrc.width, imageOptions.rnSrc.height), scale: imageOptions.rnSrc.scale, clipped: false, resizeMode: RCTResizeMode.cover) { _, _ in
                // Progress callback
            } partialLoad: { _ in
                // Partial load callback
            } completionBlock: { error, loadedImage in
                if let loadedImage = loadedImage {
                    completion(.success(loadedImage))
                } else if let error = error {
                    completion(.failure(error))
                } else {
                    completion(.failure(NSError(domain: ErrorDomainEnum.BASE.rawValue, code: 3, userInfo: [NSLocalizedDescriptionKey: "Failed to load image"])))
                }
            }
        }
    }
    
    /// Loads remote image with enhanced caching for Fabric
    private func loadRemoteImageWithCaching(uri: String, fabricSource: [String: Any], completion: @escaping (Result<UIImage, Error>) -> Void) {
        guard let url = URL(string: uri) else {
            completion(.failure(NSError(domain: ErrorDomainEnum.BASE.rawValue, code: 3, userInfo: [NSLocalizedDescriptionKey: "Invalid URL: \(uri)"])))
            return
        }
        
        // Use URLSession for better control over caching and timeout
        let session = URLSession.shared
        let task = session.dataTask(with: url) { data, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            guard let data = data, let image = UIImage(data: data) else {
                completion(.failure(NSError(domain: ErrorDomainEnum.BASE.rawValue, code: 3, userInfo: [NSLocalizedDescriptionKey: "Failed to create image from data"])))
                return
            }
            
            completion(.success(image))
        }
        task.resume()
    }
    
    /// Loads local file image
    private func loadLocalImage(uri: String, completion: @escaping (Result<UIImage, Error>) -> Void) {
        let path = uri.replacingOccurrences(of: "file://", with: "")
        
        DispatchQueue.global(qos: .userInitiated).async {
            if let image = UIImage(contentsOfFile: path) {
                completion(.success(image))
            } else {
                completion(.failure(NSError(domain: ErrorDomainEnum.BASE.rawValue, code: 3, userInfo: [NSLocalizedDescriptionKey: "Failed to load local image: \(path)"])))
            }
        }
    }
    
    /// Loads packager asset
    private func loadPackagerAsset(fabricSource: [String: Any], completion: @escaping (Result<UIImage, Error>) -> Void) {
        guard let uri = fabricSource["uri"] as? String else {
            completion(.failure(NSError(domain: ErrorDomainEnum.BASE.rawValue, code: 3, userInfo: [NSLocalizedDescriptionKey: "Invalid packager asset: missing URI"])))
            return
        }
        
        // For packager assets, we can use the URI directly
        if let url = URL(string: uri) {
            self.loadRemoteImageWithCaching(uri: uri, fabricSource: fabricSource, completion: completion)
        } else {
            completion(.failure(NSError(domain: ErrorDomainEnum.BASE.rawValue, code: 3, userInfo: [NSLocalizedDescriptionKey: "Invalid packager asset URI: \(uri)"])))
        }
    }
    
    func saveImageForMarker(_ image: UIImage, with opts: Options) -> String? {
        let fullPath = generateCacheFilePathForMarker(Utils.getExt(opts.saveFormat), opts.filename)
        if let saveFormat = opts.saveFormat, saveFormat == "base64" {
            let base64String = image.pngData()?.base64EncodedString(options: .lineLength64Characters)
            return "data:image/png;base64,\(base64String ?? "")"
        }
        let data = Utils.isPng(opts.saveFormat) ? image.pngData() : image.jpegData(compressionQuality: CGFloat(opts.quality) / 100.0)
        let fileManager = FileManager.default
        fileManager.createFile(atPath: fullPath, contents: data, attributes: nil)
        return fullPath
    }
    
    func generateCacheFilePathForMarker(_ ext: String?, _ filename: String?) -> String {
        let paths = NSSearchPathForDirectoriesInDomains(.cachesDirectory, .userDomainMask, true)
        let cacheDirectory = paths[0]
        if let filename = filename, !filename.isEmpty {
            if let ext = ext, filename.hasSuffix(ext) {
                return (cacheDirectory as NSString).appendingPathComponent(filename)
            } else {
                let fullName = "\(filename)\(ext ?? "")"
                return (cacheDirectory as NSString).appendingPathComponent(fullName)
            }
        } else {
            let name = UUID().uuidString
            let fullName = "\(name)\(ext ?? "")"
            let fullPath = (cacheDirectory as NSString).appendingPathComponent(fullName)
            return fullPath
        }
    }
    
    func markImgWithText(_ image: UIImage, _ opts: MarkTextOptions) -> UIImage? {
        var bg = image;
        let w = bg.size.width
        let h = bg.size.height
        UIGraphicsBeginImageContextWithOptions(bg.size, false, opts.backgroundImage.scale)
        
        guard let context = UIGraphicsGetCurrentContext() else {
            return nil
        }
        let canvasRect = CGRect(x: 0, y: 0, width: w, height: h)

        context.saveGState()
        
        let transform = CGAffineTransform(translationX: 0, y: canvasRect.height)
            .scaledBy(x: 1, y: -1)
        context.concatenate(transform)
        if opts.backgroundImage.alpha != 1.0 {
            context.beginTransparencyLayer(auxiliaryInfo: nil)
            context.setAlpha(opts.backgroundImage.alpha)
            context.setBlendMode(.multiply)
            context.draw(bg.cgImage!, in: canvasRect)
            context.endTransparencyLayer()
            context.setBlendMode(.normal)
        } else {
            context.draw(bg.cgImage!, in: canvasRect)
        }
        context.restoreGState()

        
        for textOpts in opts.watermarkTexts {
            context.saveGState()
            var font = textOpts.style!.font
            if textOpts.style!.italic && textOpts.style!.bold {
                let boldItalicFontDescriptor = textOpts.style!.font!.fontDescriptor.withSymbolicTraits([.traitBold, .traitItalic])
                font = UIFont(descriptor: boldItalicFontDescriptor!, size: font!.pointSize)
            } else if textOpts.style!.italic {
                let italicFontDescriptor = textOpts.style!.font!.fontDescriptor.withSymbolicTraits(.traitItalic)
                font = UIFont(descriptor: italicFontDescriptor!, size: font!.pointSize)
            } else if textOpts.style!.bold {
                let boldFontDescriptor = textOpts.style!.font!.fontDescriptor.withSymbolicTraits(.traitBold)
                font = UIFont(descriptor: boldFontDescriptor!, size: font!.pointSize)
            }
            
            var attributes: [NSAttributedString.Key: Any] = [
                .font: font as Any,   //设置字体
                .foregroundColor: textOpts.style!.color as Any,      //设置字体颜色
            ]
            
            if let shadow = textOpts.style!.shadow {
                attributes[.shadow] = shadow
            }
            if textOpts.style!.underline {
                attributes[.underlineStyle] = NSUnderlineStyle.single.rawValue
            }
            if textOpts.style!.strikeThrough {
                attributes[.strikethroughStyle] = NSUnderlineStyle.single.rawValue
            }
            if let textAlign = textOpts.style!.textAlign {
                let paragraphStyle = NSMutableParagraphStyle()
                switch textAlign {
                case "right":
                    paragraphStyle.alignment = .right
                case "center":
                    paragraphStyle.alignment = .center
                default:
                    paragraphStyle.alignment = .left
                }
                attributes[.paragraphStyle] = paragraphStyle
            }
            if textOpts.style!.skewX != 0 {
                attributes[.obliqueness] = textOpts.style!.skewX
            }
            
            let attributedText = NSAttributedString(string: textOpts.text, attributes: attributes)
            
            let maxSize = CGSize(width: w, height: h) // 最大宽度和高度
            let textRect = attributedText.boundingRect(with: maxSize, options: .usesLineFragmentOrigin, context: nil)
            let size = textRect.size
            
            let margin = CGFloat(20)
            var posX = margin
            var posY = margin
            if textOpts.position != .none {
                switch textOpts.position {
                    case .topLeft:
                        posX = margin
                        posY = margin
                    case .topCenter:
                        posX = CGFloat((w - size.width) / 2)
                    case .topRight:
                        posX = CGFloat(w - size.width - margin)
                    case .bottomLeft:
                        posY = CGFloat(h - size.height - margin)
                    case .bottomCenter:
                        posX = CGFloat((w - size.width) / 2)
                        posY = CGFloat(h - size.height - margin)
                    case .bottomRight:
                        posX = CGFloat(w - size.width - margin)
                        posY = CGFloat(h - size.height - margin)
                    case .center:
                        posX = CGFloat((w - size.width) / 2)
                        posY = CGFloat((h - size.height) / 2)
                    case .none:
                        posX = margin
                        posY = margin
                }
            } else {
                posX = Utils.parseSpreadValue(v: textOpts.X, relativeTo: CGFloat(w)) ?? margin
                posY = Utils.parseSpreadValue(v: textOpts.Y, relativeTo: CGFloat(h)) ?? margin
            }
            
            if textOpts.style!.rotate != 0 {
                context.saveGState()
                let rotation = CGAffineTransform(rotationAngle: CGFloat(textOpts.style!.rotate) * .pi / 180)
                let textRectWithPos = CGRect(x: CGFloat(posX), y: CGFloat(posY), width: size.width, height: size.height)
                context.translateBy(x: textRectWithPos.midX, y: textRectWithPos.midY)
                context.concatenate(rotation)
                context.translateBy(x: -( textRectWithPos.midX), y: -(textRectWithPos.midY))
            }
            
            if let textBackground = textOpts.style!.textBackground {
                let bgEdgeInsets = textOpts.style?.textBackground?.toEdgeInsets(width: CGFloat(w), height: CGFloat(h))
                context.setFillColor(textBackground.colorBg!.cgColor)
                let stretchX = (bgEdgeInsets?.left ?? 0) + (bgEdgeInsets?.right ?? 0);
                let stretchY = (bgEdgeInsets?.top ?? 0) + (bgEdgeInsets?.bottom ?? 0);
                var bgRect = CGRect(x: CGFloat(CGFloat(posX) - (bgEdgeInsets?.left ?? 0)), y: CGFloat(CGFloat(posY) - (bgEdgeInsets?.top ?? 0)), width: size.width + stretchX, height: size.height + stretchY)
                if textBackground.typeBg == "stretchX" {
                    bgRect = CGRect(x: 0, y: CGFloat(posY) - (bgEdgeInsets?.top ?? 0), width: CGFloat(w), height: size.height + stretchY)
                } else if textBackground.typeBg == "stretchY" {
                    bgRect = CGRect(x: CGFloat(CGFloat(posX) - (bgEdgeInsets?.left ?? 0)), y: 0, width: size.width + stretchX, height: CGFloat(h))
                }
                
                bgRect.inset(by: bgEdgeInsets!)
                
                if !Utils.isNULL(textBackground.cornerRadius) {
                    let path = textBackground.cornerRadius!.radiusPath(rect: bgRect)
                    context.addPath(path.cgPath)
                    context.fillPath()
                } else {
                    context.fill(bgRect)
                }
            }
            
            let rect = CGRect(origin: CGPoint(x: posX, y: posY), size: size)
            attributedText.draw(in: rect)
            context.restoreGState()
        }
        
        var aimg = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()
        aimg = aimg?.rotatedImageWithTransform(opts.backgroundImage.rotate)
        return aimg
    }
    
    func markImage(with image: UIImage, waterImages: [UIImage], options: MarkImageOptions) -> UIImage? {
        let bg = image;
        let w = bg.size.width
        let h = bg.size.height
        UIGraphicsBeginImageContextWithOptions(bg.size, false, options.backgroundImage.scale)
        
        let canvasRect = CGRect(x: 0, y: 0, width: CGFloat(w), height: CGFloat(h))
        let transform = CGAffineTransform(translationX: 0, y: canvasRect.height)
            .scaledBy(x: 1, y: -1)
        var context: CGContext?
        if options.backgroundImage.alpha != 1.0 {
            UIGraphicsBeginImageContextWithOptions(image.size, false, options.backgroundImage.scale)
            context = UIGraphicsGetCurrentContext()
            context?.saveGState()
            context?.concatenate(transform)
            
            context?.beginTransparencyLayer(auxiliaryInfo: nil)
            context?.setAlpha(options.backgroundImage.alpha)
            context?.setBlendMode(.multiply)
        
            context?.draw(image.cgImage!, in: canvasRect)
            context?.endTransparencyLayer()
            context?.setBlendMode(.normal)
            context?.restoreGState()
        } else {
            context = UIGraphicsGetCurrentContext()
            context?.saveGState()
            context?.concatenate(transform)
            context?.draw(image.cgImage!, in: canvasRect)
            context?.restoreGState()
        }
        
        for (index, waterImage) in waterImages.enumerated() {
            context?.saveGState()
            let watermarkOptions = options.watermarkImages[index];
            var markerImg = waterImage;
            if (options.backgroundImage.scale > 0) {
                markerImg = UIImage(cgImage: waterImage.cgImage!, scale: 1 / watermarkOptions.imageOption.scale, orientation: waterImage.imageOrientation)
            }

            let ww = markerImg.size.width
            let wh = markerImg.size.height
            
            let diagonal = sqrt(pow(ww, 2) + pow(wh, 2)) // 计算对角线长度
            let size = CGSize(width: CGFloat(diagonal), height: CGFloat(diagonal))
            var rect: CGRect
            if watermarkOptions.position != .none {
                switch watermarkOptions.position {
                    case .topLeft:
                        rect = CGRect(origin: CGPoint(x: 20, y: 20), size: size)
                    case .topCenter:
                        rect = CGRect(origin: CGPoint(x: (w - ww) / 2, y: 20), size: size)
                    case .topRight:
                        rect = CGRect(origin: CGPoint(x: w - ww - 20, y: 20), size: size)
                    case .bottomLeft:
                        rect = CGRect(origin: CGPoint(x: 20, y: h - wh - 20), size: size)
                    case .bottomCenter:
                        rect = CGRect(origin: CGPoint(x: (w - ww) / 2, y: h - wh - 20), size: size)
                    case .bottomRight:
                        rect = CGRect(origin: CGPoint(x: w - ww - 20, y: h - wh - 20), size: size)
                    case .center:
                        rect = CGRect(origin: CGPoint(x: (w - ww) / 2, y: (h - wh) / 2), size: size)
                    default:
                        rect = CGRect(origin: CGPoint(x: 20, y: 20), size: size)
                    }
            } else {
                rect = CGRect(x: Utils.parseSpreadValue(v: watermarkOptions.X, relativeTo: w) ?? 20, y: Utils.parseSpreadValue(v: watermarkOptions.Y, relativeTo: h) ?? 20, width: diagonal, height: diagonal)
            }
            
            UIGraphicsBeginImageContextWithOptions(CGSize(width: diagonal, height: diagonal), false, 1)
            let markerContext = UIGraphicsGetCurrentContext()
            markerContext?.saveGState()
            
            if watermarkOptions.imageOption.alpha != 1.0 {
                markerContext?.beginTransparencyLayer(auxiliaryInfo: nil)
                markerContext?.setAlpha(watermarkOptions.imageOption.alpha)
                markerContext?.setBlendMode(.multiply)
                let markerImage = markerImg.rotatedImageWithTransform(watermarkOptions.imageOption.rotate)
                let originPoint = CGPoint(x: 0, y: rect.height - markerImage.size.height)
                markerContext?.draw(markerImage.cgImage!, in: CGRect(origin: originPoint, size: CGSize(width: markerImage.size.width, height: markerImage.size.height)))
                markerContext?.endTransparencyLayer()

            } else {
                let markerImage = markerImg.rotatedImageWithTransform(watermarkOptions.imageOption.rotate)
                let originPoint = CGPoint(x: 0, y: rect.height - markerImage.size.height)
                markerContext?.draw(markerImage.cgImage!, in: CGRect(origin: originPoint, size: CGSize(width: markerImage.size.width, height: markerImage.size.height)))
            }
            markerContext?.restoreGState()

            let waterImageRes = UIGraphicsGetImageFromCurrentImageContext()!
            context?.draw(waterImageRes.cgImage!, in: rect)
            UIGraphicsEndImageContext()
            context?.restoreGState()
        }
        
        var newImage = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()
        newImage = newImage?.rotatedImageWithTransform(options.backgroundImage.rotate)
        return newImage
    }
}