import { pieceCoordTranslation, pieceGlow } from './utils.js';

import { matrix4 } from '../matrix.js';

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

export function setTorusRenderingHighLight(game, highLight, start, end) {
  const gl = game.gl;

  const attr = 'ai_glow';
  const attrInfo = game.rendering.bufferVaos.torus.bufferInfo.instanceAttribs[attr];
  gl.bindBuffer(gl.ARRAY_BUFFER, attrInfo.buffer);
  gl.bufferSubData(
    gl.ARRAY_BUFFER,
    start * attrInfo.numComponents * 4,
    new Float32Array(
      Array(end - start).fill(highLight ? [0.25, 0.25, 0.25, 0] : [0, 0, 0, 0]).flat()
    ),
  );
}

export function refreshConeRendering(game) {
  const gl = game.gl;

  [
    ['ai_world', p => matrix4.translation(...pieceCoordTranslation(p.coord))],
    ['ai_emission', () => ([0, 0, 0])],
    ['ai_glow', p => pieceGlow(p, game)],
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
    ['ai_world', c => matrix4.translation(...pieceCoordTranslation(c))],
    ['ai_diffuse', () => ([0, 0, 0, 0])],
    ['ai_emission', () => ([0, 0, 0])],
  ].forEach(([attr, getData]) => {
    const attrInfo = game.rendering.bufferVaos.disc.bufferInfo.instanceAttribs[attr];
    if (!attrInfo) { console.log(attrInfo, attr, getData); }
    gl.bindBuffer(gl.ARRAY_BUFFER, attrInfo.buffer);
    gl.bufferSubData(
      gl.ARRAY_BUFFER, 0, // offset
      new Float32Array(availableCoords.flatMap(getData))
    );
  });

  game.rendering.bufferVaos.disc.bufferInfo.instanceDrawCount = availableCoords.length;
}
