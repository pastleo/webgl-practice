import * as twgl from '../../vendor/twgl-full.module.js';

const mainVS = `
precision highp float;

attribute vec4 a_position;
attribute vec2 a_texcoord;
attribute vec3 a_normal;

attribute vec4 ai_diffuse;
attribute vec3 ai_translate;

uniform mat4 u_view;
uniform mat4 u_world;
uniform mat4 u_worldInverseTranspose;
uniform mat4 u_lightProjectionTransform;

varying vec3 v_normal;
varying vec2 v_texcoord;
varying vec3 v_surface;
varying vec4 v_lightProjection;

varying vec4 v_diffuse;

mat4 translate(vec3 d);

void main() {
  vec4 worldPosition = translate(ai_translate) * u_world * a_position;
  gl_Position = u_view * worldPosition;
  v_normal = (u_worldInverseTranspose * vec4(a_normal, 1)).xyz;
  v_surface = (u_world * a_position).xyz;
  v_texcoord = a_texcoord;
  v_lightProjection = u_lightProjectionTransform * worldPosition;

  v_diffuse = ai_diffuse;
}

mat4 translate(vec3 d) {
  return mat4(
    vec4(1, 0, 0, 0),
    vec4(0, 1, 0, 0),
    vec4(0, 0, 1, 0),
    vec4(d, 1)
  );
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

uniform vec3 u_lightDir;
uniform vec3 u_ambientLight;
uniform vec3 u_cameraPosition;

uniform vec4 u_diffuse;
uniform vec3 u_ambient;
uniform vec3 u_emissive;
uniform vec3 u_specular;
uniform float u_shininess;
uniform sampler2D u_lightProjectionMap;
uniform vec2 u_lightOcclusionSampleStepSize;
uniform float u_lightOcclusionBias;

float calculateLightOcclusion(float lightToSurfaceDepth, vec2 lightProjectionCoord);

void main() {
  vec4 diffuse = v_diffuse + u_diffuse;

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
    u_emissive,
    diffuse.a
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

const depthVS = `
precision highp float;

attribute vec4 a_position;

attribute vec3 ai_translate;

uniform mat4 u_view;
uniform mat4 u_world;

varying float v_depth;

mat4 translate(vec3 d);

void main() {
  gl_Position = u_view * translate(ai_translate) * u_world * a_position;
  v_depth = gl_Position.z / 2.0 + 0.5;
}

mat4 translate(vec3 d) {
  return mat4(
    vec4(1, 0, 0, 0),
    vec4(0, 1, 0, 0),
    vec4(0, 0, 1, 0),
    vec4(d, 1)
  );
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

const programOptions = {
  attribLocations: {
    'a_position': 0,
    'a_texcoord': 1,
    'a_normal':   2,
    'a_color':    3,
    'ai_translate': 4,
  },
};

export default function createPrograms(gl) {
  return {
    main: twgl.createProgramInfo(gl, [mainVS, mainFS], programOptions),
    depth: twgl.createProgramInfo(gl, [depthVS, depthFS], programOptions),
  }
}
