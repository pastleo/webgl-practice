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

uniform mat4 u_view;
uniform mat4 u_world;
uniform mat4 u_worldInverseTranspose;
uniform mat4 u_lightProjectionTransform;

varying vec3 v_normal;
varying vec2 v_texcoord;
varying vec3 v_surface;
varying vec4 v_lightProjection;

varying vec4 v_diffuse;
varying vec3 v_emission;
varying vec4 v_glow;

void main() {
  vec4 worldPosition = ai_world * u_world * a_position;
  gl_Position = u_view * worldPosition;
  v_normal = (u_worldInverseTranspose * vec4(a_normal, 1)).xyz;
  v_surface = (u_world * a_position).xyz;
  v_texcoord = a_texcoord;
  v_lightProjection = u_lightProjectionTransform * worldPosition;

  v_diffuse = ai_diffuse;
  v_emission = ai_emission;
  v_glow = ai_glow;
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

uniform sampler2D u_textureMap;

float calculateLightOcclusion(float lightToSurfaceDepth, vec2 lightProjectionCoord);

void main() {
  vec4 diffuse = v_diffuse + u_diffuse + texture2D(u_textureMap, v_texcoord);

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

  gl_FragColor = vec4(
    u_specular * specularLight +
    diffuse.rgb * diffuseLight +
    u_ambient * u_ambientLight +
    u_emission + v_emission +
    v_glow.rgb * u_glowFactor,
    diffuse.a + v_glow.a * u_glowFactor
  );
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

uniform mat4 u_view;
uniform mat4 u_world;

varying float v_depth;
varying vec4 v_objectId;

void main() {
  gl_Position = u_view * ai_world * u_world * a_position;
  v_depth = gl_Position.z / 2.0 + 0.5;
  v_objectId = ai_objectId;
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

export const attribLocations = {
  a_position: 0,
  a_texcoord: 1,
  a_normal: 2,
  a_color: 3,
  ai_objectId: 4,
  ai_emission: 5,
  ai_glow: 6,
  ai_world: 7,
};

const programOptions = { attribLocations };

export default function createPrograms(gl) {
  return {
    main: twgl.createProgramInfo(gl, [mainVS, mainFS], programOptions),
    depth: twgl.createProgramInfo(gl, [simpleVS, depthFS], programOptions),
    objId: twgl.createProgramInfo(gl, [simpleVS, objIdFS], programOptions),
  }
}
