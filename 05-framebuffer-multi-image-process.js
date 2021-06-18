import { createImageTexture, createAttributeBuffer, transferToBuffer, setTextureToUnifrom } from './lib/gl.js';
import { loadImage } from './lib/utils.js';

document.addEventListener('DOMContentLoaded', async () => {
  const canvas = document.getElementById('glCanvas');
  window.canvas = canvas;

  const gl = canvas.getContext('webgl2');
  if (!gl) {
    alert('Your browser does not support webgl2')
    return;
  }
  window.gl = gl;

  const mainRenderer = await createMainRenderer(gl);
  renderMain(gl, mainRenderer);
});

const vertexShaderSource = `#version 300 es

in vec4 a_position;
in vec2 a_texcorrd;

uniform vec2 u_resolution;
uniform float u_zFlip;

out vec2 v_texcorrd;

void main() {
  gl_Position = vec4(
    (a_position.xy / u_resolution * 2.0 - 1.0) * vec2(1, -1) * vec2(1, u_zFlip),
    0, 1
  );
  v_texcorrd = a_texcorrd;
}`;

const fragmentShaderSource = `#version 300 es
precision highp float;

in vec2 v_texcorrd;

uniform mat3 u_kernel;
uniform float u_kernelWeight;

uniform sampler2D u_texture;

out vec4 outColor;

void main() {
  vec2 onePixel = vec2(1) / vec2(textureSize(u_texture, 0));
  outColor = (
    texture(u_texture, v_texcorrd + onePixel * vec2(-1, -1)) * u_kernel[0][0] +
    texture(u_texture, v_texcorrd + onePixel * vec2( 0, -1)) * u_kernel[0][1] +
    texture(u_texture, v_texcorrd + onePixel * vec2( 1, -1)) * u_kernel[0][2] +
    texture(u_texture, v_texcorrd + onePixel * vec2(-1,  0)) * u_kernel[1][0] +
    texture(u_texture, v_texcorrd)                           * u_kernel[1][1] +
    texture(u_texture, v_texcorrd + onePixel * vec2( 1,  0)) * u_kernel[1][2] +
    texture(u_texture, v_texcorrd + onePixel * vec2(-1,  1)) * u_kernel[2][0] +
    texture(u_texture, v_texcorrd + onePixel * vec2( 0,  1)) * u_kernel[2][1] +
    texture(u_texture, v_texcorrd + onePixel * vec2( 1,  1)) * u_kernel[2][2]
  ) / u_kernelWeight;
}`;

const KERNELS = {
  normal: [
    0, 0, 0,
    0, 1, 0,
    0, 0, 0,
  ],
  gaussianBlur: [
    0.045, 0.122, 0.045,
    0.122, 0.332, 0.122,
    0.045, 0.122, 0.045,
  ],
  edgeDetect: [
    -5, 0, 0,
    0, 0, 0,
    0, 0, 5,
  ],
}

const renderingImgSize = [200, 200]

async function createMainRenderer(gl) {
  const program = webglUtils.createProgramFromSources(gl, [vertexShaderSource, fragmentShaderSource]);

  // vertex array object
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  // attribute buffers
  const buffers = {}
  buffers.position = createAttributeBuffer(gl, program, 'a_position', 2);
  buffers.texcorrd = createAttributeBuffer(gl, program, 'a_texcorrd', 2);

  // uniform locations
  const uniforms = {};
  uniforms.resolution = gl.getUniformLocation(program, 'u_resolution');
  uniforms.zFlip = gl.getUniformLocation(program, 'u_zFlip');
  uniforms.kernel = gl.getUniformLocation(program, 'u_kernel');
  uniforms.kernelWeight = gl.getUniformLocation(program, 'u_kernelWeight');
  uniforms.imageTexture = gl.getUniformLocation(program, 'u_texture');

  // textures
  const textures = {};
  textures.image = createImageTexture(gl, await loadImage('assets/me.png'));

  const attachedTextureFramebuffers = [
    createAttachedTextureFramebuffer(gl, renderingImgSize[0], renderingImgSize[1]),
  ];

  return {
    program, vao, buffers, uniforms, textures,
    attachedTextureFramebuffers,
  }
}

