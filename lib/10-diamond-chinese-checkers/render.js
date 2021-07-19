import * as twgl from '../../vendor/twgl-full.module.js';

import { skyTeamBgMap } from './consts.js';

import { pipe, degToRad } from '../utils.js';
import { matrix4 } from '../matrix.js';

export default function render(game, time) {
  const gl = game.gl;

  twgl.resizeCanvasToDisplaySize(gl.canvas, game.pixelRatio);

  const { lightProjectionTransform, occlusionBias, lightOcclusionSampleStepSize } = renderLightProjection(gl, game);

  const { viewMatrix, projectionMatrix, cameraMatrix } = calculateViewMatrix(game);

  gl.useProgram(game.rendering.programs.main.program);
  twgl.setUniforms(game.rendering.programs.main, {
    u_lightDir: matrix4.transformVector(matrix4.multiply(
      matrix4.yRotation(game.lightAngle[1]),
      matrix4.xRotation(game.lightAngle[0]),
    ), [0, -1, 0, 1]).slice(0, 3),
    u_lightProjectionMap: game.rendering.lightProjection.map,
    u_lightProjectionTransform: lightProjectionTransform,
    u_lightOcclusionSampleStepSize: lightOcclusionSampleStepSize,
    u_lightOcclusionBias: occlusionBias,
    u_glowFactor: (Math.cos(time * 0.002 + Math.PI) + 1) / 2,
    u_textureMap: game.rendering.nullTexture,
  });

  const { mirroredViewMatrix } = renderMirrorTexture(gl, game, projectionMatrix, time);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  const mainProgramInfo = game.rendering.programs.main;

  gl.useProgram(mainProgramInfo.program);
  twgl.setUniforms(mainProgramInfo, {
    u_view: viewMatrix,
    u_cameraPosition: cameraMatrix.slice(12, 15),
    u_originFogNear: 30.0,
    u_originFogFar: 40.0,
  });

  drawLocations(gl, game.rendering, mainProgramInfo);
  drawCones(gl, game.rendering, mainProgramInfo);

  renderSkybox(gl, game, projectionMatrix, viewMatrix, time);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  gl.useProgram(mainProgramInfo.program);

  drawGround(gl, game.rendering, mainProgramInfo, mirroredViewMatrix);
  drawAvailableCoords(gl, game.rendering, mainProgramInfo);
  drawKanban(gl, game.rendering, mainProgramInfo);

  gl.disable(gl.BLEND);
}

export function renderObjects(gl, rendering, programInfo) {
  drawCones(gl, rendering, programInfo);
  drawAvailableCoords(gl, rendering, programInfo);
}

function drawCones(gl, rendering, programInfo) {
  const worldMatrix = pipe(
    matrix4.identity(),
    m => matrix4.translate(m, 0, 1, 0),
  );

  twgl.setUniforms(programInfo, {
    u_instanced: true,
    u_world: worldMatrix,
    u_worldInverseTranspose: matrix4.identity(),
    u_diffuse: [0, 0, 0, 0],
    u_ambient: [0, 0, 0],
    u_emission: [0, 0, 0],
    u_specular: [1, 1, 1],
    u_shininess: 300,
  });

  drawVAOElementsInstanced(gl, rendering, 'cone');
}

function drawAvailableCoords(gl, rendering, programInfo) {
  const worldMatrix = pipe(
    matrix4.identity(),
    m => matrix4.translate(m, 0, 0.01, 0),
  );

  twgl.setUniforms(programInfo, {
    u_instanced: true,
    u_world: worldMatrix,
    u_worldInverseTranspose: matrix4.identity(),
    u_diffuse: [1, 1, 1, 0],
    u_ambient: [0, 0, 0],
    u_emission: [0, 0, 0],
    u_specular: [1, 1, 1],
    u_shininess: 300,
  });

  drawVAOElementsInstanced(gl, rendering, 'disc');
}

function drawLocations(gl, rendering, programInfo) {
  twgl.setUniforms(programInfo, {
    u_instanced: true,
    u_world: matrix4.identity(),
    u_worldInverseTranspose: matrix4.identity(),
    u_diffuse: [0, 0, 0, 0],
    u_ambient: [0, 0, 0],
    u_emission: [0, 0, 0],
    u_specular: [1, 1, 1],
    u_shininess: 20000,
  });

  drawVAOElementsInstanced(gl, rendering, 'torus');
}

function drawGround(gl, rendering, programInfo, mirroredViewMatrix) {
  const worldMatrix = pipe(
    matrix4.identity(),
    m => matrix4.scale(m, 40, 1, 40),
    m => matrix4.xRotate(m, degToRad(-90)),
  );

  twgl.setUniforms(programInfo, {
    u_instanced: false,
    u_world: worldMatrix,
    u_worldInverseTranspose: matrix4.transpose(matrix4.inverse(worldMatrix)),
    u_diffuse: [105/255, 105/255, 105/255, 0.6],
    u_ambient: [0, 0, 0],
    u_emission: [0, 0, 0],
    u_specular: [1, 1, 1],
    u_shininess: 1600,
    ...(mirroredViewMatrix ? {
      u_useMirrorTexcoord: true,
      u_textureMap: rendering.mirror.map,
      u_mirrorTransform: mirroredViewMatrix,
    } : {}),
  });

  const { bufferInfo, vao } = rendering.bufferVaos.xyQuad;
  gl.bindVertexArray(vao);
  twgl.drawBufferInfo(gl, bufferInfo);

  twgl.setUniforms(programInfo, {
    u_useMirrorTexcoord: false,
    u_textureMap: rendering.nullTexture,
  });
}

