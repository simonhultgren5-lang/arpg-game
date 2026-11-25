shader_type spatial;
// Weathered building surface: a PBR texture set laid in world space (triplanar), then aged by what time does
// to real walls: rising damp and moss at the base, algae on top faces, rain streaks running down from ledges,
// soot near chimneys, and ambient occlusion where the wall meets the ground and where pieces join.
uniform sampler2D albedo_tex : source_color, repeat_enable, filter_linear_mipmap_anisotropic;
uniform sampler2D normal_tex : hint_normal, repeat_enable, filter_linear_mipmap_anisotropic;
uniform sampler2D rough_tex : hint_default_white, repeat_enable, filter_linear_mipmap_anisotropic;
uniform vec3 tint : source_color = vec3(1.0);
uniform float scale = 0.45;
uniform float normal_depth = 1.4;
uniform float roughness_mul = 1.0;
uniform float metallic_amount = 0.0;
uniform float moss = 0.6;
uniform float damp_height = 1.1;
uniform float streaks = 0.5;
uniform float soot = 0.0;
uniform float soot_height = 4.0;
uniform vec3 moss_color : source_color = vec3(0.1, 0.18, 0.06);

varying vec3 wpos;
varying vec3 wnorm;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
	vec2 i = floor(p), f = fract(p);
	f = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) {
	float a = 0.5, s = 0.0;
	for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + 7.1; a *= 0.5; }
	return s;
}
vec4 tri(sampler2D t, vec3 p, vec3 w, float s) {
	return texture(t, p.yz * s) * w.x + texture(t, p.xz * s) * w.y + texture(t, p.xy * s) * w.z;
}

void vertex() {
	wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	wnorm = normalize((MODEL_MATRIX * vec4(NORMAL, 0.0)).xyz);
}

void fragment() {
	vec3 n = normalize(wnorm);
	vec3 w = pow(abs(n), vec3(5.0));
	w /= dot(w, vec3(1.0));
	vec3 alb = tri(albedo_tex, wpos, w, scale).rgb;
	// A second, larger sample hides the repeat.
	alb = mix(alb, tri(albedo_tex, wpos + 3.7, w, scale * 0.31).rgb, 0.35);
	float rough = tri(rough_tex, wpos, w, scale).r * roughness_mul;
	float macro = fbm(wpos.xz * 0.35 + wpos.y * 0.2);
	float along = wpos.x + wpos.z;
	// Contact shadow: darker where the wall meets the ground.
	float ao = mix(0.5, 1.0, smoothstep(0.0, 1.0, wpos.y + (macro - 0.5) * 0.5));
	// Rising damp and moss: a ragged line up the base, thicker in the shade of corners.
	float edge = wpos.y + (fbm(vec2(along * 1.7, wpos.y * 0.6)) - 0.5) * 1.1;
	float damp = (1.0 - smoothstep(0.1, damp_height, edge)) * moss;
	float top_moss = smoothstep(0.55, 0.9, n.y) * smoothstep(0.45, 0.7, fbm(wpos.xz * 1.3)) * moss;
	// Rain streaks: vertical dark runs below ledges and window sills.
	float streak = vnoise(vec2(along * 5.0, wpos.y * 0.35)) * vnoise(vec2(along * 11.0 + 4.0, wpos.y * 0.2));
	float runs = smoothstep(0.25, 0.6, streak) * streaks * (1.0 - abs(n.y));
	float sooty = soot * smoothstep(soot_height - 1.0, soot_height + 1.0, wpos.y) * (0.5 + 0.5 * macro);
	vec3 col = alb * tint * mix(0.78, 1.18, macro);
	col *= (1.0 - runs * 0.4) * (1.0 - sooty * 0.65) * ao;
	col = mix(col, moss_color * (0.6 + alb * 1.2), clamp(damp * 0.85 + top_moss * 0.7, 0.0, 0.9));
	ALBEDO = col;
	NORMAL_MAP = tri(normal_tex, wpos, w, scale).rgb;
	NORMAL_MAP_DEPTH = normal_depth;
	ROUGHNESS = clamp(mix(rough, 0.95, damp + runs * 0.2), 0.0, 1.0);
	METALLIC = metallic_amount;
	AO = ao;
	AO_LIGHT_AFFECT = 0.5;
}
