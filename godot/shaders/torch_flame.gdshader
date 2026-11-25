shader_type spatial;
render_mode unshaded, shadows_disabled;

varying float height;

void vertex() {
	height = clamp(VERTEX.y / 0.42, 0.0, 1.0);
	float phase = dot(MODEL_MATRIX[3].xz, vec2(1.7, 2.1));
	float gust = sin(TIME * 6.0 + phase) + 0.35 * sin(TIME * 11.0 + phase);
	VERTEX.x += height * height * gust * 0.075;
	VERTEX.z += height * height * sin(TIME * 4.0 + phase) * 0.035;
	VERTEX.y *= 1.0 + gust * 0.09;
}

void fragment() {
	ALBEDO = mix(vec3(2.6, 1.3, 0.18), vec3(1.5, 0.13, 0.012), height);
}
