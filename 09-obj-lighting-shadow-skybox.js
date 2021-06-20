import * as twgl from './vendor/twgl-full.module.js';
import * as WebGLObjLoader from './vendor/webgl-obj-loader.esm.js';

import { loadImage, pipe, radToDeg, degToRad } from './lib/utils.js';
import { matrix4 } from './lib/matrix.js';

import devModePromise from './lib/dev.js';

const lightPosition = [-15, 30, 40];
const sceneData = {
  camera: {
    fieldOfView: degToRad(45),
    lookAtTarget: [0, 0, 0],
    translation: [-115, 30, 200],
  },
  light: {
    fieldOfView: degToRad(150),
    ambient: [0.1, 0.1, 0.1],
    translation: [...lightPosition],
    rotation: [degToRad(-90), 0, 0], // facing down (-y)
    scale: [1, 1, 1],
    projectionSize: 2048,
    shadowBias: 0.001,
    shadowSampleStepSize: 0.001,
  },
  skybox: {
    srcset: {
      TEXTURE_CUBE_MAP_POSITIVE_X: 'assets/skybox/tropical-sunny-sky-px.jpg',
      TEXTURE_CUBE_MAP_NEGATIVE_X: 'assets/skybox/tropical-sunny-sky-nx.jpg',
      TEXTURE_CUBE_MAP_POSITIVE_Y: 'assets/skybox/tropical-sunny-sky-py.jpg',
      TEXTURE_CUBE_MAP_NEGATIVE_Y: 'assets/skybox/tropical-sunny-sky-ny.jpg',
      TEXTURE_CUBE_MAP_POSITIVE_Z: 'assets/skybox/tropical-sunny-sky-pz.jpg',
      TEXTURE_CUBE_MAP_NEGATIVE_Z: 'assets/skybox/tropical-sunny-sky-nz.jpg',

      //TEXTURE_CUBE_MAP_POSITIVE_X: 'assets/skybox/sunset-px.png',
      //TEXTURE_CUBE_MAP_NEGATIVE_X: 'assets/skybox/sunset-nx.png',
      //TEXTURE_CUBE_MAP_POSITIVE_Y: 'assets/skybox/sunset-py.png',
      //TEXTURE_CUBE_MAP_NEGATIVE_Y: 'assets/skybox/sunset-ny.png',
      //TEXTURE_CUBE_MAP_POSITIVE_Z: 'assets/skybox/sunset-pz.png',
      //TEXTURE_CUBE_MAP_NEGATIVE_Z: 'assets/skybox/sunset-nz.png',
    },
  },
  objects: [
    {
      id: 'world',
      objects: [
        {
          id: 'light',
          programName: 'color',
          attributes: colorPrimitivesAttributes(
            twgl.primitives.createSphereVertices(1, 16, 16),
            () => randomDiffColor([249 / 255, 237 / 255, 55 / 255]),
          ),
          scale: [1, 1, 1],
          rotation: [0, 0, 0],
          translation: [...lightPosition],
          disableParentTransform: true,
        },
        {
          id: 'myFirstBoatRotation',
          objects: [
            {
              id: 'myFirstBoat',
              programName: 'mtl',
              model: {
                url: 'assets/my-first-boat.obj',
                hasMtl: true,
              },
              scale: [8, 8, 8],
              rotation: [0, 0, 0],
              translation: [0, -10, 0],
            },
            {
              id: 'kite',
              programName: 'mtl',
              model: {
                url: 'assets/01_practice_kite-texture.obj',
                hasMtl: true,
              },
              rotation: [0, 0, degToRad(-90)],
              translation: [5, 12, 18],
            },
          ],
          rotation: [0, degToRad(210), 0],
        },
        {
          id: 'sea',
          programName: 'mtl',
          attributes: {
            position: { numComponents: 3, data: [
              -0.5, 0, -0.5,
              -0.5, 0,  0.5,
              0.5,  0, -0.5,
              -0.5, 0,  0.5,
              0.5,  0,  0.5,
              0.5,  0, -0.5,
            ] },
            normal: { numComponents: 3, data: [
              0, 1, 0,
              0, 1, 0,
              0, 1, 0,
              0, 1, 0,
              0, 1, 0,
              0, 1, 0,
            ] },
          },
          uniforms: {
            u_diffuse: [1, 1, 1, 1],
            u_ambient: [1, 1, 1],
            u_emissive: [0, 0, 0],
            u_specular: [1, 1, 1],
            u_specularExponent: 40,
            u_reflective: 1,
            u_normalNoise: [0.05, 0.05, 0.05],
          },
          textureNames: {
            u_diffuseMap: 'nil',
          },
          translation: [0, -11, 0],
          scale: [10000, 1, 10000],
        }
      ],
      translation: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    },
  ],
};

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
  const webglDepthTexExt = gl.getExtension('WEBGL_depth_texture');
  if (!webglDepthTexExt) {
    alert('Your browser does not support WEBGL_depth_texture')
    return;
  }

  twgl.setAttributePrefix('a_');
  const scene = createScene(gl, sceneData);
  window.scene = scene;

  const settings = {
    fieldOfView: radToDeg(scene.camera.fieldOfView),
    cameraX: scene.camera.translation[0],
    cameraY: scene.camera.translation[1],
    cameraZ: scene.camera.translation[2],
    shipYRotation: radToDeg(scene.byId.myFirstBoatRotation.rotation[1]),
    lightX: scene.light.translation[0],
    lightY: scene.light.translation[1],
    lightZ: scene.light.translation[2],
  };
  const onChange = () => {
    scene.camera.fieldOfView = degToRad(settings.fieldOfView);
    scene.camera.translation[0] = settings.cameraX;
    scene.camera.translation[1] = settings.cameraY;
    scene.camera.translation[2] = settings.cameraZ;
    scene.byId.myFirstBoatRotation.rotation[1] = degToRad(settings.shipYRotation);

    [scene.light, scene.byId.light].forEach(obj => {
      obj.translation[0] = settings.lightX;
      obj.translation[1] = settings.lightY;
      obj.translation[2] = settings.lightZ;
    });

  }
  webglLessonsUI.setupUI(document.querySelector('#ui'), settings, [
    { type: 'slider', key: 'fieldOfView', max: 180, min: 10, change: onChange },
    { type: 'slider', key: 'cameraX', max: 200, min: -200, change: onChange },
    { type: 'slider', key: 'cameraY', max: 200, min: -200, change: onChange },
    { type: 'slider', key: 'cameraZ', max: 200, min: -200, change: onChange },
    { type: 'slider', key: 'shipYRotation', max: 360, min: 0, change: onChange },
    { type: 'slider', key: 'lightX', max: 40, min: -40, step: 0.1, precision: 1, change: onChange },
    { type: 'slider', key: 'lightY', max: 40, min: 18, step: 0.1, precision: 1, change: onChange },
    { type: 'slider', key: 'lightZ', max: 40, min: -40, step: 0.1, precision: 1, change: onChange },
  ]);

  const renderLoop = timeStamp => {
    scene.byId.myFirstBoat.translation[1] = Math.sin(timeStamp * 0.001) * 0.25 - 10.5;
    scene.byId.myFirstBoat.rotation[0] = Math.sin(timeStamp * 0.0013) * 0.02 + 0.05;
    scene.byId.kite.rotation[1] = timeStamp * 0.001;

    render(gl, scene, timeStamp);
    requestAnimationFrame(renderLoop);
  };
  requestAnimationFrame(renderLoop);
});

