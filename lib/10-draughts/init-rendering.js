import * as twgl from '../../vendor/twgl-full.module.js';
import createPrograms, { attribLocations } from './shaders.js';
import { createObjectIdProjectionInfo } from './pointing-object.js';
import { createTextRendering } from './text.js';

import { matrix4 } from '../matrix.js';
import { pipe, degToRad } from '../utils.js';

import {
  pieceCoordTranslation, pieceGlow,
  pieceObjectId, availableCoordsObjectId,
} from './utils.js';
import { pieceTeamDiffuseMap, locationTeamDiffuseMap } from './consts.js';

import { encodeIntVec4 } from '../utils.js';

export default function initRendering(game) {
  twgl.setAttributePrefix('a_');

  const gl = game.gl;
  const programs = createPrograms(gl);
  const bufferVaos = {};

  bufferVaos.cone = initInstancedBufferVao(gl, programs.main,
    twgl.primitives.createTruncatedConeVertices(1, 0, 2, 32, 32),
    [
      ['ai_world', 16, p => matrix4.translation(...pieceCoordTranslation(p.coord))],
      ['ai_diffuse', 4, p => pieceTeamDiffuseMap[p.team]],
      ['ai_objectId', 4, (_, i) => encodeIntVec4(pieceObjectId(i))],
      ['ai_emission', 3, () => ([0, 0, 0])],
      ['ai_glow', 4, p => pieceGlow(p, game)],
    ],
    game.pieces,
  );

  bufferVaos.disc = initInstancedBufferVao(gl, programs.main,
    twgl.primitives.createDiscVertices(1, 32),
    [
      ['ai_diffuse', 4, () => ([0, 0, 0, 0])],
      ['ai_objectId', 4, (_, i) => encodeIntVec4(availableCoordsObjectId(i, game))],
      ['ai_emission', 3, () => ([0, 0, 0])],
      ['ai_glow', 4, () => ([0, 0, 0, 0.5])],
    ],
    Array(128).fill(),
    0, // force zero instance
  );

  bufferVaos.torus = initInstancedBufferVao(gl, programs.main,
    twgl.primitives.createTorusVertices(1.1, 0.1, 32, 32),
    [
      ['ai_world', 16, l => matrix4.translation(...pieceCoordTranslation(l.coord))],
      ['ai_diffuse', 4, l => locationTeamDiffuseMap[l.team]],
      ['ai_glow', 4, () => ([0, 0, 0, 0])],
    ],
    game.locations,
  );

  bufferVaos.xyQuad = initInstancedBufferVao(gl, programs.main,
    twgl.primitives.createXYQuadVertices(),
    [
      ['ai_diffuse', 4, () => ([0, 0, 0, 0])],
      ['ai_glow', 4, () => ([0, 0, 0, 0])],
    ],
    Array(1).fill(),
  );

  bufferVaos.kanban = initInstancedBufferVao(gl, programs.main,
    twgl.primitives.createXYQuadVertices(),
    [
      ['ai_world', 16, (_, i) => (pipe(
        matrix4.identity(),
        m => matrix4.yRotate(m, degToRad(-30 - 120 * i)),
        m => matrix4.translate(m, 0, 0.005, -20),
        m => matrix4.scale(m, 6, 1, 6),
        m => matrix4.xRotate(m, degToRad(-90)),
      ))],
      ['ai_diffuse', 4, () => ([0, 0, 0, 0])],
      ['ai_glow', 4, () => ([0, 0, 0, 0])],
    ],
    Array(3).fill(),
  );

  return {
    programs, bufferVaos,
    nullTexture: createNullTexture(gl),
    lightProjection: createLightProjectionInfo(gl),
    objectIdProjection: createObjectIdProjectionInfo(gl),
    text: createTextRendering(gl, game),
  };
}

