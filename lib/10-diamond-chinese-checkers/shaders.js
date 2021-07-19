import * as twgl from '../../vendor/twgl-full.module.js';

const mainVS = `
precision highp float;

attribute vec4 a_position;
attribute vec2 a_texcoord;
attribute vec3 a_normal;

attribute vec4 ai_diffuse;
attribute vec3 ai_emission;
attribute vec4 ai_glow;

attribute mat4 ai_world;
attribute mat4 ai_worldInverseTranspose;

uniform bool u_instanced;
uniform mat4 u_view;
uniform mat4 u_world;
uniform mat4 u_worldInverseTranspose;
uniform mat4 u_lightProjectionTransform;
uniform mat4 u_mirrorTransform;

varying vec3 v_normal;
varying vec2 v_texcoord;
varying vec3 v_surface;
varying vec4 v_lightProjection;

varying vec4 v_diffuse;
varying vec3 v_emission;
varying vec4 v_glow;

varying vec4 v_mirrorTexcoord;

void main() {
  mat4 worldMatrix = u_instanced ? ai_world * u_world : u_world;
  vec4 worldPosition = worldMatrix * a_position;

  gl_Position = u_view * worldPosition;
  v_surface = worldPosition.xyz;

  mat4 worldInverseTranspose = u_instanced ?
    ai_worldInverseTranspose * u_worldInverseTranspose :
    u_worldInverseTranspose;

  v_normal = (worldInverseTranspose * vec4(a_normal, 1)).xyz;
  v_lightProjection = u_lightProjectionTransform * worldPosition;

  v_texcoord = a_texcoord;

  v_diffuse = u_instanced ? ai_diffuse : vec4(0);
  v_emission = u_instanced ? ai_emission : vec3(0);
  v_glow = u_instanced ? ai_glow : vec4(0);

  v_mirrorTexcoord = u_mirrorTransform * worldPosition;
}

`;
const mainFS = `
precision highp float;

#define LIGHT_OCCLUSION_SAMPLE_STEP 2

varying vec3 v_normal;
varying vec2 v_texcoord;
varying vec3 v_surface;
varying vec4 v_lightProjection;

varying vec4 v_diffuse;
varying vec3 v_emission;
varying vec4 v_glow;

varying vec4 v_mirrorTexcoord;

uniform vec3 u_lightDir;
uniform vec3 u_ambientLight;
uniform vec3 u_cameraPosition;

uniform vec4 u_diffuse;
uniform vec3 u_ambient;
uniform vec3 u_emission;
uniform vec3 u_specular;
uniform float u_shininess;
uniform sampler2D u_lightProjectionMap;
uniform vec2 u_lightOcclusionSampleStepSize;
uniform float u_lightOcclusionBias;
uniform float u_glowFactor;
uniform float u_originFogNear;
uniform float u_originFogFar;
uniform bool u_useMirrorTexcoord;

uniform sampler2D u_textureMap;

float calculateLightOcclusion(float lightToSurfaceDepth, vec2 lightProjectionCoord);

void main() {
  vec2 texcoord = u_useMirrorTexcoord ? (v_mirrorTexcoord.xy / v_mirrorTexcoord.w) * 0.5 + 0.5 : v_texcoord;
  vec4 diffuse = v_diffuse + u_diffuse + texture2D(u_textureMap, texcoord);

  vec3 normal = normalize(v_normal);
  vec3 surfaceToLight = normalize(-u_lightDir);
  float diffuseLight = clamp(dot(surfaceToLight, normal), 0.0, 1.0);

  vec3 surfaceToCamera = normalize(u_cameraPosition - v_surface);
  vec3 halfVector = normalize(surfaceToCamera + surfaceToLight);

  float specularLight = diffuseLight > 0.0 ? pow(dot(halfVector, normal), u_shininess) : 0.0;

  vec2 lightProjectionCoord = v_lightProjection.xy / v_lightProjection.w * 0.5 + 0.5;
  float lightToSurfaceDepth = v_lightProjection.z / v_lightProjection.w * 0.5 + 0.5;
  float lightOcclusion = calculateLightOcclusion(lightToSurfaceDepth, lightProjectionCoord);
  diffuseLight *= 1.0 - lightOcclusion;
  specularLight *= 1.0 - lightOcclusion;

  vec3 color = (
    u_specular * specularLight +
    diffuse.rgb * diffuseLight +
    u_ambient * u_ambientLight +
    u_emission + v_emission +
    v_glow.rgb * u_glowFactor
  );

  float alpha = (
    clamp(diffuse.a + v_glow.a * u_glowFactor, 0.0, 1.0) *
    smoothstep(u_originFogFar, u_originFogNear, length(v_surface))
  );

  gl_FragColor = vec4(color, alpha);
}

float calculateLightOcclusion(float lightToSurfaceDepth, vec2 lightProjectionCoord) {
  if (
    lightProjectionCoord.x < 0.0 || lightProjectionCoord.x > 1.0 ||
    lightProjectionCoord.y < 0.0 || lightProjectionCoord.y > 1.0 ||
    lightToSurfaceDepth < 0.0 || lightToSurfaceDepth > 1.0
  ) return 0.0;

  float occulusion = 0.0;
  for(int i = -LIGHT_OCCLUSION_SAMPLE_STEP; i <= LIGHT_OCCLUSION_SAMPLE_STEP; i++) {
    for(int j = -LIGHT_OCCLUSION_SAMPLE_STEP; j <= LIGHT_OCCLUSION_SAMPLE_STEP; j++) {
      float lightProjectedDepth = texture2D(
        u_lightProjectionMap,
        lightProjectionCoord + vec2(float(i)*u_lightOcclusionSampleStepSize.x, float(j)*u_lightOcclusionSampleStepSize.y)
      ).r;
      occulusion += lightToSurfaceDepth > u_lightOcclusionBias + lightProjectedDepth ? 1.0 : 0.0;
    }
  }

  return occulusion / float((LIGHT_OCCLUSION_SAMPLE_STEP * 2 + 1) * (LIGHT_OCCLUSION_SAMPLE_STEP * 2 + 1));
}
`;

