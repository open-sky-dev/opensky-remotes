<script lang="ts">
	const vertexSource = `
attribute vec2 a_pos;
void main() {
	gl_Position = vec4(a_pos, 0.0, 1.0);
}
`

	const fragmentSource = `
precision highp float;

uniform vec2 u_res;
uniform float u_time;

float hash(vec2 p) {
	return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(
		mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
		mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
		u.y
	);
}

float fbm(vec2 p) {
	float v = 0.0;
	float a = 0.5;
	for (int i = 0; i < 5; i++) {
		v += a * noise(p);
		p = p * 2.03 + 19.19;
		a *= 0.55;
	}
	return v;
}

void main() {
	vec2 uv = gl_FragCoord.xy / u_res;
	float aspect = u_res.x / u_res.y;
	vec2 p = vec2(uv.x * aspect, uv.y);
	float t = u_time;

	// Rich blue sky: deep azure up top melting into a pale, warm horizon
	vec3 zenith = vec3(0.05, 0.31, 0.86);
	vec3 mid = vec3(0.30, 0.58, 0.98);
	vec3 horizon = vec3(0.78, 0.90, 1.0);
	vec3 col = mix(horizon, mid, smoothstep(0.12, 0.68, uv.y));
	col = mix(col, zenith, smoothstep(0.5, 1.15, uv.y));

	// A soft luminous band along the top — light lives above the frame
	col = mix(col, vec3(0.72, 0.88, 1.0), 0.3 * smoothstep(0.55, 1.05, uv.y));

	// Light shafts falling from above in several places. Two noise layers at
	// different scales drift sideways and morph over time, so beams appear,
	// wander, and dissolve rather than radiate from any fixed point. Their
	// slant, drift, and relative strengths all evolve on their own slow
	// clocks (incommensurate speeds), so the pattern never settles into a loop.
	float slant = (1.0 - uv.y) * (0.24 + 0.14 * noise(vec2(t * 0.017, 5.5)));
	float s1 = noise(vec2((p.x + slant) * 4.5 - t * 0.021, t * 0.05));
	float s2 = noise(vec2((p.x + slant * 1.6) * 9.0 + t * 0.034, 7.0 + t * 0.073));
	float w1 = 0.5 + 0.3 * noise(vec2(t * 0.031, 3.7));
	float w2 = 0.32 + 0.3 * noise(vec2(t * 0.043, 9.2));
	float shafts = smoothstep(0.5, 1.1, s1 * w1 + s2 * w2 + 0.28);
	shafts = pow(shafts, 2.0);
	// beams are brightest up top and dissolve as they fall
	float fall = smoothstep(-0.25, 0.85, uv.y);
	col += vec3(0.95, 0.98, 1.0) * shafts * fall * 0.32;
	// a faint warm breath inside the strongest beams
	col += vec3(1.0, 0.92, 0.75) * shafts * shafts * fall * 0.08;

	// Thin cirrus: big, slow, stretched wisps — a veil, not a blanket
	float c1 = fbm(vec2(p.x * 0.9 + t * 0.018, p.y * 2.6 + 3.0));
	float c2 = fbm(vec2(p.x * 1.8 - t * 0.028, p.y * 4.4 + 11.0));
	float clouds = smoothstep(0.55, 0.95, c1 * 0.68 + c2 * 0.42);
	col = mix(col, vec3(1.0, 1.0, 1.0), clouds * 0.3);

	// Fine grain keeps the gradient from banding
	col += (hash(gl_FragCoord.xy + fract(t)) - 0.5) * 0.012;

	// Feather every edge into white, with the boundary loosened by slow noise
	// so the sky melts into the page along an organic, breathing contour.
	// The side fades roughly match the container's overhang, so the solid
	// part of the sky lines up with the content column.
	float wobble = (fbm(vec2(uv.x * 3.0 + t * 0.02, uv.y * 3.0 - t * 0.015)) - 0.5) * 0.1;
	float fadeX = smoothstep(0.0, 0.17 + wobble, uv.x) * smoothstep(1.0, 0.83 - wobble, uv.x);
	float fadeY = smoothstep(0.0, 0.42 - wobble, uv.y) * smoothstep(1.0, 0.72 + wobble, uv.y);
	col = mix(vec3(1.0), col, fadeX * fadeY);

	gl_FragColor = vec4(col, 1.0);
}
`

	function compile(gl: WebGLRenderingContext, type: number, source: string) {
		const shader = gl.createShader(type)!
		gl.shaderSource(shader, source)
		gl.compileShader(shader)
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			console.error('sky shader:', gl.getShaderInfoLog(shader))
			return null
		}
		return shader
	}

	function sky(canvas: HTMLCanvasElement) {
		const gl = canvas.getContext('webgl', { antialias: false, depth: false, alpha: false })
		if (!gl) return

		const vert = compile(gl, gl.VERTEX_SHADER, vertexSource)
		const frag = compile(gl, gl.FRAGMENT_SHADER, fragmentSource)
		if (!vert || !frag) return

		const program = gl.createProgram()!
		gl.attachShader(program, vert)
		gl.attachShader(program, frag)
		gl.linkProgram(program)
		gl.useProgram(program)

		const buffer = gl.createBuffer()
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
		const aPos = gl.getAttribLocation(program, 'a_pos')
		gl.enableVertexAttribArray(aPos)
		gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

		const uRes = gl.getUniformLocation(program, 'u_res')
		const uTime = gl.getUniformLocation(program, 'u_time')

		// Render soft: ~2/3 of CSS resolution gives the sky a painterly haze
		const density = Math.min(devicePixelRatio, 2) * 0.66

		function resize() {
			const w = Math.max(1, Math.round(canvas.clientWidth * density))
			const h = Math.max(1, Math.round(canvas.clientHeight * density))
			if (canvas.width !== w || canvas.height !== h) {
				canvas.width = w
				canvas.height = h
				gl!.viewport(0, 0, w, h)
			}
		}

		const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
		let visible = true
		let frame = 0
		const start = performance.now()
		// Drop into the noise field somewhere new on every visit
		const seed = 40 + Math.random() * 600

		function draw(now: number) {
			frame = 0
			resize()
			gl!.uniform2f(uRes, canvas.width, canvas.height)
			gl!.uniform1f(uTime, (now - start) / 1000 + seed)
			gl!.drawArrays(gl!.TRIANGLES, 0, 3)
			if (!reduceMotion && visible) {
				frame = requestAnimationFrame(draw)
			}
		}

		const observer = new IntersectionObserver(([entry]) => {
			visible = entry.isIntersecting
			if (visible && !frame) {
				frame = requestAnimationFrame(draw)
			}
		})
		observer.observe(canvas)

		frame = requestAnimationFrame(draw)

		return () => {
			observer.disconnect()
			cancelAnimationFrame(frame)
			gl.getExtension('WEBGL_lose_context')?.loseContext()
		}
	}
</script>

<div class="sky" aria-hidden="true">
	<canvas {@attach sky}></canvas>
</div>

<style>
	.sky {
		/* Overhang the content column so the side fades live in the gutters
		 * and the solid sky lines up with the content edges */
		width: calc(100% + 340px);
		margin: -36px -170px 56px;
		aspect-ratio: 3 / 1;
		pointer-events: none;
		/* fallback wash if WebGL is unavailable — same palette, no motion */
		background: radial-gradient(
			ellipse 60% 55% at 50% 42%,
			#8fbcf5 0%,
			#c8e0fb 55%,
			#fff 100%
		);
	}

	.sky canvas {
		display: block;
		width: 100%;
		height: 100%;
	}

	@media (max-width: 960px) {
		/* full bleed: break out of the content column to the viewport edges */
		.sky {
			width: 100vw;
			margin-left: calc(50% - 50vw);
			margin-right: calc(50% - 50vw);
			aspect-ratio: 21 / 10;
		}
	}
</style>