const colorVS = `

attribute vec4 a_position;
attribute vec4 a_color;
uniform mat4 u_matrix;
varying vec4 v_color;

void main() {
  gl_Position = u_matrix * a_position;
  v_color = a_color;
}`;
const colorFS = `
precision highp float;

varying vec4 v_color;

void main() {
   gl_FragColor = v_color;
}`;

const texVS = `

attribute vec4 a_position;
attribute vec2 a_texcoord;
uniform mat4 u_matrix;
varying vec2 v_texcoord;

void main() {
  gl_Position = u_matrix * a_position;
  v_texcoord = a_texcoord;
}`;
const texFS = `
precision highp float;

varying vec2 v_texcoord;
uniform sampler2D u_texture;

void main() {
   gl_FragColor = texture2D(u_texture, v_texcoord);
}`;

const uniColorVS = `

attribute vec4 a_position;
uniform mat4 u_matrix;

void main() {
  gl_Position = u_matrix * a_position;
}`;
const uniColorFS = `
precision highp float;

uniform vec3 u_color;

void main() {
   gl_FragColor = vec4(u_color, 1.0);
}`;

const mtlVS = `

attribute vec4 a_position;
attribute vec2 a_texcoord;
attribute vec3 a_normal;

uniform mat4 u_matrix;
uniform mat4 u_world;
uniform mat4 u_worldInverseTranspose;

uniform vec3 u_worldLightPosition;
uniform vec3 u_worldViewerPosition;
uniform mat4 u_lightProjectionMatrix;

varying vec2 v_texcoord;
varying vec3 v_normal;
varying vec3 v_worldPosition;
varying vec3 v_surfaceToLight;
varying vec3 v_surfaceToViewer;
varying vec4 v_lightProjection;

void main() {
  gl_Position = u_matrix * a_position;
  v_texcoord = a_texcoord;
  v_normal = mat3(u_worldInverseTranspose) * a_normal;

  vec4 worldPosition = u_world * a_position;

  v_surfaceToLight = u_worldLightPosition - worldPosition.xyz;
  v_surfaceToViewer = u_worldViewerPosition - worldPosition.xyz;
  v_lightProjection = u_lightProjectionMatrix * worldPosition;
	v_worldPosition = worldPosition.xyz;
}
`;

