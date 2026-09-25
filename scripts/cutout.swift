// Subject cutout using Apple Vision (macOS 14+).
// Usage: swift scripts/cutout.swift <input.jpg> <output.png>
// Produces a straight-alpha PNG of the foreground person at source resolution.
import Foundation
import Vision
import CoreImage
import CoreImage.CIFilterBuiltins
import ImageIO
import UniformTypeIdentifiers

let args = CommandLine.arguments
guard args.count == 3 else {
  FileHandle.standardError.write("usage: cutout <input> <output.png>\n".data(using: .utf8)!)
  exit(2)
}

let inputURL = URL(fileURLWithPath: args[1])
let outputURL = URL(fileURLWithPath: args[2])

guard let source = CIImage(contentsOf: inputURL, options: [.applyOrientationProperty: true]) else {
  FileHandle.standardError.write("cannot read input\n".data(using: .utf8)!)
  exit(1)
}

let request = VNGenerateForegroundInstanceMaskRequest()
let handler = VNImageRequestHandler(ciImage: source, options: [:])
try handler.perform([request])

guard let result = request.results?.first else {
  FileHandle.standardError.write("no foreground found\n".data(using: .utf8)!)
  exit(1)
}

let maskBuffer = try result.generateScaledMaskForImage(forInstances: result.allInstances, from: handler)
let mask = CIImage(cvPixelBuffer: maskBuffer)

let blend = CIFilter.blendWithMask()
blend.inputImage = source
blend.backgroundImage = CIImage.empty()
blend.maskImage = mask

guard let output = blend.outputImage else { exit(1) }

let context = CIContext()
let colorSpace = CGColorSpace(name: CGColorSpace.sRGB)!
try context.writePNGRepresentation(of: output, to: outputURL, format: .RGBA8, colorSpace: colorSpace)
print("wrote \(outputURL.path) \(Int(output.extent.width))x\(Int(output.extent.height))")
