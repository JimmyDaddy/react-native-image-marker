//
//  RCTImageMarker.swift
//  react-native-image-marker
//
//  Created by Jimmydaddy on 2023/7/2.
//

import Foundation
import CoreText
import CoreGraphics
import UIKit
import React

@objc(ImageMarker)
public final class ImageMarker: NSObject, RCTBridgeModule {
    public var bridge: RCTBridge!
        
    func loadImage(
        with src: [AnyHashable: Any],
        callback: @escaping RCTImageLoaderCompletionBlock
    ) {
        let className = "RCTImageLoader"
        let classType: AnyClass? = NSClassFromString(className)
        guard let imageLoader = bridge.module(for: classType) as? RCTImageLoader else {
            NSLog("Failed to get ImageLoader module")
            let errorDomain = "com.jimmydaddy.imagemarker"
            let errorCode = 1
            let errorUserInfo = [NSLocalizedDescriptionKey: "Failed to get ImageLoader module"]
            let error = NSError(domain: errorDomain, code: errorCode, userInfo: errorUserInfo)
            callback(error, nil)
            return
        }
        imageLoader.loadImage(
            with: RCTConvert.nsurlRequest(src),
            callback: { error, loadedImage in
                if let error = error {
                    NSLog("LOAD_IMAGE_ERROR: %@", error.localizedDescription)
                    let errorDomain = "com.jimmydaddy.imagemarker"
                    let errorCode = 2
                    let errorUserInfo = [NSLocalizedDescriptionKey: "LOAD_IMAGE_ERROR Failed to get load image"]
                    let error = NSError(domain: errorDomain, code: errorCode, userInfo: errorUserInfo)
                    callback(error, nil)
                }
                callback(error, loadedImage)
            }
        )
    }
    
    @objc
    public static func requiresMainQueueSetup() -> Bool {
        return false
    }
    
