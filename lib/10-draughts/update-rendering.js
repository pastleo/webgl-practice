import { pieceCoordTranslation, pieceGlow } from './utils.js';

export function setConeRenderingHighLight(game, index, highLight) {
  const gl = game.gl;

  const attr = 'ai_emission';
  const attrInfo = game.rendering.bufferVaos.cone.bufferInfo.instanceAttribs[attr];
  gl.bindBuffer(gl.ARRAY_BUFFER, attrInfo.buffer);
  gl.bufferSubData(
    gl.ARRAY_BUFFER,
    index * attrInfo.numComponents * 4,
    new Float32Array(highLight ? [0.4, 0.4, 0.4] : [0, 0, 0])
  );
}

export function setDiscRenderingHighLight(game, index, highLight) {
  const gl = game.gl;

  [
    ['ai_diffuse', highLight ? [0, 0, 0, 0.4] : [0, 0, 0, 0]],
    ['ai_emission', highLight ? [0.4, 0.4, 0.4] : [0, 0, 0]],
  ].forEach(([attr, data]) => {
    const attrInfo = game.rendering.bufferVaos.disc.bufferInfo.instanceAttribs[attr];
    gl.bindBuffer(gl.ARRAY_BUFFER, attrInfo.buffer);
    gl.bufferSubData(
      gl.ARRAY_BUFFER,
      index * attrInfo.numComponents * 4,
      new Float32Array(data)
    );
  });
}

export function refreshConeRendering(game) {
  const gl = game.gl;

  [
    ['ai_translate', p => pieceCoordTranslation(p.coord)],
    ['ai_emission', () => ([0, 0, 0])],
    ['ai_glow', pieceGlow],
  ].forEach(([attr, getData]) => {
    const attrInfo = game.rendering.bufferVaos.cone.bufferInfo.instanceAttribs[attr];
    gl.bindBuffer(gl.ARRAY_BUFFER, attrInfo.buffer);
    gl.bufferSubData(
      gl.ARRAY_BUFFER, 0, // offset
      new Float32Array(game.pieces.flatMap(getData))
    );
  });
}

export function refreshDiscRendering(game) {
  const gl = game.gl;

  const availableCoords = game.pieces[game.chosenPieceIndex]?.availableCoords || [];
  [
    ['ai_translate', pieceCoordTranslation],
    ['ai_diffuse', () => ([0, 0, 0, 0])],
    ['ai_emission', () => ([0, 0, 0])],
  ].forEach(([attr, getData]) => {
    const attrInfo = game.rendering.bufferVaos.disc.bufferInfo.instanceAttribs[attr];
    gl.bindBuffer(gl.ARRAY_BUFFER, attrInfo.buffer);
    gl.bufferSubData(
      gl.ARRAY_BUFFER, 0, // offset
      new Float32Array(availableCoords.flatMap(getData))
    );
  });

  game.rendering.bufferVaos.disc.bufferInfo.instance = availableCoords.length;
}
