shader_type canvas_item;
// Health / resource orb: a glass sphere of liquid that drains from the top, ringed in worked bronze.
uniform vec4 liquid : source_color = vec4(0.72, 0.09, 0.1, 1.0);
uniform float fill : hint_range(0.0, 1.0) = 1.0;
uniform float t = 0.0;

float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }

void fragment() {
	vec2 p = UV * 2.0 - 1.0;
	float r = length(p);

	vec3 col = vec3(0.012, 0.008, 0.018);
	float sph = sqrt(max(0.0, 1.0 - r * r));            // sphere height: 1 at centre, 0 at the edge

	// Liquid surface (screen y grows downward): fill 1 -> top, 0 -> bottom.
	float level = 1.0 - 2.0 * fill;
	float wave = sin(p.x * 6.5 + t * 2.1) * 0.028 + sin(p.x * 12.0 - t * 3.0) * 0.012;
	float surface_y = level + wave * smoothstep(0.0, 0.15, fill) * smoothstep(1.0, 0.85, fill);
	float below = step(surface_y, p.y);
	float depth = clamp((p.y - surface_y) / 1.4, 0.0, 1.0);

	vec3 lq = liquid.rgb * mix(1.15, 0.38, depth);       // lighter at the surface, deep at the bottom
	lq *= 0.35 + 0.9 * pow(sph, 0.7);                   // roll off toward the rim like a lit sphere
	// Slow rising motes inside the liquid.
	vec2 g = vec2(p.x * 9.0, p.y * 9.0 + t * 1.3);
	float mote = step(0.985, hash(floor(g))) * smoothstep(0.5, 0.0, length(fract(g) - 0.5));
	lq += liquid.rgb * mote * 0.9;
	// Bright meniscus line.
	float meniscus = smoothstep(0.05, 0.0, abs(p.y - surface_y)) * step(0.001, fill) * step(fill, 0.999);
	lq += mix(liquid.rgb, vec3(1.0), 0.55) * meniscus * 0.55;
	col = mix(col, lq, below);

	// Under-glass reflections: broad top-left highlight, thin rim light on the lower right.
	col += vec3(1.0) * smoothstep(0.42, 0.0, length((p - vec2(-0.36, -0.42)) * vec2(1.0, 1.7))) * 0.2;
	col += liquid.rgb * smoothstep(0.55, 1.0, dot(normalize(p + 1e-4), vec2(0.6, 0.8))) * smoothstep(0.7, 0.95, r) * 0.35;

	// Worked-bronze ring: bevelled, with a lit upper-left and a dark lower-right.
	float a = atan(p.y, p.x);
	float lit = 0.5 + 0.5 * cos(a + 2.35);
	vec3 bronze = mix(vec3(0.13, 0.08, 0.05), vec3(0.98, 0.78, 0.5), pow(lit, 1.6));
	float ring_in = smoothstep(0.885, 0.915, r);
	float bevel = 0.7 + 0.3 * sin((r - 0.9) * 90.0);
	col = mix(col, bronze * bevel, ring_in);
	float groove = smoothstep(0.965, 0.975, r) * (1.0 - smoothstep(0.985, 0.995, r));
	col = mix(col, vec3(0.03, 0.02, 0.02), groove);
	// Dark inner shadow just inside the ring.
	col *= 1.0 - 0.45 * smoothstep(0.86, 0.9, r) * (1.0 - ring_in);
	COLOR = vec4(col, 1.0 - step(1.0, r));
}
