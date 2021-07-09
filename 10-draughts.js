import * as twgl from './vendor/twgl-full.module.js';

import initRendering from './lib/10-draughts/init-rendering.js';
import listenToInputs from './lib/10-draughts/input.js';

import render from './lib/10-draughts/render.js';

import { degToRad } from './lib/utils.js';

import { initPieces } from './lib/10-draughts/utils.js';

import devModePromise from './lib/dev.js';

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
    fieldOfView: degToRad(45),
    cameraAngle: [degToRad(-40), 0],
    cameraViewing: [0, 0, 0],
    cameraDistance: 50,
    lightAngle: [degToRad(45), degToRad(30)],
    maxCoord: [25, 25, 4],

    pieces: initPieces(),
  }
  window.game = game;

  const rendering = initRendering(gl, game);
  game.rendering = rendering;

  const input = listenToInputs(canvas, game);
  game.input = input;

  console.log(game);

  const renderLoop = () => {
    render(gl, game);

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


