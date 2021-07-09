import initRendering from './init-rendering.js';
import listenToInputs from './input.js';

import { initPieces } from './utils.js';
import { degToRad } from '../utils.js';

import { cameraMaxAngle, cameraMinAngle } from './consts.js';

export default function initGame(gl) {
  const game = {
    fieldOfView: degToRad(45),
    cameraAngle: [degToRad(-40), 0],
    cameraViewing: [0, 0, 0],
    cameraDistance: 50,
    lightAngle: [degToRad(45), degToRad(30)],
    maxCoord: [25, 25, 4],
    viewingVelocity: [0, 0],

    turn: 'y',

    pieces: initPieces(),
  }
  game.gl = gl;

  game.rendering = initRendering(game);
  game.input = listenToInputs(gl.canvas, game);

  return game;
}

export function updateGame(game) {
  moveViewing(game, game.viewingVelocity);
}

export function moveCameraAngle(game, offsetX, offsetY, preOffsetX, preOffsetY) {
  game.cameraAngle[0] += (preOffsetY - offsetY) / 100;
  if (game.cameraAngle[0] > cameraMaxAngle) {
    game.cameraAngle[0] = cameraMaxAngle;
  } else if (game.cameraAngle[0] < cameraMinAngle) {
    game.cameraAngle[0] = cameraMinAngle;
  }
  game.cameraAngle[1] += (preOffsetX - offsetX) / (100 * window.devicePixelRatio);
}

export function moveViewing(game, viewingMove) {
  const dx = viewingMove[0] * Math.cos(-game.cameraAngle[1]) - viewingMove[1] * Math.sin(-game.cameraAngle[1]);
  const dz = viewingMove[0] * Math.sin(-game.cameraAngle[1]) + viewingMove[1] * Math.cos(-game.cameraAngle[1]);
  game.cameraViewing[0] += dx * game.cameraDistance / 10;
  game.cameraViewing[2] += dz * game.cameraDistance / 10;
}

export function adjCameraDistance(game, delta) {
  game.cameraDistance += delta;
  if (game.cameraDistance > 100) game.cameraDistance = 100;
  else if (game.cameraDistance < 4) game.cameraDistance = 4;
}

export function pointingObjectId(game, objectId) {
  if (objectId !== game.pointingObjId) {
    const prePieceIndex = game.pointingObjId - 1;
    game.pointingObjId = objectId;
    const pieceIndex = game.pointingObjId - 1;

    const prePointingObj = game.pieces[prePieceIndex];
    const pointingObj = game.pieces[pieceIndex];
    const gl = game.gl;

    const attrInfo = game.rendering.bufferVaos.cone.bufferInfo.instanceAttribs.ai_emission;
    gl.bindBuffer(gl.ARRAY_BUFFER, attrInfo.buffer);

    if (prePointingObj) {
      gl.bufferSubData(
        gl.ARRAY_BUFFER, prePieceIndex * attrInfo.numComponents * 4, new Float32Array([0, 0, 0])
      );
    }

    if (pointingObj) {
      gl.bufferSubData(
        gl.ARRAY_BUFFER, pieceIndex * attrInfo.numComponents * 4, new Float32Array([0.4, 0.4, 0.4])
      );
    }
  }
}
