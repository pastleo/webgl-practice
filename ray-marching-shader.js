import * as twgl from 'https://unpkg.com/twgl.js@4.19.2/dist/4.x/twgl-full.module.js';

const vertexShaderSource = `
attribute vec4 a_position;

varying vec2 v_uv;

void main() {
  gl_Position = a_position;
  v_uv = gl_Position.xy;
}
`;

const fragmentShaderSource = `
precision highp float;

varying vec2 v_uv;

uniform float u_time;

// "ShaderToy Tutorial - Ray Marching for Dummies!" 
// by Martijn Steinrucken aka BigWings/CountFrolic - 2018
// License Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License.
//
// This shader is part of a tutorial on YouTube
// https://youtu.be/PGtv-dBi2wE

#define MAX_STEPS 100
#define MAX_DIST 100.
#define SURF_DIST .01

float GetDist(vec3 p) {
	vec4 s = vec4(0, 1, 6, 1);

  float sphereDist =  length(p-s.xyz)-s.w;
  float planeDist = p.y;

  float d = min(sphereDist, planeDist);
  return d;
}

float RayMarch(vec3 ro, vec3 rd) {
	float dO=0.;
    
  for(int i=0; i<MAX_STEPS; i++) {
    vec3 p = ro + rd*dO;
    float dS = GetDist(p);
    dO += dS;
    if(dO>MAX_DIST || dS<SURF_DIST) break;
  }
  
  return dO;
}

vec3 GetNormal(vec3 p) {
	float d = GetDist(p);
  vec2 e = vec2(.01, 0);
  
  vec3 n = d - vec3(
    GetDist(p-e.xyy),
    GetDist(p-e.yxy),
    GetDist(p-e.yyx)
  );
  
  return normalize(n);
}

float GetLight(vec3 p) {
  vec3 lightPos = vec3(0, 5, 6);
  lightPos.xz += vec2(sin(u_time), cos(u_time))*2.;
  vec3 l = normalize(lightPos-p);
  vec3 n = GetNormal(p);
  
  float dif = clamp(dot(n, l), 0., 1.);
  float d = RayMarch(p+n*SURF_DIST*2., l);
  if(d<length(lightPos-p)) dif *= .1;
  
  return dif;
}

void main() {
  vec3 col = vec3(0);
  
  vec3 ro = vec3(0, 1, 0);
  vec3 rd = normalize(vec3(v_uv.x, v_uv.y, 1));

  float d = RayMarch(ro, rd);
  
  vec3 p = ro + rd * d;
  
  float dif = GetLight(p);
  col = vec3(dif);
  
  col = pow(col, vec3(.4545));	// gamma correction

  gl_FragColor = vec4(col,1.0);
}
`;

async function setup() {
  const canvas = document.getElementById('canvas');
  const gl = canvas.getContext('webgl');

  const oesVaoExt = gl.getExtension('OES_vertex_array_object');
  if (oesVaoExt) {
    gl.createVertexArray = (...args) => oesVaoExt.createVertexArrayOES(...args);
    gl.deleteVertexArray = (...args) => oesVaoExt.deleteVertexArrayOES(...args);
    gl.isVertexArray = (...args) => oesVaoExt.isVertexArrayOES(...args);
    gl.bindVertexArray = (...args) => oesVaoExt.bindVertexArrayOES(...args);
  } else {
    throw new Error('Your browser does not support WebGL ext: OES_vertex_array_object')
  }

  twgl.setAttributePrefix('a_');

  const programInfo = twgl.createProgramInfo(gl, [vertexShaderSource, fragmentShaderSource]);

  const objects = {};

  { // xyQuad
    const attribs = twgl.primitives.createXYQuadVertices()
    const bufferInfo = twgl.createBufferInfoFromArrays(gl, attribs);
    const vao = twgl.createVAOFromBufferInfo(gl, programInfo, bufferInfo);

    objects.xyQuad = {
      attribs,
      bufferInfo,
      vao,
    };
  }

  return {
    gl,
    programInfo,
    objects,
    state: {},
    time: 0,
  };
}

function render(app) {
  const {
    gl,
    programInfo,
    objects,
    time,
  } = app;

  gl.canvas.width = gl.canvas.clientWidth;
  gl.canvas.height = gl.canvas.clientHeight;
  gl.viewport(0, 0, canvas.width, canvas.height);

  gl.useProgram(programInfo.program);

  twgl.setUniforms(programInfo, {
    u_time: time / 1000,
  });

  gl.bindVertexArray(objects.xyQuad.vao);
  twgl.drawBufferInfo(gl, objects.xyQuad.bufferInfo);
}

function startLoop(app, now = 0) {
  const timeDiff = now - app.time;
  app.time = now;

  render(app, timeDiff);
  requestAnimationFrame(now => startLoop(app, now));
}

async function main() {
  const app = await setup();
  window.app = app;
  window.gl = app.gl;

  startLoop(app);
}
main();
