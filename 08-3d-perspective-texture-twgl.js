import * as twgl from './vendor/twgl-full.module.js';
import { pipe, radToDeg, degToRad, createSlider } from './lib/utils.js';
import { matrix4 } from './lib/matrix.js';
import devModePromise from './lib/dev.js';

const colorVertexShader = `

attribute vec4 a_position;
attribute vec4 a_color;
uniform mat4 u_matrix;
varying vec4 v_color;

void main() {
  gl_Position = u_matrix * a_position;
  v_color = a_color;
}`;
const colorFragmentShader = `
precision highp float;

varying vec4 v_color;

void main() {
   gl_FragColor = v_color;
}`;

const texVertexShader = `

attribute vec4 a_position;
attribute vec2 a_texcoord;
uniform mat4 u_matrix;
varying vec2 v_texcoord;

void main() {
  gl_Position = u_matrix * a_position;
  v_texcoord = a_texcoord;
}`;
const texFragmentShader = `
precision highp float;

varying vec2 v_texcoord;
uniform sampler2D u_texture;

void main() {
   gl_FragColor = texture2D(u_texture, v_texcoord);
}`;

document.addEventListener('DOMContentLoaded', async () => {
  await devModePromise;

  const canvas = document.getElementById('canvas');

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

  twgl.setAttributePrefix('a_');
  const scene = createScene(gl);
  window.scene = scene;
  const renderScene = () => { render(gl, scene); };
  window.renderScene = renderScene;

  const onChange = fn => (event, ui) => {
    fn(ui, scene, event);
    //renderScene();
  }
  createSlider('fieldOfView', { value: radToDeg(scene.camera.fieldOfView), max: 180, min: 10,
    slide: onChange((ui, s) => { s.camera.fieldOfView = degToRad(ui.value); }),
  });
  createSlider('camera-x', { value: scene.camera.translation[0], max: 100, min: -100,
    slide: onChange((ui, s) => { s.camera.translation[0] = ui.value; }),
  });
  createSlider('camera-y', { value: scene.camera.translation[1], max: 100, min: -100,
    slide: onChange((ui, s) => { s.camera.translation[1] = ui.value; }),
  });
  createSlider('world-yRotation', { value: radToDeg(scene.byId.world.rotation[1]), max: 360, min: 0,
    slide: onChange((ui, s) => { s.byId.world.rotation[1] = degToRad(ui.value); }),
  });
  createSlider('switch', { value: 1, max: 1, min: 0,
    slide: onChange((ui, s) => {
      s.byId.offSwitch.hidden = ui.value >= 1;
      s.byId.onSwitch.hidden = ui.value < 1;
    }),
  });

  let lastRenderTime = 0;
  const renderLoop = timeStamp => {
    const delta = lastRenderTime - timeStamp;
    lastRenderTime = timeStamp;
    scene.byId.world.rotation[0] += delta / 2400;
    scene.byId.leftTorus.rotation[1] -= delta / 200;
    scene.byId.rightTorus.rotation[1] += delta / 200;
    render(gl, scene);
    requestAnimationFrame(renderLoop);
  };
  requestAnimationFrame(renderLoop);
});

