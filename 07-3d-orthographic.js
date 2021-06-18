import { createAttributeBuffer, transferToBuffer } from './lib/gl.js';
import { matrix4 } from './lib/matrix.js';
import { pipe } from './lib/utils.js';

// to see 2D version, git checkout a8bd7ef
// (basically the end of https://webgl2fundamentals.org/webgl/lessons/webgl-2d-matrices.html)
document.addEventListener('DOMContentLoaded', async () => {
  const canvas = document.getElementById('canvas');
  const gl = canvas.getContext('webgl2');
  window.gl = gl;

  const defaultRotationInRadians = [30, 30, 0];
  const controls = {
    translation: [150, 100, 0],
    rotationInRadians: defaultRotationInRadians.map(degToRadian),
    scale: [1, 1, 1],
    projectionZ: 400,
  }
  const mainRenderer = await createRenderer(gl);
  render(gl, mainRenderer, controls);

  const onChange = fn => (event, ui) => {
    fn(ui, controls, event);
    render(gl, mainRenderer, controls);
  }
  webglLessonsUI.setupSlider('#x', { value: controls.translation[0], max: gl.canvas.width,
    slide: onChange((ui, c) => { c.translation[0] = ui.value; }),
  });
  webglLessonsUI.setupSlider('#y', { value: controls.translation[1], max: gl.canvas.height,
    slide: onChange((ui, c) => { c.translation[1] = ui.value; }),
  });
  webglLessonsUI.setupSlider('#z', { value: controls.translation[2], max: 800,
    slide: onChange((ui, c) => { c.translation[2] = ui.value; }),
  });
  webglLessonsUI.setupSlider('#angleX', { value: defaultRotationInRadians[0], max: 360,
    slide: onChange((ui, c) => { c.rotationInRadians[0] = degToRadian(ui.value); }),
  });
  webglLessonsUI.setupSlider('#angleY', { value: defaultRotationInRadians[1], max: 360,
    slide: onChange((ui, c) => { c.rotationInRadians[1] = degToRadian(ui.value); }),
  });
  webglLessonsUI.setupSlider('#angleZ', { value: defaultRotationInRadians[2], max: 360,
    slide: onChange((ui, c) => { c.rotationInRadians[2] = degToRadian(ui.value); }),
  });
  webglLessonsUI.setupSlider('#scaleX', { value: controls.scale[0], min: -5, max: 5, step: 0.01, precision: 2,
    slide: onChange((ui, c) => { c.scale[0] = ui.value; }),
  });
  webglLessonsUI.setupSlider('#scaleY', { value: controls.scale[1], min: -5, max: 5, step: 0.01, precision: 2,
    slide: onChange((ui, c) => { c.scale[1] = ui.value; }),
  });
  webglLessonsUI.setupSlider('#scaleZ', { value: controls.scale[2], min: -5, max: 5, step: 0.01, precision: 2,
    slide: onChange((ui, c) => { c.scale[2] = ui.value; }),
  });
  webglLessonsUI.setupSlider('#projectionZ', { value: controls.projectionZ, max: 800,
    slide: onChange((ui, c) => { c.projectionZ = ui.value; }),
  });
});

const vertexShaderSource = `#version 300 es

// an attribute is an input (in) to a vertex shader.
// It will receive data from a buffer
in vec4 a_position;
in vec4 a_color;

// A matrix to transform the positions by
uniform mat4 u_matrix;

out vec4 v_color;

// all shaders have a main function
void main() {
  // Multiply the position by the matrix.
  gl_Position = u_matrix * a_position;
  v_color = a_color;
}
`;

const fragmentShaderSource = `#version 300 es

precision highp float;

in vec4 v_color;

// we need to declare an output for the fragment shader
out vec4 outColor;

void main() {
  outColor = v_color;
}
`;

export async function createRenderer(gl) {
  const program = webglUtils.createProgramFromSources(gl, [vertexShaderSource, fragmentShaderSource]);

  // vertex array object
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  return {
    program, vao,
    buffers: {
      position: createAttributeBuffer(gl, program, 'a_position', 3),
      color: createAttributeBuffer(gl, program, 'a_color', 3),
      // transfering size is 3, but in shader is vec4,
      // when size is smaller, it will fallback:
      // default:            [0.0, 0.0, 0.0, 1.0]
      // a_position buffer:  [x,   y,   z]
      // in vec4 a_position: [x,   y,   z,   1.0]
    },
    uniforms: {
      matrix: gl.getUniformLocation(program, 'u_matrix'),
    },
  }
}

