shader_type canvas_item;
// Vignette plus fine animated grain; drawn over the 3D view and under the interface.
uniform float vignette : hint_range(0.0, 1.0) = 0.55;
uniform float grain : hint_range(0.0, 0.1) = 0.035;

float hash(vec2 p) {
	return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void fragment() {
	vec2 uv = UV - 0.5;
	uv.x *= 1.15;
	float v = smoothstep(0.35, 0.95, length(uv));
	float n = hash(FRAGCOORD.xy + fract(TIME) * 61.0) - 0.5;
	// Darken the edges; grain is stronger in the shadows of the vignette.
	COLOR = vec4(vec3(0.015, 0.012, 0.025) + n * grain, v * vignette);
}
