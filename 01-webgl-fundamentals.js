const vertexShaderSource = `
 
// an attribute is an input (in) to a vertex shader.
// It will receive data from a buffer
attribute vec4 a_position;
uniform vec2 u_resolution;
 
// all shaders have a main function
void main() {
 
  // gl_Position is a special variable a vertex shader
  // is responsible for setting
  gl_Position = vec4(
    (a_position.xy / u_resolution * 2.0 - 1.0) * vec2(1, -1),
    0, 1
  );
}
`;
 
const fragmentShaderSource = `
 
// fragment shaders don't have a default precision so we need
// to pick one. highp is a good default. It means "high precision"
precision highp float;

uniform vec4 u_color;
 
void main() {
  // Just set the output to a constant reddish-purple
  gl_FragColor = u_color;
}
`;

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  const ok = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (ok) return shader;

  console.log(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
}

function createProgram(gl, vertexShader, fragmentShader) {
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  const ok = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (ok) return program;

  console.log(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
}

function genRectangleVertices(x, y, w, h) {
  return [
    // simply drawArrays
    //x, y, // 0
    //x + w, y, // 1
    //x, y + h, // 2
    //x, y + h, // 2
    //x + w, y, // 1
    //x + w, y + h, // 3

    // using indexed vertices / drawElements
    x, y, // 0
    x + w, y, // 1
    x, y + h, // 2
    x + w, y + h, // 3
  ]
}

function randomRectangleVertices(width, height) {
  const x = Math.random() * width, y = Math.random() * height;
  return genRectangleVertices(x, y, (width - x) * Math.random(), (height - y) * Math.random());
}
function randomColor() {
  return Array(3).fill().map(() => Math.random() * 0.75 + 0.25);
}

function drawRectangles(gl, howMany) {
  // using indexed vertices / drawElements
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(Array(howMany).fill([0, 1, 2, 2, 1, 3]).flatMap((indices, n) => indices.map(i => i + n * 4))),
    gl.STATIC_DRAW,
  )

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(Array(howMany).fill().flatMap(
      () => randomRectangleVertices(gl.canvas.width, gl.canvas.height)
    )),
    gl.STATIC_DRAW,
  );

  // simply drawArrays
  //gl.drawArrays(
    //gl.TRIANGLES,
    //0, // offset
    //howMany * 6, // count
  //);
  // using indexed vertices / drawElements
  gl.drawElements(
    gl.TRIANGLES,
    howMany * 6, // count
    gl.UNSIGNED_SHORT,
    0,
  );
}

const MY_COLOR = [107 / 255, 222 / 255, 153 / 255];

let positionBuffer, indexBuffer;
document.addEventListener('DOMContentLoaded', () => {
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

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  gl.clearColor(1, 1, 1, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  const program = createProgram(gl, vertexShader, fragmentShader);

  const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
  const resolutionUniformLocation = gl.getUniformLocation(program, 'u_resolution');
  const colorUniformLocation = gl.getUniformLocation(program, 'u_color');

  positionBuffer = gl.createBuffer();

  // using indexed vertices / drawElements
  indexBuffer = gl.createBuffer();

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.enableVertexAttribArray(positionAttributeLocation);

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.vertexAttribPointer(
    positionAttributeLocation,
    2, // size
    gl.FLOAT, // type
    false, // normalize
    0, // stride
    0, // offset
  );

  gl.useProgram(program);
  gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);

  for (let i = 0; i < 5; i++) {
    gl.uniform4f(colorUniformLocation, ...randomColor(), 1);
    drawRectangles(gl, Math.ceil(Math.random() * 4));
  }

  gl.uniform4f(colorUniformLocation, ...MY_COLOR, 1);
  drawRectangles(gl, 4);
});
