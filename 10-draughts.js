import initGame, { updateGame, startGame, resetGame } from './lib/10-draughts/game.js';
import render from './lib/10-draughts/render.js';

import devModePromise from './lib/dev.js';

async function main() {
  await devModePromise;

  const canvas = document.getElementById('main');
  const gl = canvas.getContext('webgl', {
    alpha: false,
  });
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

  const uiUpperDOM = document.querySelector('.ui-upper');
  const uiMainDOM = document.querySelector('.ui-main');
  const uiBottomDOM = document.querySelector('.ui-bottom');

  document.getElementById('start-game').addEventListener('click', () => {
    const gameOptionForm = new FormData(document.getElementById('game-option'));

    uiUpperDOM.classList.add('opacity-0');
    uiMainDOM.classList.add('opacity-0');
    uiBottomDOM.classList.remove('hidden');
    setTimeout(() => {
      uiUpperDOM.classList.add('hidden');
      uiMainDOM.classList.add('hidden');
      uiBottomDOM.classList.remove('opacity-0');
    }, 1200);

    startGame(game, {
      turnSecs: parseInt(gameOptionForm.get('turn-secs'))
    });
  });
  document.getElementById('reset-game').addEventListener('click', () => {
    uiUpperDOM.classList.remove('hidden');
    uiMainDOM.classList.remove('hidden');
    uiBottomDOM.classList.add('opacity-0');

    setTimeout(() => {
      uiUpperDOM.classList.remove('opacity-0');
      uiMainDOM.classList.remove('opacity-0');
      uiBottomDOM.classList.add('hidden');
    }, 1200);

    resetGame(game);
  });
  const disableUI = () => {
    uiUpperDOM.style.pointerEvents = 'none';
    uiMainDOM.style.pointerEvents = 'none';
    uiBottomDOM.style.pointerEvents = 'none';
  }
  const enableUI = () => {
    uiUpperDOM.style.pointerEvents = '';
    uiMainDOM.style.pointerEvents = '';
    uiBottomDOM.style.pointerEvents = '';
  }
  canvas.addEventListener('mousedown', disableUI);
  canvas.addEventListener('touchstart', disableUI);
  canvas.addEventListener('touchend', enableUI);
  canvas.addEventListener('mouseup', enableUI);

  const renderLoop = time => {
    updateGame(game);
    render(game, time);

    requestAnimationFrame(renderLoop);
  }
  requestAnimationFrame(renderLoop);
};

main();
