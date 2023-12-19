//
//  ImageMarkerExampleUITests.swift
//  ImageMarkerExampleUITests
//
//  Created by Jimmydaddy on 2023/11/28.
//

import XCTest

@MainActor
final class ImageMarkerExampleUITests: XCTestCase {
  override func setUpWithError() throws {
    super.setUp()
    // Put setup code here. This method is called before the invocation of each test method in the class.
    
    // In UI tests it is usually best to stop immediately when a failure occurs.
    continueAfterFailure = false
    
    // In UI tests it’s important to set the initial state - such as interface orientation - required for your tests before they run. The setUp method is a good place to do this.
  }
  
  override func tearDownWithError() throws {
    super.tearDown()
    // Put teardown code here. This method is called after the invocation of each test method in the class.
  }
  
  func testAppDisplay() throws {
    // UI tests must launch the application that they test.
    let app = XCUIApplication()
    app.launch()
    sleep(5)

    var ele = app.textFields["100"]
    XCTAssert(ele.exists)
    ele = app.staticTexts["watermark type"]
    XCTAssert(ele.exists)
    ele = app.staticTexts["bg format:"]
    XCTAssert(ele.exists)
    var predicate = NSPredicate(format: "label BEGINSWITH %@", "file path:")
    ele = app.staticTexts.element(matching: predicate)
    XCTAssert(ele.exists, "File path label does not exist.")
    predicate = NSPredicate(format: "label MATCHES %@", "result file size:[0-9]+\\.?[0-9]*\\s(MB|KB)")
    ele = app.staticTexts.element(matching: predicate)
    XCTAssert(ele.exists, "result file size label does not exist.")
    let button = app.otherElements["watermarkTypeBtn"]
    XCTAssert(button.exists, "WatermarkTypeBtn button does not exist.")

  }

  func testLaunchPerformance() throws {
    if #available(macOS 10.15, iOS 13.0, tvOS 13.0, watchOS 7.0, *) {
      // This measures how long it takes to launch your application.
      measure(metrics: [XCTApplicationLaunchMetric()]) {
        XCUIApplication().launch()
      }
    }
  }
}