function initInstancedBufferVao(gl, program, vertices, instanceAttrs, instanceData, instanceDrawCount) {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  const attribs = {};
  [['normal', 3], ['position', 3], ['texcoord', 2]].forEach(([attr, numComponents]) => {
    const attrName = `a_${attr}`;
    const attribSetter = program.attribSetters[attrName];
    const attribLocation = attribSetter ? attribSetter.location : attribLocations[attrName];
    if (!attribSetter) return;

    gl.enableVertexAttribArray(attribLocation);

    const data = vertices[attr].data ?? vertices[attr];
    const float32Data = Array.isArray(data) ? new Float32Array(data) : data;

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, float32Data, gl.STATIC_DRAW);

    gl.vertexAttribPointer( // point to latest bindBuffer
      attribLocation,
      vertices[attr].numComponents ?? numComponents,
      gl.FLOAT, // type
      false, // normalize
      0, // stride
      0, // offset
    );

    attribs[attrName] = { buffer, numComponents };
  });

  let getWorldMatrixInstanceAttrFn = () => matrix4.identity();
  const instanceAttribs = {};
  instanceAttrs.forEach(([attr, numComponents, getData]) => {
    if (attr === 'ai_world') {
      getWorldMatrixInstanceAttrFn = getData;
      return;
    }

    const attribSetter = program.attribSetters[attr];
    const attribLocation = attribSetter ? attribSetter.location : attribLocations[attr];
    if (!attribLocation) return;

    gl.enableVertexAttribArray(attribLocation);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      calculateFloat32Data(instanceData, getData),
      gl.DYNAMIC_DRAW,
    );

    gl.vertexAttribPointer( // point to latest bindBuffer
      attribLocation,
      numComponents,
      gl.FLOAT, // type
      false, // normalize
      0, // stride
      0, // offset
    );

    gl.vertexAttribDivisor(attribLocation, 1);

    instanceAttribs[attr] = { buffer, numComponents };
  });

  const aiWorldSetter = program.attribSetters.ai_world;
  const aiWorldLocation = aiWorldSetter ? aiWorldSetter.location : attribLocations.ai_world;
  if (aiWorldLocation) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      calculateFloat32Data(instanceData, getWorldMatrixInstanceAttrFn),
      gl.DYNAMIC_DRAW,
    );

    const stride = 4 * 16;
    Array(4).fill().forEach((_, i) => {
      const attrSubLocation = aiWorldLocation + i;
      gl.enableVertexAttribArray(attrSubLocation);
      gl.vertexAttribPointer( // point to latest bindBuffer
        attrSubLocation,
        4, // numComponents for each subAttr
        gl.FLOAT, // type
        false, // normalize
        stride, // stride
        i * 4 * 4, // offset
      );

      gl.vertexAttribDivisor(attrSubLocation, 1);
    })

    instanceAttribs.ai_world = { buffer, numComponents: 16 };
  }

  // using indices
  const indicesData = Array.isArray(vertices.indices) ? new Uint16Array(vertices.indices) : vertices.indices;
  const indicesBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indicesData, gl.STATIC_DRAW);

  // !!! important:
  gl.bindVertexArray(null);

  return {
    bufferInfo: {
      attribs, instanceAttribs,
      numElements: vertices.indices.length,
      indices: indicesBuffer,
      elementType: gl.UNSIGNED_SHORT,
      instanceDrawCount: instanceDrawCount ?? instanceData.length,
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

function createNullTexture(gl) {
  const nullTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, nullTexture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0, // level
    gl.RGBA, // internalFormat
    1, // width
    1, // height
    0, // border
    gl.RGBA, // format
    gl.UNSIGNED_BYTE, // type
    new Uint8Array([0, 0, 0, 0]), // data
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

  return nullTexture;
}

function calculateFloat32Data(instanceData, getWorldMatrixInstanceAttrFn) {
  return new Float32Array(
    instanceData.flatMap((d, i) => Array.from(getWorldMatrixInstanceAttrFn(d, i)))
  );
}