function drawKanban(gl, rendering, programInfo) {
  twgl.setUniforms(programInfo, {
    u_instanced: true,
    u_world: matrix4.identity(),
    u_worldInverseTranspose: matrix4.identity(),
    u_diffuse: [0, 0, 0, 0],
    u_ambient: [0, 0, 0],
    u_emission: [0, 0, 0],
    u_specular: [1, 1, 1],
    u_shininess: 2048,
    u_textureMap: rendering.text.texture,
  });

  drawVAOElementsInstanced(gl, rendering, 'kanban');

  twgl.setUniforms(programInfo, {
    u_textureMap: rendering.nullTexture,
  });
}

function renderSkybox(gl, game, projectionMatrix, viewMatrix, time) {
  const rendering = game.rendering;
  const programInfo = rendering.programs.skybox;

  gl.useProgram(programInfo.program);
  twgl.setUniforms(programInfo, {
    u_seed: game.randomSeed,
    u_time: 12 * game.randomSeed + time / 1000,
    u_background: [
      ...skyTeamBgMap.y,
      ...skyTeamBgMap.g,
      ...skyTeamBgMap.b,
    ],
    u_starColor: game.starColor,
    u_viewInverse: matrix4.inverse(
      matrix4.multiply(
        projectionMatrix,
        [
          ...viewMatrix.slice(0, 12),
          0, 0, 0, 1
        ],
      )
    )
  });

  gl.depthFunc(gl.LEQUAL);

  const { bufferInfo, vao } = rendering.bufferVaos.xyQuad;
  gl.bindVertexArray(vao);
  twgl.drawBufferInfo(gl, bufferInfo);

  gl.depthFunc(gl.LESS); // reset to default
}

function renderLightProjection(gl, game) {
  twgl.bindFramebufferInfo(gl, game.rendering.lightProjection.framebufferInfo);

  gl.clear(gl.DEPTH_BUFFER_BIT);

  const lightProjectionTransform = pipe(
    [ // like orthogonal, but without translation
      1 / game.lightProjectionBoundary[0], 0, 0, 0,
      0, -1 / game.lightProjectionBoundary[1], 0, 0,
      0, 0, 1 / game.lightProjectionBoundary[2], 0,
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

  drawLocations(gl, game.rendering, game.rendering.programs.depth);
  drawGround(gl, game.rendering, game.rendering.programs.depth);
  drawCones(gl, game.rendering, game.rendering.programs.depth);

  twgl.bindFramebufferInfo(gl, null);

  return {
    lightProjectionTransform,
    occlusionBias: 0.5 * Math.cos(game.lightAngle[0]) / game.lightProjectionBoundary[2],
    lightOcclusionSampleStepSize: game.lightProjectionBoundary.slice(0, 2).map(s => 0.025 / s),
  };
}

function renderMirrorTexture(gl, game, projectionMatrix) {
  twgl.bindFramebufferInfo(gl, game.rendering.mirror.framebufferInfo);

  const mirroredCameraMatrix = pipe(
    matrix4.identity(),
    m => matrix4.translate(m, ...game.cameraViewing),
    m => matrix4.yRotate(m, game.cameraAngle[1]),
    m => matrix4.xRotate(m, -game.cameraAngle[0]),
    m => matrix4.translate(m, 0, 0, game.cameraDistance),
  );
  const mirroredViewMatrix = matrix4.multiply(projectionMatrix, matrix4.inverse(mirroredCameraMatrix));

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.useProgram(game.rendering.programs.main.program);

  twgl.setUniforms(game.rendering.programs.main, {
    u_view: mirroredViewMatrix,
    u_cameraPosition: mirroredCameraMatrix.slice(12, 15),
    u_originFogNear: 99,
    u_originFogFar: 100,
  });

  drawCones(gl, game.rendering, game.rendering.programs.main);

  twgl.bindFramebufferInfo(gl, null);

  return { mirroredViewMatrix, mirroredCameraMatrix };
}

export function calculateViewMatrix(game) {
  const projectionMatrix = matrix4.perspective(game.fieldOfView, game.gl.canvas.width / game.gl.canvas.height, 1, 2000);
  const cameraMatrix = pipe(
    matrix4.identity(),
    m => matrix4.translate(m, ...game.cameraViewing),
    m => matrix4.yRotate(m, game.cameraAngle[1]),
    m => matrix4.xRotate(m, game.cameraAngle[0]),
    m => matrix4.translate(m, 0, 0, game.cameraDistance),
  );

  return {
    viewMatrix: matrix4.multiply(projectionMatrix, matrix4.inverse(cameraMatrix)),
    projectionMatrix, cameraMatrix,
  }
}

function drawVAOElementsInstanced(gl, rendering, name) {
  const { bufferInfo, vao } = rendering.bufferVaos[name];
  gl.bindVertexArray(vao);
  gl.drawElementsInstanced(
    gl.TRIANGLES,
    bufferInfo.numElements,
    bufferInfo.elementType,
    0, // offset
    bufferInfo.instanceDrawCount,
  );
}
