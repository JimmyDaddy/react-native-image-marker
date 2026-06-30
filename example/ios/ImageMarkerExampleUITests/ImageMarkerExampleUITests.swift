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
    XCTAssertTrue(app.buttons["feature-text-anchor-offset"].exists)
    XCTAssertTrue(app.buttons["feature-image-anchor-offset"].exists)
    XCTAssertTrue(app.buttons["feature-orientation-normalization"].exists)
  }

  func testTextAnchorOffsetFeatureProducesPreview() throws {
    let app = XCUIApplication()
    app.launch()

    XCTAssertTrue(app.staticTexts["Image Marker Lab"].waitForExistence(timeout: 45))
    let featureCard = app.buttons["feature-text-anchor-offset"]
    XCTAssertTrue(featureCard.waitForExistence(timeout: 15))
    featureCard.tap()

    XCTAssertTrue(app.staticTexts["Text anchor offset"].waitForExistence(timeout: 5))
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

  private func makeTestImage(size: CGSize) -> UIImage {
    let renderer = UIGraphicsImageRenderer(size: size)
    return renderer.image { context in
      UIColor.red.setFill()
      context.fill(CGRect(x: 0, y: 0, width: size.width / 2, height: size.height))
      UIColor.blue.setFill()
      context.fill(CGRect(x: size.width / 2, y: 0, width: size.width / 2, height: size.height))
    }
  }
}
