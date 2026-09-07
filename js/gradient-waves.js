// Native WebGL2 Gradient Waves Shader (Self-contained, zero external dependencies)

const hexToRgb = hex => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [1, 1, 1];
  return [parseInt(result[1], 16) / 255, parseInt(result[2], 16) / 255, parseInt(result[3], 16) / 255];
};

const detailToSteps = detail => {
  if (detail === 'low') return 40.0;
  if (detail === 'high') return 110.0;
  return 70.0;
};

const vertexShaderSource = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragmentShaderSource = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uSpeed;
uniform float uAmplitude;
uniform float uWaveScale;
uniform float uWaveRatio;
uniform float uSwell;
uniform float uTurbulence;
uniform float uTilt;
uniform float uZoom;
uniform float uHeight;
uniform float uFogDepth;
uniform float uSteps;
uniform float uBrightness;
uniform float uOpacity;
uniform float uGrain;
uniform float uGrainIntensity;
uniform vec2 uMouse;
uniform float uParallax;
uniform bool uEnableMouse;
uniform vec3 uHorizonColor;
uniform vec3 uWaveColor;
uniform vec3 uCrestColor;
out vec4 fragColor;

const float MAX_DIST = 20000.0;

float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float plasma(vec3 r, vec2 freq, vec4 tc) {
  float mx = r.x + tc.x;
  mx += uSwell * sin((r.y + mx) / 20.0 + tc.y);
  float my = r.y - tc.z;
  my += uSwell * sin((r.x + my) / 20.0 + tc.w);
  return sin(length(vec2(mx, my) * freq) * 0.2);
}

float map(vec3 p) {
  float speed = iTime * uSpeed * 0.08;
  vec4 tc = vec4(speed * 3.0, speed * 2.0, speed * 1.5, speed * 2.5);
  vec2 freq = vec2(0.04, 0.02) * (1.0 / max(uWaveScale, 0.001));
  float wave1 = plasma(p, freq, tc);
  float wave2 = plasma(p + vec3(100.0, 50.0, 0.0), freq * 1.5, tc * 1.2);
  float d = p.z - (wave1 + wave2 * 0.5) * uAmplitude * 10.0;
  return d * 0.5;
}

vec3 calcNormal(vec3 p) {
  vec2 e = vec2(1.0, -1.0) * 0.5773 * 0.25;
  return normalize(
    e.xyy * map(p + e.xyy) +
    e.yyx * map(p + e.yyx) +
    e.yxy * map(p + e.yxy) +
    e.xxx * map(p + e.xxx)
  );
}

