shader_type spatial;

// Broad ripples crossing fine wind lines. World coordinates keep the scale
// constant across rooms of different widths.
varying vec2 surface;
void vertex() {
	surface = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xz;
}
void fragment() {
	float phase = dot(surface, vec2(1.1, 0.54)) + TIME * 0.82;
	float cross_wave = dot(surface, vec2(-0.65, 2.2)) - TIME * 0.56;
	float wave = sin(phase + 0.45 * sin(cross_wave));
	float glint = smoothstep(0.78, 1.0, wave) * (0.5 + 0.5 * sin(cross_wave));
	ALBEDO = mix(vec3(0.013, 0.039, 0.046), vec3(0.046, 0.105, 0.105), glint);
	ROUGHNESS = mix(0.32, 0.13, glint);
	NORMAL_MAP = normalize(vec3(0.075 * cos(phase), 0.055 * cos(cross_wave), 1.0)) * 0.5 + 0.5;
}
