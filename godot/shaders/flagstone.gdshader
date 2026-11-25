shader_type spatial;

// The ground: PBR texture sets laid in world space, continuous across the rotated floor tiles.
// Paved cells (INSTANCE_CUSTOM.r = 1) use `paved_*` (cobbles in town, flagstones in the crypt),
// the rest use `earth_*`. The per-cell colour from the level adds variation. Textures come from
// scripts/assets/blender/materials.py (see /assets.md).
uniform sampler2D paved_albedo : source_color, filter_linear_mipmap_anisotropic, repeat_enable;
uniform sampler2D paved_normal : hint_normal, filter_linear_mipmap_anisotropic, repeat_enable;
uniform sampler2D paved_roughness : hint_default_white, filter_linear_mipmap_anisotropic, repeat_enable;
uniform sampler2D earth_albedo : source_color, filter_linear_mipmap_anisotropic, repeat_enable;
uniform sampler2D earth_normal : hint_normal, filter_linear_mipmap_anisotropic, repeat_enable;
uniform sampler2D earth_roughness : hint_default_white, filter_linear_mipmap_anisotropic, repeat_enable;
// Metres covered by one repeat of each texture.
uniform float paved_size = 4.0;
uniform float earth_size = 6.0;
// How much the per-cell colour shows through (0 = texture only).
uniform float cell_tint = 0.45;
uniform float brightness = 1.0;
// Puddled, wet patches (0 = dry). They are glossy, so the screen-space reflections catch torchlight in them.
uniform float wetness : hint_range(0.0, 1.0) = 0.6;
// Kept for older callers; the texture sets have their own courses.
uniform vec2 course_size = vec2(1.30, 0.82);

varying vec2 ground;
varying float paved;
varying float edge_mask;
varying vec2 local;

void vertex() {
	ground = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xz;
	paved = INSTANCE_CUSTOM.r;
	edge_mask = INSTANCE_CUSTOM.g * 15.0;
	local = ground - MODEL_MATRIX[3].xz;  // world-space offset from the tile centre: -1..1 across a cell
}

float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p) {
	vec2 i = floor(p), f = fract(p);
	f = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash2(i), hash2(i + vec2(1, 0)), f.x), mix(hash2(i + vec2(0, 1)), hash2(i + vec2(1, 1)), f.x), f.y);
}

void fragment() {
	vec2 uv_p = ground / paved_size;
	vec2 uv_e = ground / earth_size;
	// Where paving meets earth the border is ragged: soil creeps over the stones, and grass-dark soil spills
	// in from the edge, instead of a ruler-straight cell boundary.
	float to_edge_n = 1.0 - (local.y + 1.0) * 0.5;  // 1 at the north edge
	float to_edge_e = (local.x + 1.0) * 0.5;
	float to_edge_s = (local.y + 1.0) * 0.5;
	float to_edge_w = 1.0 - (local.x + 1.0) * 0.5;
	float near = 0.0;
	near = max(near, mod(floor(edge_mask), 2.0) > 0.5 ? to_edge_n : 0.0);
	near = max(near, mod(floor(edge_mask / 2.0), 2.0) > 0.5 ? to_edge_e : 0.0);
	near = max(near, mod(floor(edge_mask / 4.0), 2.0) > 0.5 ? to_edge_s : 0.0);
	near = max(near, mod(floor(edge_mask / 8.0), 2.0) > 0.5 ? to_edge_w : 0.0);
	float ragged = vn(ground * 3.1) * 0.55 + vn(ground * 9.0) * 0.3;
	float creep = paved * smoothstep(0.55, 0.95, near + ragged * 0.55 - 0.15);
	float p_mix = paved * (1.0 - creep);
	vec3 alb = mix(texture(earth_albedo, uv_e).rgb, texture(paved_albedo, uv_p).rgb, p_mix);
	vec3 nrm = mix(texture(earth_normal, uv_e).rgb, texture(paved_normal, uv_p).rgb, p_mix);
	float rough = mix(texture(earth_roughness, uv_e).r, texture(paved_roughness, uv_p).r, p_mix);
	// Cavity occlusion: mortar and gaps between stones are darker, and gather grime and a little moss.
	float lum = dot(alb, vec3(0.333));
	float cavity = smoothstep(0.05, 0.3, lum);
	alb *= mix(0.55, 1.0, cavity * p_mix + (1.0 - p_mix));
	float moss_gap = (1.0 - cavity) * p_mix * smoothstep(0.45, 0.8, vn(ground * 1.7));
	alb = mix(alb, vec3(0.07, 0.11, 0.04) * (0.7 + lum), moss_gap * 0.6);
	// The level's cell colours are dark (made for untextured tiles); normalise them to around 1.
	vec3 tint = mix(vec3(1.0), clamp(COLOR.rgb / max(dot(COLOR.rgb, vec3(0.333)), 0.01), 0.6, 1.4), cell_tint);
	// Break the tiling: two big, unrelated cloud layers of light and dark that never repeat in view.
	float macro = (texture(earth_albedo, ground / 23.0).r + texture(paved_albedo, ground / 37.0 + 0.37).g) * 0.5;
	float wear = mix(0.78, 1.22, smoothstep(0.2, 0.8, macro));
	// Wet patches sit in the low-lying, darker parts of that same field.
	float damp = smoothstep(0.55, 0.7, texture(earth_albedo, ground / 11.0 + vec2(0.3, 0.1)).g * 0.6 + macro * 0.4) * wetness;
	ALBEDO = alb * tint * brightness * wear * (1.0 - 0.4 * damp);
	NORMAL_MAP = nrm;
	NORMAL_MAP_DEPTH = mix(1.2, 0.5, damp);
	ROUGHNESS = mix(rough, 0.1, damp);
	SPECULAR = mix(0.5, 0.8, damp);
}
