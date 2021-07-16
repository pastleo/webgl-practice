import * as twgl from '../../vendor/twgl-full.module.js';
import createPrograms, { attribLocations, attribNumComponents } from './shaders.js';
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

  gl.enable(gl.CULL_FACE);
  gl.enable(gl.DEPTH_TEST);

  bufferVaos.cone = createInstancedBufferVao(gl, programs.main,
    twgl.primitives.createTruncatedConeVertices(1, 0, 2, 32, 32),
    {
      ai_world: p => matrix4.translation(...pieceCoordTranslation(p.coord)),
      ai_diffuse: {
        numComponents: 4, // same as attribNumComponents, just demo overwriting
        getData: p => pieceTeamDiffuseMap[p.team],
      },
      ai_objectId: (_, i) => encodeIntVec4(pieceObjectId(i)),
      ai_emission: () => ([0, 0, 0]),
      ai_glow: p => pieceGlow(p, game),
    },
    game.pieces,
  );

  bufferVaos.disc = createInstancedBufferVao(gl, programs.main,
    twgl.primitives.createDiscVertices(1, 32),
    {
      ai_world: () => matrix4.identity(),
      ai_diffuse: () => ([0, 0, 0, 0]),
      ai_objectId: (_, i) => encodeIntVec4(availableCoordsObjectId(i, game)),
      ai_emission: () => ([0, 0, 0]),
      ai_glow: () => ([0, 0, 0, 0.5]),
    },
    Array(128).fill(),
    0, // force zero instance
  );

  bufferVaos.torus = createInstancedBufferVao(gl, programs.main,
    twgl.primitives.createTorusVertices(1.1, 0.1, 32, 32),
    {
      ai_world: l => matrix4.translation(...pieceCoordTranslation(l.coord)),
      ai_diffuse: l => locationTeamDiffuseMap[l.team],
      ai_glow: () => ([0, 0, 0, 0]),
    },
    game.locations,
  );

  bufferVaos.kanban = createInstancedBufferVao(gl, programs.main,
    twgl.primitives.createXYQuadVertices(),
    {
      ai_world: (_, i) => pipe(
        matrix4.identity(),
        m => matrix4.yRotate(m, degToRad(-30 - 120 * i)),
        m => matrix4.translate(m, 0, 0.005, -20),
        m => matrix4.scale(m, 6, 1, 6),
        m => matrix4.xRotate(m, degToRad(-90)),
      ),
      ai_diffuse: () => ([0, 0, 0, 0]),
      ai_glow: () => ([0, 0, 0, 0]),
    },
    Array(3).fill(),
  );

  {
    const bufferInfo = twgl.createBufferInfoFromArrays(gl, twgl.primitives.createXYQuadVertices());
    bufferVaos.xyQuad = {
      bufferInfo, vao: twgl.createVAOFromBufferInfo(gl, programs.main, bufferInfo),
    };
  }

  return {
    programs, bufferVaos,
    nullTexture: createNullTexture(gl),
    mirror: createMirrorInfo(gl),
    lightProjection: createLightProjectionInfo(gl),
    objectIdProjection: createObjectIdProjectionInfo(gl),
    text: createTextRendering(gl, game),
  };
}

function createInstancedBufferVao(gl, program, vertices, instanceAttrs, instanceData, instanceDrawCount) {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  const bufferInfo = {
    attribs: {}, indices: null, numElements: 0, elementType: null,
    instanceAttribs: {}, instanceDrawCount: 0,
  };

  const { indices, ...verticeAttribs } = vertices;

  if (indices) {
    const indicesData = Array.isArray(indices) ? new Uint16Array(indices) : indices;
    const indicesBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indicesData, gl.STATIC_DRAW);

    bufferInfo.indices = indicesBuffer;
    bufferInfo.elementType = gl.UNSIGNED_SHORT
    bufferInfo.numElements = indices.length;
  } else {
    bufferInfo.numElements = Infinity;
  }

  Object.entries(verticeAttribs).forEach(([attr, attrContent]) => {
    const attrName = `a_${attr}`;
    const attribSetter = program.attribSetters[attrName];
    const attribLocation = attribSetter ? attribSetter.location : attribLocations[attrName];
    if (!attribSetter) return;

    gl.enableVertexAttribArray(attribLocation);

    const data = attrContent.data ?? attrContent;
    const float32Data = Array.isArray(data) ? new Float32Array(data) : data;
    const numComponents = attrContent.numComponents ?? attribNumComponents[attrName];

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, float32Data, gl.STATIC_DRAW);

    gl.vertexAttribPointer( // point to latest bindBuffer
      attribLocation,
      numComponents,
      gl.FLOAT, // type
      false, // normalize
      0, // stride
      0, // offset
    );

    bufferInfo.attribs[attrName] = { buffer, numComponents };

    if (!bufferInfo.numElements) {
      bufferInfo.numElements = Math.floor(float32Data.length / numComponents);
    }
  });

  Object.entries(instanceAttrs).forEach(([attr, attrContent]) => {
    const attribSetter = program.attribSetters[attr];
    const attribLocation = attribSetter ? attribSetter.location : attribLocations[attr];
    if (!attribLocation) return;
    const numComponents = attrContent.numComponents ?? attribNumComponents[attr];
    const getData = attrContent.getData ?? attrContent;

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      calculateFloat32Data(instanceData, getData),
      gl.DYNAMIC_DRAW,
    );

    const stride = numComponents > 4 ? 4 * numComponents : 0;
    Array(Math.ceil(numComponents / 4)).fill().forEach((_,i) => {
      const attrSubLocation = attribLocation + i;
      const restNumComponents = numComponents - i * 4;
      const subNumComponents = restNumComponents >= 4 ? 4 : restNumComponents;

      gl.enableVertexAttribArray(attrSubLocation);

      gl.vertexAttribPointer( // point to latest bindBuffer
        attrSubLocation,
        subNumComponents,
        gl.FLOAT, // type
        false, // normalize
        stride,
        i * 4 * 4, // offset
      );

      gl.vertexAttribDivisor(attrSubLocation, 1);
    });

    bufferInfo.instanceAttribs[attr] = { buffer, numComponents };
  });
  bufferInfo.instanceDrawCount = instanceDrawCount ?? instanceData.length,

  // !!! important:
  gl.bindVertexArray(null);

  return { bufferInfo, vao };
}

function calculateFloat32Data(instanceData, getWorldMatrixInstanceAttrFn) {
  return new Float32Array(
    instanceData.flatMap((d, i) => Array.from(getWorldMatrixInstanceAttrFn(d, i)))
  );
}

export function createMirrorInfo(gl) {
  const framebufferInfo = twgl.createFramebufferInfo(gl, null, 1024, 1024);

  return {
    framebufferInfo,
    map: framebufferInfo.attachments[0],
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
