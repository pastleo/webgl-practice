import * as twgl from '../../vendor/twgl-full.module.js';
import createPrograms, { attribLocations } from './shaders.js';

import { allPieceCorrds, pieceCoordTranslation } from './utils.js';
import { pieceTeamDiffuseMap } from './consts.js';

import { encodeIntVec4 } from '../utils.js';

export default function initRendering(gl, game) {
  const programs = createPrograms(gl);

  const bufferVaos = {};

  bufferVaos.cone = initInstancedBufferVao(gl, programs.main,
    twgl.primitives.createTruncatedConeVertices(1, 0, 2, 32, 32),
    [
      ['ai_translate', 3, p => pieceCoordTranslation(p.coord)],
      ['ai_diffuse', 4, p => pieceTeamDiffuseMap[p.team]],
      ['ai_objectId', 4, p => encodeIntVec4(p.i)],
    ],
    game.pieces,
  );

  bufferVaos.torus = initInstancedBufferVao(gl, programs.main,
    twgl.primitives.createTorusVertices(1.1, 0.1, 32, 32),
    [
      ['ai_translate', 3, pieceCoordTranslation],
    ],
    allPieceCorrds(),
  );

  { // ground / xyQuad
    const vertices = twgl.primitives.createXYQuadVertices();

    const bufferInfo = twgl.createBufferInfoFromArrays(gl, vertices);
    const vao = twgl.createVAOFromBufferInfo(gl, programs.main, bufferInfo);
    bufferVaos.xyQuad = { bufferInfo, vao };
  }

  return {
    programs, bufferVaos,
    lightProjection: createLightProjectionInfo(gl),
    objectIdProjection: createObjectIdProjectionInfo(gl),
  };
}

function initInstancedBufferVao(gl, program, vertices, instanceAttrs, instanceData) {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  [['normal', 3], ['position', 3], ['texcoord', 2]].forEach(([attr, size]) => {
    const attribSetter = program.attribSetters[`a_${attr}`];
    const attribLocation = attribSetter ? attribSetter.location : attribLocations[`a_${attr}`];
    if (!attribSetter) return;

    gl.enableVertexAttribArray(attribLocation);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices[attr], gl.STATIC_DRAW);

    gl.vertexAttribPointer( // point to latest bindBuffer
      attribLocation,
      size,
      gl.FLOAT, // type
      false, // normalize
      0, // stride
      0, // offset
    );
  });

  instanceAttrs.forEach(([attr, size, getData, type]) => {
    const attribSetter = program.attribSetters[attr];
    const attribLocation = attribSetter ? attribSetter.location : attribLocations[attr];
    if (!attribLocation) return;

    gl.enableVertexAttribArray(attribLocation);

    const data = new Float32Array(instanceData.flatMap(getData));

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

    gl.vertexAttribPointer( // point to latest bindBuffer
      attribLocation,
      size,
      type || gl.FLOAT, // type
      false, // normalize
      0, // stride
      0, // offset
    );

    gl.vertexAttribDivisor(attribLocation, 1);
  });

  // using indices
  const indicesBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, vertices.indices, gl.STATIC_DRAW);

  // !!! important:
  gl.bindVertexArray(null);

  return {
    bufferInfo: {
      numElements: vertices.indices.length,
      indices: indicesBuffer,
      elementType: gl.UNSIGNED_SHORT,
      instance: instanceData.length,
    }, vao,
  };
}

function createLightProjectionInfo(gl) {
  const depthTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, depthTexture);

  const width = 2048;
  const height = 2048;

  gl.texImage2D(
    gl.TEXTURE_2D,
    0, // level
    gl.DEPTH_COMPONENT, // internalFormat
    width,
    height,
    0, // border
    gl.DEPTH_COMPONENT, // format
    gl.UNSIGNED_INT, // type
    null, // data
  );

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const framebufferInfo = twgl.createFramebufferInfo(gl, [
    { attachmentPoint: gl.DEPTH_ATTACHMENT, attachment: depthTexture },
  ], width, height)

  return {
    framebufferInfo,
    map: framebufferInfo.attachments[0],
  };
}

function createObjectIdProjectionInfo(gl) {
  const width = 1;
  const height = 1;

  const framebufferInfo = twgl.createFramebufferInfo(gl, null, width, height)

  return {
    framebufferInfo,
    map: framebufferInfo.attachments[0],
  };
}
