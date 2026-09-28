// WebGL stage for the living portrait. Draws, in one pass, the rest-pose
// poster, the blended head (the head canvas of useLivingPortrait) feathered
// into it over its box, and a small warp of the whole figure by the body map:
// the upper body turns a few pixels with the head, lifts or settles with a
// nod, and breathes. He is cut out by the figure mask onto the page's own
// hall; the photograph's wall left in the mask's halo is graded to the page's
// stone (the poster is graded the same way at build time,
// scripts/living-body.mjs), so the halo cannot be seen.

const VERTEX = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAGMENT = `
precision highp float;
uniform sampler2D uPoster;
uniform sampler2D uHead;
uniform sampler2D uBody;
uniform sampler2D uAlpha;
uniform vec3 uStone;
uniform vec2 uSize;
uniform vec4 uBox;      // left, top, width, height, as fractions of the plate
uniform float uFeather; // box margin, as a fraction of the box
uniform float uTurn;    // horizontal shift at the head, plate fraction
uniform float uLift;    // vertical shift of the upper body, plate fraction
uniform float uBreath;  // vertical shift at the head from breathing, plate fraction

// Light, colourless pixels outside his body are the photograph's wall (0.72
// luma and up, keyed fully from 0.7; his hair's highlights stay under 0.5).
// Mirrors wallKey() in scripts/living-body.mjs.
float wallKey(vec3 c, float body) {
  float hi = max(c.r, max(c.g, c.b));
  float sat = hi > 0.0 ? (hi - min(c.r, min(c.g, c.b))) / hi : 0.0;
  float luma = dot(c, vec3(0.299, 0.587, 0.114));
  return smoothstep(0.6, 0.7, luma) * (1.0 - smoothstep(0.07, 0.14, sat)) * (1.0 - smoothstep(0.6, 0.95, body));
}

vec3 plate(vec2 uv) {
  vec3 c = texture2D(uPoster, uv).rgb;
  vec2 h = (uv - uBox.xy) / uBox.zw;
  if (h.x > 0.0 && h.x < 1.0 && h.y > 0.0 && h.y < 1.0) {
    vec2 e = min(h, 1.0 - h) / uFeather;
    float a = clamp(e.x, 0.0, 1.0) * clamp(e.y, 0.0, 1.0);
    vec3 head = texture2D(uHead, h).rgb;
    head = mix(head, uStone, wallKey(head, texture2D(uBody, uv).r));
    c = mix(c, head, a);
  }
  return c;
}

void main() {
  vec2 uv = vec2(gl_FragCoord.x / uSize.x, 1.0 - gl_FragCoord.y / uSize.y);
  float w = texture2D(uBody, uv).r;
  // Higher on the body moves more: the hips barely turn, the shoulders and
  // head do; breathing lifts the shoulders and head from a still waist.
  float up = 1.0 - uv.y;
  vec2 d = vec2(uTurn * (0.4 + 0.6 * up), uLift * up + uBreath * up) * w;
  vec2 src = uv - d;
  float a = texture2D(uAlpha, src).r;
  gl_FragColor = vec4(plate(src) * a, a);
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
 * Returns null where WebGL is unavailable; the caller then shows the head
 * canvas directly and the body stays still.
 */
export function createLivingStage(canvas, { poster, head, body, alpha, box, stone }) {
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
  texture(gl, 2, body);
  texture(gl, 3, alpha);
  gl.uniform1i(u("uPoster"), 0);
  gl.uniform1i(u("uHead"), 1);
  gl.uniform1i(u("uBody"), 2);
  gl.uniform1i(u("uAlpha"), 3);
  gl.uniform3f(u("uStone"), stone[0] / 255, stone[1] / 255, stone[2] / 255);
  gl.uniform4f(u("uBox"), box.left, box.top, box.width, box.height);
  gl.uniform1f(u("uFeather"), box.feather);
  const uSize = u("uSize");
  const uTurn = u("uTurn");
  const uLift = u("uLift");
  const uBreath = u("uBreath");

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
    // The head canvas changed; send it to the GPU before the next draw.
    updateHead() {
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, headTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, head);
    },
    draw({ turn, lift, breath }) {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uTurn, turn);
      gl.uniform1f(uLift, lift);
      gl.uniform1f(uBreath, breath);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
  };
}