const mtlFS = `
precision highp float;

#define LIGHT_SHADOW_SAMPLE_STEP 2

varying vec2 v_texcoord;
varying vec3 v_normal;
varying vec3 v_worldPosition;
varying vec3 v_surfaceToLight;
varying vec3 v_surfaceToViewer;
varying vec4 v_lightProjection;

uniform sampler2D u_lightProjectionMap;
uniform float u_lightShadowBias;
uniform float u_lightShadowSampleStepSize;

uniform vec4 u_diffuse;
uniform vec3 u_ambient;
uniform vec3 u_emissive;
uniform vec3 u_specular;
uniform float u_specularExponent;
uniform float u_reflective;
uniform vec3 u_normalNoise;

uniform vec3 u_ambientLight;
uniform sampler2D u_diffuseMap;
uniform samplerCube u_skyboxMap;

uniform mat3 u_normalNoiseBase;
uniform float u_normalNoiseRange;

vec3 rgb2hsv(vec3 c);
vec3 hsv2rgb(vec3 c);
float lightProjectedFactor(float lightToSurfaceDepth, vec2 lightProjectionCoord);
float noise3D(in vec3 coord, in float wavelength);

void main() {
  vec3 normalNoise = vec3(
    noise3D(v_worldPosition + u_normalNoiseBase * vec3(1, 0, 0), 10.0),
    noise3D(v_worldPosition + u_normalNoiseBase * vec3(0, 1, 0), 10.0),
    noise3D(v_worldPosition + u_normalNoiseBase * vec3(0, 0, 1), 10.0)
  ) * u_normalNoise - (u_normalNoise * 0.5);

  float worldPositionLength = length(v_worldPosition);
  float normalRangeReduction = worldPositionLength / u_normalNoiseRange;
  normalRangeReduction = 1.0 - normalRangeReduction * normalRangeReduction;
  normalNoise *= normalRangeReduction <= 0.0 ? 0.0 : normalRangeReduction;

  vec3 normal = normalize(normalize(v_normal) + normalNoise);
  vec3 surfaceToLightDirection = normalize(v_surfaceToLight);
  vec3 surfaceToViewerDirection = normalize(v_surfaceToViewer);
  vec3 halfVector = normalize(surfaceToLightDirection + surfaceToViewerDirection);

  float diffuse = mix(dot(normal, surfaceToLightDirection), 1.0, u_reflective);
  float specular = diffuse >= 0.0 ? pow(dot(halfVector, normal), u_specularExponent) : 0.0;

  vec4 u_diffuseMapColor = mix(
    texture2D(u_diffuseMap, v_texcoord),
    textureCube(u_skyboxMap, reflect(-surfaceToViewerDirection, normal)),
    u_reflective
  );
  vec4 diffuseColor = u_diffuseMapColor * u_diffuse;

  vec2 lightProjectionCoord = v_lightProjection.xy / v_lightProjection.w * 0.5 + 0.5;
  float lightToSurfaceDepth = v_lightProjection.z / v_lightProjection.w * 0.5 + 0.5;

  float lightProjected =
    lightProjectionCoord.x >= 0.0 && lightProjectionCoord.x <= 1.0 &&
    lightProjectionCoord.y >= 0.0 && lightProjectionCoord.y <= 1.0 &&
    lightToSurfaceDepth >= 0.0 && lightToSurfaceDepth <= 1.0 ? (
      lightProjectedFactor(lightToSurfaceDepth, lightProjectionCoord)
    ) : 1.0;
  diffuse *= lightProjected;

  vec3 diffuseHSV = rgb2hsv(diffuseColor.rgb);
  diffuseHSV.y *= (1.0 - diffuse * diffuse * 0.6 * (1.0 - u_reflective));
  diffuseHSV.z *= diffuse * 0.5 + 0.5;

  gl_FragColor = vec4(
    hsv2rgb(diffuseHSV) +
    u_ambient * u_ambientLight +
    u_specular * specular +
    u_emissive,
    1.0
  );
}

float lightProjectedFactor(float lightToSurfaceDepth, vec2 lightProjectionCoord) {
  float factor = 0.0;
  for(int i = -LIGHT_SHADOW_SAMPLE_STEP; i <= LIGHT_SHADOW_SAMPLE_STEP; i++) {
    for(int j = -LIGHT_SHADOW_SAMPLE_STEP; j <= LIGHT_SHADOW_SAMPLE_STEP; j++) {
      float lightProjectedDepth = texture2D(
        u_lightProjectionMap,
        lightProjectionCoord + vec2(float(i)*u_lightShadowSampleStepSize, float(j)*u_lightShadowSampleStepSize)
      ).r;
      factor += lightToSurfaceDepth > u_lightShadowBias + lightProjectedDepth ? 0.0 : 1.0;
    }
  }

  return factor / float((LIGHT_SHADOW_SAMPLE_STEP * 2 + 1) * (LIGHT_SHADOW_SAMPLE_STEP * 2 + 1));
}

vec3 rgb2hsv(vec3 c){
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}
vec3 hsv2rgb(vec3 c){
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// http://www.science-and-fiction.org/rendering/noise.html
float simple_interpolate(in float a, in float b, in float x)
{
   return a + smoothstep(0.0,1.0,x) * (b-a);
}
float rand3D(in vec3 co)
{
    return fract(sin(dot(co.xyz ,vec3(12.9898,78.233,144.7272))) * 43758.5453);
}
float interpolatedNoise3D(in float x, in float y, in float z)
{
    float integer_x = x - fract(x);
    float fractional_x = x - integer_x;

    float integer_y = y - fract(y);
    float fractional_y = y - integer_y;

    float integer_z = z - fract(z);
    float fractional_z = z - integer_z;

    float v1 = rand3D(vec3(integer_x, integer_y, integer_z));
    float v2 = rand3D(vec3(integer_x+1.0, integer_y, integer_z));
    float v3 = rand3D(vec3(integer_x, integer_y+1.0, integer_z));
    float v4 = rand3D(vec3(integer_x+1.0, integer_y +1.0, integer_z));

    float v5 = rand3D(vec3(integer_x, integer_y, integer_z+1.0));
    float v6 = rand3D(vec3(integer_x+1.0, integer_y, integer_z+1.0));
    float v7 = rand3D(vec3(integer_x, integer_y+1.0, integer_z+1.0));
    float v8 = rand3D(vec3(integer_x+1.0, integer_y +1.0, integer_z+1.0));

    float i1 = simple_interpolate(v1,v5, fractional_z);
    float i2 = simple_interpolate(v2,v6, fractional_z);
    float i3 = simple_interpolate(v3,v7, fractional_z);
    float i4 = simple_interpolate(v4,v8, fractional_z);

    float ii1 = simple_interpolate(i1,i2,fractional_x);
    float ii2 = simple_interpolate(i3,i4,fractional_x);

    return simple_interpolate(ii1 , ii2 , fractional_y);
}

float noise3D(in vec3 coord, in float wavelength)
{
   return interpolatedNoise3D(coord.x/wavelength, coord.y/wavelength, coord.z/wavelength);
}
`

