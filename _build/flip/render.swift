// Renders every page of a PDF to JPEG for the flipbook viewer.  usage: render <pdf> <outdir> <height> <quality 0-1>
import PDFKit
import AppKit
let a = CommandLine.arguments
let d = PDFDocument(url: URL(fileURLWithPath: a[1]))!
let out = a[2], H = CGFloat(Double(a[3])!), q = Double(a[4])!
try? FileManager.default.createDirectory(atPath: out, withIntermediateDirectories: true)
var sizes: [[Int]] = []
for i in 0..<d.pageCount {
    let p = d.page(at: i)!
    let b = p.bounds(for: .mediaBox)
    let w = (b.width / b.height * H).rounded()
    let img = p.thumbnail(of: NSSize(width: w, height: H), for: .mediaBox)
    let rep = NSBitmapImageRep(data: img.tiffRepresentation!)!
    let data = rep.representation(using: .jpeg, properties: [.compressionFactor: q])!
    try! data.write(to: URL(fileURLWithPath: String(format: "%@/p%03d.jpg", out, i + 1)))
    sizes.append([Int(w), Int(H)])
}
let json = try! JSONSerialization.data(withJSONObject: ["count": d.pageCount, "sizes": sizes], options: [])
try! json.write(to: URL(fileURLWithPath: out + "/manifest.json"))
print("rendered \(d.pageCount) pages")
