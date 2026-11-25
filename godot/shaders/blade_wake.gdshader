shader_type spatial;
render_mode unshaded, blend_add, cull_disabled, shadows_disabled, depth_draw_never;

uniform vec4 tint : source_color;
uniform float progress : hint_range(0.0, 1.0) = 0.0;

void fragment() {
	float head = progress * 2.3;
	float distance_behind = head - UV.x;
	float wake = smoothstep(-0.04, 0.04, distance_behind)
		* (1.0 - smoothstep(0.12, 1.25, distance_behind));
	float edge = smoothstep(0.77, 0.94, UV.y);
	ALBEDO = mix(tint.rgb, vec3(1.0, 0.89, 0.68), edge) * (1.2 + edge);
	ALPHA = wake * (0.12 + UV.y * 0.32 + edge * 0.52);
}