const sceneData = {
  camera: {
    fieldOfView: degToRad(45),
    translation: [20, 0, 60],
  },
  objects: [
    {
      id: 'world',
      objects: [
        {
          id: 'offSwitch',
          programName: 'color',
          attributes: {
            position: { numComponents: 3, data: [
              16, 9, 0, // 0
              -16, 9, 0, // 1
              16, -9, 0, // 2
              -16, -9, 0, // 3

              ...[0, -2].flatMap(z => ([
                18, 11, z, // 4, 8
                -18, 11, z, // 5, 9
                18, -11, z, // 6, 10
                -18, -11, z, // 7, 11
              ]))
            ] },
            color: { numComponents: 3, data: [
              ...Array(4).fill([107 / 255, 222 / 255, 153 / 255]).flat(),
              ...Array(4).fill([0, 0, 0]).flat(),
              ...Array(4).fill([68.9 / 255, 68.9 / 255, 68.9 / 255]).flat(),
            ] },
            indices: [
              0, 1, 2, 2, 1, 3,
              4, 0, 2, 4, 2, 6,
              2, 3, 6, 3, 7, 6,
              1, 5, 7, 1, 7, 3,
              4, 5, 1, 4, 1, 0,
              8, 9, 4, 9, 5, 4,
              9, 11, 7, 9, 7, 5,
              11, 6, 7, 11, 10, 6,
              8, 4, 6, 8, 6, 10,
              9, 8, 10, 9, 10, 11,
            ]
          },
          hidden: true,
        },
        {
          id: 'onSwitch',
          programName: 'tex',
          attributes: {
            position: { numComponents: 3, data: [
              16, 9, 0, // 0
              -16, 9, 0, // 1
              16, -9, 0, // 2
              -16, -9, 0, // 3

              ...[0, -2, -2].flatMap(z => ([
                18, 11, z, // 4, 8, 12
                -18, 11, z, // 5, 9, 13
                18, -11, z, // 6, 10, 14
                -18, -11, z, // 7, 11, 15
              ]))
            ] },
            texcoord: { numComponents: 2, data: [
              0.9902120717781403, 0.007142857142857143, // 0
              0.00897226753670473, 0.007142857142857143, // 1
              0.9902120717781403, 0.9757142857142858, // 2
              0.00897226753670473, 0.9757142857142858, // 3

              ...Array(2).fill().flatMap(() => ([
                1, 0, // 4, 8
                0, 0, // 5, 9
                1, 0.9828571428571429, // 6, 10
                0, 0.9828571428571429, // 7, 11
              ])),
              1, 1, // 12
              0, 1, // 13
              1, 1, // 14
              0, 1, // 15
            ] },
            indices: [
              0, 1, 2, 2, 1, 3,
              4, 0, 2, 4, 2, 6,
              2, 3, 6, 3, 7, 6,
              1, 5, 7, 1, 7, 3,
              4, 5, 1, 4, 1, 0,
              8, 9, 4, 9, 5, 4,
              9, 11, 7, 9, 7, 5,
              11, 6, 7, 11, 10, 6,
              8, 4, 6, 8, 6, 10,
              13, 12, 14, 13, 14, 15,
            ]
          },
          textureNames: {
            u_texture: 'switchSdErr',
          },
        },
        {
          objects: [
            {
              id: 'rightTorus',
              programName: 'color',
              attributes: colorPrimitivesAttributes(
                twgl.primitives.createTorusVertices(10, 4, 40, 10),
                () => randomDiffColor([249 / 255, 237 / 255, 55 / 255]),
              ),
              scale: [0.2, 0.2, 0.2],
              rotation: [Math.PI / 2, 0, 0],
              translation: [0, -5, 0],
            },
            {
              translation: [0, 5, 0],
              objects: Array(4).fill().map((_, i) => ({
                programName: 'color',
                attributes: colorPrimitivesAttributes(
                  twgl.primitives.createSphereVertices(1, 10, 10),
                  () => randomDiffColor([249 / 255, 237 / 255, 55 / 255]),
                ),
                translation: [Math.cos(i * Math.PI / 2) * 2, Math.sin(i * Math.PI / 2) * 2, 0],
              })),
            },
          ],
          translation: [24, 0, 0],
        },
        {
          objects: [
            {
              id: 'leftTorus',
              programName: 'color',
              attributes: colorPrimitivesAttributes(
                twgl.primitives.createTorusVertices(10, 4, 40, 10),
                () => randomDiffColor([50 / 255, 144 / 255, 66 / 255]),
              ),
              scale: [0.2, 0.2, 0.2],
              rotation: [Math.PI / 2, 0, 0],
              translation: [0, 5, 0],
            },
            {
              translation: [0, -5, 0],
              objects: Array(4).fill().map((_, i) => ({
                programName: 'color',
                attributes: colorPrimitivesAttributes(
                  twgl.primitives.createCylinderVertices(1, 1, 10, 10),
                  () => randomDiffColor([50 / 255, 144 / 255, 66 / 255]),
                ),
                translation: [Math.cos(i * Math.PI / 2) * 2, Math.sin(i * Math.PI / 2) * 2, 0],
                rotation: [Math.PI / 2, 0, 0],
              })),
            },
          ],
          translation: [-24, 0, 0],
        }
      ],
      translation: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    },
  ],
}

