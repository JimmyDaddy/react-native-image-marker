//
//  ImageMarkerExampleUITests.swift
//  ImageMarkerExampleUITests
//
//  Created by Jimmydaddy on 2023/11/28.
//

import XCTest
import UIKit
import ImageIO

private actor SequentialLoadProbe {
  private var active = 0
  private var maximumActive = 0
  private var started: [Int] = []

  func begin(_ value: Int) {
    active += 1
    maximumActive = max(maximumActive, active)
    started.append(value)
  }

  func end() {
    active -= 1
  }

  func snapshot() -> (maximumActive: Int, started: [Int]) {
    return (maximumActive, started)
  }
}

private actor AsyncLimiterProbe {
  private var active = 0
  private var maximumActive = 0
  private var entries: [Int] = []

  func begin(_ value: Int) {
    active += 1
    maximumActive = max(maximumActive, active)
    entries.append(value)
  }

  func end() {
    active -= 1
  }

  func snapshot() -> (maximumActive: Int, entries: [Int]) {
    return (maximumActive, entries)
  }
}

private actor AsyncTestGate {
  private var isOpen = false
  private var waiters: [CheckedContinuation<Void, Never>] = []

  func wait() async {
    if isOpen {
      return
    }
    await withCheckedContinuation { continuation in
      waiters.append(continuation)
    }
  }

  func open() {
    isOpen = true
    let currentWaiters = waiters
    waiters.removeAll()
    currentWaiters.forEach { $0.resume() }
  }
}

private final class CancellationBridgeProbe: @unchecked Sendable {
  private let lock = NSLock()
  private var completion: ((Result<Int, Error>) -> Void)?
  private var cancellationCount = 0

  func install(_ completion: @escaping (Result<Int, Error>) -> Void) {
    lock.lock()
    self.completion = completion
    lock.unlock()
  }

  func recordCancellation() {
    lock.lock()
    cancellationCount += 1
    lock.unlock()
  }

  func complete(_ result: Result<Int, Error>) {
    lock.lock()
    let completion = self.completion
    lock.unlock()
    completion?(result)
  }

  func cancellationCalls() -> Int {
    lock.lock()
    defer { lock.unlock() }
    return cancellationCount
  }
}

