const vertexShaderSource = `#version 300 es

// an attribute is an input (in) to a vertex shader.
// It will receive data from a buffer
in vec4 a_position;
in vec4 a_color;
uniform vec2 u_resolution;
out vec4 v_color;

// all shaders have a main function
void main() {

  // gl_Position is a special variable a vertex shader
  // is responsible for setting
  gl_Position = vec4(
    (a_position.xy / u_resolution * 2.0 - 1.0) * vec2(1, -1),
    0, 1
  );

  v_color = a_color;
}
`;

const fragmentShaderSource = `#version 300 es

// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;

in vec4 v_color;
//uniform vec4 u_color;

// we need to declare an output for the fragment shader
out vec4 outColor;

void main() {
  // Just set the output to a constant reddish-purple
  outColor = v_color;
}
`;

const MY_COLOR = [107 / 255, 222 / 255, 153 / 255];

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('glCanvas');
  window.canvas = canvas;

  const gl = canvas.getContext('webgl2');
  if (!gl) {
    alert('Your browser does not support webgl2')
    return;
  }
  window.gl = gl;

  webglUtils.resizeCanvasToDisplaySize(gl.canvas);

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  gl.clearColor(1, 1, 1, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // vertex array object, but still don't understand why we need this
  // I understand! it is about keeping group of attribute, buffer state into one, see here:
  // https://webgl2fundamentals.org/webgl/lessons/webgl1-to-webgl2.html#vertex-array-objects
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  const program = webglUtils.createProgramFromSources(gl, [vertexShaderSource, fragmentShaderSource]);

  // GSGL positions
  const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
  const colorAttributeLocation = gl.getAttribLocation(program, 'a_color');
  const resolutionUniformLocation = gl.getUniformLocation(program, 'u_resolution');
  //const colorUniformLocation = gl.getUniformLocation(program, 'u_color');

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

  // color attribute setup
  const colorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);

  gl.enableVertexAttribArray(colorAttributeLocation);

  gl.vertexAttribPointer(
    colorAttributeLocation,
    4, // size
    gl.UNSIGNED_BYTE, // type
    true, // normalize
    0, // stride
    0, // offset
  );

  // transfer positions
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      //100, 100,
      //90, 200,
      //240, 180,
      100, 100,
      150, 100,
      100, 150,
      100, 150,
      150, 150,
      150, 100,
    ]),
    gl.STATIC_DRAW,
  );

  // transfer colors
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Uint8Array([
      ...genColor(),
      ...genColor(),
      ...genColor(),
      ...genColor(),
      ...genColor(),
      ...genColor(),
    ]),
    gl.STATIC_DRAW,
  );

  gl.useProgram(program);
  gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);
  //gl.uniform4f(colorUniformLocation, ...MY_COLOR, 1);

  gl.drawArrays(
    gl.TRIANGLES,
    0, // offset
    6, // count
  );
});

function genColor() {
  return [Math.random() * 255, Math.random() * 255, Math.random() * 255, 255]
}
