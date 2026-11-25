shader_type spatial;
render_mode specular_schlick_ggx;
// Fen river: depth-tinted water, flowing ripple normals, fresnel sky reflection and shore foam.
uniform vec3 shallow_color : source_color = vec3(0.09, 0.27, 0.27);
uniform vec3 deep_color : source_color = vec3(0.012, 0.055, 0.075);
uniform vec3 foam_color : source_color = vec3(0.38, 0.46, 0.48);
uniform vec3 sky_color : source_color = vec3(0.2, 0.26, 0.38);
uniform vec2 flow = vec2(0.55, 0.0);
uniform float ripple_scale = 1.1;
uniform float depth_fade = 1.7;
uniform float foam_width = 0.16;
uniform sampler2D bed : filter_linear, repeat_disable;
uniform vec4 bed_rect = vec4(0.0, 0.0, 1.0, 1.0);
uniform float water_y = -0.15;
varying vec2 ground;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
	vec2 i = floor(p), f = fract(p);
	f = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float height(vec2 p, float t) {
	float h = vnoise(p * ripple_scale * 2.0 - flow * t) * 0.6;
	h += vnoise(p * ripple_scale * 4.3 + vec2(-t * 0.6, t * 0.35)) * 0.3;
	h += vnoise(p * ripple_scale * 9.0 - flow * t * 1.7) * 0.1;
	return h;
}

void vertex() {
	ground = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xz;
}

void fragment() {
	float t = TIME;
	float e = 0.06;
	float h0 = height(ground, t);
	float hx = height(ground + vec2(e, 0.0), t);
	float hz = height(ground + vec2(0.0, e), t);
	vec3 n = normalize(vec3((h0 - hx) * 1.8, 1.0, (h0 - hz) * 1.8));
	NORMAL = normalize((VIEW_MATRIX * vec4(n, 0.0)).xyz);
	// Water depth comes from a baked height map of the riverbed (see fen.gd), not the depth buffer.
	vec2 uv = (ground - bed_rect.xy) / bed_rect.zw;
	float bed_y = texture(bed, uv).r;
	float thick = clamp(water_y - bed_y + (h0 - 0.5) * 0.06, 0.0, 6.0);
	float depth01 = 1.0 - exp(-thick / depth_fade);
	vec3 col = mix(shallow_color, deep_color, depth01);
	float edge = 1.0 - smoothstep(0.0, foam_width, thick);
	float lace = smoothstep(0.25, 0.95, vnoise(ground * 5.0 + vec2(t * 0.35, -t * 0.2)) + vnoise(ground * 11.0 - t * 0.5) * 0.4);
	float foam = edge * lace;
	float streak = smoothstep(0.62, 0.9, vnoise(vec2(ground.x * 0.9 - t * flow.x * 1.5, ground.y * 7.0)));
	float fres = pow(1.0 - clamp(dot(normalize(NORMAL), normalize(VIEW)), 0.0, 1.0), 3.0);
	col = mix(col, sky_color, fres * 0.55);
	col = mix(col, foam_color, foam * 0.9 + streak * 0.06);
	ALBEDO = col;
	ALPHA = clamp(0.55 + depth01 * 0.4 + foam, 0.0, 1.0) * smoothstep(0.0, 0.05, thick);

	ROUGHNESS = mix(0.06, 0.55, foam);
	SPECULAR = 0.9;
	EMISSION = vec3(0.004, 0.016, 0.02) + foam * vec3(0.012, 0.016, 0.016);

}
