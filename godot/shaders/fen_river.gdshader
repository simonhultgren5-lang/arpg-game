shader_type spatial;
varying vec2 ground;
void vertex() {
	ground = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xz;
}
void fragment() {
	float current = sin(ground.y * 7.0 + sin(ground.x * 1.4 - TIME) + TIME * 2.1);
	float eddy = sin(ground.y * 3.3 + ground.x * 0.7 + sin(ground.x * 1.1 + TIME * 0.5));
	float glint = smoothstep(0.80, 1.0, current) * smoothstep(0.2, 1.0, eddy);
	ALBEDO = mix(vec3(0.037, 0.16, 0.16), vec3(0.22, 0.41, 0.38), glint);
	EMISSION = vec3(0.005, 0.018, 0.022) + glint * vec3(0.04, 0.065, 0.07);
	ROUGHNESS = 0.28;
}
