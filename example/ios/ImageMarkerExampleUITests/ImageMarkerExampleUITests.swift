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
    XCTAssertTrue(featureButton(in: app, identifier: "feature-sharp-scaled-watermark", label: "Sharp scaled watermark").exists)
    XCTAssertTrue(featureButton(in: app, identifier: "feature-orientation-normalization", label: "Orientation normalization").exists)
    XCTAssertTrue(featureButton(in: app, identifier: "feature-rotation-output-policy", label: "Rotation output policy").exists)
    XCTAssertTrue(featureButton(in: app, identifier: "feature-watermark-orientation", label: "Watermark orientation").exists)
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

  func testSharpScaledWatermarkFeatureProducesPreview() throws {
    let app = XCUIApplication()
    app.launch()

    XCTAssertTrue(app.staticTexts["Image Marker Lab"].waitForExistence(timeout: 45))
    let featureCard = featureButton(in: app, identifier: "feature-sharp-scaled-watermark", label: "Sharp scaled watermark")
    XCTAssertTrue(featureCard.exists)
    featureCard.tap()

    XCTAssertTrue(app.staticTexts["Sharp scaled watermark"].waitForExistence(timeout: 5))
    XCTAssertTrue(app.otherElements["result-preview-ready"].waitForExistence(timeout: 15))
    let preview = app.descendants(matching: .any)["result-preview-open"]
    XCTAssertTrue(preview.waitForExistence(timeout: 5))
    preview.tap()

    let modal = app.otherElements["result-preview-modal"]
    XCTAssertTrue(modal.waitForExistence(timeout: 5))
    let modalImage = app.descendants(matching: .any)["result-preview-modal-image"]
    XCTAssertTrue(modalImage.waitForExistence(timeout: 5))
    app.buttons["result-preview-close"].tap()
    let dismissed = expectation(for: NSPredicate(format: "exists == false"), evaluatedWith: modalImage)
    wait(for: [dismissed], timeout: 5)
  }

  func testRotationOutputPolicyFeatureProducesPreview() throws {
    let app = XCUIApplication()
    app.launch()

    XCTAssertTrue(app.staticTexts["Image Marker Lab"].waitForExistence(timeout: 45))
    let featureCard = featureButton(
      in: app,
      identifier: "feature-rotation-output-policy",
      label: "Rotation output policy"
    )
    XCTAssertTrue(featureCard.exists)
    featureCard.tap()

    XCTAssertTrue(app.otherElements["result-preview-ready"].waitForExistence(timeout: 15))
    XCTAssertTrue(app.staticTexts["rotation-output-validated"].waitForExistence(timeout: 10))
  }

  func testWatermarkOrientationMatchesUprightPixelReference() throws {
    let app = XCUIApplication()
    app.launch()

    XCTAssertTrue(app.staticTexts["Image Marker Lab"].waitForExistence(timeout: 45))
    let featureCard = featureButton(
      in: app,
      identifier: "feature-watermark-orientation",
      label: "Watermark orientation"
    )
    XCTAssertTrue(featureCard.exists)
    featureCard.tap()

    XCTAssertTrue(app.otherElements["result-preview-ready"].waitForExistence(timeout: 60))
    XCTAssertTrue(app.staticTexts["watermark-orientation-validated"].waitForExistence(timeout: 10))
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

  func testPositionDefaultsAndEdgeInsetOverrides() throws {
    let canvasSize = CGSize(width: 100, height: 80)
    let itemSize = CGSize(width: 20, height: 10)

    let absolute = ImageMarkerRenderer.markerOrigin(
      position: .none,
      offsetX: nil,
      offsetY: nil,
      canvasSize: canvasSize,
      itemSize: itemSize
    )
    XCTAssertEqual(absolute.x, 20, accuracy: 0.001)
    XCTAssertEqual(absolute.y, 20, accuracy: 0.001)

    let flushAbsolute = ImageMarkerRenderer.markerOrigin(
      position: .none,
      offsetX: nil,
      offsetY: nil,
      canvasSize: canvasSize,
      itemSize: itemSize,
      edgeInset: "0"
    )
    XCTAssertEqual(flushAbsolute.x, 0, accuracy: 0.001)
    XCTAssertEqual(flushAbsolute.y, 0, accuracy: 0.001)

    let defaultAnchored = ImageMarkerRenderer.markerOrigin(
      position: .topLeft,
      offsetX: nil,
      offsetY: nil,
      canvasSize: canvasSize,
      itemSize: itemSize
    )
    XCTAssertEqual(defaultAnchored.x, 20, accuracy: 0.001)
    XCTAssertEqual(defaultAnchored.y, 20, accuracy: 0.001)

    let insetAnchored = ImageMarkerRenderer.markerOrigin(
      position: .bottomRight,
      offsetX: nil,
      offsetY: nil,
      canvasSize: canvasSize,
      itemSize: itemSize,
      edgeInset: "7"
    )
    XCTAssertEqual(insetAnchored.x, 73, accuracy: 0.001)
    XCTAssertEqual(insetAnchored.y, 63, accuracy: 0.001)

    let explicitZero = ImageMarkerRenderer.markerOrigin(
      position: .bottomRight,
      offsetX: "0",
      offsetY: "0",
      canvasSize: canvasSize,
      itemSize: itemSize,
      edgeInset: "7"
    )
    XCTAssertEqual(explicitZero.x, 80, accuracy: 0.001)
    XCTAssertEqual(explicitZero.y, 70, accuracy: 0.001)
  }

  func testRotatesFortyFiveDegreesWithExpandedTransparentCanvas() throws {
    let background = makeSolidImage(size: CGSize(width: 40, height: 20), color: .red)
    let renderedImage = try XCTUnwrap(
      ImageMarkerRenderer.renderImageWatermarks(
        background: background,
        watermarks: [],
        backgroundScale: 1,
        backgroundRotate: 45,
        backgroundAlpha: 1,
        rotationCanvasMode: .expand
      )
    )

    XCTAssertEqual(renderedImage.size.width, 43, accuracy: 0.001)
    XCTAssertEqual(renderedImage.size.height, 43, accuracy: 0.001)
    let bytes = try XCTUnwrap(rgbaBytes(for: renderedImage))
    let width = Int(renderedImage.size.width * renderedImage.scale)
    XCTAssertLessThan(bytes[pixelIndex(x: 0, y: 0, width: width) + 3], 64)
    XCTAssertTrue(isRedPixel(bytes, at: pixelIndex(x: width / 2, y: width / 2, width: width)))
  }

  func testRotatesFortyFiveDegreesWithCroppedOriginalCanvas() throws {
    let background = makeSolidImage(size: CGSize(width: 40, height: 20), color: .red)
    let renderedImage = try XCTUnwrap(
      ImageMarkerRenderer.renderImageWatermarks(
        background: background,
        watermarks: [],
        backgroundScale: 1,
        backgroundRotate: 45,
        backgroundAlpha: 1,
        rotationCanvasMode: .crop
      )
    )

    XCTAssertEqual(renderedImage.size.width, 40, accuracy: 0.001)
    XCTAssertEqual(renderedImage.size.height, 20, accuracy: 0.001)
    let bytes = try XCTUnwrap(rgbaBytes(for: renderedImage))
    let width = Int(renderedImage.size.width * renderedImage.scale)
    XCTAssertLessThan(bytes[pixelIndex(x: 0, y: 0, width: width) + 3], 64)
    XCTAssertTrue(isRedPixel(bytes, at: pixelIndex(x: width / 2, y: 10, width: width)))
  }

  func testJPEGUsesExplicitMatteWhilePNGPreservesTransparency() throws {
    let transparentImage = makeTransparentInsetImage(
      size: CGSize(width: 10, height: 10),
      inset: 3,
      color: .red
    )
    let pngData = try XCTUnwrap(
      ImageMarkerRenderer.encodedData(
        for: transparentImage,
        asPNG: true,
        jpegQuality: 1,
        matteColor: UIColor.green.withAlphaComponent(0.2)
      )
    )
    let jpegData = try XCTUnwrap(
      ImageMarkerRenderer.encodedData(
        for: transparentImage,
        asPNG: false,
        jpegQuality: 1,
        matteColor: .green
      )
    )
    let pngImage = try XCTUnwrap(UIImage(data: pngData))
    let jpegImage = try XCTUnwrap(UIImage(data: jpegData))
    let pngBytes = try XCTUnwrap(rgbaBytes(for: pngImage))
    let jpegBytes = try XCTUnwrap(rgbaBytes(for: jpegImage))

    XCTAssertEqual(pngBytes[3], 0)
    XCTAssertLessThan(jpegBytes[0], 40)
    XCTAssertGreaterThan(jpegBytes[1], 200)
    XCTAssertLessThan(jpegBytes[2], 40)
    XCTAssertEqual(jpegBytes[3], 255)
  }

  func testTrimsTransparentWatermarkPaddingBeforeAnchoredPositioning() throws {
    let background = makeSolidImage(size: CGSize(width: 12, height: 12), color: .red)
    let paddedWatermark = makeTransparentInsetImage(
      size: CGSize(width: 8, height: 8),
      inset: 2,
      color: .blue
    )
    let trimmedWatermark = paddedWatermark.trimmingTransparentPadding()
    XCTAssertEqual(trimmedWatermark.size.width, 4, accuracy: 0.001)
    XCTAssertEqual(trimmedWatermark.size.height, 4, accuracy: 0.001)

    let renderedImage = try XCTUnwrap(
      ImageMarkerRenderer.renderImageWatermarks(
        background: background,
        watermarks: [
          ImageMarkerImageWatermark(
            image: paddedWatermark,
            position: .topRight,
            offsetX: "0",
            offsetY: "0",
            scale: 1,
            rotate: 0,
            alpha: 1,
            trimTransparentPadding: true
          ),
        ],
        backgroundScale: 1,
        backgroundRotate: 0,
        backgroundAlpha: 1
      )
    )

    XCTAssertGreaterThan(bluePixelCount(in: renderedImage, xRange: 8..<12, yRange: 0..<4), 10)

    let asymmetric = makeAsymmetricTransparentImage()
    let asymmetricTrimmed = asymmetric.trimmingTransparentPadding()
    XCTAssertEqual(asymmetricTrimmed.size.width, 3, accuracy: 0.001)
    XCTAssertEqual(asymmetricTrimmed.size.height, 4, accuracy: 0.001)

    for visibleRect in [
      CGRect(x: 1, y: 300, width: 2, height: 4),
      CGRect(x: 1, y: 254, width: 2, height: 4),
    ] {
      let tallImage = makeTransparentRectImage(
        size: CGSize(width: 4, height: 600),
        visibleRect: visibleRect
      )
      let tallTrimmed = tallImage.trimmingTransparentPadding()
      XCTAssertEqual(tallTrimmed.size.width, 2, accuracy: 0.001)
      XCTAssertEqual(tallTrimmed.size.height, 4, accuracy: 0.001)
      XCTAssertEqual(bluePixelCount(in: tallTrimmed, xRange: 0..<2, yRange: 0..<4), 8)
    }
  }

  func testOptionsPreferFilenameAndProvideRenderingDefaults() throws {
    let background: [AnyHashable: Any] = [
      "src": ["uri": "file:///tmp/background.png"],
    ]
    let canonical = try Options(dicOpts: [
      "backgroundImage": background,
      "filename": "canonical-name",
      "fileName": "legacy-name",
    ])
    XCTAssertEqual(canonical.filename, "canonical-name")
    XCTAssertEqual(canonical.rotationCanvasMode, .expand)

    var white: CGFloat = 0
    XCTAssertTrue(canonical.matteColor.getWhite(&white, alpha: nil))
    XCTAssertEqual(white, 1, accuracy: 0.001)

    let legacy = try Options(dicOpts: [
      "backgroundImage": background,
      "fileName": "legacy-name",
      "matteColor": "#00FF00",
      "rotationCanvasMode": "crop",
    ])
    XCTAssertEqual(legacy.filename, "legacy-name")
    XCTAssertEqual(legacy.rotationCanvasMode, .crop)
    var red: CGFloat = 0
    var green: CGFloat = 0
    var blue: CGFloat = 0
    var alpha: CGFloat = 0
    XCTAssertTrue(legacy.matteColor.getRed(&red, green: &green, blue: &blue, alpha: &alpha))
    XCTAssertEqual(red, 0, accuracy: 0.001)
    XCTAssertEqual(green, 1, accuracy: 0.001)
    XCTAssertEqual(blue, 0, accuracy: 0.001)
    XCTAssertEqual(alpha, 1, accuracy: 0.001)

    let translucentMatte = try Options(dicOpts: [
      "backgroundImage": background,
      "matteColor": "#FF000080",
    ])
    XCTAssertTrue(translucentMatte.matteColor.getRed(&red, green: &green, blue: &blue, alpha: &alpha))
    XCTAssertEqual(red, 1, accuracy: 0.001)
    XCTAssertEqual(green, 0, accuracy: 0.001)
    XCTAssertEqual(blue, 0, accuracy: 0.001)
    XCTAssertEqual(alpha, 1, accuracy: 0.001)

    XCTAssertThrowsError(try Options(dicOpts: [
      "backgroundImage": background,
      "matteColor": "#FFFFFFzz",
    ]))
    XCTAssertThrowsError(try ImageOptions(dicOpts: [
      "src": ["uri": "file:///tmp/image.png"],
      "scale": 0,
    ]))
    XCTAssertThrowsError(try ImageOptions(dicOpts: [
      "src": ["uri": "file:///tmp/image.png"],
      "rotate": CGFloat.infinity,
    ]))

    XCTAssertEqual(Utils.canonicalOutputFilename("output.png", ext: ".jpg"), "output.jpg")
    XCTAssertEqual(Utils.canonicalOutputFilename("output.JPEG", ext: ".png"), "output.png")
  }

  func testAnchorsRotatedWatermarkByVisibleBounds() throws {
    let background = makeSolidImage(size: CGSize(width: 40, height: 40), color: .red)
    let watermark = makeSolidImage(size: CGSize(width: 6, height: 14), color: .blue)

    for rotation in [CGFloat(45), CGFloat(90)] {
      let renderedImage = try XCTUnwrap(
        ImageMarkerRenderer.renderImageWatermarks(
          background: background,
          watermarks: [
            ImageMarkerImageWatermark(
              image: watermark,
              position: .topRight,
              offsetX: nil,
              offsetY: nil,
              scale: 1,
              rotate: rotation,
              alpha: 1,
              edgeInset: "0"
            ),
          ],
          backgroundScale: 1,
          backgroundRotate: 0,
          backgroundAlpha: 1
        )
      )
      let bounds = try XCTUnwrap(bluePixelBounds(in: renderedImage))
      XCTAssertLessThanOrEqual(bounds.minY, 1, "rotation \(rotation)")
      XCTAssertGreaterThanOrEqual(bounds.maxX, 39, "rotation \(rotation)")
    }
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

  func testRendersScaledImageWatermarkWithoutInterpolatedEdges() throws {
    let background = makeSolidImage(size: CGSize(width: 8, height: 8), color: .red)
    let watermark = makeCheckerImage(size: CGSize(width: 4, height: 4))

    let renderedImage = try XCTUnwrap(
      ImageMarkerRenderer.renderImageWatermarks(
        background: background,
        watermarks: [
          ImageMarkerImageWatermark(
            image: watermark,
            position: .none,
            offsetX: "0",
            offsetY: "0",
            scale: 0.5,
            rotate: 0,
            alpha: 1
          ),
        ],
        backgroundScale: 1,
        backgroundRotate: 0,
        backgroundAlpha: 1
      )
    )
    let bytes = try XCTUnwrap(rgbaBytes(for: renderedImage))
    let width = Int(renderedImage.size.width * renderedImage.scale)

    for y in 0..<2 {
      for x in 0..<2 {
        XCTAssertTrue(
          isBlackOrWhitePixel(bytes, at: pixelIndex(x: x, y: y, width: width)),
          "Expected a hard black or white watermark pixel at (\(x), \(y))"
        )
      }
    }
    XCTAssertTrue(isRedPixel(bytes, at: pixelIndex(x: 2, y: 0, width: width)))
    XCTAssertTrue(isRedPixel(bytes, at: pixelIndex(x: 0, y: 2, width: width)))
  }

  func testPreservesAsymmetricWatermarkOrientationAcrossScaleAndRotation() throws {
    let background = makeSolidImage(size: CGSize(width: 32, height: 32), color: .black)
    let watermark = makeQuadrantImage()

    for scenario in [
      (name: "scale=1", scale: CGFloat(1), rotation: CGFloat(0), expected: [UIColor.red, .green, .blue, .yellow]),
      (name: "scale=2", scale: CGFloat(2), rotation: CGFloat(0), expected: [UIColor.red, .green, .blue, .yellow]),
      (name: "rotation=90", scale: CGFloat(1), rotation: CGFloat(90), expected: [UIColor.blue, .red, .yellow, .green]),
    ] {
      let renderedImage = try XCTUnwrap(
        ImageMarkerRenderer.renderImageWatermarks(
          background: background,
          watermarks: [
            ImageMarkerImageWatermark(
              image: watermark,
              position: .none,
              offsetX: "4",
              offsetY: "5",
              scale: scenario.scale,
              rotate: scenario.rotation,
              alpha: 1
            ),
          ],
          backgroundScale: 1,
          backgroundRotate: 0,
          backgroundAlpha: 1
        )
      )

      let markerSize = CGSize(
        width: watermark.size.width * scenario.scale,
        height: watermark.size.height * scenario.scale
      )
      let visibleSize = ImageMarkerRenderer.rotatedBoundingSize(markerSize, rotation: scenario.rotation)
      let samplePoints = quadrantSamplePoints(origin: CGPoint(x: 4, y: 5), size: visibleSize)
      let bytes = try XCTUnwrap(rgbaBytes(for: renderedImage))
      let width = Int(renderedImage.size.width * renderedImage.scale)

      for (index, point) in samplePoints.enumerated() {
        assertPixel(
          bytes,
          at: point,
          width: width,
          matches: scenario.expected[index],
          message: "\(scenario.name), quadrant \(index)"
        )
      }
    }
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

  private func makeTransparentInsetImage(size: CGSize, inset: CGFloat, color: UIColor) -> UIImage {
    let format = UIGraphicsImageRendererFormat.default()
    format.scale = 1
    format.opaque = false
    let renderer = UIGraphicsImageRenderer(size: size, format: format)
    return renderer.image { context in
      UIColor.clear.setFill()
      context.fill(CGRect(origin: .zero, size: size))
      color.setFill()
      context.fill(
        CGRect(
          x: inset,
          y: inset,
          width: size.width - inset * 2,
          height: size.height - inset * 2
        )
      )
    }
  }

  private func makeAsymmetricTransparentImage() -> UIImage {
    return makeTransparentRectImage(
      size: CGSize(width: 9, height: 11),
      visibleRect: CGRect(x: 1, y: 3, width: 3, height: 4)
    )
  }

  private func makeTransparentRectImage(size: CGSize, visibleRect: CGRect) -> UIImage {
    let format = UIGraphicsImageRendererFormat.default()
    format.scale = 1
    format.opaque = false
    return UIGraphicsImageRenderer(size: size, format: format).image { context in
      UIColor.clear.setFill()
      context.fill(CGRect(origin: .zero, size: size))
      UIColor.blue.setFill()
      context.fill(visibleRect)
    }
  }

  private func makeCheckerImage(size: CGSize) -> UIImage {
    let format = UIGraphicsImageRendererFormat.default()
    format.scale = 1
    let renderer = UIGraphicsImageRenderer(size: size, format: format)
    return renderer.image { context in
      for y in 0..<Int(size.height) {
        for x in 0..<Int(size.width) {
          let color: UIColor = (x + y).isMultiple(of: 2) ? .black : .white
          color.setFill()
          context.fill(CGRect(x: x, y: y, width: 1, height: 1))
        }
      }
    }
  }

  private func makeQuadrantImage() -> UIImage {
    let size = CGSize(width: 8, height: 6)
    let format = UIGraphicsImageRendererFormat.default()
    format.scale = 1
    format.opaque = true
    return UIGraphicsImageRenderer(size: size, format: format).image { context in
      for (rect, color) in [
        (CGRect(x: 0, y: 0, width: 4, height: 3), UIColor.red),
        (CGRect(x: 4, y: 0, width: 4, height: 3), UIColor.green),
        (CGRect(x: 0, y: 3, width: 4, height: 3), UIColor.blue),
        (CGRect(x: 4, y: 3, width: 4, height: 3), UIColor.yellow),
      ] {
        color.setFill()
        context.fill(rect)
      }
    }
  }

  private func quadrantSamplePoints(origin: CGPoint, size: CGSize) -> [CGPoint] {
    return [
      CGPoint(x: origin.x + size.width / 4, y: origin.y + size.height / 4),
      CGPoint(x: origin.x + size.width * 3 / 4, y: origin.y + size.height / 4),
      CGPoint(x: origin.x + size.width / 4, y: origin.y + size.height * 3 / 4),
      CGPoint(x: origin.x + size.width * 3 / 4, y: origin.y + size.height * 3 / 4),
    ]
  }

  private func assertPixel(
    _ bytes: [UInt8],
    at point: CGPoint,
    width: Int,
    matches expectedColor: UIColor,
    message: String
  ) {
    var expectedRed: CGFloat = 0
    var expectedGreen: CGFloat = 0
    var expectedBlue: CGFloat = 0
    var expectedAlpha: CGFloat = 0
    XCTAssertTrue(
      expectedColor.getRed(
        &expectedRed,
        green: &expectedGreen,
        blue: &expectedBlue,
        alpha: &expectedAlpha
      )
    )
    let index = pixelIndex(x: Int(point.x), y: Int(point.y), width: width)
    XCTAssertEqual(bytes[index], UInt8(expectedRed * 255), accuracy: 2, message)
    XCTAssertEqual(bytes[index + 1], UInt8(expectedGreen * 255), accuracy: 2, message)
    XCTAssertEqual(bytes[index + 2], UInt8(expectedBlue * 255), accuracy: 2, message)
    XCTAssertEqual(bytes[index + 3], UInt8(expectedAlpha * 255), accuracy: 2, message)
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

  private func bluePixelBounds(in image: UIImage) -> CGRect? {
    guard let bytes = rgbaBytes(for: image) else {
      return nil
    }
    let width = Int(image.size.width * image.scale)
    let height = Int(image.size.height * image.scale)
    var minX = width
    var minY = height
    var maxX = -1
    var maxY = -1
    for y in 0..<height {
      for x in 0..<width {
        let index = pixelIndex(x: x, y: y, width: width)
        if bytes[index + 2] > 140 && bytes[index] < 120 && bytes[index + 1] < 120 {
          minX = min(minX, x)
          minY = min(minY, y)
          maxX = max(maxX, x)
          maxY = max(maxY, y)
        }
      }
    }
    guard maxX >= minX, maxY >= minY else {
      return nil
    }
    return CGRect(x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1)
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

  private func pixelIndex(x: Int, y: Int, width: Int) -> Int {
    return (y * width + x) * 4
  }

  private func isBlackOrWhitePixel(_ bytes: [UInt8], at index: Int) -> Bool {
    let red = bytes[index]
    let green = bytes[index + 1]
    let blue = bytes[index + 2]
    let isBlack = red == 0 && green == 0 && blue == 0
    let isWhite = red == 255 && green == 255 && blue == 255
    return isBlack || isWhite
  }

  private func isRedPixel(_ bytes: [UInt8], at index: Int) -> Bool {
    let red = bytes[index]
    let green = bytes[index + 1]
    let blue = bytes[index + 2]
    return red == 255 && green == 0 && blue == 0
  }
}
