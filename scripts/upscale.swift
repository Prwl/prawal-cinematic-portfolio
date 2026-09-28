// Upscales the living portrait's frames with Apple's on-device super
// resolution (VideoToolbox VTSuperResolutionScaler, macOS 26+), then scales
// the 4x result down to the plate size with Lanczos. Called by
// scripts/prepare-video.mjs; not meant to be run by hand.
//   swift scripts/upscale.swift <inDir> <outDir> <outWidth> <segmentStarts>
// Frames are PNGs named 0001.png... in clip order. The scaler runs in video
// mode, feeding each frame its predecessor so detail stays consistent from
// frame to frame (neighbouring frames are cross-faded on the page, so
// per-frame shimmer would show). A segment start (comma-separated, 0-based)
// begins a new take and gets no predecessor.
import CoreImage
import Foundation
import ImageIO
import UniformTypeIdentifiers
import VideoToolbox

let args = CommandLine.arguments
guard args.count == 5, let outWidth = Int(args[3]) else {
  fatalError("usage: upscale.swift <inDir> <outDir> <outWidth> <segmentStarts>")
}
let inDir = URL(fileURLWithPath: args[1])
let outDir = URL(fileURLWithPath: args[2])
let starts = Set(args[4].split(separator: ",").compactMap { Int($0) })
let files = try FileManager.default.contentsOfDirectory(atPath: inDir.path).filter { $0.hasSuffix(".png") }.sorted()
guard let first = CIImage(contentsOf: inDir.appendingPathComponent(files[0])) else { fatalError("unreadable input") }
let width = Int(first.extent.width), height = Int(first.extent.height)

guard VTSuperResolutionScalerConfiguration.isSupported,
  let config = VTSuperResolutionScalerConfiguration(
    frameWidth: width, frameHeight: height, scaleFactor: 4, inputType: .video, usePrecomputedFlow: false,
    qualityPrioritization: .normal, revision: VTSuperResolutionScalerConfiguration.defaultRevision)
else { fatalError("super resolution unsupported on this Mac") }

// The model ships separately from the OS; fetch it once if missing.
if config.configurationModelStatus != .ready {
  let done = DispatchSemaphore(value: 0)
  config.downloadConfigurationModel { _ in done.signal() }
  done.wait()
  while config.configurationModelStatus != .ready { Thread.sleep(forTimeInterval: 0.5) }
}

let processor = VTFrameProcessor()
try processor.startSession(configuration: config)
defer { processor.endSession() }

let srgb = CGColorSpace(name: CGColorSpace.sRGB)!
let ctx = CIContext(options: [.workingColorSpace: srgb, .outputColorSpace: srgb])

func buffer(_ attrs: [String: Any]) -> CVPixelBuffer {
  var pb: CVPixelBuffer?
  let w = attrs[kCVPixelBufferWidthKey as String] as! Int
  let h = attrs[kCVPixelBufferHeightKey as String] as! Int
  let format = (attrs[kCVPixelBufferPixelFormatTypeKey as String] as! [NSNumber])[0].uint32Value
  var a = attrs
  a[kCVPixelBufferPixelFormatTypeKey as String] = format
  CVPixelBufferCreate(nil, w, h, format, a as CFDictionary, &pb)
  return pb!
}

var prevSource: VTFrameProcessorFrame?
var prevOutput: VTFrameProcessorFrame?
var processed = 0
for (i, name) in files.enumerated() {
  // A frame already written by an earlier, interrupted run is kept; the next
  // frame then starts without a predecessor.
  if FileManager.default.fileExists(atPath: outDir.appendingPathComponent(name).path) {
    prevSource = nil
    prevOutput = nil
    continue
  }
  // Release each frame's images before the next: without it a long grid
  // exhausts memory and the process is killed.
  autoreleasepool {
    let image = CIImage(contentsOf: inDir.appendingPathComponent(name))!
    let src = buffer(config.sourcePixelBufferAttributes)
    ctx.render(image, to: src, bounds: image.extent, colorSpace: srgb)
    let dst = buffer(config.destinationPixelBufferAttributes)
    let t = CMTime(value: CMTimeValue(i), timescale: 24)
    let srcFrame = VTFrameProcessorFrame(buffer: src, presentationTimeStamp: t)!
    let dstFrame = VTFrameProcessorFrame(buffer: dst, presentationTimeStamp: t)!
    if starts.contains(i) { prevSource = nil; prevOutput = nil }
    let params = VTSuperResolutionScalerParameters(
      sourceFrame: srcFrame, previousFrame: prevSource, previousOutputFrame: prevOutput, opticalFlow: nil,
      submissionMode: .sequential, destinationFrame: dstFrame)!
    let done = DispatchSemaphore(value: 0)
    var failure: Error?
    processor.process(parameters: params) { _, error in
      failure = error
      done.signal()
    }
    done.wait()
    if let failure { fatalError("frame \(i): \(failure)") }
    prevSource = srcFrame
    prevOutput = dstFrame

    // The scaler leaves alpha undefined (NaN); the plate is opaque.
    let raw = CIImage(cvPixelBuffer: dst, options: [.colorSpace: srgb])
    let big = raw.settingAlphaOne(in: raw.extent)
    let lanczos = CIFilter(name: "CILanczosScaleTransform")!
    lanczos.setValue(big, forKey: kCIInputImageKey)
    lanczos.setValue(Double(outWidth) / big.extent.width, forKey: kCIInputScaleKey)
    lanczos.setValue(1.0, forKey: kCIInputAspectRatioKey)
    let out = lanczos.outputImage!
    let cg = ctx.createCGImage(out, from: out.extent.integral, format: .RGBA8, colorSpace: srgb)!
    let dest = CGImageDestinationCreateWithURL(outDir.appendingPathComponent(name) as CFURL, UTType.png.identifier as CFString, 1, nil)!
    CGImageDestinationAddImage(dest, cg, nil)
    CGImageDestinationFinalize(dest)
    processed += 1
  }
}
print("upscaled \(processed) of \(files.count) frames \(width)x\(height) -> \(outWidth)")
