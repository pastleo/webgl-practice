import { loadImage } from './lib/utils.js';
import { createImageTexture, createAttributeBuffer, transferToBuffer, setTextureToUnifrom } from './lib/gl.js';

const vertexShaderSourceOri = `#version 300 es

in vec2 a_position;
in vec2 a_texcorrd;

uniform vec2 u_resolution;
uniform vec2 u_scale;
uniform vec2 u_rotation;
uniform vec2 u_translation;

out vec2 v_texcorrd;

void main() {
  vec2 scaled_position = vec2(a_position.x * u_scale.x, a_position.y * u_scale.y);
  vec2 rotated_position = vec2(
    scaled_position.x * u_rotation.y + scaled_position.y * u_rotation.x,
    scaled_position.y * u_rotation.y - scaled_position.x * u_rotation.x
  );
  gl_Position = vec4(
    ((rotated_position + u_translation) / u_resolution * 2.0 - 1.0) * vec2(1, -1),
    0, 1
  );
  v_texcorrd = a_texcorrd;
}
`;
const fragmentShaderSource = `#version 300 es
precision highp float;

in vec2 v_texcorrd;
uniform vec2 u_resolution;

uniform sampler2D u_texture;
out vec4 outColor;

void main() {
  outColor = texture(u_texture, v_texcorrd / u_resolution);
}
`;

export async function createRenderer(gl) {
  const program = webglUtils.createProgramFromSources(gl, [vertexShaderSourceOri, fragmentShaderSource]);

  const image = await loadImage('assets/me.png');
  gl.canvas.width = image.width;
  gl.canvas.height = image.height;

  // vertex array object
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  return {
    program, vao,
    buffers: {
      position: createAttributeBuffer(gl, program, 'a_position', 2),
      texcorrd: createAttributeBuffer(gl, program, 'a_texcorrd', 2),
    },
    uniforms: {
      resolution: gl.getUniformLocation(program, 'u_resolution'),
      texture: gl.getUniformLocation(program, 'u_texture'),
      scale: gl.getUniformLocation(program, 'u_scale'),
      rotation: gl.getUniformLocation(program, 'u_rotation'),
      translation: gl.getUniformLocation(program, 'u_translation'),
    },
    textures: {
      image: await createImageTexture(gl, image),
    },
  }
}

export function render(gl, renderer, controls) {
  // https://webglfundamentals.org/webgl/lessons/webgl-resizing-the-canvas.html
  webglUtils.resizeCanvasToDisplaySize(gl.canvas);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  gl.useProgram(renderer.program);
  gl.bindVertexArray(renderer.vao);

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.clearColor(1, 1, 1, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  if (controls.mode === 'crop') {
    const renderCorrd = new Float32Array([
      controls.x, controls.y,
      controls.x + controls.width, controls.y,
      controls.x, controls.y + controls.height,

      controls.x, controls.y + controls.height,
      controls.x + controls.width, controls.y,
      controls.x + controls.width, controls.y + controls.height,
    ])

    transferToBuffer(gl, renderer.buffers.texcorrd, renderCorrd);
    transferToBuffer(gl, renderer.buffers.position, renderCorrd);
    gl.uniform2f(renderer.uniforms.scale, 1, 1);
    gl.uniform2f(renderer.uniforms.rotation, 0, 1);
    gl.uniform2f(renderer.uniforms.translation, 0, 0);
  } else {
    transferToBuffer(gl, renderer.buffers.texcorrd, new Float32Array([
      0, 0,
      gl.canvas.width, 0,
      0, gl.canvas.height,

      0, gl.canvas.height,
      gl.canvas.width, 0,
      gl.canvas.width, gl.canvas.height,
    ]));
    transferToBuffer(gl, renderer.buffers.position, new Float32Array([
      -controls.width / 2, -controls.height / 2,
      controls.width / 2, -controls.height / 2,
      -controls.width / 2, controls.height / 2,

      -controls.width / 2, controls.height / 2,
      controls.width / 2, - controls.height / 2,
      controls.width / 2, controls.height / 2,
    ]));
    gl.uniform2f(renderer.uniforms.scale, controls.scaleX, controls.scaleY);
    gl.uniform2f(renderer.uniforms.rotation, Math.sin(-Math.PI * controls.degree / 180), Math.cos(-Math.PI * controls.degree / 180));
    gl.uniform2f(renderer.uniforms.translation, controls.x, controls.y);
  }

  gl.uniform2f(renderer.uniforms.resolution, gl.canvas.width, gl.canvas.height);
  setTextureToUnifrom(gl, 0, renderer.uniforms.image, renderer.textures.image);
  gl.drawArrays(gl.TRIANGLES, /* offset: */ 0, /* count: */ 6);
}
