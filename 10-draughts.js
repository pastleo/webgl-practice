import initGame, { updateGame } from './lib/10-draughts/game.js';
import render from './lib/10-draughts/render.js';

import devModePromise from './lib/dev.js';

async function main() {
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

  const game = initGame(gl);
  window.game = game;
  console.log(game);

  const renderLoop = time => {
    updateGame(game);
    render(game, time);

    requestAnimationFrame(renderLoop);
  }
  requestAnimationFrame(renderLoop);
};

main();