function renderMain(gl, renderer) {
  const {
    program, vao, buffers, uniforms, textures,
    attachedTextureFramebuffers,
  } = renderer;

  webglUtils.resizeCanvasToDisplaySize(gl.canvas);

  gl.useProgram(program);
  gl.bindVertexArray(vao);

  // transfer texcorrd attribute
  transferToBuffer(gl, buffers.texcorrd, new Float32Array([
    0, 0,
    1, 0,
    0, 1,

    0, 1,
    1, 0,
    1, 1,
  ]));

  // first render to framebuffer[0]
  bindFramebuffer(gl, attachedTextureFramebuffers[0].framebuffer, renderingImgSize[0], renderingImgSize[1])
  setPositions(
    gl, renderingImgSize[0], renderingImgSize[1], // resolutionWidth, resolutionHeight
    0, 0, renderingImgSize[0], renderingImgSize[1], // x, y, width, height
    renderer,
  );
  gl.uniform1f(uniforms.zFlip, -1);
  setTextureToUnifrom(gl, 0, uniforms.imageTexture, textures.image);
  setKernel(gl, KERNELS.gaussianBlur, renderer);
  gl.drawArrays(gl.TRIANGLES, /* offset: */ 0, /* count: */ 6);

  // second render to canvas
  bindFramebuffer(gl, null, gl.canvas.width, gl.canvas.height)

  // clear
  gl.clearColor(1, 1, 1, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  setPositions(
    gl, gl.canvas.width, gl.canvas.height, // resolutionWidth, resolutionHeight
    100, 50, renderingImgSize[0], renderingImgSize[1], // x, y, width, height
    renderer,
  );
  gl.uniform1f(uniforms.zFlip, 1);
  setTextureToUnifrom(gl, 0, uniforms.imageTexture, attachedTextureFramebuffers[0].texture);
  setKernel(gl, KERNELS.edgeDetect, renderer);
  gl.drawArrays(gl.TRIANGLES, /* offset: */ 0, /* count: */ 6);
}

function bindFramebuffer(gl, fb, width, height) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.viewport(0, 0, width, height);
}

function setPositions(
  gl, resolutionWidth, resolutionHeight,
  x, y, width, height,
  { uniforms, buffers },
) {
  gl.uniform2f(uniforms.resolution, resolutionWidth, resolutionHeight);

  // transfer attributes to buffers
  transferToBuffer(gl, buffers.position, new Float32Array([
    x, y,
    x + width, y,
    x, y + height,

    x, y + height,
    x + width, y,
    x + width, y + height,
  ]));
}

function setKernel(gl, kernel, { uniforms }) {
  gl.uniformMatrix3fv(uniforms.kernel, false, kernel);
  gl.uniform1f(uniforms.kernelWeight, getKernelWeight(kernel));
}

function createAttachedTextureFramebuffer(gl, width, height) {

  const framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

  // colorTexture
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  gl.texImage2D(
    gl.TEXTURE_2D,
    0, // level
    gl.RGBA, // internalFormat
    width, height, 0, // border
    gl.RGBA, // format
    gl.UNSIGNED_BYTE, // type
    null, // data
  );

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0, // attachmentPoint
    gl.TEXTURE_2D,
    texture,
    0, // level
  );

  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
    console.error('framebuffer (color) insufficient / not supported');
  }

  // depthTexture
  // does not have visual effect here, just learn about:
  // https://webgl2fundamentals.org/webgl/lessons/webgl-render-to-texture.html
  // to provide gl.enable(gl.DEPTH_TEST) for texture as framebuffer
  const depthTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, depthTexture);

  gl.texImage2D(
    gl.TEXTURE_2D,
    0, // level
    gl.DEPTH_COMPONENT24, // internalFormat
    width, height, 0, // border
    gl.DEPTH_COMPONENT, // format
    gl.UNSIGNED_INT, // type
    null, // data
  );

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.DEPTH_ATTACHMENT, // attachmentPoint
    gl.TEXTURE_2D,
    depthTexture,
    0, // level
  );

  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
    console.error('framebuffer (depth) insufficient / not supported');
  }
  return { texture, framebuffer };
}

function getKernelWeight(kernel) {
  const weight = kernel.reduce((x, c) => x + c, 0.0)
  return weight <= 0 ? 1 : weight;
}
