shader_type spatial;
// Painterly dark-fantasy look: banded diffuse, warm rim light, optional glow.

uniform vec4 albedo : source_color = vec4(0.5, 0.5, 0.5, 1.0);
uniform vec4 rim_color : source_color = vec4(1.0, 0.55, 0.25, 1.0);
uniform vec4 emission_color : source_color = vec4(0.0, 0.0, 0.0, 1.0);
uniform float emission_energy = 0.0;
uniform float rim_power = 3.0;
uniform float rim_strength = 0.4;
uniform float bands = 3.0;

uniform sampler2D grain : source_color, repeat_enable, filter_linear_mipmap_anisotropic;
varying vec3 part_pos;
varying vec3 part_normal;

void vertex() {
	part_pos = VERTEX;
	part_normal = NORMAL;
}

void fragment() {
	vec3 weight = pow(abs(normalize(part_normal)), vec3(4.0));
	weight /= max(dot(weight, vec3(1.0)), 0.001);
	vec3 p = part_pos * 1.8;
	float patina = dot(weight, vec3(texture(grain, p.yz).r, texture(grain, p.xz).r, texture(grain, p.xy).r));
	ALBEDO = albedo.rgb * mix(0.7, 1.1, patina);
	ROUGHNESS = 0.85;
	float rim = pow(1.0 - clamp(dot(normalize(NORMAL), normalize(VIEW)), 0.0, 1.0), rim_power);
	EMISSION = rim_color.rgb * rim * rim_strength + emission_color.rgb * emission_energy;
}

void light() {
	float ndl = clamp(dot(NORMAL, LIGHT), 0.0, 1.0);
	float banded = mix(ndl, floor(ndl * bands + 0.5) / bands, 0.6);
	float highlight = pow(max(dot(NORMAL, normalize(LIGHT + VIEW)), 0.0), 32.0);
	SPECULAR_LIGHT += LIGHT_COLOR * ATTENUATION * highlight * 0.12;
	DIFFUSE_LIGHT += LIGHT_COLOR * ATTENUATION * banded / PI;
}