function createScene(gl) {
  const byId = {};
  const sceneGlobals = {
    programs: {
      color: twgl.createProgramInfo(gl, [colorVertexShader, colorFragmentShader]),
      tex: twgl.createProgramInfo(gl, [texVertexShader, texFragmentShader]),
    },
    textures: {
      switchSdErr: twgl.createTexture(gl, {
        wrapS: gl.CLAMP_TO_EDGE, wrapT: gl.CLAMP_TO_EDGE,
        min: gl.LINEAR_MIPMAP_LINEAR,
        src: 'assets/switch-sdcard-error.jpg',
      }),
    },
    byId,
  }

  return {
    ...sceneData,
    objects: sceneData.objects.map(obj => createObject(gl, obj, sceneGlobals)),
    byId,
  }
}

function createObject(gl, { id, objects, ...objData }, sceneGlobals) {
  let node = {
    translation: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    ...objData,
    objects: (objects || []).map(obj => createObject(gl, obj, sceneGlobals)),
  }

  if (objData.programName && objData.attributes) {
    const bufferInfo = twgl.createBufferInfoFromArrays(gl, objData.attributes);
    const programInfo = sceneGlobals.programs[objData.programName];
    const texUniforms = Object.fromEntries(
      Object.entries(objData.textureNames || {}).map(([uniform, texName]) => ([uniform, sceneGlobals.textures[texName]]))
    );

    node = {
      ...node,
      programInfo, bufferInfo,
      vao: twgl.createVAOFromBufferInfo(gl, programInfo, bufferInfo),
      uniforms: {
        ...objData.uniforms,
        ...texUniforms,
      },
    }
  }

  if (id) {
    sceneGlobals.byId[id] = node;
  }
  return node;
}

function render(gl, { camera, objects }) {
  twgl.resizeCanvasToDisplaySize(gl.canvas);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.enable(gl.CULL_FACE);
  gl.enable(gl.DEPTH_TEST);

  const viewProjectionMatrix = matrix4.multiply(
    matrix4.perspective(
      camera.fieldOfView,
      /* aspect: */ gl.canvas.clientWidth / gl.canvas.clientHeight,
      /* near: */ 1,
      /* far: */ 2000,
    ),
    matrix4.inverse(
      matrix4.lookAt(camera.translation, objects[0].translation, [0, 1, 0])
    ),
  )

  objects.forEach(o => renderObject(gl, o, viewProjectionMatrix, matrix4.identity()));
}

function renderObject(gl, {
  programInfo, vao, bufferInfo, hidden, translation, rotation, scale, uniforms, objects,
}, viewProjectionMatrix, localMatrix) {
  const newLocalMatrix = pipe(
    localMatrix,
    m => matrix4.translate(m, ...translation),
    m => matrix4.xRotate(m, rotation[0]),
    m => matrix4.yRotate(m, rotation[1]),
    m => matrix4.zRotate(m, rotation[2]),
    m => matrix4.scale(m, ...scale),
  )

  if (!hidden && programInfo && vao) {
    gl.useProgram(programInfo.program);
    gl.bindVertexArray(vao);

    const u_matrix = matrix4.multiply(
      viewProjectionMatrix, newLocalMatrix,
    )

    twgl.setUniforms(programInfo, { u_matrix, ...uniforms });
    twgl.drawBufferInfo(gl, bufferInfo);
  }

  objects.forEach(o => renderObject(gl, o, viewProjectionMatrix, newLocalMatrix));
}

// -----------------------------------------------------------

function colorPrimitivesAttributes(vertices, colorFn) {
  const deindexVertices = twgl.primitives.deindexVertices(vertices);

  return {
    position: { numComponents: 3, data: deindexVertices.position },
    color: { numComponents: 3,
      data: Array(deindexVertices.position.length / 9).fill().flatMap(
        () => Array(3).fill().flatMap(colorFn)
      ),
    }
  }
}

function randomDiffColor(baseColor) {
  const diff = (Math.random() * 2 - 1) / 16;
  return baseColor.map(l => l + diff);
}
