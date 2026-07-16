import AppKit
import Foundation
import PDFKit

let args = CommandLine.arguments
guard args.count >= 3 else {
    fputs("Usage: render-pdf-pages.swift <input.pdf> <output-dir> [target-width] [max-pages]\n", stderr)
    exit(64)
}

let inputURL = URL(fileURLWithPath: args[1])
let outputURL = URL(fileURLWithPath: args[2], isDirectory: true)
let targetWidth = Int(args.count >= 4 ? args[3] : "1000") ?? 1000
let maxPagesArg = Int(args.count >= 5 ? args[4] : "0") ?? 0

guard let document = PDFDocument(url: inputURL) else {
    fputs("Cannot open PDF: \(inputURL.path)\n", stderr)
    exit(65)
}

try FileManager.default.createDirectory(at: outputURL, withIntermediateDirectories: true)

let totalPages = document.pageCount
let renderCount = maxPagesArg > 0 ? min(totalPages, maxPagesArg) : totalPages
var renderedPaths: [String] = []

for pageIndex in 0..<renderCount {
    guard let page = document.page(at: pageIndex) else { continue }
    let bounds = page.bounds(for: .mediaBox)
    guard bounds.width > 0, bounds.height > 0 else { continue }

    let scale = CGFloat(targetWidth) / bounds.width
    let targetHeight = max(1, Int((bounds.height * scale).rounded()))

    guard let bitmap = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: targetWidth,
        pixelsHigh: targetHeight,
        bitsPerSample: 8,
        samplesPerPixel: 4,
        hasAlpha: true,
        isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: 0,
        bitsPerPixel: 0
    ) else {
        fputs("Cannot allocate bitmap for PDF page \(pageIndex + 1)\n", stderr)
        exit(66)
    }

    bitmap.size = NSSize(width: targetWidth, height: targetHeight)
    guard let nsContext = NSGraphicsContext(bitmapImageRep: bitmap) else {
        fputs("Cannot create graphics context for PDF page \(pageIndex + 1)\n", stderr)
        exit(66)
    }

    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = nsContext
    NSColor.white.setFill()
    NSBezierPath(rect: NSRect(x: 0, y: 0, width: targetWidth, height: targetHeight)).fill()
    let thumbnail = page.thumbnail(
        of: NSSize(width: targetWidth, height: targetHeight),
        for: .mediaBox
    )
    thumbnail.draw(
        in: NSRect(x: 0, y: 0, width: targetWidth, height: targetHeight),
        from: NSRect(origin: .zero, size: thumbnail.size),
        operation: .sourceOver,
        fraction: 1.0
    )
    NSGraphicsContext.restoreGraphicsState()

    guard let imageData = bitmap.representation(using: .jpeg, properties: [.compressionFactor: 0.72]) else {
        fputs("Cannot render PDF page \(pageIndex + 1)\n", stderr)
        exit(66)
    }

    let filename = String(format: "page-%03d.jpg", pageIndex + 1)
    let pageURL = outputURL.appendingPathComponent(filename)
    try imageData.write(to: pageURL)
    renderedPaths.append("\(pageURL.path)\t\(targetWidth)\t\(targetHeight)")
}

print(renderedPaths.joined(separator: "\n"))
