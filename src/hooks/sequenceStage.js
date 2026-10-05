// The hero's stage: the living stage (livingStage.js)
// with one addition, a small tilt of the head up or down. The take has no
// filmed pitch, so the head is treated as a rounded solid: an ellipsoid over
// the head's ellipse at rest, as deep as the face is wide, turned a few
// degrees about the top of the neck. Points on the front of the face (nose,
// chin) move furthest, the crown drops back, and the displacement fades to
// nothing at the head's outline, so the collar, lapels, wall and every pixel
// outside the head stay put. Nothing is redrawn: every pixel is the frame's
// own, moved. The one other addition is a second head picture, with its own
// tilt, blended in where the page moves between two frames of the same
// target pose (a join within a take). Kept apart from
// livingStage.js so production is untouched.

const VERTEX = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAGMENT = `
precision highp float;
uniform sampler2D uPoster;
uniform sampler2D uHead;
uniform sampler2D uHead2;   // a second frame, blended in by uMix (useSequencePortrait)
uniform float uMix;         // 0 shows uHead alone
uniform sampler2D uBody;
uniform sampler2D uAlpha;
uniform vec3 uStone;
uniform vec2 uSize;
uniform vec4 uBox;
uniform float uFeather;
uniform float uTurn;
uniform float uLift;
uniform vec2 uPlate;    // plate size, pixels
uniform vec2 uHeadC;    // head ellipse centre, plate pixels (uHead's frame)
uniform vec2 uHeadC2;   // the same for uHead2's frame
uniform vec2 uHeadR;    // head ellipse radii, plate pixels
uniform float uTilt;    // radians, positive looks up (uHead's frame)
uniform float uTilt2;   // the same for uHead2's frame

// As livingStage.js and scripts/living-body.mjs.
float wallKey(vec3 c, float body) {
  float hi = max(c.r, max(c.g, c.b));
  float sat = hi > 0.0 ? (hi - min(c.r, min(c.g, c.b))) / hi : 0.0;
  float luma = dot(c, vec3(0.299, 0.587, 0.114));
  return smoothstep(0.6, 0.7, luma) * (1.0 - smoothstep(0.07, 0.14, sat)) * (1.0 - smoothstep(0.6, 0.95, body));
}

// The plate at uv, with the head from uHead at uv and, blended in by uMix,
// from uHead2 at uv2: each frame is tilted by its own amount to the same
// target pose, so the two agree where they are mixed.
vec3 plate(vec2 uv, vec2 uv2) {
  vec3 c = texture2D(uPoster, uv).rgb;
  vec2 h = (uv - uBox.xy) / uBox.zw;
  vec2 h2 = (uv2 - uBox.xy) / uBox.zw;
  if (h.x > 0.0 && h.x < 1.0 && h.y > 0.0 && h.y < 1.0) {
    vec2 e = min(h, 1.0 - h) / uFeather;
    float a = clamp(e.x, 0.0, 1.0) * clamp(e.y, 0.0, 1.0);
    vec3 head = texture2D(uHead, h).rgb;
    if (uMix > 0.0) head = mix(head, texture2D(uHead2, h2).rgb, uMix);
    head = mix(head, uStone, wallKey(head, texture2D(uBody, uv).r));
    c = mix(c, head, a);
  }
  return c;
}

// Where a point of the tilted head came from. Small angles: y' = y cos t -
// z sin t about the pivot, inverted by sampling at the point minus the move.
vec2 tilt(vec2 uv, float angle, vec2 centre) {
  vec2 q = uv * uPlate;
  vec2 n = (q - centre) / uHeadR;
  float r = length(n);
  if (r >= 1.0) return uv;
  float z = sqrt(1.0 - r * r) * uHeadR.x * 1.2;
  float pivot = centre.y + uHeadR.y * 1.15;
  float fade = 1.0 - smoothstep(0.6, 1.0, r);
  float dy = ((q.y - pivot) * (cos(angle) - 1.0) - z * sin(angle)) * fade;
  return vec2(uv.x, (q.y - dy) / uPlate.y);
}

void main() {
  vec2 uv = vec2(gl_FragCoord.x / uSize.x, 1.0 - gl_FragCoord.y / uSize.y);
  float w = texture2D(uBody, uv).r;
  float up = 1.0 - uv.y;
  vec2 d = vec2(uTurn * (0.4 + 0.6 * up), uLift * up) * w;
  vec2 src = tilt(uv - d, uTilt, uHeadC);
  vec2 src2 = tilt(uv - d, uTilt2, uHeadC2);
  float a = texture2D(uAlpha, src).r;
  gl_FragColor = vec4(plate(src, src2) * a, a);
}
`;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? "shader");
  return shader;
}

function texture(gl, unit, source) {
  const t = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  return t;
}

/**
 * `head` is the rest frame's bitmap; `plateSize` and `ellipse` ({ cx, cy, rx,
 * ry } in plate fractions) place the head for the tilt. Returns null where
 * WebGL is unavailable.
 */
export function createSequenceStage(canvas, { poster, head, body, alpha, box, stone, plateSize, ellipse }) {
  const gl = canvas.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: true, preserveDrawingBuffer: false });
  if (!gl) return null;
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const u = (name) => gl.getUniformLocation(program, name);
  texture(gl, 0, poster);
  const headTexture = texture(gl, 1, head);
  const head2Texture = texture(gl, 4, head);
  texture(gl, 2, body);
  texture(gl, 3, alpha);
  gl.uniform1i(u("uPoster"), 0);
  gl.uniform1i(u("uHead"), 1);
  gl.uniform1i(u("uBody"), 2);
  gl.uniform1i(u("uAlpha"), 3);
  gl.uniform1i(u("uHead2"), 4);
  gl.uniform3f(u("uStone"), stone[0] / 255, stone[1] / 255, stone[2] / 255);
  gl.uniform4f(u("uBox"), box.left, box.top, box.width, box.height);
  gl.uniform1f(u("uFeather"), box.feather);
  gl.uniform2f(u("uPlate"), plateSize.width, plateSize.height);
  gl.uniform2f(u("uHeadR"), ellipse.rx * plateSize.width, ellipse.ry * plateSize.height);
  const uHeadC = u("uHeadC");
  const uHeadC2 = u("uHeadC2");
  const uSize = u("uSize");
  const uTurn = u("uTurn");
  const uLift = u("uLift");
  const uTilt = u("uTilt");
  const uTilt2 = u("uTilt2");
  const uMix = u("uMix");
  const upload = (t, unit, bitmap) => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
  };

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
    gl.uniform2f(uSize, w, h);
  }
  resize();

  return {
    resize,
    // A new head picture, and where its face is (plate fractions, x only:
    // the turn moves the face sideways; the tilt keeps the rest ellipse's
    // height).
    updateHead(bitmap, faceX) {
      upload(headTexture, 1, bitmap);
      gl.uniform2f(uHeadC, faceX * plateSize.width, ellipse.cy * plateSize.height);
    },
    // A second frame, blended over the head by draw's `mix`, with its own
    // face position and tilt.
    updateHead2(bitmap, faceX) {
      upload(head2Texture, 4, bitmap);
      gl.uniform2f(uHeadC2, faceX * plateSize.width, ellipse.cy * plateSize.height);
    },
    draw({ turn, lift, tilt, tilt2 = tilt, mix = 0 }) {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uTurn, turn);
      gl.uniform1f(uLift, lift);
      gl.uniform1f(uTilt, tilt);
      gl.uniform1f(uTilt2, tilt2);
      gl.uniform1f(uMix, mix);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
  };
}