const skyboxVS = `

attribute vec4 a_position;
uniform mat4 u_matrix;

varying vec3 v_normal;

void main() {
  gl_Position = vec4(a_position.xy, 1.0, 1.0);
  v_normal = (u_matrix * a_position).xyz;
}`;
const skyboxFS = `
precision highp float;

varying vec3 v_normal;

uniform samplerCube u_skyboxMap;

void main() {
  gl_FragColor = textureCube(u_skyboxMap, normalize(v_normal));
}`;

const programOptions = {
  attribLocations: {
    'a_position': 0,
    'a_texcoord': 1,
    'a_normal':   2,
    'a_color':    3,
  },
};

function createScene(gl, data) {
  const byId = {};

  const sceneGlobals = {
    programs: {
      color: twgl.createProgramInfo(gl, [colorVS, colorFS], programOptions),
      tex: twgl.createProgramInfo(gl, [texVS, texFS], programOptions),
      uniColor: twgl.createProgramInfo(gl, [uniColorVS, uniColorFS], programOptions),
      mtl: twgl.createProgramInfo(gl, [mtlVS, mtlFS], programOptions),
      skybox: twgl.createProgramInfo(gl, [skyboxVS, skyboxFS], programOptions),
    },
    textures: {
      nil: twgl.createTexture(gl, {
        src: [255, 255, 255, 1],
      }),
    },
    byId,
  }

  return {
    ...data,
    objects: data.objects.map(obj => createObject(gl, obj, sceneGlobals)),
    lightProjection: createLightProjectionInfo(gl, data.light),
    skybox: createSkyboxInfo(gl, data.skybox, sceneGlobals),
    ...sceneGlobals,
  }
}

