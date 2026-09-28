// Dense optical flow with VideoToolbox's on-device model (the flow macOS uses
// for frame rate conversion), for scripts/real_grid.py. Not meant to be run
// by hand.
//   flow <pairs.txt>
// Each line of pairs.txt is "<a.png> <b.png> <ab.bin> <ba.bin>", all images
// the same size. ab.bin receives, for every pixel of a, where that pixel is
// in b, and ba.bin the same from b to a: an int32 width and height, then
// float32 (dx, dy) pairs, row-major.
import CoreImage
import Foundation
import VideoToolbox

let args = CommandLine.arguments
guard args.count == 2 else { fatalError("usage: flow <pairs.txt>") }
let lines = try String(contentsOfFile: args[1], encoding: .utf8).split(separator: "\n").map { $0.split(separator: " ").map(String.init) }
guard let first = lines.first, let probe = CIImage(contentsOf: URL(fileURLWithPath: first[0])) else { fatalError("no pairs") }
let width = Int(probe.extent.width), height = Int(probe.extent.height)

guard VTOpticalFlowConfiguration.isSupported,
  let config = VTOpticalFlowConfiguration(
    frameWidth: width, frameHeight: height, qualityPrioritization: .quality,
    revision: VTOpticalFlowConfiguration.defaultRevision)
else { fatalError("optical flow unsupported on this Mac") }
let processor = VTFrameProcessor()
try processor.startSession(configuration: config)
defer { processor.endSession() }

let srgb = CGColorSpace(name: CGColorSpace.sRGB)!
let ctx = CIContext(options: [.workingColorSpace: srgb, .outputColorSpace: srgb])

func buffer(_ attrs: [String: Any]) -> CVPixelBuffer {
  var pb: CVPixelBuffer?
  let w = attrs[kCVPixelBufferWidthKey as String] as! Int
  let h = attrs[kCVPixelBufferHeightKey as String] as! Int
  let raw = attrs[kCVPixelBufferPixelFormatTypeKey as String]
  let format = ((raw as? [NSNumber])?.first ?? (raw as! NSNumber)).uint32Value
  var a = attrs
  a[kCVPixelBufferPixelFormatTypeKey as String] = format
  CVPixelBufferCreate(nil, w, h, format, a as CFDictionary, &pb)
  return pb!
}

func frame(_ path: String, _ t: Int) -> VTFrameProcessorFrame {
  let image = CIImage(contentsOf: URL(fileURLWithPath: path))!
  let pb = buffer(config.sourcePixelBufferAttributes)
  ctx.render(image, to: pb, bounds: image.extent, colorSpace: srgb)
  return VTFrameProcessorFrame(buffer: pb, presentationTimeStamp: CMTime(value: CMTimeValue(t), timescale: 24))!
}

func write(_ pb: CVPixelBuffer, _ path: String) {
  CVPixelBufferLockBaseAddress(pb, .readOnly)
  defer { CVPixelBufferUnlockBaseAddress(pb, .readOnly) }
  let w = CVPixelBufferGetWidth(pb), h = CVPixelBufferGetHeight(pb)
  let stride = CVPixelBufferGetBytesPerRow(pb)
  let base = CVPixelBufferGetBaseAddress(pb)!
  let half = CVPixelBufferGetPixelFormatType(pb) == kCVPixelFormatType_TwoComponent16Half
  var out = [Float32](repeating: 0, count: w * h * 2)
  for y in 0..<h {
    let row = base + y * stride
    for x in 0..<(w * 2) {
      out[y * w * 2 + x] = half ? Float32(row.assumingMemoryBound(to: Float16.self)[x]) : row.assumingMemoryBound(to: Float32.self)[x]
    }
  }
  var data = Data()
  var dims = [Int32(w), Int32(h)]
  data.append(Data(bytes: &dims, count: 8))
  out.withUnsafeBytes { data.append(contentsOf: $0) }
  try! data.write(to: URL(fileURLWithPath: path))
}

for (n, p) in lines.enumerated() where p.count == 4 {
  autoreleasepool {
    let a = frame(p[0], 2 * n), b = frame(p[1], 2 * n + 1)
    let forward = buffer(config.destinationPixelBufferAttributes)
    let backward = buffer(config.destinationPixelBufferAttributes)
    let flow = VTFrameProcessorOpticalFlow(forwardFlow: forward, backwardFlow: backward)!
    let params = VTOpticalFlowParameters(sourceFrame: a, nextFrame: b, submissionMode: .random, destinationOpticalFlow: flow)!
    let done = DispatchSemaphore(value: 0)
    var failure: Error?
    processor.process(parameters: params) { _, error in
      failure = error
      done.signal()
    }
    done.wait()
    if let failure { fatalError("\(p[0]): \(failure)") }
    write(forward, p[2])
    write(backward, p[3])
  }
}
