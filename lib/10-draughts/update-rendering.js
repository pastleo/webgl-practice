import {
  pieceCoordTranslation, pieceGlow,
  flatMapOrFillFloat32Array, instanceWorldMatriceAttrs,
} from './utils.js';

import { matrix4 } from '../matrix.js';

export function setConeRenderingHighLight(game, index, highLight) {
  updateInstancedBuffer(game, 'cone', {
    ai_emission: highLight ? [0.4, 0.4, 0.4] : [0, 0, 0],
  }, 1, { startIndex: index });
}

export function setDiscRenderingHighLight(game, index, highLight) {
  updateInstancedBuffer(game, 'disc', {
    ai_diffuse: highLight ? [0, 0, 0, 0.4] : [0, 0, 0, 0],
    ai_emission: highLight ? [0.4, 0.4, 0.4] : [0, 0, 0],
  }, 1, { startIndex: index });
}

export function setTorusRenderingHighLight(game, highLight, startIndex, endIndex) {
  updateInstancedBuffer(game, 'torus', {
    ai_glow: highLight ? [0.25, 0.25, 0.25, 0] : [0, 0, 0, 0],
  }, endIndex - startIndex, { startIndex });
}

export function refreshConeRendering(game) {
  updateInstancedBuffer(game, 'cone', {
    ...instanceWorldMatriceAttrs(
      p => matrix4.translation(...pieceCoordTranslation(p.coord))
    ),
    ai_emission: [0, 0, 0],
    ai_glow: p => pieceGlow(p, game),
  }, game.pieces);
}

export function refreshDiscRendering(game) {
  const chosenPiece = game.pieces[game.chosenPieceIndex];
  const availableCoords = chosenPiece ? chosenPiece.availableCoords : [];
  updateInstancedBuffer(game, 'disc', {
    ...instanceWorldMatriceAttrs(
      c => matrix4.translation(...pieceCoordTranslation(c))
    ),
    ai_diffuse: [0, 0, 0],
    ai_emission: [0, 0, 0],
  }, availableCoords, {
    instanceDrawCount: availableCoords.length,
  });
}

function updateInstancedBuffer(game, name, attrs, instanceDataOrLength, options = {}) {
  const gl = game.gl;
  const bufferInfo = game.rendering.bufferVaos[name].bufferInfo;
  const startIndex = options.startIndex || 0;

  Object.entries(attrs).forEach(([attr, attrContent]) => {
    const attrInfo = bufferInfo.instanceAttribs[attr];
    const mapperFnOrData = attrContent.data || attrContent;

    gl.bindBuffer(gl.ARRAY_BUFFER, attrInfo.buffer);
    gl.bufferSubData(
      gl.ARRAY_BUFFER,
      startIndex * attrInfo.numComponents * 4,
      flatMapOrFillFloat32Array(instanceDataOrLength, mapperFnOrData),
    );
  });

  if (options.instanceDrawCount !== undefined) {
    bufferInfo.instanceDrawCount = options.instanceDrawCount;
  }
}
