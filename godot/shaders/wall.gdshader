shader_type spatial;
// Stone walls with a cut-away near the hero, so walls between the camera and the hero never hide them.

uniform vec4 albedo : source_color = vec4(0.22, 0.19, 0.24, 1.0);
uniform vec4 albedo_top : source_color = vec4(0.10, 0.08, 0.11, 1.0);
uniform vec3 player_pos = vec3(0.0);
uniform float cut_radius = 4.0;
uniform float cut_enabled = 1.0;
// Ashlar texture set (scripts/assets/blender/materials.py); one repeat covers `stone_size` metres.
uniform sampler2D stone_albedo : source_color, filter_linear_mipmap_anisotropic, repeat_enable;
uniform sampler2D stone_normal : hint_normal, filter_linear_mipmap_anisotropic, repeat_enable;
uniform sampler2D stone_roughness : hint_default_white, filter_linear_mipmap_anisotropic, repeat_enable;
uniform float stone_size = 2.4;
uniform float use_texture = 0.0;

varying vec3 wpos;
varying vec3 wnormal;

float hash(vec2 p) {
	return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void vertex() {
	wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	wnormal = normalize((MODEL_MATRIX * vec4(NORMAL, 0.0)).xyz);
}

void fragment() {
	vec2 d = wpos.xz - player_pos.xz;
	// The camera looks from +Z, so cut walls just south (in front) of the hero.
	if (cut_enabled > 0.5 && d.y > -0.3 && d.y < cut_radius * 1.6 && abs(d.x) < cut_radius && wpos.y > 0.35) {
		discard;
	}
	// Blocky stone courses.
	vec2 brick = vec2(wpos.x + wpos.z, wpos.y * 2.2);
	float row = floor(brick.y);
	brick.x += mod(row, 2.0) * 0.5;
	float n = hash(floor(brick * vec2(1.1, 1.0)));
	vec2 f = fract(brick * vec2(1.1, 1.0));
	float mortar = smoothstep(0.0, 0.06, f.x) * smoothstep(0.0, 0.06, f.y);
	vec3 col = albedo.rgb * (0.75 + 0.35 * n) * mix(0.55, 1.0, mortar);
	if (wnormal.y > 0.7) {
		col = albedo_top.rgb;
	}
	if (use_texture > 0.5) {
		// Walls run along X or Z, so X+Z walks along every face; Y goes up the wall.
		vec2 uv = vec2(wpos.x + wpos.z, -wpos.y) / stone_size;
		col = texture(stone_albedo, uv).rgb * albedo.rgb * 3.2;
		NORMAL_MAP = texture(stone_normal, uv).rgb;
		NORMAL_MAP_DEPTH = 1.4;
		if (wnormal.y > 0.7) {
			col = albedo_top.rgb;
		}
	}
	// Aged by water and time: damp and moss climb the base, soot darkens the top, vertical rain streaks run down.
	float along = wpos.x + wpos.z;
	float wob = hash(floor(vec2(along * 2.3, 0.0))) * 0.4 + hash(floor(vec2(along * 5.1, 1.0))) * 0.2;
	float damp = 1.0 - smoothstep(0.1, 1.5, wpos.y + wob - 0.3);
	float streak = smoothstep(0.55, 0.9, hash(floor(vec2(along * 9.0, 3.0))) * (0.6 + 0.4 * hash(floor(vec2(along * 3.0, floor(wpos.y * 0.6))))));
	col *= mix(1.0, 0.72, streak * 0.6);
	col *= mix(1.0, 0.8, smoothstep(2.4, 3.2, wpos.y));
	col = mix(col, vec3(0.06, 0.1, 0.04) * (0.8 + col * 2.0), damp * 0.6 * (wnormal.y < 0.7 ? 1.0 : 0.0));
	col *= mix(0.5, 1.0, smoothstep(0.0, 0.8, wpos.y));  // contact shadow at the base
	ALBEDO = col;
	ROUGHNESS = use_texture > 0.5 ? texture(stone_roughness, vec2(wpos.x + wpos.z, -wpos.y) / stone_size).r : 0.92;
}