private final class SourceLifetimeToken {}

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

  func testCore21SharedRecipeTextConformance() throws {
    let bundle = Bundle(for: type(of: self))
    let url = try XCTUnwrap(
      bundle.url(forResource: "core-2.1-recipe", withExtension: "json")
    )
    let root = try XCTUnwrap(
      JSONSerialization.jsonObject(with: Data(contentsOf: url)) as? [String: Any]
    )
    let layers = try XCTUnwrap(root["layers"] as? [[String: Any]])
    let styleOptions = try XCTUnwrap(layers.first?["style"] as? [String: Any])
    let style = try TextStyle(dicOpts: styleOptions)

    XCTAssertEqual(root["schemaVersion"] as? Int, 2)
    XCTAssertEqual(try style.resolvedMaxWidth(backgroundWidth: 320), 200)
    XCTAssertEqual(style.lineHeight, 40)
    XCTAssertEqual(style.letterSpacing, 1)
    XCTAssertEqual(style.direction, "auto")
    XCTAssertEqual(style.wrap, "character")
    XCTAssertEqual(style.maxLines, 2)
    XCTAssertEqual(style.overflow, "ellipsis")

    let paragraphStyle = NSMutableParagraphStyle()
    paragraphStyle.baseWritingDirection = .natural
    paragraphStyle.minimumLineHeight = try XCTUnwrap(style.lineHeight)
    paragraphStyle.maximumLineHeight = try XCTUnwrap(style.lineHeight)
    let layout = ImageMarkerTextLayout(
      text: NSAttributedString(
        string: layers[0]["text"] as? String ?? "",
        attributes: [
          .font: UIFont.systemFont(ofSize: 32),
          .foregroundColor: UIColor.white,
          .paragraphStyle: paragraphStyle,
          .kern: style.letterSpacing,
        ]
      ),
      maxWidth: try style.resolvedMaxWidth(backgroundWidth: 320),
      style: style
    )
    XCTAssertLessThanOrEqual(layout.size.width, 200)
    XCTAssertGreaterThan(layout.size.height, 40)
    XCTAssertLessThanOrEqual(layout.size.height, 80)

    let rendered = UIGraphicsImageRenderer(
      size: CGSize(width: 200, height: 80)
    ).image { context in
      UIColor.black.setFill()
      context.fill(CGRect(x: 0, y: 0, width: 200, height: 80))
      layout.draw(at: .zero)
    }
    let bytes = try XCTUnwrap(rgbaBytes(for: rendered))
    XCTAssertTrue(
      stride(from: 0, to: bytes.count, by: 4).contains { index in
        bytes[index] > 24 || bytes[index + 1] > 24 || bytes[index + 2] > 24
      }
    )
  }

  func testCore21ImageInfoReadsEncodedOrientation() throws {
    let image = makeSolidImage(
      size: CGSize(width: 12, height: 8),
      color: .systemBlue
    )
    let data = NSMutableData()
    let destination = try XCTUnwrap(
      CGImageDestinationCreateWithData(
        data,
        "public.jpeg" as CFString,
        1,
        nil
      )
    )
    CGImageDestinationAddImage(
      destination,
      try XCTUnwrap(image.cgImage),
      [kCGImagePropertyOrientation: 6] as CFDictionary
    )
    XCTAssertTrue(CGImageDestinationFinalize(destination))
    let serialized = try ImageInfoReader.read([
      "uri": "data:image/jpeg;base64,\(data.base64EncodedString())",
    ])
    let info = try XCTUnwrap(
      JSONSerialization.jsonObject(with: Data(serialized.utf8)) as? [String: Any]
    )

    XCTAssertEqual(info["encodedWidth"] as? Int, 12)
    XCTAssertEqual(info["encodedHeight"] as? Int, 8)
    XCTAssertEqual(info["width"] as? Int, 8)
    XCTAssertEqual(info["height"] as? Int, 12)
    XCTAssertEqual(info["orientation"] as? Int, 6)
    XCTAssertEqual(info["rotationDegrees"] as? Int, 90)
    XCTAssertEqual(info["requiresNormalization"] as? Bool, true)
  }

  func testInvisibleWatermarkMatchesCrossPlatformVectors() throws {
    let key = "0123456789abcdef"
    let frame = try InvisibleWatermark.frameForTesting(
      payload: "asset-42",
      key: key
    )
    XCTAssertEqual(
      frame.map { String(format: "%02x", $0) }.joined(),
      "494d010861737365742d343200000000df3d807417f6"
    )
    XCTAssertEqual(
      Array(try InvisibleWatermark.permutationForTesting(key: key).prefix(8)),
      [114, 47, 36, 153, 1, 60, 116, 140]
    )
  }

  func testInvisibleWatermarkEmbedsAndAuthenticatesPixels() throws {
    let image = makeSolidImage(
      size: CGSize(width: 256, height: 176),
      color: UIColor(red: 0.35, green: 0.48, blue: 0.62, alpha: 1)
    )
    let key = "0123456789abcdef"
    let marked = try InvisibleWatermark.embed(
      image: image,
      payload: "asset-42",
      key: key,
      strength: "balanced"
    )
    let result = try InvisibleWatermark.detect(
      image: marked,
      key: key,
      strength: "balanced",
      search: "fast"
    )

    XCTAssertTrue(result.detected, "Expected a valid detection, got confidence \(result.confidence)")
    XCTAssertEqual(result.payload, "asset-42")
    XCTAssertGreaterThan(result.confidence, 0.8)
  }

  func testInvisibleWatermarkRecoversLightImageResizing() throws {
    let image = makeSolidImage(
      size: CGSize(width: 256, height: 176),
      color: UIColor(red: 0.35, green: 0.48, blue: 0.62, alpha: 1)
    )
    let key = "0123456789abcdef"
    let marked = try InvisibleWatermark.embed(
      image: image,
      payload: "asset-42",
      key: key,
      strength: "robust"
    )

    for scale in [0.9, 0.95, 1.05, 1.1] {
      let resized = try InvisibleWatermark.resizeForTesting(image: marked, scale: scale)
      let result = try InvisibleWatermark.detect(
        image: resized,
        key: key,
        strength: "robust",
        search: "robust"
      )

      XCTAssertTrue(result.detected, "Expected scale \(scale) to be recovered")
      XCTAssertEqual(result.payload, "asset-42")
      XCTAssertEqual(result.scale ?? 0, scale, accuracy: 0.0001)
    }
  }

  func testApp() throws {
    let app = XCUIApplication()
    app.launch()
    XCTAssertTrue(app.staticTexts["Image Marker Lab"].waitForExistence(timeout: 45))
    XCTAssertTrue(app.staticTexts["Feature checks"].exists)
    XCTAssertTrue(featureButton(in: app, identifier: "feature-text-anchor-offset", label: "Anchored text offset").exists)
    XCTAssertTrue(featureButton(in: app, identifier: "feature-image-anchor-offset", label: "Anchored image offset").exists)
    XCTAssertTrue(featureButton(in: app, identifier: "feature-mixed-watermark", label: "Text + image watermark").exists)
    XCTAssertTrue(featureButton(in: app, identifier: "feature-tiled-text", label: "Tiled text + outline").exists)
    XCTAssertTrue(featureButton(in: app, identifier: "feature-tiled-logo", label: "Tiled logo grid").exists)
    XCTAssertTrue(featureButton(in: app, identifier: "feature-invisible-watermark", label: "Invisible trace").exists)
    XCTAssertTrue(featureButton(in: app, identifier: "feature-sharp-scaled-watermark", label: "Sharp scaled watermark").exists)
    XCTAssertTrue(featureButton(in: app, identifier: "feature-orientation-normalization", label: "Orientation normalization").exists)
    XCTAssertTrue(featureButton(in: app, identifier: "feature-rotation-output-policy", label: "Rotation output policy").exists)
    XCTAssertTrue(featureButton(in: app, identifier: "feature-watermark-orientation", label: "Watermark orientation").exists)
  }

  func testEditorUndoPreviewAndOriginalExportRunThroughCore() throws {
    let app = XCUIApplication()
    app.launch()

    XCTAssertTrue(app.staticTexts["Image Marker Lab"].waitForExistence(timeout: 45))
    let editorTab = app.descendants(matching: .any)["surface-editor"]
    XCTAssertTrue(editorTab.waitForExistence(timeout: 5))
    editorTab.tap()

    XCTAssertTrue(app.descendants(matching: .any)["editor-canvas"].waitForExistence(timeout: 5))
    XCTAssertTrue(app.descendants(matching: .any)["editor-layer-editor-title"].exists)
    XCTAssertTrue(app.descendants(matching: .any)["editor-layer-editor-logo"].exists)

    app.descendants(matching: .any)["editor-add-text"].tap()
    let addedLayer = app.descendants(matching: .any)["editor-layer-layer-editor-3"]
    XCTAssertTrue(addedLayer.waitForExistence(timeout: 5))
    app.descendants(matching: .any)["editor-toolbar-undo"].tap()
    XCTAssertFalse(addedLayer.waitForExistence(timeout: 1))

    app.descendants(matching: .any)["editor-preview"].tap()
    XCTAssertTrue(app.descendants(matching: .any)["editor-result-image"].waitForExistence(timeout: 30))
    let previewReady = app.descendants(matching: .any).matching(
      NSPredicate(format: "identifier == %@ AND label BEGINSWITH %@", "editor-status", "Preview ready")
    ).firstMatch
    XCTAssertTrue(previewReady.waitForExistence(timeout: 5))

    let export = app.descendants(matching: .any)["editor-export"]
    if !export.isHittable {
      app.scrollViews.firstMatch.swipeDown()
    }
    export.tap()
    let exportReady = app.descendants(matching: .any).matching(
      NSPredicate(format: "identifier == %@ AND label BEGINSWITH %@", "editor-status", "Export ready")
    ).firstMatch
    XCTAssertTrue(exportReady.waitForExistence(timeout: 30))
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

  func testTiledTextFeatureProducesPreview() throws {
    let app = XCUIApplication()
    app.launch()

    XCTAssertTrue(app.staticTexts["Image Marker Lab"].waitForExistence(timeout: 45))
    let featureCard = featureButton(in: app, identifier: "feature-tiled-text", label: "Tiled text + outline")
    XCTAssertTrue(featureCard.exists)
    featureCard.tap()

    XCTAssertTrue(app.staticTexts["Tiled text + outline"].waitForExistence(timeout: 5))
    XCTAssertTrue(app.otherElements["result-preview-ready"].waitForExistence(timeout: 15))
  }

  func testInvisibleWatermarkFeatureEmbedsAndDetects() throws {
    let app = XCUIApplication()
    app.launch()

    XCTAssertTrue(app.staticTexts["Image Marker Lab"].waitForExistence(timeout: 45))
    let featureCard = featureButton(
      in: app,
      identifier: "feature-invisible-watermark",
      label: "Invisible trace"
    )
    XCTAssertTrue(featureCard.exists)
    featureCard.tap()

    XCTAssertTrue(app.otherElements["result-preview-ready"].waitForExistence(timeout: 30))
    let verified = app.staticTexts.matching(
      NSPredicate(format: "label BEGINSWITH %@", "Invisible batch verified · 2 outputs")
    ).firstMatch
    XCTAssertTrue(verified.waitForExistence(timeout: 10))
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

  func testTileLayoutResolvesOffsetsStaggerAndCopyLimit() throws {
    let layout = try ImageMarkerWatermarkLayout(dicOpts: [
      "type": "tile",
      "gapX": 20,
      "gapY": 10,
      "offsetX": "10%",
      "offsetY": -5,
      "stagger": true,
    ])

    let placements = try layout.placements(
      canvasSize: CGSize(width: 100, height: 60),
      itemSize: CGSize(width: 20, height: 10)
    )
    XCTAssertEqual(placements[0].x, -10, accuracy: 0.001)
    XCTAssertEqual(placements[0].y, -5, accuracy: 0.001)
    XCTAssertEqual(placements[1].x, 30, accuracy: 0.001)
    let secondRow = placements.filter { $0.y == 15 }
    XCTAssertEqual(secondRow[0].x, 10, accuracy: 0.001)
    XCTAssertEqual(secondRow[1].x, 50, accuracy: 0.001)

    let dense = try ImageMarkerWatermarkLayout(dicOpts: ["type": "tile"])
    XCTAssertThrowsError(
      try dense.placements(
        canvasSize: CGSize(width: 100, height: 100),
        itemSize: CGSize(width: 1, height: 1)
      )
    ) { error in
      XCTAssertEqual(
        error.localizedDescription,
        "tile layout exceeds the maximum of 4096 copies per layer"
      )
    }
  }

  func testTiledImageRepeatsAcrossCanvas() throws {
    let background = makeSolidImage(size: CGSize(width: 12, height: 8), color: .red)
    let marker = makeSolidImage(size: CGSize(width: 2, height: 2), color: .blue)
    let layout = try ImageMarkerWatermarkLayout(dicOpts: [
      "type": "tile",
      "gapX": 2,
      "gapY": 2,
    ])

    let rendered = try XCTUnwrap(
      try ImageMarkerRenderer.renderImageWatermarks(
        background: background,
        watermarks: [
          ImageMarkerImageWatermark(
            image: marker,
            position: .none,
            offsetX: nil,
            offsetY: nil,
            scale: 1,
            rotate: 0,
            alpha: 1,
            layout: layout
          )
        ],
        backgroundScale: 1,
        backgroundRotate: 0,
        backgroundAlpha: 1
      )
    )

    XCTAssertEqual(
      bluePixelCount(in: rendered, xRange: 0..<12, yRange: 0..<8),
      24
    )
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
      try ImageMarkerRenderer.renderImageWatermarks(
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
      try ImageMarkerRenderer.renderImageWatermarks(
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
      try ImageMarkerRenderer.renderImageWatermarks(
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

  func testMaxSizeDefaultsValidatesAndBuildsBoundedLoadRequests() throws {
    let background: [AnyHashable: Any] = [
      "src": ["uri": "file:///tmp/background.png"],
    ]
    XCTAssertEqual(try Options(dicOpts: ["backgroundImage": background]).maxSize, 2048)
    XCTAssertEqual(
      try Options(dicOpts: ["backgroundImage": background, "maxSize": 1024]).maxSize,
      1024
    )
    for maxSize: Any in [0, -1, 10.5, Double.nan, Double.infinity, true, "1024"] {
      assertInvalidParams {
        _ = try Options(dicOpts: ["backgroundImage": background, "maxSize": maxSize])
      }
    }

    let small = Utils.imageLoadRequest(
      for: RNImageSRC(dicOpts: ["width": CGFloat(100), "height": CGFloat(50), "scale": CGFloat(2)]),
      maxSize: 512
    )
    XCTAssertEqual(small.size, CGSize(width: 100, height: 50))
    XCTAssertEqual(small.scale, 2, accuracy: 0.001)
    XCTAssertEqual(small.resizeMode, .cover)

    let large = Utils.imageLoadRequest(
      for: RNImageSRC(dicOpts: ["width": CGFloat(2000), "height": CGFloat(1000), "scale": CGFloat(2)]),
      maxSize: 1000
    )
    XCTAssertEqual(large.size, CGSize(width: 1000, height: 500))
    XCTAssertEqual(large.scale, 1, accuracy: 0.001)
    XCTAssertEqual(large.resizeMode, .contain)

    let unknown = Utils.imageLoadRequest(
      for: RNImageSRC(dicOpts: ["uri": "https://example.com/image.jpg"]),
      maxSize: 768
    )
    XCTAssertEqual(unknown.size, CGSize(width: 768, height: 768))
    XCTAssertEqual(unknown.scale, 1, accuracy: 0.001)
    XCTAssertEqual(unknown.resizeMode, .contain)
  }

  func testSharedCppCoreFitsPixelBounds() {
    let landscape = IMImageMarkerFitWithinMax(4000, 2000, 1000)
    XCTAssertEqual(landscape.width, 1000)
    XCTAssertEqual(landscape.height, 500)

    let narrow = IMImageMarkerFitWithinMax(1000, 1, 10)
    XCTAssertEqual(narrow.width, 10)
    XCTAssertEqual(narrow.height, 1)
  }

  func testLargeImageDownsamplePerformanceAndMemory() throws {
    let source = makeSolidImage(
      size: CGSize(width: 1600, height: 1200),
      color: .green
    )
    let data = try XCTUnwrap(source.pngData())

    measure(metrics: [XCTClockMetric(), XCTMemoryMetric()]) {
      for _ in 0..<12 {
        autoreleasepool {
          let image = Utils.downsampleImageData(data, maxSize: 400)
          XCTAssertEqual(image?.cgImage?.width, 400)
          XCTAssertEqual(image?.cgImage?.height, 300)
        }
      }
    }
  }

  func testImageIODownsamplesDataAndBase64BeforeRendering() throws {
    let source = makeSolidImage(size: CGSize(width: 400, height: 200), color: .blue)
    let data = try XCTUnwrap(source.pngData())

    let downsampled = try XCTUnwrap(Utils.downsampleImageData(data, maxSize: 100))
    XCTAssertEqual(downsampled.imageOrientation, .up)
    XCTAssertEqual(downsampled.scale, 1, accuracy: 0.001)
    XCTAssertEqual(downsampled.cgImage?.width, 100)
    XCTAssertEqual(downsampled.cgImage?.height, 50)

    let dataURI = "data:image/png;base64,\(data.base64EncodedString())"
    let base64Image = try XCTUnwrap(Utils.downsampleBase64Image(dataURI, maxSize: 80))
    XCTAssertEqual(base64Image.cgImage?.width, 80)
    XCTAssertEqual(base64Image.cgImage?.height, 40)
    XCTAssertNil(Utils.downsampleBase64Image("data:image/png,not-base64", maxSize: 80))
  }

  func testRejectsInvalidQualityAlphaAndUnsafeFilenames() throws {
    let background: [AnyHashable: Any] = [
      "src": ["uri": "file:///tmp/background.png"],
    ]

    for quality in [0, 100] {
      XCTAssertEqual(
        try Options(dicOpts: ["backgroundImage": background, "quality": quality]).quality,
        quality
      )
    }
    for quality: Any in [-1, 101, 50.5, Double.nan, Double.infinity, true, "80"] {
      assertInvalidParams {
        _ = try Options(dicOpts: ["backgroundImage": background, "quality": quality])
      }
    }

    for alpha in [0.0, 1.0] {
      XCTAssertEqual(
        try ImageOptions(dicOpts: ["src": ["uri": "file:///tmp/image.png"], "alpha": alpha]).alpha,
        alpha,
        accuracy: 0.001
      )
    }
    for alpha: Any in [-0.01, 1.01, Double.nan, Double.infinity, true, "0.5"] {
      assertInvalidParams {
        _ = try ImageOptions(dicOpts: ["src": ["uri": "file:///tmp/image.png"], "alpha": alpha])
      }
    }

    XCTAssertEqual(try Utils.resolvedAlpha(0.35, fieldName: "text"), 0.35, accuracy: 0.001)
    XCTAssertEqual(try Utils.resolvedAlpha(nil, fieldName: "text"), 1, accuracy: 0.001)
    for alpha: Any in [-0.01, 1.01, Double.nan, Double.infinity, true, "0.5"] {
      assertInvalidParams {
        _ = try Utils.resolvedAlpha(alpha, fieldName: "text")
      }
    }

    for filename in [".", "..", ".png", ".jpg", ".jpeg", "../escape", "nested/file", "nested\\file", "bad\nname"] {
      assertInvalidParams {
        _ = try Options(dicOpts: ["backgroundImage": background, "filename": filename])
      }
    }
    XCTAssertNoThrow(try Options(dicOpts: ["backgroundImage": background, "filename": "safe-name.png"]))
    XCTAssertNoThrow(try Options(dicOpts: ["backgroundImage": background, "filename": "  "]))
  }

  func testParsesShadowHexColorAndRejectsInvalidValues() throws {
    assertColor(Utils.resolvedTextColor(nil), red: 0, green: 0, blue: 0, alpha: 1)
    assertColor(Utils.resolvedTextColor("#123"), red: 1.0 / 15.0, green: 2.0 / 15.0, blue: 3.0 / 15.0, alpha: 1)

    let shadow = try XCTUnwrap(
      Utils.getShadowStyle([
        "radius": 0,
        "dx": 8,
        "dy": 0,
        "color": "#0000FF",
      ])
    )
    let shadowColor = try XCTUnwrap(shadow.shadowColor as? UIColor)
    assertColor(shadowColor, red: 0, green: 0, blue: 1, alpha: 1)

    let shortShadow = try XCTUnwrap(
      Utils.getShadowStyle([
        "radius": 0,
        "dx": 0,
        "dy": 0,
        "color": "#F08C",
      ])
    )
    let shortColor = try XCTUnwrap(shortShadow.shadowColor as? UIColor)
    assertColor(shortColor, red: 1, green: 0, blue: 8.0 / 15.0, alpha: 12.0 / 15.0)

    assertInvalidParams {
      _ = try Utils.getShadowStyle(["radius": 0, "dx": 0, "dy": 0, "color": "#GGGGGG"])
    }
    assertInvalidParams {
      _ = try Utils.getShadowStyle(["radius": 0, "dx": 0, "dy": 0])
    }

    let renderedImage = makeShadowedTextImage(shadow: shadow)
    let bytes = try XCTUnwrap(rgbaBytes(for: renderedImage))
    let bluePixels = stride(from: 0, to: bytes.count, by: 4).filter { index in
      bytes[index + 2] > 140 && bytes[index] < 100 && bytes[index + 1] < 100
    }
    XCTAssertGreaterThan(bluePixels.count, 0)
  }

  func testBackgroundScaleChangesCanvasWithoutImplicitlyScalingLayers() throws {
    let backgroundImage = makeSolidImage(size: CGSize(width: 40, height: 24), color: .red)
    let watermarkImage = makeSolidImage(size: CGSize(width: 4, height: 3), color: .blue)
    let background: [AnyHashable: Any] = [
      "src": ["uri": "file:///tmp/background.png"],
    ]

    for scenario in [
      (scale: CGFloat(0.5), size: CGSize(width: 20, height: 12)),
      (scale: CGFloat(2), size: CGSize(width: 80, height: 48)),
      (scale: CGFloat(1.1), size: CGSize(width: 44, height: 26)),
      (scale: CGFloat(0.3), size: CGSize(width: 12, height: 7)),
    ] {
      let options = try Options(dicOpts: [
        "backgroundImage": background.merging(["scale": scenario.scale]) { _, new in new },
      ])
      let renderedImage = try XCTUnwrap(
        try ImageMarkerRenderer.renderImageWatermarks(
          background: backgroundImage,
          watermarks: [
            ImageMarkerImageWatermark(
              image: watermarkImage,
              position: .none,
              offsetX: "2",
              offsetY: "3",
              scale: 1,
              rotate: 0,
              alpha: 1
            ),
          ],
          backgroundScale: options.backgroundImage.scale,
          backgroundRotate: 0,
          backgroundAlpha: 1
        )
      )

      XCTAssertEqual(renderedImage.scale, 1, accuracy: 0.001)
      XCTAssertEqual(renderedImage.size.width, scenario.size.width, accuracy: 0.001)
      XCTAssertEqual(renderedImage.size.height, scenario.size.height, accuracy: 0.001)
      let watermarkBounds = try XCTUnwrap(bluePixelBounds(in: renderedImage))
      XCTAssertEqual(watermarkBounds.minX, 2, accuracy: 0.001)
      XCTAssertEqual(watermarkBounds.minY, 3, accuracy: 0.001)
      XCTAssertEqual(watermarkBounds.width, 4, accuracy: 0.001)
      XCTAssertEqual(watermarkBounds.height, 3, accuracy: 0.001)
    }

    XCTAssertEqual(
      ImageMarkerRenderer.scaledCanvasSize(CGSize(width: 4, height: 3), backgroundScale: 1.1),
      CGSize(width: 4, height: 3)
    )
    XCTAssertEqual(
      ImageMarkerRenderer.scaledCanvasSize(CGSize(width: 4, height: 3), backgroundScale: 0.3),
      CGSize(width: 1, height: 1)
    )

    for backingScale in [CGFloat(2), CGFloat(3)] {
      let backingSize = CGSize(width: 4 * backingScale, height: 3 * backingScale)
      let backingImage = makeSolidImage(size: backingSize, color: .red)
      let retinaImage = try XCTUnwrap(
        UIImage(cgImage: try XCTUnwrap(backingImage.cgImage), scale: backingScale, orientation: .up)
      )
      XCTAssertEqual(retinaImage.size, CGSize(width: 4, height: 3))
      let watermarkBackingImage = makeSolidImage(
        size: CGSize(width: 2 * backingScale, height: 2 * backingScale),
        color: .blue
      )
      let retinaWatermark = try XCTUnwrap(
        UIImage(
          cgImage: try XCTUnwrap(watermarkBackingImage.cgImage),
          scale: backingScale,
          orientation: .up
        )
      )
      XCTAssertEqual(retinaWatermark.size, CGSize(width: 2, height: 2))

      let renderedImage = try XCTUnwrap(
        try ImageMarkerRenderer.renderImageWatermarks(
          background: retinaImage,
          watermarks: [
            ImageMarkerImageWatermark(
              image: retinaWatermark,
              position: .none,
              offsetX: "1",
              offsetY: "1",
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
      XCTAssertEqual(renderedImage.size, CGSize(width: 4, height: 3))
      let watermarkBounds = try XCTUnwrap(bluePixelBounds(in: renderedImage))
      XCTAssertEqual(watermarkBounds, CGRect(x: 1, y: 1, width: 2, height: 2))
    }
  }

  func testBackgroundScaleDoesNotImplicitlyScaleText() throws {
    let background = makeSolidImage(size: CGSize(width: 60, height: 40), color: .red)
    var textBounds: [CGRect] = []

    for scale in [CGFloat(0.5), CGFloat(2)] {
      let renderedImage = try XCTUnwrap(
        ImageMarkerRenderer.renderCanvas(
          background: background,
          backgroundScale: scale,
          backgroundRotate: 0,
          backgroundAlpha: 1,
          rotationCanvasMode: .expand
        ) { _, _ in
          let text = NSAttributedString(
            string: "M",
            attributes: [
              .font: UIFont.systemFont(ofSize: 12),
              .foregroundColor: UIColor.blue,
            ]
          )
          text.draw(at: CGPoint(x: 3, y: 4))
        }
      )
      textBounds.append(try XCTUnwrap(bluePixelBounds(in: renderedImage)))
    }

    XCTAssertEqual(textBounds[0].minX, textBounds[1].minX, accuracy: 0.001)
    XCTAssertEqual(textBounds[0].minY, textBounds[1].minY, accuracy: 0.001)
    XCTAssertEqual(textBounds[0].width, textBounds[1].width, accuracy: 0.001)
    XCTAssertEqual(textBounds[0].height, textBounds[1].height, accuracy: 0.001)
  }

  func testSequentialAsyncMapBoundsConcurrencyAndPreservesOrder() async throws {
    let probe = SequentialLoadProbe()
    let output = try await Utils.sequentialAsyncMap([0, 1, 2, 3]) { value in
      await probe.begin(value)
      try await Task.sleep(nanoseconds: 5_000_000)
      await probe.end()
      return value * 10
    }
    let snapshot = await probe.snapshot()

    XCTAssertEqual(output, [0, 10, 20, 30])
    XCTAssertEqual(snapshot.maximumActive, 1)
    XCTAssertEqual(snapshot.started, [0, 1, 2, 3])
  }

  func testAsyncLimiterBoundsConcurrencyAndSkipsCancelledWaiter() async throws {
    let limiter = ImageMarkerAsyncLimiter(limit: 1)
    let probe = AsyncLimiterProbe()

    await withTaskGroup(of: Void.self) { group in
      for value in 0..<4 {
        group.addTask {
          try? await limiter.withPermit {
            await probe.begin(value)
            try await Task.sleep(nanoseconds: 5_000_000)
            await probe.end()
          }
        }
      }
    }
    let boundedSnapshot = await probe.snapshot()
    XCTAssertEqual(boundedSnapshot.maximumActive, 1)
    XCTAssertEqual(Set(boundedSnapshot.entries), Set(0..<4))

    let cancellationLimiter = ImageMarkerAsyncLimiter(limit: 1)
    let cancellationProbe = AsyncLimiterProbe()
    let gate = AsyncTestGate()
    let firstStarted = expectation(description: "first limiter operation started")
    let first = Task {
      try await cancellationLimiter.withPermit {
        await cancellationProbe.begin(1)
        firstStarted.fulfill()
        await gate.wait()
        await cancellationProbe.end()
      }
    }
    await fulfillment(of: [firstStarted], timeout: 2)

    let cancelledWaiter = Task {
      try await cancellationLimiter.withPermit {
        await cancellationProbe.begin(2)
        await cancellationProbe.end()
      }
    }
    for _ in 0..<1_000 {
      if await cancellationLimiter.waitingCount == 1 {
        break
      }
      await Task.yield()
    }
    let queuedWaiters = await cancellationLimiter.waitingCount
    XCTAssertEqual(queuedWaiters, 1)
    cancelledWaiter.cancel()
    do {
      try await cancelledWaiter.value
      XCTFail("Expected a cancelled limiter waiter")
    } catch is CancellationError {
      // Expected.
    }
    await gate.open()
    try await first.value

    let cancelledSnapshot = await cancellationProbe.snapshot()
    XCTAssertEqual(cancelledSnapshot.maximumActive, 1)
    XCTAssertEqual(cancelledSnapshot.entries, [1])
  }

  func testCancellableContinuationHandlesCancellationCompletionRace() async throws {
    let probe = CancellationBridgeProbe()
    let startEntered = expectation(description: "request start entered")
    let allowStartToReturn = DispatchSemaphore(value: 0)
    let task = Task {
      try await ImageMarkerCancellableContinuation.run { completion in
        probe.install(completion)
        startEntered.fulfill()
        allowStartToReturn.wait()
        return {
          probe.recordCancellation()
          completion(.success(99))
        }
      }
    }

    await fulfillment(of: [startEntered], timeout: 2)
    task.cancel()
    allowStartToReturn.signal()
    do {
      _ = try await task.value
      XCTFail("Expected request cancellation")
    } catch is CancellationError {
      // Expected.
    }
    probe.complete(.success(42))
    XCTAssertEqual(probe.cancellationCalls(), 1)

    let completedValue = try await ImageMarkerCancellableContinuation.run { completion in
      completion(.success(7))
      return {
        probe.recordCancellation()
      }
    }
    XCTAssertEqual(completedValue, 7)
    XCTAssertEqual(probe.cancellationCalls(), 1)
  }

  func testRenderAndReleaseSourcesDropsInputsBeforeEncodingPhase() {
    weak var firstSource: SourceLifetimeToken?
    weak var secondSource: SourceLifetimeToken?
    var sources: [SourceLifetimeToken] = []
    autoreleasepool {
      let first = SourceLifetimeToken()
      let second = SourceLifetimeToken()
      firstSource = first
      secondSource = second
      sources = [first, second]
    }

    let renderedCount = Utils.renderAndReleaseSources(&sources) { currentSources in
      XCTAssertNotNil(firstSource)
      XCTAssertNotNil(secondSource)
      return currentSources.count
    }

    XCTAssertEqual(renderedCount, 2)
    XCTAssertTrue(sources.isEmpty)
    XCTAssertNil(firstSource)
    XCTAssertNil(secondSource)
  }

  func testAnchorsRotatedWatermarkByVisibleBounds() throws {
    let background = makeSolidImage(size: CGSize(width: 40, height: 40), color: .red)
    let watermark = makeSolidImage(size: CGSize(width: 6, height: 14), color: .blue)

    for rotation in [CGFloat(45), CGFloat(90)] {
      let renderedImage = try XCTUnwrap(
        try ImageMarkerRenderer.renderImageWatermarks(
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
      try ImageMarkerRenderer.renderImageWatermarks(
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
      try ImageMarkerRenderer.renderImageWatermarks(
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
      try ImageMarkerRenderer.renderImageWatermarks(
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
        try ImageMarkerRenderer.renderImageWatermarks(
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

  private func makeShadowedTextImage(shadow: NSShadow) -> UIImage {
    let format = UIGraphicsImageRendererFormat.default()
    format.scale = 1
    format.opaque = false
    return UIGraphicsImageRenderer(size: CGSize(width: 64, height: 36), format: format).image { _ in
      let text = NSAttributedString(
        string: "MM",
        attributes: [
          .font: UIFont.boldSystemFont(ofSize: 24),
          .foregroundColor: UIColor.red,
          .shadow: shadow,
        ]
      )
      text.draw(at: CGPoint(x: 1, y: 1))
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

  private func assertColor(
    _ color: UIColor,
    red expectedRed: CGFloat,
    green expectedGreen: CGFloat,
    blue expectedBlue: CGFloat,
    alpha expectedAlpha: CGFloat,
    file: StaticString = #filePath,
    line: UInt = #line
  ) {
    var red: CGFloat = 0
    var green: CGFloat = 0
    var blue: CGFloat = 0
    var alpha: CGFloat = 0
    XCTAssertTrue(
      color.getRed(&red, green: &green, blue: &blue, alpha: &alpha),
      file: file,
      line: line
    )
    XCTAssertEqual(red, expectedRed, accuracy: 0.001, file: file, line: line)
    XCTAssertEqual(green, expectedGreen, accuracy: 0.001, file: file, line: line)
    XCTAssertEqual(blue, expectedBlue, accuracy: 0.001, file: file, line: line)
    XCTAssertEqual(alpha, expectedAlpha, accuracy: 0.001, file: file, line: line)
  }

  private func assertInvalidParams(
    _ expression: () throws -> Void,
    file: StaticString = #filePath,
    line: UInt = #line
  ) {
    XCTAssertThrowsError(try expression(), file: file, line: line) { error in
      XCTAssertEqual(
        (error as NSError).domain,
        ErrorDomainEnum.PARAMS_INVALID.rawValue,
        file: file,
        line: line
      )
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
