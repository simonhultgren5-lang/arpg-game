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
// Kept for older callers; the texture sets have their own courses.
uniform vec2 course_size = vec2(1.30, 0.82);

varying vec2 ground;
varying float paved;

void vertex() {
	ground = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xz;
	paved = INSTANCE_CUSTOM.r;
}

void fragment() {
	vec2 uv_p = ground / paved_size;
	vec2 uv_e = ground / earth_size;
	vec3 alb = mix(texture(earth_albedo, uv_e).rgb, texture(paved_albedo, uv_p).rgb, paved);
	vec3 nrm = mix(texture(earth_normal, uv_e).rgb, texture(paved_normal, uv_p).rgb, paved);
	float rough = mix(texture(earth_roughness, uv_e).r, texture(paved_roughness, uv_p).r, paved);
	// The level's cell colours are dark (made for untextured tiles); normalise them to around 1.
	vec3 tint = mix(vec3(1.0), clamp(COLOR.rgb / max(dot(COLOR.rgb, vec3(0.333)), 0.01), 0.6, 1.4), cell_tint);
	ALBEDO = alb * tint * brightness;
	NORMAL_MAP = nrm;
	NORMAL_MAP_DEPTH = 1.2;
	ROUGHNESS = rough;
}
