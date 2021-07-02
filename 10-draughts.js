import * as twgl from './vendor/twgl-full.module.js';
import { matrix4 } from './lib/matrix.js';
import { pipe, degToRad, radToDeg } from './lib/utils.js';

import devModePromise from './lib/dev.js';

const mainVS = `
precision highp float;

attribute vec4 a_position;
attribute vec3 a_color;
uniform mat4 u_matrix;

varying vec3 v_color;

void main() {
  gl_Position = u_matrix * a_position;
  v_color = a_color;
}
`;
const mainFS = `
precision highp float;

varying vec3 v_color;

void main() {
  gl_FragColor = vec4(v_color, 1);
  //gl_FragColor = vec4(0.5, 0.5, 0.5, 1);
}
`;

document.addEventListener('DOMContentLoaded', async () => {
  await devModePromise;

  const canvas = document.getElementById('main');
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
  twgl.setAttributePrefix('a_');

  const rendering = {};
  rendering.programInfo = twgl.createProgramInfo(gl, [mainVS, mainFS]);
  const coneVertices = (
    twgl.primitives.makeRandomVertexColors(
      twgl.primitives.createTruncatedConeVertices(1, 0, 1, 10, 10)
    )
  );

  twgl.resizeCanvasToDisplaySize(gl.canvas, window.devicePixelRatio || 1);

  rendering.coneBufferInfo = twgl.createBufferInfoFromArrays(gl, coneVertices);

  const vao = twgl.createVAOFromBufferInfo(gl, rendering.programInfo, rendering.coneBufferInfo);

  gl.bindVertexArray(vao);

  const scene = {
    cameraAngle: [degToRad(-20), 0],
    cameraViewing: [0, 0, 0],
  }
  const input = {};

  document.addEventListener('keydown', event => {
    input[event.code] = true;
  })
  document.addEventListener('keyup', event => {
    input[event.code] = false;
  })
  document.addEventListener('keyup', event => {
    input[event.code] = false;
  })
  canvas.addEventListener('mousedown', event => {
    input.mousedown = true;
    input.mouseClient = [event.clientX, event.clientY];
  })
  canvas.addEventListener('mouseup', () => {
    input.mousedown = false;
  })
  canvas.addEventListener('touchstart', event => {
    input.touched = true;
    input.touchClient = [event.touches[0].clientX, event.touches[0].clientY];
  })
  canvas.addEventListener('touchend', () => {
    input.touched = false;
    delete input.multiTouchClient;
  })

  const moveCameraAngle = (clientX, clientY, preClientX, preClientY) => {
    scene.cameraAngle[0] += (preClientY - clientY) / 100;
    if (scene.cameraAngle[0] > 0) {
      scene.cameraAngle[0] = 0;
    } else if (scene.cameraAngle[0] < degToRad(-60)) {
      scene.cameraAngle[0] = degToRad(-60);
    }
    scene.cameraAngle[1] += (preClientX - clientX) / (100 * window.devicePixelRatio);
  };
  const moveViewing = viewingMove => {
    scene.cameraViewing[0] += viewingMove[0] * Math.cos(-scene.cameraAngle[1]) - viewingMove[1] * Math.sin(-scene.cameraAngle[1]);
    scene.cameraViewing[2] += viewingMove[0] * Math.sin(-scene.cameraAngle[1]) + viewingMove[1] * Math.cos(-scene.cameraAngle[1]);
  };

  canvas.addEventListener('mousemove', event => {
    if (input.mousedown) {
      const { clientX, clientY } = event;
      const [preClientX, preClientY] = input.mouseClient;

      moveCameraAngle(clientX, clientY, preClientX, preClientY);

      input.mouseClient = [clientX, clientY];
    }
  })
  canvas.addEventListener('touchmove', event => {
    event.preventDefault();

    if (input.touched) {
      if (event.touches.length >= 2) {
        const clientX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
        const clientY = (event.touches[0].clientY + event.touches[1].clientY) / 2;

        if (input.multiTouchClient) {
          const [preClientX, preClientY] = input.multiTouchClient;
          moveViewing([(preClientX - clientX) / 100, (preClientY - clientY) / 100]);
        }
        input.multiTouchClient = [clientX, clientY];
      } else {
        const { clientX, clientY } = event.touches[0];
        const [preClientX, preClientY] = input.touchClient;

        moveCameraAngle(clientX, clientY, preClientX, preClientY);

        input.touchClient = [clientX, clientY];
      }
    }
  })

  const renderLoop = () => {
    render(gl, rendering, scene);

    const viewingMove = [0, 0];
    if (input.KeyA) {
      viewingMove[0] -= 0.1;
    } else if (input.KeyD) {
      viewingMove[0] += 0.1;
    }
    if (input.KeyW) {
      viewingMove[1] -= 0.1;
    } else if (input.KeyS) {
      viewingMove[1] += 0.1;
    }
    moveViewing(viewingMove);

    requestAnimationFrame(renderLoop);
  }
  renderLoop();
})

function render(gl, rendering, scene) {
  gl.enable(gl.CULL_FACE);
  gl.enable(gl.DEPTH_TEST);

  const projectionMatrix = matrix4.perspective(degToRad(45), gl.canvas.width / gl.canvas.height, 1, 2000);
  const cameraMatrix = pipe(
    matrix4.identity(),
    m => matrix4.translate(m, ...scene.cameraViewing),
    m => matrix4.yRotate(m, scene.cameraAngle[1]),
    m => matrix4.xRotate(m, scene.cameraAngle[0]),
    m => matrix4.translate(m, 0, 0, 10),
  );

  const viewMatrix = matrix4.multiply(projectionMatrix, matrix4.inverse(cameraMatrix));

  for (let i = -10; i <= 10; i++) {
    for (let j = -10; j <= 10; j++) {
      const worldMatrix = pipe(
        matrix4.identity(),
        m => matrix4.translate(m, i * 2, 0, j * 2),
      );

      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      gl.useProgram(rendering.programInfo.program);
      twgl.setUniforms(rendering.programInfo, {
        u_matrix: matrix4.multiply(viewMatrix, worldMatrix),
      });
      twgl.drawBufferInfo(gl, rendering.coneBufferInfo);
    }
  }
}
