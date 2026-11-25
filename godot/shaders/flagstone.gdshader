shader_type spatial;

// Staggered courses laid in world space, continuous across the rotated floor tiles.
uniform vec2 course_size = vec2(1.30, 0.82);
varying vec2 ground;
varying float paved;
void vertex() {
	ground = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xz;
	paved = INSTANCE_CUSTOM.r;
}

void fragment() {
	vec2 course = ground / course_size;
	course.x += 0.5 * mod(floor(course.y), 2.0);
	vec2 block = floor(course);
	float variation = fract(sin(dot(block, vec2(39.61, 17.13))) * 4271.51);
	vec2 local = fract(course);
	vec2 edges = min(local, 1.0 - local) * course_size;
	float bevel = smoothstep(0.012, 0.056, min(edges.x, edges.y));
	float weather = sin(ground.x * 0.81 + sin(ground.y)) * cos(ground.y * 0.64);
	float stone = mix(0.53, 0.92 + variation * 0.25, bevel);
	ALBEDO = COLOR.rgb * mix(1.0, stone, paved) * (1.0 + weather * 0.07);
	ROUGHNESS = mix(0.94, 0.75 - weather * 0.12, paved * bevel);
}
