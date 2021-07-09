import * as twgl from '../../vendor/twgl-full.module.js';
import { calculateViewMatrix, renderObjects } from './render.js';

import { pipe, decodeVec4Int } from '../utils.js';
import { matrix4 } from '../matrix.js';

export default function renderAndGetPointingObjectId(gl, game, pointingOffsetCoord, existingViewMatrix) {
  const viewMatrix = existingViewMatrix ?? calculateViewMatrix(gl, game).viewMatrix;

  twgl.bindFramebufferInfo(gl, game.rendering.objectIdProjection.framebufferInfo);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const objectIdProjectionTransform = pipe(
    matrix4.identity(),
    m => matrix4.scale(m, gl.canvas.width, gl.canvas.height, 1),
    m => matrix4.translate(m,
      (2 / gl.canvas.width) * (gl.canvas.width / 2 - pointingOffsetCoord[0]),
      (2 / gl.canvas.height) * (pointingOffsetCoord[1] - gl.canvas.height / 2),
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