    public static func moduleName() -> String! {
        return "ImageMarker";
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
        
    func markerImgWithText(_ image: UIImage, _ opts: MarkTextOptions) -> UIImage? {
        let w = Int(image.size.width)
        let h = Int(image.size.height)
        
        UIGraphicsBeginImageContextWithOptions(image.size, false, opts.backgroundImage.scale)
        
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
            context.draw(image.cgImage!, in: canvasRect)
            context.endTransparencyLayer()
            context.setBlendMode(.normal)
        } else {
            context.draw(image.cgImage!, in: canvasRect)
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
            
            let margin = 20
            var posX = margin
            var posY = margin
            if textOpts.position != .none {
                switch textOpts.position {
                    case .topLeft:
                        posX = margin
                        posY = margin
                    case .topCenter:
                        posX = (w - Int(size.width)) / 2
                    case .topRight:
                        posX = w - Int(size.width) - margin
                    case .bottomLeft:
                        posY = h - Int(size.height) - margin
                    case .bottomCenter:
                        posX = (w - Int(size.width)) / 2
                        posY = h - Int(size.height) - margin
                    case .bottomRight:
                        posX = w - Int(size.width) - margin
                        posY = h - Int(size.height) - margin
                    case .center:
                        posX = (w - Int(size.width)) / 2
                        posY = (h - Int(size.height)) / 2
                    case .none:
                        posX = margin
                        posY = margin
                }
            } else {
                posX = Int(textOpts.X)
                posY = Int(textOpts.Y)
            }
            
            if textOpts.style!.rotate != 0 {
                context.saveGState()
                context.translateBy(x: canvasRect.midX, y: canvasRect.midY)
                let rotation = CGAffineTransform(rotationAngle: CGFloat(textOpts.style!.rotate) * .pi / 180)
                context.concatenate(rotation)
                context.translateBy(x: -canvasRect.midX, y: -canvasRect.midY)
            }
            
            if let textBackground = textOpts.style!.textBackground {
                context.setFillColor(textBackground.colorBg!.cgColor)
                if textBackground.typeBg == "stretchX" {
                    context.fill(CGRect(x: 0, y: CGFloat(posY) - textBackground.paddingY, width: CGFloat(w), height: size.height + 2 * textBackground.paddingY))
                } else if textBackground.typeBg == "stretchY" {
                    context.fill(CGRect(x: CGFloat(CGFloat(posX) - textBackground.paddingX), y: 0, width: size.width + 2 * textBackground.paddingX, height: CGFloat(h)))
                } else {
                    context.fill(CGRect(x: CGFloat(CGFloat(posX) - textBackground.paddingX), y: CGFloat(CGFloat(posY) - textBackground.paddingY), width: size.width + 2 * textBackground.paddingX, height: size.height + 2 * textBackground.paddingY))
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
    
    func markeImage(with image: UIImage, waterImage: UIImage, options: MarkImageOptions) -> UIImage? {
        let w = Int(image.size.width)
        let h = Int(image.size.height)
                
        let ww = waterImage.size.width * options.watermarkImage.scale
        let wh = waterImage.size.height * options.watermarkImage.scale
        
        let diagonal = sqrt(pow(ww, 2) + pow(ww, 2)) // 计算对角线长度
        
        let canvasRect = CGRect(x: 0, y: 0, width: CGFloat(w), height: CGFloat(h))
        
        UIGraphicsBeginImageContextWithOptions(image.size, false, options.backgroundImage.scale)

        let transform = CGAffineTransform(translationX: 0, y: canvasRect.height)
            .scaledBy(x: 1, y: -1)
        var context: CGContext?
        if options.backgroundImage.alpha != 1.0 {
            UIGraphicsBeginImageContextWithOptions(image.size, false, 0)
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
        
        let size = CGSize(width: CGFloat(diagonal), height: CGFloat(diagonal))
        
        var rect: CGRect
        if options.position != .none {
            switch options.position {
                case .topLeft:
                    rect = CGRect(origin: CGPoint(x: 20, y: 20), size: size)
                case .topCenter:
                    rect = CGRect(origin: CGPoint(x: (w - Int(size.width)) / 2, y: 20), size: size)
                case .topRight:
                    rect = CGRect(origin: CGPoint(x: w - Int(size.width) - 20, y: 20), size: size)
                case .bottomLeft:
                    rect = CGRect(origin: CGPoint(x: 20, y: h - Int(size.height) - 20), size: size)
                case .bottomCenter:
                    rect = CGRect(origin: CGPoint(x: (w - Int(size.width)) / 2, y: h - Int(size.height) - 20), size: size)
                case .bottomRight:
                    rect = CGRect(origin: CGPoint(x: w - Int(size.width) - 20, y: h - Int(size.height) - 20), size: size)
                case .center:
                    rect = CGRect(origin: CGPoint(x: (w - Int(size.width)) / 2, y: (h - Int(size.height)) / 2), size: size)
                default:
                    rect = CGRect(origin: CGPoint(x: 20, y: 20), size: size)
                }
        } else {
            rect = CGRect(x: CGFloat(options.X), y: CGFloat(options.Y), width: CGFloat(ww), height: CGFloat(wh))
        }
        
        UIGraphicsBeginImageContextWithOptions(CGSize(width: diagonal, height: diagonal), false, 0)
        let markerContext = UIGraphicsGetCurrentContext()
        markerContext?.saveGState()

        if options.watermarkImage.alpha != 1.0 {
            markerContext?.beginTransparencyLayer(auxiliaryInfo: nil)
            markerContext?.setAlpha(options.watermarkImage.alpha)
            markerContext?.setBlendMode(.multiply)
            let markerImage = waterImage.rotatedImageWithTransform(options.watermarkImage.rotate)
            markerContext?.draw(markerImage.cgImage!, in: CGRect(origin: .zero, size: CGSize(width: diagonal, height: diagonal)))
            markerContext?.endTransparencyLayer()

        } else {
            let markerImage = waterImage.rotatedImageWithTransform(options.watermarkImage.rotate)
            markerContext?.draw(markerImage.cgImage!, in: CGRect(origin: .zero, size: CGSize(width: diagonal, height: diagonal)))
        }
        markerContext?.restoreGState()

        let waterImageRes = UIGraphicsGetImageFromCurrentImageContext()!
        context?.draw(waterImageRes.cgImage!, in: rect)
        UIGraphicsEndImageContext()
        
        var newImage = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()
        newImage = newImage?.rotatedImageWithTransform(options.backgroundImage.rotate)
        return newImage
    }
    
    @objc(markWithText:resolver:rejecter:)
    func mark(withText opts: [AnyHashable: Any], resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) -> Void {
        let markOpts = MarkTextOptions.checkTextParams(opts, rejecter: rejecter)
        if markOpts === nil {
            rejecter("OPTS_INVALID", "opts invalid", nil)
        }
        if Utils.isBase64(markOpts!.backgroundImage.uri) {
            if let image = UIImage.transBase64(markOpts!.backgroundImage.uri) {
                if let scaledImage = markerImgWithText(image, markOpts!) {
                    let res = saveImageForMarker(scaledImage, with: markOpts!)
                    resolver(res)
                } else {
                    print("Can't mark the image")
                    rejecter("error", "Can't mark the image.", nil)
                }
            }
        } else {
            loadImage(with: markOpts!.backgroundImage.src, callback: { (error, image) in
                if let error = error {
                    if let image = UIImage(contentsOfFile: markOpts!.backgroundImage.uri) {
                        if let scaledImage = self.markerImgWithText(image, markOpts!) {
                            let res = self.saveImageForMarker(scaledImage, with: markOpts!)
                            resolver(res)
                        } else {
                            print("Can't mark the image")
                            rejecter("error", "Can't mark the image.", error)
                        }
                    } else {
                        print("Can't retrieve the file from the path")
                        rejecter("error", "Can't retrieve the file from the path.", error)
                    }
                } else if let image = image {
                    if let scaledImage = self.markerImgWithText(image, markOpts!) {
                        let res = self.saveImageForMarker(scaledImage, with: markOpts!)
                        resolver(res)
                    } else {
                        print("Can't mark the image")
                        rejecter("error", "Can't mark the image.", error)
                    }
                }
            })
        }
    }
    
    @objc(markWithImage:resolver:rejecter:)
    func mark(withImage opts: [AnyHashable: Any], resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) -> Void {
        let markOpts = MarkImageOptions.checkImageParams(opts, rejecter: rejecter)
        if markOpts === nil {
            rejecter("OPTS_INVALID", "opts invalid", nil)
        }
        if Utils.isBase64(markOpts?.backgroundImage.uri) {
            if let image = UIImage.transBase64(markOpts!.backgroundImage.uri) {
                if Utils.isBase64(markOpts!.watermarkImage.uri) {
                    if let marker = UIImage.transBase64(markOpts!.watermarkImage.uri) {
                        if let scaledImage = markeImage(with: image, waterImage: marker, options: markOpts!) {
                            let res = saveImageForMarker(scaledImage, with: markOpts!)
                            resolver(res)
                        } else {
                            print("Can't mark the image")
                            rejecter("error", "Can't mark the image.", nil)
                        }
                    }
                } else {
                    self.loadImage(with: markOpts!.watermarkImage.src, callback: { (error, marker) in
                        if let error = error {
                            if let marker = UIImage(contentsOfFile: markOpts!.watermarkImage.uri) {
                                if let scaledImage = self.markeImage(with: image, waterImage: marker, options: markOpts!) {
                                    let res = self.saveImageForMarker(scaledImage, with: markOpts!)
                                    resolver(res)
                                } else {
                                    print("Can't mark the image")
                                    rejecter("error", "Can't mark the image.", error)
                                }
                            } else {
                                print("Can't retrieve the file from the path")
                                rejecter("error", "Can't retrieve the file from the path.", error)
                            }
                        } else if let marker = marker {
                            if let scaledImage = self.markeImage(with: image, waterImage: marker, options: markOpts!) {
                                let res = self.saveImageForMarker(scaledImage, with: markOpts!)
                                resolver(res)
                            } else {
                                print("Can't mark the image")
                                rejecter("error", "Can't mark the image.", error)
                            }
                        }
                    })
                }
            }
        } else {
            self.loadImage(with: markOpts!.backgroundImage.src, callback: { (error, image) in
                if let error = error {
                    if let image = UIImage(contentsOfFile: markOpts!.backgroundImage.uri) {
                        if Utils.isBase64(markOpts!.watermarkImage.uri) {
                            if let marker = UIImage.transBase64(markOpts!.watermarkImage.uri) {
                                if let scaledImage = self.markeImage(with: image, waterImage: marker, options: markOpts!) {
                                    let res = self.saveImageForMarker(scaledImage, with: markOpts!)
                                    resolver(res)
                                } else {
                                    print("Can't mark the image")
                                    rejecter("error", "Can't mark the image.", error)
                                }
                            }
                        } else {
                            self.loadImage(with: markOpts!.watermarkImage.src, callback: { (error, marker) in
                                if let error = error {
                                    if let marker = UIImage(contentsOfFile: markOpts!.watermarkImage.uri) {
                                        if let scaledImage = self.markeImage(with: image, waterImage: marker, options: markOpts!) {
                                            let res = self.saveImageForMarker(scaledImage, with: markOpts!)
                                            resolver(res)
                                        } else {
                                            print("Can't mark the image")
                                            rejecter("error", "Can't mark the image.", error)
                                        }
                                    } else {
                                        print("Can't retrieve the file from the path")
                                        rejecter("error", "Can't retrieve the file from the path.", error)
                                    }
                                } else if let marker = marker {
                                    if let scaledImage = self.markeImage(with: image, waterImage: marker, options: markOpts!) {
                                        let res = self.saveImageForMarker(scaledImage, with: markOpts!)
                                        resolver(res)
                                    } else {
                                        print("Can't mark the image")
                                        rejecter("error", "Can't mark the image.", error)
                                    }
                                }
                            })
                        }
                    } else {
                        print("Can't retrieve the file from the path")
                        rejecter("error", "Can't retrieve the file from the path.", error)
                    }
                } else if let image = image {
                    if Utils.isBase64(markOpts!.watermarkImage.uri) {
                        if let marker = UIImage.transBase64(markOpts!.watermarkImage.uri) {
                            if let scaledImage = self.markeImage(with: image, waterImage: marker, options: markOpts!) {
                                let res = self.saveImageForMarker(scaledImage, with: markOpts!)
                                resolver(res)
                            } else {
                                print("Can't mark the image")
                                rejecter("error", "Can't mark the image.", error)
                            }
                        }
                    } else {
                        self.loadImage(with: markOpts!.watermarkImage.src, callback: { (error, marker) in
                            if let error = error {
                                if let marker = UIImage(contentsOfFile: markOpts!.watermarkImage.uri) {
                                    if let scaledImage = self.markeImage(with: image, waterImage: marker, options: markOpts!) {
                                        let res = self.saveImageForMarker(scaledImage, with: markOpts!)
                                        resolver(res)
                                    } else {
                                        print("Can't mark the image")
                                        rejecter("error", "Can't mark the image.", error)
                                    }
                                } else {
                                    print("Can't retrieve the file from the path")
                                    rejecter("error", "Can't retrieve the file from the path.", error)
                                }
                            } else if let marker = marker {
                                if let scaledImage = self.markeImage(with: image, waterImage: marker, options: markOpts!) {
                                    let res = self.saveImageForMarker(scaledImage, with: markOpts!)
                                    resolver(res)
                                } else {
                                    print("Can't mark the image")
                                    rejecter("error", "Can't mark the image.", error)
                                }
                            }
                        })
                    }
                }
            })
        }
    }
}