function createObject(gl, { id, objects, ...objData }, sceneGlobals) {
  const node = {
    ...(id ? { id } : {}),
    translation: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    ...objData,
    objects: (objects || []).map(obj => createObject(gl, obj, sceneGlobals)),
  }

  if (objData.programName) {
    if (objData.model) {
      loadModelToObjects(gl, node, objData, sceneGlobals);
    } else if (objData.attributes) {
      const programInfo = sceneGlobals.programs[objData.programName];
      const bufferInfo = twgl.createBufferInfoFromArrays(gl, objData.attributes);
      const texUniforms = Object.fromEntries(
        Object.entries(objData.textureNames || {}).map(([uniform, texName]) => ([uniform, sceneGlobals.textures[texName]]))
      );

      Object.assign(node, {
        programInfo, bufferInfo,
        vao: twgl.createVAOFromBufferInfo(gl, programInfo, bufferInfo),
        uniforms: {
          ...objData.uniforms,
          ...texUniforms,
        },
      });
    }
  }

  if (id) {
    sceneGlobals.byId[id] = node;
  }
  return node;
}

async function loadModelToObjects(gl, node, objData, sceneGlobals) {
  const modelName = objData.id || 'model';

  node.model = {
    name: modelName,
    obj: objData.model.url,
    mtl: objData.model.hasMtl,
  }

  const { [modelName]: model } = await WebGLObjLoader.downloadModels([node.model])

  node.model = { ...node.model, ...model };

  // shared position/vertices
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.vertices), gl.STATIC_DRAW);
  const positionBufferInfo = {
    position: { numComponents: 3, buffer: positionBuffer },
  };

  // shared texture/texcoord
  const texcoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.textures), gl.STATIC_DRAW);
  const texcoordBufferInfo = {
    texcoord: { numComponents: 2, buffer: texcoordBuffer },
  }

  // shared vertexNormal
  const normalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.vertexNormals), gl.STATIC_DRAW);
  const normalBufferInfo = {
    normal: { numComponents: 3, buffer: normalBuffer },
  };

  node.objects = [
    ...node.objects,
    ...model.indicesPerMaterial.map((indices, mtlIdx) => {
      const material = model.materialsByIndex[mtlIdx];

      let u_diffuseMap = 'nil';

      if (material.mapDiffuse.texture) {
        const textureName = `${modelName}-${material.name}-${material.mapDiffuse.filename}`;
        sceneGlobals.textures[textureName] = twgl.createTexture(gl, {
          wrapS: gl.CLAMP_TO_EDGE, wrapT: gl.CLAMP_TO_EDGE,
          min: gl.LINEAR_MIPMAP_LINEAR,
          src: material.mapDiffuse.texture,
          flipY: 1,
        })
        u_diffuseMap = textureName;
      }

      return createObject(gl, {
        programName: objData.programName,
        attributes: {
          ...positionBufferInfo,
          ...texcoordBufferInfo,
          ...normalBufferInfo,
          indices,
        },
        uniforms: {
          u_color: randomColor(),
          u_diffuse: [...material.diffuse, 1],
          u_ambient: material.ambient,
          u_emissive: material.emissive,
          u_specular: material.specular,
          u_specularExponent: material.specularExponent,
          u_reflective: 0,
          u_normalNoise: [0, 0, 0],
        },
        textureNames: { u_diffuseMap },
      }, sceneGlobals);
    })
  ];
}

