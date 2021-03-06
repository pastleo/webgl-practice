import devModePromise from './lib/dev.js';

const vertexShaderSource = `

// an attribute is an input (in) to a vertex shader.
// It will receive data from a buffer
attribute vec4 a_position;
attribute vec2 a_texcorrd;
uniform vec2 u_resolution;
varying vec2 v_texcorrd;

// all shaders have a main function
void main() {

  // gl_Position is a special variable a vertex shader
  // is responsible for setting
  gl_Position = vec4(
    (a_position.xy / u_resolution * 2.0 - 1.0) * vec2(1, -1),
    0, 1
  );
  v_texcorrd = a_texcorrd;
}
`;

const fragmentShaderSource = `

// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;

varying vec2 v_texcorrd;
uniform sampler2D u_texture;

void main() {
  gl_FragColor = texture2D(u_texture, v_texcorrd);
}
`;

document.addEventListener('DOMContentLoaded', async () => {
  await devModePromise;

  const canvas = document.getElementById('glCanvas');
  window.canvas = canvas;

  const webgl2 = canvas.getContext('webgl2');
  const gl = webgl2 || canvas.getContext('webgl');
  if (webgl2) {
    gl.webgl2 = true;
  } else {
    console.warn('using webgl v1 instead of v2');

    const oesVaoExt = gl.getExtension('OES_vertex_array_object');
    if (oesVaoExt) {
      gl.createVertexArray = (...args) => oesVaoExt.createVertexArrayOES(...args);
      gl.deleteVertexArray = (...args) => oesVaoExt.deleteVertexArrayOES(...args);
      gl.isVertexArray = (...args) => oesVaoExt.isVertexArrayOES(...args);
      gl.bindVertexArray = (...args) => oesVaoExt.bindVertexArrayOES(...args);
    } else {
      alert('Your browser does not support OES_vertex_array_object')
      return;
    }
  }
  if (!gl) {
    alert('Your browser does not support webgl')
    return;
  }
  window.gl = gl;

  webglUtils.resizeCanvasToDisplaySize(gl.canvas);

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  const program = webglUtils.createProgramFromSources(gl, [vertexShaderSource, fragmentShaderSource]);

  // GSGL positions
  const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
  const texcorrdAttributeLocation = gl.getAttribLocation(program, 'a_texcorrd');
  const resolutionUniformLocation = gl.getUniformLocation(program, 'u_resolution');
  const textureSamplerUniformLocation = gl.getUniformLocation(program, 'u_texture');

  // vertex array object, has to be above gl.enableVertexAttribArray
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  // position attribute setup
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  gl.enableVertexAttribArray(positionAttributeLocation);

  gl.vertexAttribPointer(
    positionAttributeLocation,
    2, // size
    gl.FLOAT, // type
    false, // normalize
    0, // stride
    0, // offset
  );

  // texcorrd attribute setup
  const texcorrdBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, texcorrdBuffer);

  gl.enableVertexAttribArray(texcorrdAttributeLocation);

  gl.vertexAttribPointer(
    texcorrdAttributeLocation,
    2, // size
    gl.FLOAT, // type
    true, // normalize
    0, // stride
    0, // offset
  );

  // load image as texture
  //const image = await loadImage('assets/me.png');
  const image = await loadImage('https://i.imgur.com/vryPVknh.jpg'); // CROSS_ORIGIN
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0, // level
    gl.RGBA, // internalFormat
    gl.RGBA, // format
    gl.UNSIGNED_BYTE, // type
    image, // data
  ); 

  /*
  // make texture
  const color1 = genColor();
  const color2 = genColor();
  gl.texImage2D(
    gl.TEXTURE_2D,
    0, // level
    gl.RGBA, // internalFormat
    2, // width
    2, // height
    0, // border, MUST ALWAYS BE ZERO
    gl.RGBA, // format
    gl.UNSIGNED_BYTE, // type
    // data:
    new Uint8Array([
      color1, color2,
      color2, color1,
    ].flat()),
  );
  */

  // https://webgl2fundamentals.org/webgl/lessons/webgl-3d-textures.html
  // how to deal with range < -1 or > +1
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  // how to deal with zoom out of a texture / how to use mipmap
  //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); // choose 1 pixel from the biggest mip
  //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); // choose 4 pixels from the biggest mip and blend them
  //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_NEAREST); // choose the best mip, then pick one pixel from that mip
  //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST); // choose the best mip, then blend 4 pixels from that mip
  //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR); // choose the best 2 mips, choose 1 pixel from each, blend them
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.webgl2 ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR); // choose the best 2 mips. choose 4 pixels from each, blend them

  // how to deal with zoom in of a texture / how to use mipmap
  //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST); // choose 1 pixel from the biggest mip
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); // choose 4 pixels from the biggest mip and blend them

  gl.generateMipmap(gl.TEXTURE_2D);

  // transfer positions
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      100, 50,
      300, 50,
      100, 250,

      100, 250,
      300, 50,
      300, 250,
    ]),
    gl.STATIC_DRAW,
  );

  // transfer texcorrd
  gl.bindBuffer(gl.ARRAY_BUFFER, texcorrdBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      0, 0,
      1, 0,
      0, 1,

      0, 1,
      1, 0,
      1, 1,
    ]),
    gl.STATIC_DRAW,
  );

  gl.useProgram(program);
  gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);

  // use texture
  const textureUnit = 0;
  gl.uniform1i(textureSamplerUniformLocation, textureUnit);
  gl.activeTexture(gl.TEXTURE0 + textureUnit);
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // canvas become black after loading texutre...reset to white:
  gl.clearColor(1, 1, 1, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.drawArrays(
    gl.TRIANGLES,
    0, // offset
    6, // count
  );
});

function genColor() {
  return [Math.random() * 255, Math.random() * 255, Math.random() * 255, 255]
}
async function loadImage(url) {
  return new Promise(resolve => {
    const image = new Image();

    // CROSS_ORIGIN
    // https://webgl2fundamentals.org/webgl/lessons/webgl-cors-permission.html
    if ((new URL(url)).host !== location.host) {
      image.crossOrigin = '';
    }

    image.onload = function() {
      resolve(image);
    };
    image.src = url;
  })
}
function isPowerOf2(value) {
  return (value & (value - 1)) == 0;
}
