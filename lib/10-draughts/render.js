import * as twgl from '../../vendor/twgl-full.module.js';

import { pipe, degToRad } from '../utils.js';
import { matrix4 } from '../matrix.js';

export default function render(gl, game) {
  twgl.resizeCanvasToDisplaySize(gl.canvas, window.devicePixelRatio || 1);

  gl.enable(gl.CULL_FACE);
  gl.enable(gl.DEPTH_TEST);

  const { lightProjectionTransform, occlusionBias, lightOcclusionSampleStepSize } = renderLightProjection(gl, game);

  const { viewMatrix, cameraMatrix } = calculateViewMatrix(gl, game);

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.useProgram(game.rendering.programs.main.program);

  twgl.setUniforms(game.rendering.programs.main, {
    u_view: viewMatrix,
    u_cameraPosition: cameraMatrix.slice(12, 15),
    u_lightDir: matrix4.transformVector(matrix4.multiply(
      matrix4.yRotation(game.lightAngle[1]),
      matrix4.xRotation(game.lightAngle[0]),
    ), [0, -1, 0, 1]).slice(0, 3),
    u_ambientLight: [0, 0, 0],
    u_lightProjectionMap: game.rendering.lightProjection.map,
    u_lightProjectionTransform: lightProjectionTransform,
    u_lightOcclusionSampleStepSize: lightOcclusionSampleStepSize,
    u_lightOcclusionBias: occlusionBias,
  });

  renderObjects(gl, game.rendering, game.rendering.programs.main);
  renderBackground(gl, game.rendering, game.rendering.programs.main);
}

export function renderObjects(gl, rendering, programInfo) {
  { // draw pieces / cones
    const worldMatrix = pipe(
      matrix4.identity(),
      m => matrix4.translate(m, 0, 1, 0),
    );

    twgl.setUniforms(programInfo, {
      u_world: worldMatrix,
      u_worldInverseTranspose: matrix4.transpose(matrix4.inverse(worldMatrix)),
      u_diffuse: [0, 0, 0, 0],
      u_ambient: [0, 0, 0],
      u_emissive: [0, 0, 0],
      u_specular: [1, 1, 1],
      u_shininess: 300,
    });
    gl.bindVertexArray(rendering.bufferVaos.cone.vao);
    gl.drawElementsInstanced(
      gl.TRIANGLES,
      rendering.bufferVaos.cone.bufferInfo.numElements,
      rendering.bufferVaos.cone.bufferInfo.elementType,
      0, // offset
      rendering.bufferVaos.cone.bufferInfo.instance,
    );
  }
}

function renderBackground(gl, rendering, programInfo) {
  { // draw torus
    twgl.setUniforms(programInfo, {
      u_world: matrix4.identity(),
      u_worldInverseTranspose: matrix4.transpose(matrix4.inverse(matrix4.identity())),
      u_diffuse: [1, 1, 1, 1],
      u_ambient: [0, 0, 0],
      u_emissive: [0, 0, 0],
      u_specular: [1, 1, 1],
      u_shininess: 20000,
    });
    gl.bindVertexArray(rendering.bufferVaos.torus.vao);
    gl.drawElementsInstanced(
      gl.TRIANGLES,
      rendering.bufferVaos.torus.bufferInfo.numElements,
      rendering.bufferVaos.torus.bufferInfo.elementType,
      0, // offset
      rendering.bufferVaos.torus.bufferInfo.instance,
    );
  }

  { // draw ground / xyQuad
    const worldMatrix = pipe(
      matrix4.identity(),
      m => matrix4.scale(m, 1000, 1, 1000),
      m => matrix4.xRotate(m, degToRad(-90)),
    );

    twgl.setUniforms(programInfo, {
      u_world: worldMatrix,
      u_worldInverseTranspose: matrix4.transpose(matrix4.inverse(worldMatrix)),
      u_diffuse: [107/255, 222/255, 153/255, 1],
      u_ambient: [0, 0, 0],
      u_emissive: [0, 0, 0],
      u_specular: [1, 1, 1],
      u_shininess: 20000,
    });
    gl.bindVertexArray(game.rendering.bufferVaos.xyQuad.vao);
    twgl.drawBufferInfo(gl, game.rendering.bufferVaos.xyQuad.bufferInfo);
  }
}


function renderLightProjection(gl, game) {
  twgl.bindFramebufferInfo(gl, game.rendering.lightProjection.framebufferInfo);

  // debug:
  //twgl.bindFramebufferInfo(gl, null);
  //gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  gl.clear(gl.DEPTH_BUFFER_BIT);

  const lightProjectionTransform = pipe(
    [ // like orthogonal, but without translation
      1 / game.maxCoord[0], 0, 0, 0,
      0, -1 / game.maxCoord[1], 0, 0,
      0, 0, 1 / game.maxCoord[2], 0,
      0, 0, 0, 1,
    ],
    m => matrix4.multiply(m, [ // sheering
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, Math.tan(game.lightAngle[0]), 1, 0,
      0, 0, 0, 1,
    ]),
    m => matrix4.multiply(m, matrix4.inverse(
      matrix4.multiply(
        matrix4.yRotation(game.lightAngle[1]),
        matrix4.xRotation(degToRad(90)),
      )
    ))
  );

  gl.useProgram(game.rendering.programs.depth.program);

  twgl.setUniforms(game.rendering.programs.depth, {
    u_view: lightProjectionTransform,
  });

  renderObjects(gl, game.rendering, game.rendering.programs.depth);
  renderBackground(gl, game.rendering, game.rendering.programs.depth);
  twgl.bindFramebufferInfo(gl, null);

  return {
    lightProjectionTransform,
    occlusionBias: 0.5 * Math.cos(game.lightAngle[0]) / game.maxCoord[2],
    lightOcclusionSampleStepSize: game.maxCoord.slice(0, 2).map(s => 0.025 / s),
  };
}

export function calculateViewMatrix(gl, game) {
  const projectionMatrix = matrix4.perspective(game.fieldOfView, gl.canvas.width / gl.canvas.height, 1, 2000);
  const cameraMatrix = pipe(
    matrix4.identity(),
    m => matrix4.translate(m, ...game.cameraViewing),
    m => matrix4.yRotate(m, game.cameraAngle[1]),
    m => matrix4.xRotate(m, game.cameraAngle[0]),
    m => matrix4.translate(m, 0, 0, game.cameraDistance),
  );

  return {
    viewMatrix: matrix4.multiply(projectionMatrix, matrix4.inverse(cameraMatrix)),
    cameraMatrix,
  }
}