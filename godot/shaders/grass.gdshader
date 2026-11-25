shader_type spatial;
render_mode cull_disabled;
// Grass blades: wind sway that grows toward the tip, a dark root to a lit tip gradient, and a gentle
// bend away from the hero. The blade mesh has UV.y = 0 at the root and 1 at the tip.
uniform vec3 root_color : source_color = vec3(0.06, 0.13, 0.04);
uniform vec3 tip_color : source_color = vec3(0.42, 0.62, 0.2);
uniform vec3 dry_color : source_color = vec3(0.5, 0.42, 0.2);
uniform float wind_strength = 0.16;
uniform float wind_speed = 1.3;
global uniform vec3 hero_pos;
varying float tip;
varying float tone;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

void vertex() {
	vec3 origin = (MODEL_MATRIX * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
	vec3 wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	tip = UV.y;
	tone = hash(floor(origin.xz * 3.1));
	float bend = tip * tip;
	float gust = sin(origin.x * 0.35 + origin.z * 0.2 + TIME * wind_speed) + 0.5 * sin(origin.x * 0.9 - TIME * wind_speed * 1.7 + origin.z * 0.6);
	vec3 push = vec3(gust, 0.0, gust * 0.6 + sin(TIME * wind_speed * 0.8 + origin.x) * 0.3) * wind_strength * bend;
	vec3 away = wp - hero_pos;
	float near = 1.0 - smoothstep(0.0, 1.4, length(away.xz));
	push += normalize(vec3(away.x, 0.0, away.z) + 0.0001) * near * 0.55 * bend;
	VERTEX += (inverse(MODEL_MATRIX) * vec4(push, 0.0)).xyz;
}

void fragment() {
	vec3 c = mix(root_color, tip_color, smoothstep(0.0, 0.9, tip));
	c = mix(c, dry_color, tone * 0.55 * tip);
	ALBEDO = c;
	ROUGHNESS = 0.7;
	SPECULAR = 0.25;
	BACKLIGHT = c * 0.35;
}
