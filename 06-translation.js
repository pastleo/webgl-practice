import * as rendererOri from './06-translation-renderer-ori.js';
import * as rendererTranform from './06-translation-renderer-transform.js';
import devModePromise from './lib/dev.js';

document.addEventListener('DOMContentLoaded', async () => {
  await devModePromise;

  const canvas = document.getElementById('glCanvas');
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

  const oriRender = await rendererOri.createRenderer(gl);
  const transformRender = await rendererTranform.createRenderer(gl);
  const render = () => {
    if (controls.mode === 'transform') {
      rendererTranform.render(gl, transformRender, controls)
    } else {
      rendererOri.render(gl, oriRender, controls)
    }
  };

  let controls = { x: 0, y: 0 };
  let lastFocus = null;
  const mountInput = (input, isNumber) => {
    const parseFn = isNumber ? parseFloat : (x => x);
    controls = { ...controls, [input.name]: parseFn(input.value) };
    input.addEventListener('change', () => {
      controls = { ...controls, [input.name]: parseFn(input.value) };
      render();
    })
    if (isNumber) {
      input.addEventListener('focus', () => {
        lastFocus = input.name;
      })
    }
  };
  mountInput(document.getElementById('input-mode'), false);
  mountInput(document.getElementById('input-width'), true);
  mountInput(document.getElementById('input-height'), true);
  mountInput(document.getElementById('input-degree'), true);
  mountInput(document.getElementById('input-scale-x'), true);
  mountInput(document.getElementById('input-scale-y'), true);

  const onMouseEvent = event => {
    controls = { ...controls, 
      x: event.offsetX, y: event.offsetY,
    };
    render();
  };
  let mouseDown = false;
  canvas.addEventListener('mousedown', event => {
    mouseDown = true;
    onMouseEvent(event);
  });
  canvas.addEventListener('mouseup', () => {
    mouseDown = false;
  });
  canvas.addEventListener('mousemove', event => {
    if (mouseDown) {
      onMouseEvent(event);
    }
  });

  canvas.addEventListener('wheel', event => {
    if (lastFocus) {
      const input = document.querySelector(`[name=${lastFocus}]`);
      controls[lastFocus] -= event.deltaY / (parseFloat(input.dataset.wheelDiv) || 10);
      input.value = controls[lastFocus];
      render();
    }
  })

  rendererOri.render(gl, oriRender, { ...controls, width: gl.canvas.width, height: gl.canvas.height })
})

