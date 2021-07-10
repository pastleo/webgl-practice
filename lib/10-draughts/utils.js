import { glowColor } from './consts.js';

export function allPieceCorrds() {
  return [
    // main pieces:
    ...Array(9).fill().flatMap((_, i) => (
      Array(9).fill().map((_, j) => (
        [i - 4, j - 4]
      ))
    )),
    // left down pieces
    ...Array(4).fill().flatMap((_, i) => (
      Array(i+1).fill().map((_, j) => (
        [i - 8, j - 4]
      ))
    )),
    // top pieces
    ...Array(4).fill().flatMap((_, i) => (
      Array(i+1).fill().map((_, j) => (
        [i + 1, j + 5]
      ))
    )),
    // right upper pieces
    ...Array(4).fill().flatMap((_, i) => (
      Array(i+1).fill().map((_, j) => (
        [j + 5, i + 1]
      ))
    )),
    // bottom pieces
    ...Array(4).fill().flatMap((_, i) => (
      Array(i+1).fill().map((_, j) => (
        [j - 4, i - 8]
      ))
    )),
  ];
}

export function pieceCoordTranslation(coord) {
  return [coord[0] * 3 - coord[1] * 1.5, 0, coord[1] * -2.5];
}

export function pieceGlow(piece) {
  return piece.availableCoords.length > 0 ? glowColor : [0, 0, 0];
}

export function validPieceCoord(coord) {
  if ( // main
    coord[0] >= -4 && coord[0] <= 4 &&
    coord[1] >= -4 && coord[1] <= 4
  ) return true;
  if ( // left down
    coord[0] >= -8 && coord[0] <= -5 &&
    coord[1] >= -4 && coord[1] <= (coord[0] + 4)
  ) return true;
  if ( // bottom
    coord[0] >= -4 && coord[0] <= -1 &&
    coord[1] >= (coord[0] - 4) && coord[1] <= -5
  ) return true;
  if ( // top
    coord[0] >= (coord[1] - 4) && coord[0] <= 4 &&
    coord[1] >= 5 && coord[1] <= 8
  ) return true;
  if ( // right up
    coord[0] >= 5 && coord[0] <= 8 &&
    coord[1] >= (coord[0] - 4) && coord[1] <= 4
  ) return true;

  return false;
}

export function pieceCoordId(coord) {
  return (coord[0] + 8) + (coord[1] + 8) * 17;
}

export function availableCoordsObjectId(coord, game) {
  return pieceCoordId(coord) + game.pieces.length;
}
