//
//  ImageMarkerExampleUITests.swift
//  ImageMarkerExampleUITests
//
//  Created by Jimmydaddy on 2023/11/28.
//

import XCTest
import UIKit

final class ImageMarkerExampleUITests: XCTestCase {

  override func setUpWithError() throws {
    // Put setup code here. This method is called before the invocation of each test method in the class.

    // In UI tests it is usually best to stop immediately when a failure occurs.
    continueAfterFailure = false

    // In UI tests it’s important to set the initial state - such as interface orientation - required for your tests before they run. The setUp method is a good place to do this.
  }

  override func tearDownWithError() throws {
    // Put teardown code here. This method is called after the invocation of each test method in the class.
  }

  func testApp() throws {
    let app = XCUIApplication()
    app.launch()
    XCTAssertTrue(app.staticTexts["Image Marker Lab"].waitForExistence(timeout: 45))
    XCTAssertTrue(app.staticTexts["Feature checks"].exists)
    XCTAssertTrue(featureButton(in: app, identifier: "feature-text-anchor-offset", label: "Anchored text offset").exists)
    XCTAssertTrue(featureButton(in: app, identifier: "feature-image-anchor-offset", label: "Anchored image offset").exists)
    XCTAssertTrue(featureButton(in: app, identifier: "feature-mixed-watermark", label: "Text + image watermark").exists)
    XCTAssertTrue(featureButton(in: app, identifier: "feature-orientation-normalization", label: "Orientation normalization").exists)
  }

  func testTextAnchorOffsetFeatureProducesPreview() throws {
    let app = XCUIApplication()
    app.launch()

    XCTAssertTrue(app.staticTexts["Image Marker Lab"].waitForExistence(timeout: 45))
    let featureCard = featureButton(in: app, identifier: "feature-text-anchor-offset", label: "Anchored text offset")
    XCTAssertTrue(featureCard.exists)
    featureCard.tap()

    XCTAssertTrue(app.staticTexts["Text anchor offset"].waitForExistence(timeout: 5))
    XCTAssertTrue(app.otherElements["result-preview-ready"].waitForExistence(timeout: 15))
  }

  func testMixedWatermarkFeatureProducesPreview() throws {
    let app = XCUIApplication()
    app.launch()

    XCTAssertTrue(app.staticTexts["Image Marker Lab"].waitForExistence(timeout: 45))
    let featureCard = featureButton(in: app, identifier: "feature-mixed-watermark", label: "Text + image watermark")
    XCTAssertTrue(featureCard.exists)
    featureCard.tap()

    XCTAssertTrue(app.staticTexts["Mixed text + image"].waitForExistence(timeout: 5))
    XCTAssertTrue(app.otherElements["result-preview-ready"].waitForExistence(timeout: 15))
  }