let verticesCnt = null;
export function render(gl, renderer, controls) {
  webglUtils.resizeCanvasToDisplaySize(gl.canvas);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  gl.useProgram(renderer.program);
  gl.bindVertexArray(renderer.vao);

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.clearColor(1, 1, 1, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // !!! draw only when facing camera !!!
  gl.enable(gl.CULL_FACE);

  // !!! things behind should not be drawn !!!
  gl.enable(gl.DEPTH_TEST);

  if (verticesCnt === null) {
    // see doodles/webgl-3d-orthographic.pdf for design
    const a = 40, b = 200, c = 60, d = 45;

    const points = [0, d].flatMap(z => ([
      [0, 0, z], // 0, 13
      [0, b, z],
      [a, b, z],
      [a, 0, z],
      [2*a+c, 0, z], // 4, 17
      [a, a, z],
      [2*a+c, a, z],
      [a, 2*a, z],
      [2*a+c, 2*a, z], // 8, 21
      [a, 3*a, z],
      [2*a+c, 3*a, z],
      [a+c, a, z],
      [a+c, 2*a, z], // 12, 25
    ]));
    const positions = [
      ...rectVertices(points[0], points[1], points[2], points[3]), // 0
      ...rectVertices(points[3], points[5], points[6], points[4]),
      ...rectVertices(points[7], points[9], points[10], points[8]),
      ...rectVertices(points[11], points[12], points[8], points[6]),
      ...rectVertices(points[13], points[16], points[15], points[14]), // 4
      ...rectVertices(points[16], points[17], points[19], points[18]),
      ...rectVertices(points[20], points[21], points[23], points[22]),
      ...rectVertices(points[24], points[19], points[21], points[25]),
      ...rectVertices(points[0], points[13], points[14], points[1]), // 8
      ...rectVertices(points[0], points[4], points[17], points[13]),
      ...rectVertices(points[4], points[10], points[23], points[17]),
      ...rectVertices(points[9], points[22], points[23], points[10]),
      ...rectVertices(points[9], points[2], points[15], points[22]), // 12
      ...rectVertices(points[2], points[1], points[14], points[15]),
      ...rectVertices(points[5], points[7], points[20], points[18]),
      ...rectVertices(points[5], points[18], points[24], points[11]),
      ...rectVertices(points[11], points[24], points[25], points[12]), // 16
      ...rectVertices(points[7], points[12], points[25], points[20]),
    ]
    transferToBuffer(gl, renderer.buffers.position, new Float32Array(positions));

    const frontColor = [107/256, 222/256, 153/256];
    const backColor = randomColor();
    const colors = [
      ...rectColor(frontColor), // 0
      ...rectColor(frontColor),
      ...rectColor(frontColor),
      ...rectColor(frontColor),
      ...rectColor(backColor), // 4
      ...rectColor(backColor),
      ...rectColor(backColor),
      ...rectColor(backColor),
      ...rectColor(randomColor()), // 8
      ...rectColor(randomColor()),
      ...rectColor(randomColor()),
      ...rectColor(randomColor()),
      ...rectColor(randomColor()), // 12
      ...rectColor(randomColor()),
      ...rectColor(randomColor()),
      ...rectColor(randomColor()),
      ...rectColor(randomColor()), // 16
      ...rectColor(randomColor()),
    ];
    transferToBuffer(gl, renderer.buffers.color, new Float32Array(colors));

    verticesCnt = positions.length / 3;
  }

  const matrix = pipe(
    matrix4.projection(gl.canvas.clientWidth, gl.canvas.clientHeight, controls.projectionZ),
    m => matrix4.translate(m, controls.translation[0], controls.translation[1], controls.translation[2]),
    m => matrix4.xRotate(m, controls.rotationInRadians[0]),
    m => matrix4.yRotate(m, controls.rotationInRadians[1]),
    m => matrix4.zRotate(m, controls.rotationInRadians[2]),
    m => matrix4.scale(m, controls.scale[0], controls.scale[1], controls.scale[2]),
    matrix4.inspect,
  )

  gl.uniformMatrix4fv(renderer.uniforms.matrix, false, matrix);

  gl.drawArrays(gl.TRIANGLES, /* offset: */ 0, /* count: */ verticesCnt);
}

const degToRadian = deg => (360 - deg) * Math.PI / 180;
// a, b, c, d need to be counter-clock wise to make surface facing out
const rectVertices = (a, b, c, d) => ([
  ...a, ...b, ...c,
  ...a, ...c, ...d,
])
const randomColor = () => [Math.random(), Math.random(), Math.random()];
const rectColor = color => Array(6).fill(color).flat();