function createLightProjectionInfo(gl, lightData) {
  const depthTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, depthTexture);

  gl.texImage2D(
    gl.TEXTURE_2D,
    0, // level
    gl.DEPTH_COMPONENT, // internalFormat
    lightData.projectionSize, // width
    lightData.projectionSize, // height
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
  ])

  return {
    framebufferInfo,
    lightProjectionMap: framebufferInfo.attachments[0],
  };
}

function createSkyboxInfo(gl, skybox, { programs }) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

  const tmpImageSize = 1;

  const imagePromises = Object.entries(skybox.srcset).map(async ([targetName, url]) => {
    const target = gl[targetName];
    gl.texImage2D(
      target,
      /* level: */ 0,
      /* internalFormat: */ gl.RGBA,
      /* width: */ tmpImageSize,
      /* height: */ tmpImageSize,
      /* border: */ 0,
      /* format: */ gl.RGBA,
      /* type: */ gl.UNSIGNED_BYTE,
      /* data: */ null
    );

    const image = await loadImage(url);
    return {
      image, target
    }
  });

  Promise.all(imagePromises).then(srcs => {
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
    srcs.forEach(({ image, target }) => {
      gl.texImage2D(
        target,
        /* level: */ 0,
        /* internalFormat: */ gl.RGBA,
        /* format: */ gl.RGBA,
        /* type: */ gl.UNSIGNED_BYTE,
        image,
      );
    });
    gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
  })

  gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

  const bufferInfo = twgl.createBufferInfoFromArrays(gl, {
    position: { numComponents: 3, data: [
      -1, 1, 1,
      -1, -1, 1,
      1, 1, 1,
      1, 1, 1,
      -1, -1, 1,
      1, -1, 1,
    ] },
  })

  return {
    texture, bufferInfo,
    vao: twgl.createVAOFromBufferInfo(gl, programs.skybox, bufferInfo),
  };
}

