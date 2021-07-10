import initRendering from './init-rendering.js';
import { setConeRenderingHighLight, setDiscRenderingHighLight, refreshDiscRendering, refreshConeRendering } from './update-rendering.js';
import listenToInputs from './input.js';

import { validPieceCoord, pieceCoordHash, getObjectFromId, pieceInDestination } from './utils.js';
import { pipe, degToRad } from '../utils.js';

import { cameraMaxAngle, cameraMinAngle, nextTurnMap } from './consts.js';

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
    chosenPieceIndex: null,

    score: {
      y: 0, b: 0, g: 0,
    },

    occupiedCoordHashs: {},
  }
  game.gl = gl;

  initOccupiedCoordHashs(game);
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
  ];
}

function initOccupiedCoordHashs(game) {
  const occupiedCoordHashs = {};
  game.pieces.forEach(piece => {
    occupiedCoordHashs[pieceCoordHash(piece.coord)] = true;
  })

  game.occupiedCoordHashs = occupiedCoordHashs;
}

function updateOccupiedCoordHashs(game, removedCoord, addedCoord) {
  game.occupiedCoordHashs[pieceCoordHash(addedCoord)] = true;
  delete game.occupiedCoordHashs[pieceCoordHash(removedCoord)];
}

function refreshAvailableCoords(game) {
  game.pieces.forEach(piece => {
    if (piece.team === game.turn) {
      piece.availableCoords = pipe(
        [
          ...directMovableCoords(piece.coord, game),
          ...jumpableCoords(piece.coord, game),
        ].map(coord => ([pieceCoordHash(coord), coord])), // remove duplications:
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
      !game.occupiedCoordHashs[pieceCoordHash(newCoord)]
    )
  );
}

function jumpableCoords(coord, game, visited = {}) { // result contains duplications
  if (visited[pieceCoordHash(coord)]) return [];
  visited[pieceCoordHash(coord)] = true;

  const nextAvailableCoords = [
    [-1, 0], [0, 1], [1, 1], [1, 0], [0, -1], [-1, -1]
  ].map(
    direction => ([coord.map((c, i) => c + direction[i]), coord.map((c, i) => c + direction[i] * 2)])
  ).filter(
    ([viaCoord, newCoord]) => (
      validPieceCoord(newCoord) &&
      game.occupiedCoordHashs[pieceCoordHash(viaCoord)] &&
      !game.occupiedCoordHashs[pieceCoordHash(newCoord)]
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
    const [preObjectType, , preObjectIndex] = getObjectFromId(game.pointingObjId, game);
    const [objectType, object, objectIndex] = getObjectFromId(objectId, game);
    game.pointingObjId = objectId;

    switch (preObjectType) {
      case 'piece':
        if (game.chosenPieceIndex !== preObjectIndex) {
          setConeRenderingHighLight(game, preObjectIndex, false);
        }
        break;
      case 'availableCoord':
        setDiscRenderingHighLight(game, preObjectIndex, false);
        break;
    }
    switch (objectType) {
      case 'piece':
        if (object.availableCoords.length > 0) {
          setConeRenderingHighLight(game, objectIndex, true);
        }
        break;
      case 'availableCoord':
        setDiscRenderingHighLight(game, objectIndex, true);
        break;
    }
  }
}

export function chooseObjectId(game, objectId) {
  const [objectType, object, objectIndex] = getObjectFromId(objectId, game);

  switch (objectType) {
    case 'piece':
      if (object.availableCoords.length > 0) {
        if (game.chosenPieceIndex !== null) {
          setConeRenderingHighLight(game, game.chosenPieceIndex, false);
        }
        setConeRenderingHighLight(game, objectIndex, true);
        game.chosenPieceIndex = objectIndex;
        refreshDiscRendering(game);
      }
      break;
    case 'availableCoord':
      moveChosenPiece(game, object);
      break;
  }
}

function moveChosenPiece(game, coord) {
  const piece = game.pieces[game.chosenPieceIndex];

  updateOccupiedCoordHashs(game, piece.coord, coord);
  const pieceInDestinationBefore = pieceInDestination(piece);
  piece.coord = coord;
  const pieceInDestinationAfter = pieceInDestination(piece);
  game.turn = nextTurnMap[game.turn];
  refreshAvailableCoords(game);

  if (pieceInDestinationBefore !== pieceInDestinationAfter) {
    game.score[piece.team] += pieceInDestinationAfter ? 1 : -1;
    if (game.score[piece.team] >= 10) {
      alert(`team ${piece.team} win!`);
    }
  }

  game.chosenPieceIndex = null;
  refreshConeRendering(game);
  refreshDiscRendering(game);
}
