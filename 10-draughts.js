import * as twgl from './vendor/twgl-full.module.js';

import listenToInputs from './lib/10-draughts/input.js';
import createPrograms, { attribLocations } from './lib/10-draughts/shaders.js';

import { matrix4 } from './lib/matrix.js';
import { pipe, degToRad } from './lib/utils.js';

import devModePromise from './lib/dev.js';

const pieceTeamDiffuseMap = {
  y: [215/255, 147/255, 57/255, 1],
  g: [57/255, 215/255, 94/255, 1],
  b: [57/255, 132/255, 215/255, 1],
};

document.addEventListener('DOMContentLoaded', async () => {
  await devModePromise;

  const canvas = document.getElementById('main');
  const gl = canvas.getContext('webgl');
  if (!gl) {
    alert('Your browser does not support WebGL')
    return;
  }
  window.gl = gl;

  const oesVaoExt = gl.getExtension('OES_vertex_array_object');
  if (oesVaoExt) {
    gl.createVertexArray = (...args) => oesVaoExt.createVertexArrayOES(...args);
    gl.deleteVertexArray = (...args) => oesVaoExt.deleteVertexArrayOES(...args);
    gl.isVertexArray = (...args) => oesVaoExt.isVertexArrayOES(...args);
    gl.bindVertexArray = (...args) => oesVaoExt.bindVertexArrayOES(...args);
  } else {
    alert('Your browser does not support WebGL ext: OES_vertex_array_object')
    return;
  }

  const webglDepthTexExt = gl.getExtension('WEBGL_depth_texture');
  if (!webglDepthTexExt) {
    alert('Your browser does not support WebGL ext: WEBGL_depth_texture')
    return;
  }

  const angleInstancedArrayExt = gl.getExtension('ANGLE_instanced_arrays');
  if (angleInstancedArrayExt) {
    gl.drawArraysInstanced = (...args) => angleInstancedArrayExt.drawArraysInstancedANGLE(...args);
    gl.drawElementsInstanced = (...args) => angleInstancedArrayExt.drawElementsInstancedANGLE(...args);
    gl.vertexAttribDivisor = (...args) => angleInstancedArrayExt.vertexAttribDivisorANGLE(...args);
  } else {
    alert('Your browser does not support WebGL ext: ANGLE_instanced_arrays')
    return;
  }

  twgl.setAttributePrefix('a_');

  const game = {
    cameraAngle: [degToRad(-40), 0],
    cameraViewing: [0, 0, 6],
    cameraDistance: 50,
    lightAngle: [degToRad(45), degToRad(30)],
    maxCoord: [25, 25, 4],
    pointing: null,

    pieces: initPieces(),
  }
  window.game = game;

  const input = listenToInputs(canvas, game);
  const rendering = initRendering(gl, game);

  console.log(game, rendering);

  const renderLoop = () => {
    render(gl, rendering, game);

    const viewingMove = [0, 0];
    if (input.KeyA) {
      viewingMove[0] -= 0.1;
    } else if (input.KeyD) {
      viewingMove[0] += 0.1;
    }
    if (input.KeyW) {
      viewingMove[1] -= 0.1;
    } else if (input.KeyS) {
      viewingMove[1] += 0.1;
    }
    input.moveViewing(viewingMove);

    requestAnimationFrame(renderLoop);
  }
  renderLoop();
});