  func testLaunchPerformance() throws {
    if #available(macOS 10.15, iOS 13.0, tvOS 13.0, watchOS 7.0, *) {
      // This measures how long it takes to launch your application.
      measure(metrics: [XCTApplicationLaunchMetric()]) {
        XCUIApplication().launch()
      }
    }
  }

  func testNormalizesUIImageOrientationBeforeCGImageRendering() throws {
    let sourceImage = makeTestImage(size: CGSize(width: 12, height: 8))
    let orientedImage = UIImage(
      cgImage: sourceImage.cgImage!,
      scale: sourceImage.scale,
      orientation: .right
    )

    let normalizedImage = orientedImage.normalizedForImageMarker()

    XCTAssertEqual(normalizedImage.imageOrientation, .up)
    XCTAssertEqual(normalizedImage.scale, orientedImage.scale)
    XCTAssertEqual(normalizedImage.size, orientedImage.size)
    XCTAssertNotNil(normalizedImage.cgImage)
  }

  func testKeepsAlreadyUprightUIImageInstance() throws {
    let image = makeTestImage(size: CGSize(width: 12, height: 8))

    XCTAssertTrue(image.normalizedForImageMarker() === image)
  }

  func testRendersImageWatermarkUsingAnchoredOffsets() throws {
    let background = makeSolidImage(size: CGSize(width: 80, height: 60), color: .red)
    let watermark = makeSolidImage(size: CGSize(width: 10, height: 10), color: .blue)

    let renderedImage = try XCTUnwrap(
      ImageMarkerRenderer.renderImageWatermarks(
        background: background,
        watermarks: [
          ImageMarkerImageWatermark(
            image: watermark,
            position: .topRight,
            offsetX: "5",
            offsetY: "4",
            scale: 1,
            rotate: 0,
            alpha: 1
          ),
        ],
        backgroundScale: 1,
        backgroundRotate: 0,
        backgroundAlpha: 1
      )
    )

    XCTAssertEqual(renderedImage.size.width, background.size.width, accuracy: 0.01)
    XCTAssertEqual(renderedImage.size.height, background.size.height, accuracy: 0.01)
    XCTAssertGreaterThan(
      bluePixelCount(in: renderedImage, xRange: 65..<80, yRange: 4..<20),
      20
    )
    XCTAssertEqual(bluePixelCount(in: renderedImage, xRange: 0..<40, yRange: 0..<30), 0)
  }

  func testRotatesRenderedBackgroundWhenRequested() throws {
    let background = makeSolidImage(size: CGSize(width: 30, height: 20), color: .red)
    let watermark = makeSolidImage(size: CGSize(width: 5, height: 5), color: .blue)

    let renderedImage = try XCTUnwrap(
      ImageMarkerRenderer.renderImageWatermarks(
        background: background,
        watermarks: [
          ImageMarkerImageWatermark(
            image: watermark,
            position: .topLeft,
            offsetX: "0",
            offsetY: "0",
            scale: 1,
            rotate: 0,
            alpha: 1
          ),
        ],
        backgroundScale: 1,
        backgroundRotate: 90,
        backgroundAlpha: 1
      )
    )

    XCTAssertEqual(renderedImage.size.width, background.size.height, accuracy: 1)
    XCTAssertEqual(renderedImage.size.height, background.size.width, accuracy: 1)
  }

  private func makeTestImage(size: CGSize) -> UIImage {
    let renderer = UIGraphicsImageRenderer(size: size)
    return renderer.image { context in
      UIColor.red.setFill()
      context.fill(CGRect(x: 0, y: 0, width: size.width / 2, height: size.height))
      UIColor.blue.setFill()
      context.fill(CGRect(x: size.width / 2, y: 0, width: size.width / 2, height: size.height))
    }
  }

  private func featureButton(in app: XCUIApplication, identifier: String, label: String) -> XCUIElement {
    let candidates = [
      app.buttons[identifier],
      app.buttons[label],
      app.descendants(matching: .any)[identifier],
      app.descendants(matching: .any)[label],
      app.staticTexts[label],
    ]

    for _ in 0..<8 {
      if let hittable = candidates.first(where: { $0.exists && $0.isHittable }) {
        return hittable
      }
      let scrollView = app.scrollViews.firstMatch
      scrollView.exists ? scrollView.swipeUp() : app.swipeUp()
      RunLoop.current.run(until: Date().addingTimeInterval(0.2))
    }

    return candidates.first(where: { $0.exists }) ?? app.descendants(matching: .any)[label]
  }

  private func makeSolidImage(size: CGSize, color: UIColor) -> UIImage {
    let format = UIGraphicsImageRendererFormat.default()
    format.scale = 1
    let renderer = UIGraphicsImageRenderer(size: size, format: format)
    return renderer.image { context in
      color.setFill()
      context.fill(CGRect(origin: .zero, size: size))
    }
  }

  private func bluePixelCount(in image: UIImage, xRange: Range<Int>, yRange: Range<Int>) -> Int {
    guard let bytes = rgbaBytes(for: image) else {
      XCTFail("Expected readable rendered image bytes")
      return 0
    }

    let width = Int(image.size.width * image.scale)
    let height = Int(image.size.height * image.scale)
    var count = 0
    for y in yRange where y >= 0 && y < height {
      for x in xRange where x >= 0 && x < width {
        let index = (y * width + x) * 4
        let red = bytes[index]
        let green = bytes[index + 1]
        let blue = bytes[index + 2]
        if blue > 160 && red < 100 && green < 100 {
          count += 1
        }
      }
    }
    return count
  }

  private func rgbaBytes(for image: UIImage) -> [UInt8]? {
    guard let cgImage = image.cgImage else {
      return nil
    }

    let width = Int(image.size.width * image.scale)
    let height = Int(image.size.height * image.scale)
    let bytesPerPixel = 4
    let bytesPerRow = width * bytesPerPixel
    var bytes = [UInt8](repeating: 0, count: height * bytesPerRow)
    let colorSpace = CGColorSpaceCreateDeviceRGB()
    let bitmapInfo = CGImageAlphaInfo.premultipliedLast.rawValue | CGBitmapInfo.byteOrder32Big.rawValue

    bytes.withUnsafeMutableBytes { rawBuffer in
      guard let context = CGContext(
        data: rawBuffer.baseAddress,
        width: width,
        height: height,
        bitsPerComponent: 8,
        bytesPerRow: bytesPerRow,
        space: colorSpace,
        bitmapInfo: bitmapInfo
      ) else {
        return
      }
      context.interpolationQuality = .none
      context.draw(cgImage, in: CGRect(x: 0, y: 0, width: width, height: height))
    }

    return bytes
  }
}
