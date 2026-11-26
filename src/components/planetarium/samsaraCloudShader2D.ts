const VERTEX_SHADER_SOURCE = `
attribute vec2 aPos;
varying vec2 vPos;
void main() {
  vPos = aPos;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER_SOURCE = `
precision highp float;

varying vec2 vPos;
uniform sampler2D uCloudTex;
uniform float uTime;
uniform float uAngleRad;
uniform float uTurnSpeed;
uniform float uReveal;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amp = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 3; i++) {
    value += amp * valueNoise(p);
    p = rot * p * 2.03 + vec2(11.3, 7.1);
    amp *= 0.5;
  }
  return value;
}

void main() {
  // Exact UV mapping: uv.y = 0 at TOP (White clouds), uv.y = 1 at BOTTOM (Gold-Black clouds)
  vec2 uv = vec2(vPos.x * 0.5 + 0.5, 0.5 - vPos.y * 0.5);
  vec2 p = uv - 0.5;

  // Inverse rotation rot(-uAngleRad) matches 2D ctx.rotate(samsara.angleRad)
  float c = cos(uAngleRad);
  float s = sin(uAngleRad);
  vec2 rotP = vec2(p.x * c + p.y * s, -p.x * s + p.y * c);

  // Protect both cosmic orbs (top dark orb & bottom white moon)
  vec2 topOrbPos = vec2(0.0, -0.22);
  vec2 botOrbPos = vec2(0.0, 0.22);
  float distTopOrb = length(rotP - topOrbPos);
  float distBotOrb = length(rotP - botOrbPos);
  float orbMask = smoothstep(0.068, 0.115, distTopOrb) * smoothstep(0.068, 0.115, distBotOrb);

  // Analytical Taiji vortex flow + counter-rotating orb eddies + 3-octave fbm curl
  vec2 globalSwirl = vec2(-rotP.y, rotP.x) * 1.45 +
    vec2(sin(rotP.y * 6.2831853), cos(rotP.x * 6.2831853)) * 0.16;

  vec2 dTop = rotP - topOrbPos;
  vec2 eddyTop = vec2(-dTop.y, dTop.x) * exp(-distTopOrb * 6.5) * 0.95;

  vec2 dBot = rotP - botOrbPos;
  vec2 eddyBot = vec2(dBot.y, -dBot.x) * exp(-distBotOrb * 6.5) * 0.95;

  vec2 turbCoord = rotP * 4.4 + vec2(uTime * 0.12, -uTime * 0.09);
  vec2 curlTurb = vec2(
    fbm(turbCoord + vec2(3.1, 1.7)) - 0.5,
    fbm(turbCoord + vec2(8.3, 5.2)) - 0.5
  ) * 1.35;

  vec2 flow = (globalSwirl + eddyTop + eddyBot + curlTurb) * orbMask;

  // Seamless dual-phase ping-pong advection
  float ph0 = fract(uTime * 0.16);
  float ph1 = fract(uTime * 0.16 + 0.5);
  float blend = abs(2.0 * ph0 - 1.0);
  float amp = (0.045 + uTurnSpeed * 0.038) * orbMask;

  vec2 uv0 = clamp(rotP + 0.5 - flow * (ph0 - 0.5) * amp, 0.002, 0.998);
  vec2 uv1 = clamp(rotP + 0.5 - flow * (ph1 - 0.5) * amp, 0.002, 0.998);

  vec4 col0 = texture2D(uCloudTex, uv0);
  vec4 col1 = texture2D(uCloudTex, uv1);
  vec4 col = mix(col0, col1, blend);

  // Drifting procedural mist veils tinted by hemisphere
  float mist = fbm(rotP * 4.6 + vec2(uTime * 0.14, -uTime * 0.11));
  float whiteHemi = smoothstep(0.14, -0.14, rotP.y);
  float goldHemi = smoothstep(-0.14, 0.14, rotP.y);

  vec3 rgb = col.rgb;

  // White cumulus highlight breathing
  float whiteBreath = 0.5 + 0.5 * sin(rotP.x * 7.0 + rotP.y * 5.0 - uTime * 1.65);
  float whiteHighlight = whiteHemi * smoothstep(0.55, 0.95, col.b) * orbMask;
  rgb += vec3(0.92, 0.96, 1.0) * (mist * 0.10 + whiteBreath * 0.06) * whiteHighlight;

  // Warm golden ridge Qi light wave sweep
  float goldMask = clamp((col.r - col.b) * 2.1, 0.0, 1.0);
  float qiWave = 0.5 + 0.5 * sin(rotP.x * 8.5 - rotP.y * 6.5 - uTime * 2.35);
  rgb += vec3(1.0, 0.72, 0.20) * goldMask * (0.14 * qiWave + 0.10 * mist) * orbMask;

  // Soft hemisphere atmospheric mist veil
  vec3 hemiMistColor = mix(vec3(1.0, 0.70, 0.22), vec3(0.90, 0.95, 1.0), whiteHemi);
  float hemiMask = max(whiteHemi, goldHemi);
  rgb += hemiMistColor * mist * 0.055 * col.a * orbMask * hemiMask;

  // Subtle corona pulse around both orb rims
  float minOrbDist = min(distTopOrb, distBotOrb);
  float rimPulse = 0.65 + 0.35 * sin(uTime * 2.4 + atan(rotP.y, rotP.x) * 2.0);
  float orbRim = smoothstep(0.125, 0.088, minOrbDist) * smoothstep(0.062, 0.088, minOrbDist);
  vec3 orbRimCol = distTopOrb < distBotOrb ? vec3(0.86, 0.92, 1.0) : vec3(1.0, 0.80, 0.35);
  rgb += orbRimCol * orbRim * rimPulse * 0.16;

  // Soft outer radial feather & Black-Hole-centered radial reveal wave
  float outerMask = smoothstep(0.495, 0.43, length(rotP));
  float revealFront = mix(-0.18, 0.72, clamp(uReveal, 0.0, 1.0));
  float radialReveal = 1.0 - smoothstep(revealFront - 0.22, revealFront + 0.04, length(p));
  float waveEdge = smoothstep(0.0, 0.15, uReveal) * (1.0 - smoothstep(0.85, 1.0, uReveal))
                 * smoothstep(revealFront - 0.16, revealFront - 0.04, length(p))
                 * (1.0 - smoothstep(revealFront - 0.04, revealFront + 0.06, length(p)));
  rgb = clamp(rgb + vec3(1.0, 0.92, 0.65) * waveEdge * 0.35, 0.0, 1.0);
  float outAlpha = clamp(col.a * outerMask * radialReveal, 0.0, 1.0);

  gl_FragColor = vec4(rgb * outAlpha, outAlpha);
}
`;

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/**
 * Pure WebGL 2D fluid-advection renderer for the Samsara volumetric Taiji cloud texture.
 * Zero Three.js dependencies; falls back cleanly to 2D canvas if WebGL is unavailable.
 */
export class SamsaraCloudShaderRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly gl: WebGLRenderingContext | null;
  private program: WebGLProgram | null = null;
  private vertShader: WebGLShader | null = null;
  private fragShader: WebGLShader | null = null;
  private quadBuffer: WebGLBuffer | null = null;
  private cloudTex: WebGLTexture | null = null;
  private uploadedImage: HTMLImageElement | null = null;

  private uCloudTexLoc: WebGLUniformLocation | null = null;
  private uTimeLoc: WebGLUniformLocation | null = null;
  private uAngleRadLoc: WebGLUniformLocation | null = null;
  private uTurnSpeedLoc: WebGLUniformLocation | null = null;
  private uRevealLoc: WebGLUniformLocation | null = null;
  private aPosLoc = -1;

  private currentSize = 0;
  private disposed = false;

  constructor() {
    this.canvas = document.createElement('canvas');
    const attrs: WebGLContextAttributes = {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
      powerPreference: 'high-performance',
    };
    const gl =
      (this.canvas.getContext('webgl2', attrs) as WebGLRenderingContext | null) ??
      (this.canvas.getContext('webgl', attrs) as WebGLRenderingContext | null);

    this.gl = gl;
    if (!gl) return;

    const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);
    if (!vs || !fs) {
      if (vs) gl.deleteShader(vs);
      if (fs) gl.deleteShader(fs);
      return;
    }
    this.vertShader = vs;
    this.fragShader = fs;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return;
    }
    this.program = program;

    this.aPosLoc = gl.getAttribLocation(program, 'aPos');
    this.uCloudTexLoc = gl.getUniformLocation(program, 'uCloudTex');
    this.uTimeLoc = gl.getUniformLocation(program, 'uTime');
    this.uAngleRadLoc = gl.getUniformLocation(program, 'uAngleRad');
    this.uTurnSpeedLoc = gl.getUniformLocation(program, 'uTurnSpeed');
    this.uRevealLoc = gl.getUniformLocation(program, 'uReveal');

    const quadBuffer = gl.createBuffer();
    if (!quadBuffer) return;
    this.quadBuffer = quadBuffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );

    const tex = gl.createTexture();
    if (!tex) return;
    this.cloudTex = tex;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  }

  public renderTo2D(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    centerX: number,
    centerY: number,
    diskSize: number,
    angleRad: number,
    timeSec: number,
    turnSpeed: number,
    alpha: number,
    reveal = 1.0
  ): boolean {
    const gl = this.gl;
    if (
      this.disposed ||
      !gl ||
      !this.program ||
      !this.quadBuffer ||
      !this.cloudTex ||
      this.aPosLoc < 0 ||
      !img.complete ||
      img.naturalWidth === 0 ||
      diskSize <= 0 ||
      alpha <= 0.005 ||
      reveal <= 0.005
    ) {
      return false;
    }

    const size = Math.max(128, Math.min(768, Math.round(diskSize)));
    if (this.currentSize !== size) {
      this.currentSize = size;
      this.canvas.width = size;
      this.canvas.height = size;
    }

    if (this.uploadedImage !== img) {
      gl.bindTexture(gl.TEXTURE_2D, this.cloudTex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      this.uploadedImage = img;
    }

    gl.viewport(0, 0, size, size);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.enableVertexAttribArray(this.aPosLoc);
    gl.vertexAttribPointer(this.aPosLoc, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.cloudTex);
    gl.uniform1i(this.uCloudTexLoc, 0);
    gl.uniform1f(this.uTimeLoc, timeSec);
    gl.uniform1f(this.uAngleRadLoc, angleRad);
    gl.uniform1f(this.uTurnSpeedLoc, turnSpeed);
    gl.uniform1f(this.uRevealLoc, Math.max(0, Math.min(1, reveal)));

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.drawImage(
      this.canvas,
      centerX - diskSize * 0.5,
      centerY - diskSize * 0.5,
      diskSize,
      diskSize
    );
    ctx.restore();

    return true;
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    const gl = this.gl;
    if (!gl) return;

    if (this.cloudTex) gl.deleteTexture(this.cloudTex);
    if (this.quadBuffer) gl.deleteBuffer(this.quadBuffer);
    if (this.program) gl.deleteProgram(this.program);
    if (this.vertShader) gl.deleteShader(this.vertShader);
    if (this.fragShader) gl.deleteShader(this.fragShader);
    gl.getExtension('WEBGL_lose_context')?.loseContext();

    this.cloudTex = null;
    this.quadBuffer = null;
    this.program = null;
    this.vertShader = null;
    this.fragShader = null;
    this.uploadedImage = null;
  }
}
