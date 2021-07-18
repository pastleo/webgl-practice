import * as twgl from '../../vendor/twgl-full.module.js';
import { calculateViewMatrix, renderObjects } from './render.js';

import { pipe, decodeVec4Int } from '../utils.js';
import { matrix4 } from '../matrix.js';

export function createObjectIdProjectionInfo(gl) {
  const width = 1;
  const height = 1;

  const framebufferInfo = twgl.createFramebufferInfo(gl, null, width, height)

  return {
    framebufferInfo,
    map: framebufferInfo.attachments[0],
  };
}


export function renderAndGetPointingObjectId(game, pointingOffsetCoord, existingViewMatrix) {
  const gl = game.gl;
  const viewMatrix = existingViewMatrix || calculateViewMatrix(game).viewMatrix;

  twgl.bindFramebufferInfo(gl, game.rendering.objectIdProjection.framebufferInfo);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const devicePixelRatio = window.devicePixelRatio || 1;

  const objectIdProjectionTransform = pipe(
    matrix4.identity(),
    m => matrix4.scale(m, gl.canvas.width, gl.canvas.height, 1),
    m => matrix4.translate(m,
      (2 / gl.canvas.width) * (gl.canvas.width / 2 - pointingOffsetCoord[0] * devicePixelRatio),
      (2 / gl.canvas.height) * (pointingOffsetCoord[1] * devicePixelRatio - gl.canvas.height / 2),
      0,
    ),
    m => matrix4.multiply(m, viewMatrix),
  );

  gl.useProgram(game.rendering.programs.objId.program);

  twgl.setUniforms(game.rendering.programs.objId, {
    u_view: objectIdProjectionTransform,
  });

  renderObjects(gl, game.rendering, game.rendering.programs.objId);

  const pixelData = new Uint8Array(4);
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixelData);

  twgl.bindFramebufferInfo(gl, null);

  return decodeVec4Int(pixelData);
}

