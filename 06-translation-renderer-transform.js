import { pipe, loadImage } from './lib/utils.js';
import { createImageTexture, createAttributeBuffer, transferToBuffer, setTextureToUnifrom } from './lib/gl.js';
import { matrix3 } from './lib/matrix.js';

const vertexShaderSourceOri = `

attribute vec2 a_position;
attribute vec2 a_texcorrd;

uniform vec2 u_resolution;
uniform mat3 u_transform;

varying vec2 v_texcorrd;

void main() {
  gl_Position = vec4(
    (u_transform * vec3(a_position, 1.0)).xy,
    0, 1
  );
  v_texcorrd = a_texcorrd;
}
`;
const fragmentShaderSource = `
precision highp float;

varying vec2 v_texcorrd;
uniform vec2 u_resolution;

uniform sampler2D u_texture;

void main() {
  gl_FragColor = texture2D(u_texture, v_texcorrd / u_resolution);
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
      transform: gl.getUniformLocation(program, 'u_transform'),
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

  gl.uniform2f(renderer.uniforms.resolution, gl.canvas.width, gl.canvas.height);
  setTextureToUnifrom(gl, 0, renderer.uniforms.image, renderer.textures.image);

  let transformMatrix = matrix3.identity();

  for(let i = 0; i < 3; i++) {
    transformMatrix = pipe(
      transformMatrix,
      m => matrix3.translate(m, controls.x, controls.y),
      m => matrix3.rotate(m, controls.degree * Math.PI / 180),
      m => matrix3.scale(m, controls.scaleX, controls.scaleY),
      matrix3.inspect
    )

    gl.uniformMatrix3fv(renderer.uniforms.transform, false,
      pipe(
        transformMatrix,
        m => matrix3.multiply(matrix3.scaling(2 / gl.canvas.width, 2 / gl.canvas.height), m),
        m => matrix3.multiply(matrix3.translation(-1, -1), m),
        m => matrix3.multiply(matrix3.scaling(1, -1), m),
      )
    );

    gl.drawArrays(gl.TRIANGLES, /* offset: */ 0, /* count: */ 6);
  }
}
