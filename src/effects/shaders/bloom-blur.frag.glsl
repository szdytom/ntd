#version 300 es
precision mediump float;

uniform sampler2D u_texture;
uniform vec2 u_step;
in vec2 v_uv;
out vec4 outColor;

void main() {
  vec4 color = texture(u_texture, v_uv) * 0.2270270270;
  color += texture(u_texture, v_uv + u_step * 1.3846153846) * 0.3162162162;
  color += texture(u_texture, v_uv - u_step * 1.3846153846) * 0.3162162162;
  color += texture(u_texture, v_uv + u_step * 3.2307692308) * 0.0702702703;
  color += texture(u_texture, v_uv - u_step * 3.2307692308) * 0.0702702703;
  outColor = color;
}
