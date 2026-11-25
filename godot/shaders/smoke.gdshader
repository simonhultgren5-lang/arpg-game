shader_type spatial;
render_mode unshaded, blend_mix, cull_disabled, depth_draw_never, shadows_disabled;
// Soft billboard smoke / dust / poison cloud: a fractal-noise puff that dissolves as it ages. Unshaded but
// self-lit with a bright rim against the dark so it still reads at night.
uniform vec3 tint : source_color = vec3(0.38, 0.36, 0.38);
uniform vec3 lit : source_color = vec3(0.7, 0.68, 0.7);
uniform float opacity = 0.55;
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
	for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.05 + 3.1; a *= 0.5; }
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
	vec2 p = UV * 2.0 - 1.0;
	float n = fbm(p * 1.8 + seed * 9.0 + TIME * 0.12);
	float shape = 1.0 - length(p);
	float a = clamp(shape * 1.35 + (n - 0.5) * 1.1, 0.0, 1.0);
	a *= smoothstep(0.0, 0.12, age) * (1.0 - age);
	ALBEDO = mix(tint, lit, smoothstep(0.35, 0.8, n));
	ALPHA = a * opacity * COLOR.a;
}
