import initRendering from './init-rendering.js';
import listenToInputs from './input.js';

import { validPieceCoord, pieceCoordId } from './utils.js';
import { pipe, degToRad } from '../utils.js';

import { cameraMaxAngle, cameraMinAngle } from './consts.js';

export default function initGame(gl) {
  const game = {
    fieldOfView: degToRad(45),
    cameraAngle: [degToRad(-40), 0],
    cameraViewing: [0, 0, 0],
    cameraDistance: 50,
    lightAngle: [degToRad(45), degToRad(30)],
    lightProjectionBoundary: [25, 25, 4],
    viewingVelocity: [0, 0],

    pieces: initPieces(),
    turn: 'y',
    chosenPieceI: 4, // WIP
  }
  game.gl = gl;

  // DEBUG:
  //game.pieces[0].coord = [-3, -2];

  game.occupiedCoordIds = initOccupiedCoordIds(game.pieces);
  refreshAvailableCoords(game);

  game.rendering = initRendering(game);
  game.input = listenToInputs(gl.canvas, game);

  return game;
}

export function updateGame(game) {
  moveViewing(game, game.viewingVelocity);
}

function initPieces() {
  return [
    // team y
    ...Array(4).fill().flatMap((_, i) => (
      Array(i+1).fill().map((_, j) => (
        { coord: [i - 8, j - 4], team: 'y', availableCoords: [] }
      ))
    )),

    // team b
    ...Array(4).fill().flatMap((_, i) => (
      Array(i+1).fill().map((_, j) => (
        { coord: [i + 1, j + 5], team: 'b', availableCoords: [] }
      ))
    )),

    // team g
    ...Array(4).fill().flatMap((_, i) => (
      Array(i+1).fill().map((_, j) => (
        { coord: [i + 1, j - 4], team: 'g', availableCoords: [] }
      ))
    )),
  ].map((piece, i) => ({
    ...piece, i: i + 1
  }));
}

function initOccupiedCoordIds(pieces) {
  const occupiedCoordIds = {};
  pieces.forEach(piece => {
    occupiedCoordIds[pieceCoordId(piece.coord)] = true;
  })

  return occupiedCoordIds;
}

function refreshAvailableCoords(game) {
  game.pieces.forEach(piece => {
    if (piece.team === game.turn) {
      piece.availableCoords = pipe(
        [
          ...directMovableCoords(piece.coord, game),
          ...jumpableCoords(piece.coord, game),
        ].map(coord => ([pieceCoordId(coord), coord])), // remove duplications:
        Object.fromEntries,
        Object.values,
      );
    } else {
      piece.availableCoords = [];
    }
  })
}

function directMovableCoords(coord, game) {
  return [
    [-1, 0], [0, 1], [1, 1], [1, 0], [0, -1], [-1, -1]
  ].map(
    direction => coord.map((c, i) => c + direction[i])
  ).filter(
    newCoord => (
      validPieceCoord(newCoord) &&
      !game.occupiedCoordIds[pieceCoordId(newCoord)]
    )
  );
}

function jumpableCoords(coord, game, visited = {}) { // result contains duplications
  if (visited[pieceCoordId(coord)]) return [];
  visited[pieceCoordId(coord)] = true;

  const nextAvailableCoords = [
    [-1, 0], [0, 1], [1, 1], [1, 0], [0, -1], [-1, -1]
  ].map(
    direction => ([coord.map((c, i) => c + direction[i]), coord.map((c, i) => c + direction[i] * 2)])
  ).filter(
    ([viaCoord, newCoord]) => (
      validPieceCoord(newCoord) &&
      game.occupiedCoordIds[pieceCoordId(viaCoord)] &&
      !game.occupiedCoordIds[pieceCoordId(newCoord)]
    )
  ).map(([_viaCoord, newCoord]) => newCoord);

  return [
    ...nextAvailableCoords,
    ...nextAvailableCoords.flatMap(c => jumpableCoords(c, game, visited)),
  ];
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

    // TODO: refactor
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

export function chooseObjectId(game, objectId) {
  const object = game.pieces[objectId - 1];

  if (object) {
    console.log('click', object.i, object);
  }
}
