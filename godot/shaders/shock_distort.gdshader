shader_type spatial;
render_mode unshaded, blend_mix, cull_disabled, depth_draw_never, shadows_disabled;
// A refracting shock ring: bends the scene behind an expanding ring, like heat or pressure leaving a blast.
uniform sampler2D screen : hint_screen_texture, repeat_disable, filter_linear;
uniform float progress : hint_range(0.0, 1.0) = 0.0;
uniform float bend = 0.035;

void fragment() {
	vec2 p = UV * 2.0 - 1.0;
	float r = length(p);
	float ring_at = progress * 0.95;
	float band = smoothstep(0.16, 0.0, abs(r - ring_at)) * (1.0 - progress) * step(r, 1.0);
	vec2 dir = normalize(p + 0.0001);
	// Offset in screen space along the ring's outward direction as seen from above.
	vec2 off = (vec2(dir.x, dir.y) * band * bend);
	ALBEDO = texture(screen, SCREEN_UV + off).rgb;
	ALPHA = clamp(band * 3.0, 0.0, 1.0);
}
