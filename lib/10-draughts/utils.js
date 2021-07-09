
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

export function initPieces() {
  return [
    // team y
    ...Array(4).fill().flatMap((_, i) => (
      Array(i+1).fill().map((_, j) => (
        { coord: [i - 8, j - 4], team: 'y' }
      ))
    )),

    // team b
    ...Array(4).fill().flatMap((_, i) => (
      Array(i+1).fill().map((_, j) => (
        { coord: [i + 1, j + 5], team: 'b' }
      ))
    )),

    // team g
    ...Array(4).fill().flatMap((_, i) => (
      Array(i+1).fill().map((_, j) => (
        { coord: [i + 1, j - 4], team: 'g' }
      ))
    )),
  ].map((piece, i) => ({
    ...piece, i: i + 1
  }));
}

export function pieceCoordTranslation(coord) {
  return [coord[0] * 3 - coord[1] * 1.5, 0, coord[1] * -2.5];
}
