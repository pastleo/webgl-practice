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

export function pieceGlow(piece, game) {
  return piece.team === game.turn ? [0.25, 0.25, 0.25, 0] : [0, 0, 0, 0];
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

export function pieceInDestination(piece) {
  const { team, coord } = piece;

  if ( // right up, for team y
    team === 'y' &&
    coord[0] >= 5 && coord[0] <= 8 &&
    coord[1] >= (coord[0] - 4) && coord[1] <= 4
  ) return true;
  if ( // bottom, for team b
    team === 'b' &&
    coord[0] >= -4 && coord[0] <= -1 &&
    coord[1] >= (coord[0] - 4) && coord[1] <= -5
  ) return true;
  if ( // left up, for team y
    team === 'g' &&
    coord[0] >= -4 && coord[0] <= -1 &&
    coord[1] >= (coord[0] + 5) && coord[1] <= 4
  ) return true;

  return false;
}

export function pieceCoordHash(coord) {
  return (coord[0] + 8) + (coord[1] + 8) * 17;
}

export function pieceObjectId(pieceIndex) {
  return pieceIndex + 1;
}

export function availableCoordsObjectId(coordIndex, game) {
  return coordIndex + game.pieces.length + 1;
}

export function getObjectFromId(objectId, game) {
  if (objectId < game.pieces.length + 1) {
    const pieceIndex = objectId - 1;
    const piece = game.pieces[pieceIndex];
    if (piece) return ['piece', piece, pieceIndex];
  } else {
    const availableCoordIndex = objectId - game.pieces.length - 1;
    const availableCoord = (
      (game.pieces[game.chosenPieceIndex]?.availableCoords || [])[availableCoordIndex]
    )
    if (availableCoord) return ['availableCoord', availableCoord, availableCoordIndex];
  }
  return [null, null, null];
}
