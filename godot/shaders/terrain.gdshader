shader_type spatial;
// Fen terrain: one shader blends earth, grass, wet mud, shale cliffs and frosted peaks by slope, height
// and the painted vertex colour. World-space triplanar so the mesh needs no UVs, with a large-scale
// breakup so nothing visibly tiles.
uniform sampler2D earth_albedo : source_color, repeat_enable, filter_linear_mipmap_anisotropic;
uniform sampler2D earth_normal : hint_normal, repeat_enable, filter_linear_mipmap_anisotropic;
uniform sampler2D rock_albedo : source_color, repeat_enable, filter_linear_mipmap_anisotropic;
uniform sampler2D rock_normal : hint_normal, repeat_enable, filter_linear_mipmap_anisotropic;
uniform float earth_scale = 0.28;
uniform float rock_scale = 0.16;
uniform vec3 grass_color : source_color = vec3(0.19, 0.34, 0.09);
uniform vec3 grass_dry : source_color = vec3(0.36, 0.36, 0.14);
uniform vec3 mud_color : source_color = vec3(0.075, 0.062, 0.05);
uniform vec3 rock_tint : source_color = vec3(0.95, 0.93, 1.0);
uniform vec3 frost_color : source_color = vec3(0.78, 0.84, 0.92);
uniform float frost_height = 17.0;

varying vec3 wpos;
varying vec3 wnorm;
varying vec4 paint;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
	vec2 i = floor(p), f = fract(p);
	f = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) {
	float a = 0.5, s = 0.0;
	for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + 11.7; a *= 0.5; }
	return s;
}
vec4 tri(sampler2D t, vec3 p, vec3 w, float s) {
	return texture(t, p.yz * s) * w.x + texture(t, p.xz * s) * w.y + texture(t, p.xy * s) * w.z;
}

void vertex() {
	wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	wnorm = normalize((MODEL_MATRIX * vec4(NORMAL, 0.0)).xyz);
	paint = COLOR;
}

void fragment() {
	vec3 n = normalize(wnorm);
	vec3 w = pow(abs(n), vec3(6.0));
	w /= dot(w, vec3(1.0));
	float macro = fbm(wpos.xz * 0.06);
	float meso = fbm(wpos.xz * 0.45 + 3.0);
	float slope = 1.0 - clamp(n.y, 0.0, 1.0);
	// Cliff mask: steep faces become shale, with a ragged edge.
	float cliff = smoothstep(0.22, 0.46, slope + (meso - 0.5) * 0.22);
	float scree = smoothstep(0.1, 0.3, slope) * (1.0 - cliff);
	vec3 earth = tri(earth_albedo, wpos, w, earth_scale).rgb;
	earth = mix(earth, tri(earth_albedo, wpos * 0.37 + 5.0, w, earth_scale).rgb, 0.45);
	vec3 rock = tri(rock_albedo, wpos, w, rock_scale).rgb * rock_tint;
	// Strata bands on the cliffs.
	float strata = sin(wpos.y * 5.5 + fbm(wpos.xz * 0.7) * 5.0) * 0.5 + 0.5;
	rock *= mix(0.72, 1.12, strata);
	// Ground cover: the vertex paint (grass, road, shale, mud) tints a normalised earth texture.
	vec3 hue = paint.rgb;
	float lum = dot(hue, vec3(0.333));
	vec3 detail = clamp(earth / max(dot(earth, vec3(0.333)), 0.02), 0.45, 1.7);
	vec3 cover = mix(grass_color, grass_dry, smoothstep(0.35, 0.75, macro + meso * 0.3));
	vec3 ground = mix(cover * 2.1, hue * 0.5, 0.18) * detail;
	// The pilgrim road is paler, dry earth.
	float roady = smoothstep(0.1, 0.35, hue.r - hue.b);
	ground = mix(ground, hue * 0.55 * detail, roady);
	// Wet banks: darker, glossier mud near and under the waterline.
	float wet = 1.0 - smoothstep(-0.55, 0.12, wpos.y);
	ground = mix(ground, mud_color * (0.7 + earth * 0.9), wet);
	vec3 col = mix(ground, rock, cliff);
	col = mix(col, rock * 1.15, scree * 0.5);
	float frost = smoothstep(frost_height, frost_height + 2.2, wpos.y + (macro - 0.5) * 2.0) * smoothstep(0.1, 0.4, n.y);
	col = mix(col, frost_color, frost * 0.85);
	ALBEDO = col;
	vec3 en = tri(earth_normal, wpos, w, earth_scale).rgb;
	vec3 rn = tri(rock_normal, wpos, w, rock_scale).rgb;
	NORMAL_MAP = mix(en, rn, cliff);
	NORMAL_MAP_DEPTH = mix(0.9, 1.5, cliff);
	ROUGHNESS = mix(mix(0.92, 0.6, wet), 0.8, cliff);
	ROUGHNESS = mix(ROUGHNESS, 0.5, frost);
	SPECULAR = 0.35;
}
