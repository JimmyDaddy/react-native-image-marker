import UIKit

final class ImageMarkerTextLayout {
    private let textStorage: NSTextStorage
    private let layoutManager: NSLayoutManager
    private let textContainer: NSTextContainer
    let size: CGSize

    init(
        text: NSAttributedString,
        maxWidth: CGFloat,
        style: TextStyle
    ) {
        self.textStorage = NSTextStorage(attributedString: text)
        self.layoutManager = NSLayoutManager()
        self.textContainer = NSTextContainer(
            size: CGSize(width: maxWidth, height: .greatestFiniteMagnitude)
        )
        textContainer.lineFragmentPadding = 0
        textContainer.maximumNumberOfLines = style.maxLines ?? 0
        switch style.wrap {
        case "character":
            textContainer.lineBreakMode = style.overflow == "ellipsis" && style.maxLines != nil
                ? .byTruncatingTail
                : .byCharWrapping
        case "none":
            textContainer.maximumNumberOfLines = style.maxLines ?? text.string
                .components(separatedBy: .newlines)
                .count
            textContainer.lineBreakMode = style.overflow == "ellipsis"
                ? .byTruncatingTail
                : .byClipping
        default:
            textContainer.lineBreakMode = style.overflow == "ellipsis" && style.maxLines != nil
                ? .byTruncatingTail
                : .byWordWrapping
        }
        layoutManager.addTextContainer(textContainer)
        textStorage.addLayoutManager(layoutManager)
        layoutManager.ensureLayout(for: textContainer)
        let used = layoutManager.usedRect(for: textContainer)
        self.size = CGSize(
            width: min(max(ceil(used.width), 1), maxWidth),
            height: max(ceil(used.height), 1)
        )
    }

    func draw(at origin: CGPoint) {
        let glyphRange = layoutManager.glyphRange(for: textContainer)
        layoutManager.drawBackground(
            forGlyphRange: glyphRange,
            at: origin
        )
        layoutManager.drawGlyphs(
            forGlyphRange: glyphRange,
            at: origin
        )
    }
}