function initRendering(gl, game) {
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

function render(gl, rendering, game) {
  twgl.resizeCanvasToDisplaySize(gl.canvas, window.devicePixelRatio || 1);

  gl.enable(gl.CULL_FACE);
  gl.enable(gl.DEPTH_TEST);

  const { lightProjectionTransform, occlusionBias, lightOcclusionSampleStepSize } = renderLightProjection(gl, rendering, game);

  const projectionMatrix = matrix4.perspective(degToRad(45), gl.canvas.width / gl.canvas.height, 1, 2000);
  const cameraMatrix = pipe(
    matrix4.identity(),
    m => matrix4.translate(m, ...game.cameraViewing),
    m => matrix4.yRotate(m, game.cameraAngle[1]),
    m => matrix4.xRotate(m, game.cameraAngle[0]),
    m => matrix4.translate(m, 0, 0, game.cameraDistance),
  );

  const viewMatrix = matrix4.multiply(projectionMatrix, matrix4.inverse(cameraMatrix));

  renderObjectIdProjection(gl, rendering, game, viewMatrix);

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.useProgram(rendering.programs.main.program);

  twgl.setUniforms(rendering.programs.main, {
    u_view: viewMatrix,
    u_cameraPosition: cameraMatrix.slice(12, 15),
    u_lightDir: matrix4.transformVector(matrix4.multiply(
      matrix4.yRotation(game.lightAngle[1]),
      matrix4.xRotation(game.lightAngle[0]),
    ), [0, -1, 0, 1]).slice(0, 3),
    u_ambientLight: [0, 0, 0],
    u_lightProjectionMap: rendering.lightProjection.map,
    u_lightProjectionTransform: lightProjectionTransform,
    u_lightOcclusionSampleStepSize: lightOcclusionSampleStepSize,
    u_lightOcclusionBias: occlusionBias,
  });

  renderObjects(gl, rendering, rendering.programs.main);
  renderBackground(gl, rendering, rendering.programs.main);
}

function renderObjects(gl, rendering, programInfo) {
  { // draw pieces / cones
    const worldMatrix = pipe(
      matrix4.identity(),
      m => matrix4.translate(m, 0, 1, 0),
    );

    twgl.setUniforms(programInfo, {
      u_world: worldMatrix,
      u_worldInverseTranspose: matrix4.transpose(matrix4.inverse(worldMatrix)),
      u_diffuse: [0, 0, 0, 0],
      u_ambient: [0, 0, 0],
      u_emissive: [0, 0, 0],
      u_specular: [1, 1, 1],
      u_shininess: 300,
    });
    gl.bindVertexArray(rendering.bufferVaos.cone.vao);
    gl.drawElementsInstanced(
      gl.TRIANGLES,
      rendering.bufferVaos.cone.bufferInfo.numElements,
      rendering.bufferVaos.cone.bufferInfo.elementType,
      0, // offset
      rendering.bufferVaos.cone.bufferInfo.instance,
    );
  }
}

function renderBackground(gl, rendering, programInfo) {
  { // draw torus
    twgl.setUniforms(programInfo, {
      u_world: matrix4.identity(),
      u_worldInverseTranspose: matrix4.transpose(matrix4.inverse(matrix4.identity())),
      u_diffuse: [1, 1, 1, 1],
      u_ambient: [0, 0, 0],
      u_emissive: [0, 0, 0],
      u_specular: [1, 1, 1],
      u_shininess: 20000,
    });
    gl.bindVertexArray(rendering.bufferVaos.torus.vao);
    gl.drawElementsInstanced(
      gl.TRIANGLES,
      rendering.bufferVaos.torus.bufferInfo.numElements,
      rendering.bufferVaos.torus.bufferInfo.elementType,
      0, // offset
      rendering.bufferVaos.torus.bufferInfo.instance,
    );
  }

  { // draw ground / xyQuad
    const worldMatrix = pipe(
      matrix4.identity(),
      m => matrix4.scale(m, 1000, 1, 1000),
      m => matrix4.xRotate(m, degToRad(-90)),
    );

    twgl.setUniforms(programInfo, {
      u_world: worldMatrix,
      u_worldInverseTranspose: matrix4.transpose(matrix4.inverse(worldMatrix)),
      u_diffuse: [107/255, 222/255, 153/255, 1],
      u_ambient: [0, 0, 0],
      u_emissive: [0, 0, 0],
      u_specular: [1, 1, 1],
      u_shininess: 20000,
    });
    gl.bindVertexArray(rendering.bufferVaos.xyQuad.vao);
    twgl.drawBufferInfo(gl, rendering.bufferVaos.xyQuad.bufferInfo);
  }
}


function renderLightProjection(gl, rendering, game) {
  twgl.bindFramebufferInfo(gl, rendering.lightProjection.framebufferInfo);

  // debug:
  //twgl.bindFramebufferInfo(gl, null);
  //gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  gl.clear(gl.DEPTH_BUFFER_BIT);

  const lightProjectionTransform = pipe(
    [ // like orthogonal, but without translation
      1 / game.maxCoord[0], 0, 0, 0,
      0, -1 / game.maxCoord[1], 0, 0,
      0, 0, 1 / game.maxCoord[2], 0,
      0, 0, 0, 1,
    ],
    m => matrix4.multiply(m, [ // sheering
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, Math.tan(game.lightAngle[0]), 1, 0,
      0, 0, 0, 1,
    ]),
    m => matrix4.multiply(m, matrix4.inverse(
      matrix4.multiply(
        matrix4.yRotation(game.lightAngle[1]),
        matrix4.xRotation(degToRad(90)),
      )
    ))
  );

  gl.useProgram(rendering.programs.depth.program);

  twgl.setUniforms(rendering.programs.depth, {
    u_view: lightProjectionTransform,
  });

  renderObjects(gl, rendering, rendering.programs.depth);
  renderBackground(gl, rendering, rendering.programs.depth);
  twgl.bindFramebufferInfo(gl, null);

  return {
    lightProjectionTransform,
    occlusionBias: 0.5 * Math.cos(game.lightAngle[0]) / game.maxCoord[2],
    lightOcclusionSampleStepSize: game.maxCoord.slice(0, 2).map(s => 0.025 / s),
  };
}

function renderObjectIdProjection(gl, rendering, game, viewMatrix) {
  if (!game.pointing) return;

  twgl.bindFramebufferInfo(gl, rendering.objectIdProjection.framebufferInfo);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const objectIdProjectionTransform = pipe(
    matrix4.identity(),
    m => matrix4.scale(m, gl.canvas.width, gl.canvas.height, 1),
    m => matrix4.translate(m,
      (2 / gl.canvas.width) * (gl.canvas.width / 2 - game.pointing[0]),
      (2 / gl.canvas.height) * (game.pointing[1] - gl.canvas.height / 2),
      0,
    ),
    m => matrix4.multiply(m, viewMatrix),
  );

  gl.useProgram(rendering.programs.objId.program);

  twgl.setUniforms(rendering.programs.objId, {
    u_view: objectIdProjectionTransform,
  });

  renderObjects(gl, rendering, rendering.programs.objId);

  const pixelData = new Uint8Array(4);
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixelData);

  game.pointingObjectId = decodeVec4Int(pixelData);
  if (game.pointingObjectId) {
    console.log(game.pointingObjectId);
  }

  twgl.bindFramebufferInfo(gl, null);
}

function pieceCoordTranslation(coord) {
  return [coord[0] * 3 - coord[1] * 1.5, 0, coord[1] * -2.5];
}

function allPieceCorrds() {
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

function initPieces() {
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

function encodeIntVec4(i) {
  return [
    ((i >>  0) & 0xFF) / 0xFF,
    ((i >>  8) & 0xFF) / 0xFF,
    ((i >> 16) & 0xFF) / 0xFF,
    ((i >> 24) & 0xFF) / 0xFF,
  ]
}
function decodeVec4Int(vec) {
  return (
    (vec[0] << 0) + (vec[1] << 8) +
    (vec[2] << 16) + (vec[3] << 24)
  );
}