function render(gl, scene, timeStamp) {
  gl.enable(gl.CULL_FACE);
  gl.enable(gl.DEPTH_TEST);

  twgl.resizeCanvasToDisplaySize(gl.canvas, window.devicePixelRatio || 1);

  const { lightProjectionMatrix } = renderLightProjection(gl, scene);

  const { camera, light, lightProjection, objects } = scene;

  bindFramebuffer(gl, null, gl.canvas.width, gl.canvas.height)
  gl.clearColor(1, 1, 1, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const projectionMatrix = matrix4.perspective(
    camera.fieldOfView,
    /* aspect: */ gl.canvas.clientWidth / gl.canvas.clientHeight,
    /* near: */ 1,
    /* far: */ 2000,
  )
  const viewMatrix = matrix4.inverse(
    matrix4.lookAt(camera.translation, camera.lookAtTarget, [0, 1, 0])
  );

  const globals = {
    viewProjectionMatrix: matrix4.multiply(
      projectionMatrix, viewMatrix,
    ),
  }
  const noiseBase = timeStamp * 0.005;
  const uniforms = {
    u_worldLightPosition: light.translation,
    u_worldViewerPosition: camera.translation,
    u_ambientLight: light.ambient,
    u_lightProjectionMatrix: lightProjectionMatrix,
    u_lightProjectionMap: lightProjection.lightProjectionMap,
    u_lightShadowBias: light.shadowBias,
    u_lightShadowSampleStepSize: light.shadowSampleStepSize,
    u_skyboxMap: scene.skybox.texture,
    u_normalNoiseRange: 500,
    u_normalNoiseBase: [
      noiseBase, 0, 0,
      0, noiseBase, 0,
      0, 0, noiseBase,
    ],
  }

  objects.forEach(o => renderObject(gl, o, globals, matrix4.identity(), uniforms));

  renderSkybox(gl, scene, projectionMatrix, viewMatrix);
}

function renderLightProjection(gl, { programs, light, objects, lightProjection }) {
  bindFramebuffer(gl, lightProjection.framebufferInfo.framebuffer, light.projectionSize, light.projectionSize);

  gl.clear(gl.DEPTH_BUFFER_BIT);

  const lightProjectionMatrix = matrix4.multiply(
    matrix4.perspective(
      light.fieldOfView,
      /* aspect: */ 1,
      /* near: */ 1,
      /* far: */ 2000,
    ),
    matrix4.inverse(
      pipe(
        matrix4.identity(),
        m => matrix4.translate(m, ...light.translation),
        m => matrix4.xRotate(m, light.rotation[0]),
        m => matrix4.yRotate(m, light.rotation[1]),
        m => matrix4.zRotate(m, light.rotation[2]),
        m => matrix4.scale(m, ...light.scale),
      )
    ),
  );

  const globals = {
    viewProjectionMatrix: lightProjectionMatrix,
    lightProjectionProgramInfo: programs.uniColor,
  };

  objects.forEach(o => renderObject(gl, o, globals, matrix4.identity(), {
    u_color: [0, 0, 0]
  }));

  return { lightProjectionMatrix };
}

function renderObject(gl, {
  programInfo, vao, bufferInfo, hidden, translation, rotation, scale, uniforms, objects,
  disableParentTransform,
}, globals, parentWorldMatrix, parentUniforms) {
  const u_world = pipe(
    disableParentTransform ? matrix4.identity() : parentWorldMatrix,
    m => matrix4.translate(m, ...translation),
    m => matrix4.xRotate(m, rotation[0]),
    m => matrix4.yRotate(m, rotation[1]),
    m => matrix4.zRotate(m, rotation[2]),
    m => matrix4.scale(m, ...scale),
  )

  const localUniforms = {
    ...parentUniforms,
    ...uniforms,
  }
  const programInfoToUse = globals.lightProjectionProgramInfo ?? programInfo;

  if (!hidden && programInfo && vao && bufferInfo) {
    gl.useProgram(programInfoToUse.program);
    gl.bindVertexArray(vao);

    const u_matrix = matrix4.multiply(
      globals.viewProjectionMatrix, u_world,
    )
    const u_worldInverseTranspose = matrix4.transpose(
      matrix4.inverse(u_world)
    );

    twgl.setUniforms(programInfoToUse, {
      ...localUniforms,
      u_matrix, u_world, u_worldInverseTranspose,
    });
    twgl.drawBufferInfo(gl, bufferInfo);
  }

  objects.forEach(o => renderObject(gl, o, globals, u_world, localUniforms));
}

function renderSkybox(gl, { programs, skybox }, projectionMatrix, viewMatrix) {
  gl.useProgram(programs.skybox.program);
  gl.bindVertexArray(skybox.vao);
  gl.depthFunc(gl.LEQUAL);

  twgl.setUniforms(programs.skybox, {
    u_skyboxMap: skybox.texture,
    u_matrix: matrix4.inverse(
      matrix4.multiply(
        projectionMatrix,
        [
          ...viewMatrix.slice(0, 12),
          0, 0, 0, viewMatrix[15], // remove translation
        ],
      ),
    ), // https://webgl2fundamentals.org/webgl/lessons/webgl-skybox.html
  });
  twgl.drawBufferInfo(gl, skybox.bufferInfo);

  gl.depthFunc(gl.LESS); // reset to default
}

function bindFramebuffer(gl, fb, width, height) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.viewport(0, 0, width, height);
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
function randomColor() {
  return [Math.random(), Math.random(), Math.random()]
}