void main() {
  vec2 uv = gl_FragCoord.xy / iResolution.xy;
  vec2 p = (gl_FragCoord.xy * 2.0 - iResolution.xy) / min(iResolution.x, iResolution.y);

  vec2 mouseOffset = vec2(0.0);
  if (uEnableMouse) {
    mouseOffset = (uMouse - 0.5) * uParallax * 2.0;
  }

  vec3 ro = vec3(p.x * 20.0 + mouseOffset.x * 30.0, -80.0 + mouseOffset.y * 20.0, 40.0 * uHeight);
  vec3 ta = vec3(0.0, 40.0, 0.0);
  vec3 ww = normalize(ta - ro);
  vec3 uu = normalize(cross(ww, vec3(0.0, 0.0, 1.0)));
  vec3 vv = normalize(cross(uu, ww));

  float fov = 1.2 / max(uZoom, 0.1);
  vec3 rd = normalize(p.x * uu + p.y * vv + fov * ww);

  float t = 0.0;
  float d = 0.0;
  float maxSteps = uSteps;
  for (float i = 0.0; i < 150.0; i += 1.0) {
    if (i >= maxSteps || t > MAX_DIST) break;
    vec3 pos = ro + rd * t;
    d = map(pos);
    if (abs(d) < 0.01 * t || t > MAX_DIST) break;
    t += d * 0.7;
  }

  vec3 col = uHorizonColor;
  if (t < MAX_DIST) {
    vec3 pos = ro + rd * t;
    vec3 nor = calcNormal(pos);
    float diff = max(dot(nor, normalize(vec3(0.5, 0.8, 1.0))), 0.0);
    float fresnel = pow(1.0 - max(dot(-rd, nor), 0.0), 3.0);
    col = mix(uWaveColor, uCrestColor, diff * 0.6 + fresnel * 0.4);
    float fog = 1.0 - exp(-t * 0.003 * (10.0 / max(uFogDepth, 1.0)));
    col = mix(col, uHorizonColor, clamp(fog, 0.0, 1.0));
  }

  col *= uBrightness;

  if (uGrain > 0.5) {
    float noise = hash21(gl_FragCoord.xy + fract(iTime) * 100.0);
    col += (noise - 0.5) * uGrainIntensity;
  }

  fragColor = vec4(clamp(col, 0.0, 1.0), uOpacity);
}
`;

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('[GradientWaves] Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl, vsSource, fsSource) {
  const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
  const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
  if (!vs || !fs) return null;

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);

  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn('[GradientWaves] Program link error:', gl.getProgramInfoLog(prog));
    gl.deleteProgram(prog);
    return null;
  }
  return prog;
}

export function initGradientWaves(containerId, userOptions = {}) {
  const container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
  if (!container) return null;

  const options = {
    horizonColor: '#083E8A',
    waveColor: '#F59E0B',
    crestColor: '#FFFFFF',
    speed: 0.4,
    amplitude: 2.5,
    waveScale: 0.6,
    waveRatio: 0.9,
    swell: 35,
    turbulence: 20,
    tilt: 1.11,
    zoom: 1.0,
    height: 5.5,
    fogDepth: 15,
    detail: 'medium',
    brightness: 1.0,
    opacity: 1.0,
    mouseInteraction: true,
    parallaxStrength: 0.5,
    grain: true,
    grainIntensity: 0.05,
    ...userOptions
  };

  const canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  canvas.style.pointerEvents = 'none';

  let gl = null;
  try {
    gl = canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      powerPreference: 'high-performance'
    });
  } catch (e) {}

  if (!gl) {
    console.warn('[GradientWaves] WebGL2 not supported.');
    return null;
  }

  container.appendChild(canvas);

  const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);
  if (!program) return null;

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const posLoc = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  const u = {
    iTime: gl.getUniformLocation(program, 'iTime'),
    iResolution: gl.getUniformLocation(program, 'iResolution'),
    uSpeed: gl.getUniformLocation(program, 'uSpeed'),
    uAmplitude: gl.getUniformLocation(program, 'uAmplitude'),
    uWaveScale: gl.getUniformLocation(program, 'uWaveScale'),
    uWaveRatio: gl.getUniformLocation(program, 'uWaveRatio'),
    uSwell: gl.getUniformLocation(program, 'uSwell'),
    uTurbulence: gl.getUniformLocation(program, 'uTurbulence'),
    uTilt: gl.getUniformLocation(program, 'uTilt'),
    uZoom: gl.getUniformLocation(program, 'uZoom'),
    uHeight: gl.getUniformLocation(program, 'uHeight'),
    uFogDepth: gl.getUniformLocation(program, 'uFogDepth'),
    uSteps: gl.getUniformLocation(program, 'uSteps'),
    uBrightness: gl.getUniformLocation(program, 'uBrightness'),
    uOpacity: gl.getUniformLocation(program, 'uOpacity'),
    uGrain: gl.getUniformLocation(program, 'uGrain'),
    uGrainIntensity: gl.getUniformLocation(program, 'uGrainIntensity'),
    uMouse: gl.getUniformLocation(program, 'uMouse'),
    uParallax: gl.getUniformLocation(program, 'uParallax'),
    uEnableMouse: gl.getUniformLocation(program, 'uEnableMouse'),
    uHorizonColor: gl.getUniformLocation(program, 'uHorizonColor'),
    uWaveColor: gl.getUniformLocation(program, 'uWaveColor'),
    uCrestColor: gl.getUniformLocation(program, 'uCrestColor')
  };

  const currentMouse = [0.5, 0.5];
  const targetMouse = [0.5, 0.5];

  const setSize = () => {
    const rect = container.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.floor(rect.width * dpr));
    const h = Math.max(1, Math.floor(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  };

  const ro = new ResizeObserver(setSize);
  ro.observe(container);
  setSize();

  const onPointerMove = e => {
    const rect = container.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    targetMouse[0] = (e.clientX - rect.left) / rect.width;
    targetMouse[1] = 1.0 - (e.clientY - rect.top) / rect.height;
  };
  const onPointerLeave = () => {
    targetMouse[0] = 0.5;
    targetMouse[1] = 0.5;
  };

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  document.addEventListener('pointerleave', onPointerLeave);

  let raf = 0;
  let isVisible = true;
  let isPageVisible = !document.hidden;
  const t0 = performance.now();

  const renderFrame = t => {
    if (!gl || gl.isContextLost()) return;

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);
    gl.bindVertexArray(vao);

    const timeSec = (t - t0) * 0.001;
    gl.uniform1f(u.iTime, timeSec);
    gl.uniform2f(u.iResolution, canvas.width, canvas.height);
    gl.uniform1f(u.uSpeed, options.speed);
    gl.uniform1f(u.uAmplitude, options.amplitude);
    gl.uniform1f(u.uWaveScale, options.waveScale);
    gl.uniform1f(u.uWaveRatio, options.waveRatio);
    gl.uniform1f(u.uSwell, options.swell);
    gl.uniform1f(u.uTurbulence, options.turbulence);
    gl.uniform1f(u.uTilt, options.tilt);
    gl.uniform1f(u.uZoom, options.zoom);
    gl.uniform1f(u.uHeight, options.height);
    gl.uniform1f(u.uFogDepth, options.fogDepth);
    gl.uniform1f(u.uSteps, detailToSteps(options.detail));
    gl.uniform1f(u.uBrightness, options.brightness);
    gl.uniform1f(u.uOpacity, options.opacity);
    gl.uniform1f(u.uGrain, options.grain ? 1.0 : 0.0);
    gl.uniform1f(u.uGrainIntensity, options.grainIntensity);

    const tx = options.mouseInteraction ? targetMouse[0] : 0.5;
    const ty = options.mouseInteraction ? targetMouse[1] : 0.5;
    currentMouse[0] += 0.05 * (tx - currentMouse[0]);
    currentMouse[1] += 0.05 * (ty - currentMouse[1]);
    gl.uniform2f(u.uMouse, currentMouse[0], currentMouse[1]);

    gl.uniform1f(u.uParallax, options.parallaxStrength);
    gl.uniform1i(u.uEnableMouse, options.mouseInteraction ? 1 : 0);

    const hc = hexToRgb(options.horizonColor);
    const wc = hexToRgb(options.waveColor);
    const cc = hexToRgb(options.crestColor);
    gl.uniform3fv(u.uHorizonColor, new Float32Array(hc));
    gl.uniform3fv(u.uWaveColor, new Float32Array(wc));
    gl.uniform3fv(u.uCrestColor, new Float32Array(cc));

    gl.drawArrays(gl.TRIANGLES, 0, 3);

    raf = requestAnimationFrame(renderFrame);
  };

  const tryStart = () => {
    if (isVisible && isPageVisible && raf === 0) raf = requestAnimationFrame(renderFrame);
  };
  const tryStop = () => {
    if (raf !== 0) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };

  const io = new IntersectionObserver(
    ([entry]) => {
      isVisible = entry.isIntersecting;
      isVisible ? tryStart() : tryStop();
    },
    { threshold: 0 }
  );
  io.observe(container);

  const onVisibility = () => {
    isPageVisible = !document.hidden;
    isPageVisible ? tryStart() : tryStop();
  };
  document.addEventListener('visibilitychange', onVisibility);

  tryStart();

  return {
    destroy: () => {
      tryStop();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerleave', onPointerLeave);
      try {
        if (canvas.parentNode === container) {
          container.removeChild(canvas);
        }
      } catch {}
      gl?.getExtension('WEBGL_lose_context')?.loseContext();
    },
    updateOptions: newOpts => {
      Object.assign(options, newOpts);
    }
  };
}