const simpleVS = `
precision highp float;

attribute vec4 a_position;

attribute vec4 ai_objectId;

attribute mat4 ai_world;

uniform bool u_instanced;
uniform mat4 u_view;
uniform mat4 u_world;
uniform vec4 u_objectId;

varying float v_depth;
varying vec4 v_objectId;

void main() {
  mat4 worldMatrix = u_instanced ? ai_world * u_world : u_world;
  gl_Position = u_view * worldMatrix * a_position;
  v_depth = gl_Position.z / 2.0 + 0.5;
  v_objectId = u_instanced ? ai_objectId : u_objectId;
}
`;

const depthFS = `
precision highp float;

varying float v_depth;

void main() {
  float depthColor = v_depth;
  gl_FragColor = vec4(depthColor, depthColor, depthColor, 1);
}
`;
const objIdFS = `
precision highp float;

varying vec4 v_objectId;

void main() {
  gl_FragColor = v_objectId;
}
`;

const skyboxVS = `
precision highp float;

attribute vec2 a_position;
varying vec3 v_cubeCoord;
uniform mat4 u_viewInverse;

void main() {
  gl_Position = vec4(a_position, 1, 1);
  v_cubeCoord = -(u_viewInverse * gl_Position).xyz;
}
`;

const skyboxFS = `
precision highp float;

varying vec3 v_cubeCoord;

uniform mat3 u_background;
uniform float u_time;
uniform float u_seed;
uniform vec3 u_starColor;

#define COS30 0.8660254037844386
#define SIN30 0.49999999999999994
#define SIN45 0.7071067811865475
#define SIN60 0.8660254037844386

mat2 rot(float a) {
  float s = sin(a), c = cos(a);
  return mat2(c, -s, s, c);
}

float hash21(vec2 p) {
  p = fract(p*vec2(321.98, 876.64));
  p += dot(p, p+45.69);
  return fract(p.x * p.y);
}

float star(vec2 uv, float rnd) {
  uv += vec2(rnd - 0.5, fract(rnd * 13.4) - 0.5);
  uv *= 1.0 / (rnd * 0.5 + 0.01);

  float d = length(uv);
  float m = 0.05/d;

  if (rnd >= 0.75) {
    uv *= rot(146.84 * rnd);
    float rays = max(0.0, 1.0 - abs(uv.x * uv.y * 1000.0));
    m += rays;
  }

  return m * smoothstep(0.5, 0.1, d);
}

vec3 starsLayer(vec2 uv) {
  vec3 color = vec3(0);

  vec2 gv = fract(uv) - 0.5;
  vec2 id = floor(uv);

  for(int i = 0; i <= 1; i++) {
    for(int j = 0; j <= 1; j++) {
      vec2 offset = vec2(i, j) - vec2(0.5);
      vec2 subId = id + offset;

      float rnd = hash21(subId + u_seed);
      vec3 starColor = sin(vec3(1.4, 1.5, 1.6) * rnd * u_time) * 0.5 + 0.5;
      color += starColor * u_starColor * star(gv - offset, rnd);
    }
  }
  return color;
}

void main() {
  vec3 cubeCoord = normalize(v_cubeCoord);
  vec3 color = vec3(0);

  color += (1.0 - length(cubeCoord - vec3(COS30, 0, -SIN30)) / 2.0) * u_background[0];
  color += (1.0 - length(cubeCoord - vec3(-COS30, 0, -SIN30)) / 2.0) * u_background[1];
  color += (1.0 - length(cubeCoord - vec3(0, 0, 1)) / 2.0) * u_background[2];

  vec2 cartesianCoord = vec2(atan(cubeCoord.z / cubeCoord.x), acos(cubeCoord.y));

  color += starsLayer(cartesianCoord * 32.86) * smoothstep(SIN60, SIN45, -cubeCoord.y);
  color += starsLayer(cubeCoord.xz * 29.48) * smoothstep(SIN45, SIN60, -cubeCoord.y);

  gl_FragColor = vec4(color, 1);
}
`;

export const attribLocations = {
  a_position: 0,
  a_texcoord: 1,
  a_normal: 2,
  ai_objectId: 4,
  ai_emission: 5,
  ai_glow: 6,
  ai_world: 7,
};

export const attribNumComponents = {
  a_position: 3,
  a_texcoord: 2,
  a_normal: 3,
  ai_diffuse: 4,
  ai_objectId: 4,
  ai_emission: 3,
  ai_glow: 4,
  ai_world: 16,
  ai_worldInverseTranspose: 16,
};

const programOptions = { attribLocations };

export default function createPrograms(gl) {
  return {
    main: twgl.createProgramInfo(gl, [mainVS, mainFS], programOptions),
    depth: twgl.createProgramInfo(gl, [simpleVS, depthFS], programOptions),
    objId: twgl.createProgramInfo(gl, [simpleVS, objIdFS], programOptions),
    skybox: twgl.createProgramInfo(gl, [skyboxVS, skyboxFS], programOptions),
  }
}
