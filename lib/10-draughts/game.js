import initRendering from './init-rendering.js';

import {
  setConeRenderingHighLight, setDiscRenderingHighLight,
  refreshDiscRendering, refreshConeRendering, setTorusRenderingHighLight,
} from './update-rendering.js';
import listenToInputs from './input.js';
import { updateTextRendering } from './text.js';

import {
  leftDownPieceCoords, topPieceCoords, rightDownPieceCoords,
  rightUpPieceCoords, bottomPieceCoords, leftUpPieceCoords,
  centerPieceCoords,
  validPieceCoord, pieceCoordHash, getObjectFromId, pieceInDestination,
  distanceSq,
} from './utils.js';
import { pipe, degToRad } from '../utils.js';

import {
  cameraMaxAngle, cameraMinAngle, nextTurnMap, skyTeamStarColorMap,
  demoCameraVelocityDeg,
} from './consts.js';

export default function initGame(gl) {
  const game = {
    fieldOfView: degToRad(45),
    cameraAngle: [degToRad(-85), 0],
    cameraViewing: [0, 0, 0],
    cameraDistance: 2000,
    lightAngle: [degToRad(45), degToRad(30)],
    lightProjectionBoundary: [25, 25, 4],
    viewingVelocity: [0, 0],
    cameraAngleVelocity: [0, degToRad(demoCameraVelocityDeg)],
    cameraTarget: {
      angle0: degToRad(-20),
      distance: calcWelcomeCameraDistance(gl),
    },
    starColor: [0, 0, 0],

    pieces: initPieces(),
    locations: initLocations(),
    highLightedLocationSlice: [0, 0], // start, end
    turn: 'n',
    chosenPieceIndex: null,
    randomSeed: Math.random(),

    score: { y: 0, g: 0, b: 0 },
    steps: { y: 0, g: 0, b: 0 },
    winners: [],
    turnRemainingSecs: 0,
    turnSecs: 0, // 0 to disable

    occupiedCoordHashs: {},

    pixelRatio: 1,
  }
  game.gl = gl;

  // debug:
  //dbgPiecesAlmostWin(game.pieces);

  initOccupiedCoordHashs(game);

  game.rendering = initRendering(game);
  game.input = listenToInputs(gl.canvas, game);

  return game;
}

export function updateGame(game) {
  moveViewing(game, game.viewingVelocity);
  approachCameraTarget(game);
  moveCameraAngle(game, game.cameraAngleVelocity);
  updateStarColor(game);
  preventViewingTooFar(game);
}

export function startGame(game, options) {
  game.turnSecs = options.turnSecs;

  game.turn = ['y', 'g', 'b'][Math.floor(Math.random() * 3)];
  refreshAvailableCoords(game);
  refreshConeRendering(game);
  startTurnCountDown(game);
  updateTextRendering(game);

  game.cameraTarget = {
    viewing: [0, 0, 0],
    angle0: degToRad(-40),
    angle1: Math.ceil(game.cameraAngle[1] / (Math.PI * 2)) * Math.PI * 2 + ({
      y: degToRad(300), g: degToRad(60), b: degToRad(180),
    }[game.turn]),
    distance: 50,
  };
}

export function resetGame(game) {
  game.pieces = initPieces();
  game.chosenPieceIndex = null;
  game.turn = 'n';
  game.score = { y: 0, g: 0, b: 0 };
  game.steps = { y: 0, g: 0, b: 0 };
  game.winners = [];

  initOccupiedCoordHashs(game);

  highLightTeamLocationSlice(game, false);
  stopTurnCountDown(game);
  refreshAvailableCoords(game);
  refreshConeRendering(game);
  refreshDiscRendering(game);
  updateTextRendering(game);

  game.cameraTarget = {
    viewing: [0, 0, 0],
    angle0: degToRad(-20),
    distance: calcWelcomeCameraDistance(game.gl),
  };
  game.cameraAngleVelocity = [0, degToRad(demoCameraVelocityDeg)];
}

function approachCameraTarget(game) {
  const cameraTarget = game.cameraTarget;
  if (cameraTarget.angle0) {
    if (Math.abs(cameraTarget.angle0 - game.cameraAngle[0]) > 0.1) {
      game.cameraAngleVelocity[0] = (cameraTarget.angle0 - game.cameraAngle[0]) / 50;
    } else {
      game.cameraAngleVelocity[0] = 0;
      delete cameraTarget.angle0;
    }
  }
  if (cameraTarget.angle1) {
    if (Math.abs(cameraTarget.angle1 - game.cameraAngle[1]) > 0.1) {
      game.cameraAngleVelocity[1] = (cameraTarget.angle1 - game.cameraAngle[1]) / 50;
    } else {
      game.cameraAngleVelocity[1] = 0;
      delete cameraTarget.angle1;
    }
  }
  if (cameraTarget.distance) {
    if (Math.abs(cameraTarget.distance - game.cameraDistance) > 2) {
      game.cameraDistance = (cameraTarget.distance + game.cameraDistance * 23) / 24;
    } else {
      delete cameraTarget.distance;
    }
  }
  if (cameraTarget.viewing) {
    const distance = distanceSq(cameraTarget.viewing, game.cameraViewing);
    if (distance > 0.25) {
      game.cameraViewing = game.cameraViewing.map((p, i) => (p * 31 + cameraTarget.viewing[i]) / 32);
    } else {
      delete cameraTarget.viewing;
    }
  }
}

