shader_type spatial;
render_mode unshaded, blend_add, cull_disabled, depth_draw_never, shadows_disabled;
// Realistic fire: a billboarded, turbulent flame whose heat falls from a white-yellow core through orange
// to deep red. Domain-warped fractal noise scrolls upward, so every sprite licks and flickers differently.
// Works on a single quad (drive `manual_age` from a tween) or on CPUParticles3D (age comes from
// INSTANCE_CUSTOM.y and the colour ramp fades it out).
uniform vec3 hot : source_color = vec3(1.0, 0.93, 0.62);
uniform vec3 mid : source_color = vec3(1.0, 0.46, 0.1);
uniform vec3 cool : source_color = vec3(0.42, 0.05, 0.02);
uniform float strength = 1.7;
uniform float rise = 1.5;
uniform float turbulence = 1.0;
uniform float manual_age : hint_range(0.0, 1.0) = 0.0;
varying float seed;
varying float age;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
	vec2 i = floor(p), f = fract(p);
	f = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) {
	float a = 0.5, s = 0.0;
	for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.07 + 5.3; a *= 0.5; }
	return s;
}

void vertex() {
	vec3 sc = vec3(length(MODEL_MATRIX[0].xyz), length(MODEL_MATRIX[1].xyz), length(MODEL_MATRIX[2].xyz));
	mat4 bb = mat4(INV_VIEW_MATRIX[0] * sc.x, INV_VIEW_MATRIX[1] * sc.y, INV_VIEW_MATRIX[2] * sc.z, MODEL_MATRIX[3]);
	MODELVIEW_MATRIX = VIEW_MATRIX * bb;
	seed = hash(MODEL_MATRIX[3].xz + MODEL_MATRIX[3].y);
	age = clamp(INSTANCE_CUSTOM.y + manual_age, 0.0, 1.0);
}

void fragment() {
	vec2 p = vec2(UV.x * 2.0 - 1.0, 1.0 - UV.y * 2.0);
	float t = TIME * rise + seed * 17.0;
	// Narrow toward the tip, so the sprite reads as a tongue, not a disc.
	float taper = 1.0 + 0.9 * clamp(p.y * 0.5 + 0.5, 0.0, 1.0);
	vec2 q = vec2(p.x * taper, p.y);
	float warp = fbm(vec2(q.x * 2.0, q.y * 1.4 - t * 0.8)) - 0.5;
	float n = fbm(vec2(q.x * 3.0 + warp * 2.4 * turbulence, q.y * 2.2 - t * 1.6 + warp * 1.2));
	float body = 1.0 - length(vec2(q.x * 1.15, (q.y + 0.3) * 0.82));
	float f = clamp(body * 1.25 + (n - 0.46) * 1.15, 0.0, 1.0);
	f = f * f * (3.0 - 2.0 * f);
	float heat = f * (1.0 - age * 0.7);
	vec3 col = mix(cool, mid, smoothstep(0.08, 0.5, heat));
	col = mix(col, hot, smoothstep(0.5, 0.92, heat));
	ALBEDO = col * strength;
	ALPHA = smoothstep(0.015, 0.3, f) * (1.0 - age) * COLOR.a;
}
