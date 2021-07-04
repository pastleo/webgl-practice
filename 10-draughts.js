import * as twgl from './vendor/twgl-full.module.js';

import listenToInputs from './lib/10-draughts/input.js';
import createPrograms from './lib/10-draughts/shaders.js';

import { matrix4 } from './lib/matrix.js';
import { pipe, degToRad } from './lib/utils.js';

import devModePromise from './lib/dev.js';

document.addEventListener('DOMContentLoaded', async () => {
  await devModePromise;

  const canvas = document.getElementById('main');
  const gl = canvas.getContext('webgl');
  if (!gl) {
    alert('Your browser does not support webgl')
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
    alert('Your browser does not support OES_vertex_array_object')
    return;
  }

  const webglDepthTexExt = gl.getExtension('WEBGL_depth_texture');
  if (!webglDepthTexExt) {
    alert('Your browser does not support WEBGL_depth_texture')
    return;
  }

  twgl.setAttributePrefix('a_');

  const scene = {
    cameraAngle: [degToRad(-20), 0],
    cameraViewing: [0, 0, 0],
    cameraDistance: 10,
    lightAngle: [degToRad(45), degToRad(30)],
    maxCoord: [25, 25, 4],
  }

  const input = listenToInputs(canvas, scene);
  const rendering = initRendering(gl);

  console.log(rendering);

  const renderLoop = () => {
    render(gl, rendering, scene);

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

function initRendering(gl) {
  const programs = createPrograms(gl);

  const bufferVaos = {};

  { // cone
    const vertices = twgl.primitives.createTruncatedConeVertices(1, 0, 2, 30, 30);

    const bufferInfo = twgl.createBufferInfoFromArrays(gl, vertices);
    const vao = twgl.createVAOFromBufferInfo(gl, programs.main, bufferInfo);
    bufferVaos.cone = { bufferInfo, vao };


  }
  { // xyQuad
    const vertices = twgl.primitives.createXYQuadVertices();

    const bufferInfo = twgl.createBufferInfoFromArrays(gl, vertices);
    const vao = twgl.createVAOFromBufferInfo(gl, programs.main, bufferInfo);
    bufferVaos.xyQuad = { bufferInfo, vao };
  }


  return {
    programs, bufferVaos,
    lightProjection: createLightProjectionInfo(gl),
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

function render(gl, rendering, scene) {
  twgl.resizeCanvasToDisplaySize(gl.canvas, window.devicePixelRatio || 1);

  gl.enable(gl.CULL_FACE);
  gl.enable(gl.DEPTH_TEST);

  const { lightProjectionTransform, occlusionBias, lightOcclusionSampleStepSize } = renderLightProjection(gl, rendering, scene);

  twgl.bindFramebufferInfo(gl, null);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  const projectionMatrix = matrix4.perspective(degToRad(45), gl.canvas.width / gl.canvas.height, 1, 2000);
  const cameraMatrix = pipe(
    matrix4.identity(),
    m => matrix4.translate(m, ...scene.cameraViewing),
    m => matrix4.yRotate(m, scene.cameraAngle[1]),
    m => matrix4.xRotate(m, scene.cameraAngle[0]),
    m => matrix4.translate(m, 0, 0, scene.cameraDistance),
  );

  const viewMatrix = matrix4.multiply(projectionMatrix, matrix4.inverse(cameraMatrix));
  
  gl.useProgram(rendering.programs.main.program);

  twgl.setUniforms(rendering.programs.main, {
    u_view: viewMatrix,
    u_cameraPosition: cameraMatrix.slice(12, 15),
    u_lightDir: matrix4.transformVector(matrix4.multiply(
      matrix4.yRotation(scene.lightAngle[1]),
      matrix4.xRotation(scene.lightAngle[0]),
    ), [0, -1, 0, 1]).slice(0, 3),
    u_ambientLight: [0, 0, 0],
    u_lightProjectionMap: rendering.lightProjection.map,
    u_lightProjectionTransform: lightProjectionTransform,
    u_lightOcclusionSampleStepSize: lightOcclusionSampleStepSize,
    u_lightOcclusionBias: occlusionBias,
  });

  renderObjects(gl, rendering, rendering.programs.main);
}

function renderObjects(gl, rendering, programInfo) {
  { // draw one cone
    const worldMatrix = pipe(
      matrix4.identity(),
      m => matrix4.translate(m, 0, 1, 0),
    );

    twgl.setUniforms(programInfo, {
      u_world: worldMatrix,
      u_worldInverseTranspose: matrix4.transpose(matrix4.inverse(worldMatrix)),
      u_diffuse: [107/255, 222/255, 153/255, 1],
      u_ambient: [0, 0, 0],
      u_emissive: [0, 0, 0],
      u_specular: [1, 1, 1],
      u_shininess: 300,
    });
    gl.bindVertexArray(rendering.bufferVaos.cone.vao);
    twgl.drawBufferInfo(gl, rendering.bufferVaos.cone.bufferInfo);
  }

  { // draw ground
    const worldMatrix = pipe(
      matrix4.identity(),
      m => matrix4.scale(m, 1000, 1, 1000),
      m => matrix4.xRotate(m, degToRad(-90)),
    );

    twgl.setUniforms(programInfo, {
      u_world: worldMatrix,
      u_worldInverseTranspose: matrix4.transpose(matrix4.inverse(worldMatrix)),
      u_diffuse: [107/255, 222/255, 198/255, 1],
      u_ambient: [0, 0, 0],
      u_emissive: [0, 0, 0],
      u_specular: [1, 1, 1],
      u_shininess: 20000,
    });
    gl.bindVertexArray(rendering.bufferVaos.xyQuad.vao);
    twgl.drawBufferInfo(gl, rendering.bufferVaos.xyQuad.bufferInfo);
  }
}

function renderLightProjection(gl, rendering, scene) {
  twgl.bindFramebufferInfo(gl, rendering.lightProjection.framebufferInfo);

  // debug:
  //twgl.bindFramebufferInfo(gl, null);
  //gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  gl.clear(gl.DEPTH_BUFFER_BIT);

  const lightProjectionTransform = pipe(
    [ // like orthogonal, but without translation
      1 / scene.maxCoord[0], 0, 0, 0,
      0, -1 / scene.maxCoord[1], 0, 0,
      0, 0, 1 / scene.maxCoord[2], 0,
      0, 0, 0, 1,
    ],
    m => matrix4.multiply(m, [ // sheering
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, Math.tan(scene.lightAngle[0]), 1, 0,
      0, 0, 0, 1,
    ]),
    m => matrix4.multiply(m, matrix4.inverse(
      matrix4.multiply(
        matrix4.yRotation(scene.lightAngle[1]),
        matrix4.xRotation(degToRad(90)),
      )
    ))
  );

  gl.useProgram(rendering.programs.depth.program);

  twgl.setUniforms(rendering.programs.depth, {
    u_view: lightProjectionTransform,
  });

  renderObjects(gl, rendering, rendering.programs.depth);

  return {
    lightProjectionTransform,
    occlusionBias: 0.5 * Math.cos(scene.lightAngle[0]) / scene.maxCoord[2],
    lightOcclusionSampleStepSize: scene.maxCoord.slice(0, 2).map(s => 0.025 / s),
  };
}