function preventViewingTooFar(game) {
  if (Math.abs(game.cameraViewing[0]) > 30) {
    game.cameraViewing[0] = game.cameraViewing[0] * 31 / 32;
  }
  if (Math.abs(game.cameraViewing[2]) > 30) {
    game.cameraViewing[2] = game.cameraViewing[2] * 31 / 32;
  }
}

function initPieces() {
  return [
    // team y
    ...leftDownPieceCoords().map(coord => (
      { coord, team: 'y', availableCoords: [] }
    )),

    // team g
    ...rightDownPieceCoords().map(coord => (
      { coord, team: 'g', availableCoords: [] }
    )),

    // team b
    ...topPieceCoords().map(coord => (
      { coord, team: 'b', availableCoords: [] }
    )),
  ];
}

// for debug
function dbgPiecesAlmostWin(pieces) {
  pieces[0].coord = [4, 4];
  pieces[1].coord = [4, 3];
  pieces[2].coord = [4, 2];
  pieces[3].coord = [4, 1];
  pieces[4].coord = [4, 0];
  pieces[5].coord = [3, 4];
  pieces[6].coord = [3, 3];
  pieces[7].coord = [3, 2];
  pieces[8].coord = [3, 1];
  pieces[9].coord = [3, 0];

  pieces[10].coord = [-4, 0];
  pieces[11].coord = [-3, 0];
  pieces[12].coord = [-3, 1];
  pieces[13].coord = [-2, 1];
  pieces[14].coord = [-2, 2];
  pieces[15].coord = [-1, 2];
  pieces[16].coord = [-1, 3];
  pieces[17].coord = [0, 3];
  pieces[18].coord = [0, 4];
  pieces[19].coord = [1, 4];
}

function initLocations() {
  return [
    ...leftDownPieceCoords().map(coord => ({ coord, team: 'y' })), // index [0..9]
    ...topPieceCoords().map(coord => ({ coord, team: 'b' })), // index [10..19]
    ...rightDownPieceCoords().map(coord => ({ coord, team: 'g' })), // index [20..29]
    ...rightUpPieceCoords().map(coord => ({ coord, team: 'y' })), // index [30..39]
    ...bottomPieceCoords().map(coord => ({ coord, team: 'b' })), // index [40..49]
    ...leftUpPieceCoords().map(coord => ({ coord, team: 'g' })), // index [50..59]
    ...centerPieceCoords().map(coord => ({ coord, team: 'n' })),
  ]
}

function highLightTeamLocationSlice(game, highLight) {
  setTorusRenderingHighLight(game, false, ...game.highLightedLocationSlice);

  if (highLight) {
    game.highLightedLocationSlice = (
      { y: [30, 40], b: [40, 50], g: [50, 60] }[game.turn]
    );
    setTorusRenderingHighLight(game, true, ...game.highLightedLocationSlice);
  } else {
    game.highLightedLocationSlice = [0, 0];
  }
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

export function moveCameraAngle(game, angles) {
  angles.forEach((a, i) => {
    game.cameraAngle[i] += a;
  });

  if (game.cameraAngle[0] > cameraMaxAngle) {
    game.cameraAngle[0] = cameraMaxAngle;
  } else if (game.cameraAngle[0] < cameraMinAngle) {
    game.cameraAngle[0] = cameraMinAngle;
  }
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
        highLightTeamLocationSlice(game, true);
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
  game.chosenPieceIndex = null;
  game.steps[game.turn]++;

  highLightTeamLocationSlice(game, false);
  updateOccupiedCoordHashs(game, piece.coord, coord);
  const pieceInDestinationBefore = pieceInDestination(piece);
  piece.coord = coord;
  const pieceInDestinationAfter = pieceInDestination(piece);

  if (pieceInDestinationBefore !== pieceInDestinationAfter) {
    game.score[piece.team] += pieceInDestinationAfter ? 1 : -1;
    if (game.score[piece.team] >= 10) {
      game.winners.push(piece.team);
    }
  }

  nextTurn(game);

  refreshAvailableCoords(game);
  refreshConeRendering(game);
  refreshDiscRendering(game);
  updateTextRendering(game);
}

function nextTurn(game) {
  if (game.winners.length >= 3) {
    game.turn = 'n';
    stopTurnCountDown(game);
    return;
  }

  let next = nextTurnMap[game.turn];
  while(game.winners.indexOf(next) !== -1) {
    next = nextTurnMap[next];
  }
  game.turn = next;
  startTurnCountDown(game);
}

function startTurnCountDown(game) {
  clearInterval(game.turnCountDown);

  if (game.turnSecs < 1) return;
  game.turnRemainingSecs = game.turnSecs;

  game.turnCountDown = setInterval(() => {
    game.turnRemainingSecs--;

    if (game.turnRemainingSecs <= 0) {
      nextTurn(game);
      highLightTeamLocationSlice(game, false);
      refreshAvailableCoords(game);
      refreshConeRendering(game);
      refreshDiscRendering(game);
    }
    updateTextRendering(game);
  }, 1000);
}
function stopTurnCountDown(game) {
  clearInterval(game.turnCountDown);
  game.turnRemainingSecs = 0;
}

function updateStarColor(game) {
  const targetColor = skyTeamStarColorMap[game.turn];
  game.starColor = targetColor.map((c, i) => (
    (c + game.starColor[i] * 9) / 10
  ))
}

function calcWelcomeCameraDistance(gl) {
  return 50 / (gl.canvas.clientWidth / gl.canvas.clientHeight) + 50;
}
