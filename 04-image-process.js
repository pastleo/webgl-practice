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
uniform float u_textureSize;

void main() {
  // normal
  gl_FragColor = texture2D(u_texture, v_texcorrd);

  // r -> b, g -> r, b -> g
  // gl_FragColor = texture2D(u_texture, v_texcorrd).brga;

  // blur
  // vec2 onePixel = vec2(1) / vec2(u_textureSize);
  // gl_FragColor = (
  //   texture2D(u_texture, v_texcorrd + onePixel * vec2(-2, -2)) +
  //   texture2D(u_texture, v_texcorrd + onePixel * vec2(0, -2)) +
  //   texture2D(u_texture, v_texcorrd + onePixel * vec2(2, -2)) +
  //   texture2D(u_texture, v_texcorrd + onePixel * vec2(-2, 0)) +
  //   texture2D(u_texture, v_texcorrd) +
  //   texture2D(u_texture, v_texcorrd + onePixel * vec2(2, 0)) +
  //   texture2D(u_texture, v_texcorrd + onePixel * vec2(-2, 2)) +
  //   texture2D(u_texture, v_texcorrd + onePixel * vec2(0, 2)) +
  //   texture2D(u_texture, v_texcorrd + onePixel * vec2(2, 2))
  // ) / 9.0;

  // edgeDetect
  vec2 onePixel = vec2(1) / vec2(u_textureSize);
  vec3 color = (
    texture2D(u_texture, v_texcorrd) * 8.0 -
    texture2D(u_texture, v_texcorrd + onePixel * vec2(-1, -1)) -
    texture2D(u_texture, v_texcorrd + onePixel * vec2(0, -1)) -
    texture2D(u_texture, v_texcorrd + onePixel * vec2(1, -1)) -
    texture2D(u_texture, v_texcorrd + onePixel * vec2(-1, 0)) -
    texture2D(u_texture, v_texcorrd + onePixel * vec2(1, 0)) -
    texture2D(u_texture, v_texcorrd + onePixel * vec2(-1, 1)) -
    texture2D(u_texture, v_texcorrd + onePixel * vec2(0, 1)) -
    texture2D(u_texture, v_texcorrd + onePixel * vec2(1, 1))
  ).rgb;
  gl_FragColor = 1.0 - vec4(
    (vec3(color.r + color.g + color.b, color.r + color.g + color.b, color.r + color.g + color.b) / 3.0),
    1
  );
}
`;

document.addEventListener('DOMContentLoaded', async () => {
  const canvas = document.getElementById('glCanvas');
  window.canvas = canvas;

  const gl = canvas.getContext('webgl');
  if (!gl) {
    alert('Your browser does not support webgl')
    return;
  }
  window.gl = gl;

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

  webglUtils.resizeCanvasToDisplaySize(gl.canvas);

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  const program = webglUtils.createProgramFromSources(gl, [vertexShaderSource, fragmentShaderSource]);

  // GSGL positions
  const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
  const texcorrdAttributeLocation = gl.getAttribLocation(program, 'a_texcorrd');
  const resolutionUniformLocation = gl.getUniformLocation(program, 'u_resolution');
  const textureSamplerUniformLocation = gl.getUniformLocation(program, 'u_texture');
  const textureSizeUniformLocation = gl.getUniformLocation(program, 'u_textureSize');

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
  const image = await loadImage('assets/me.png');
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
  const textureUnit = 3;
  gl.uniform1i(textureSamplerUniformLocation, textureUnit);
  gl.uniform1f(textureSizeUniformLocation, image.width);
  gl.activeTexture(gl[`TEXTURE${textureUnit}`]); // from gl.TEXTURE0 to gl.TEXTURE31
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
    image.onload = function() {
      resolve(image);
    };
    image.src = url;
  })
}
