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

const skyboxVS = `
precision highp float;

attribute vec2 a_position;

varying vec3 v_cubeCoord;
varying vec2 v_coord;
uniform mat4 u_viewInvere;

void main() {
  gl_Position = vec4(a_position, 1, 1);
  v_coord = gl_Position.xy;
  v_cubeCoord = -(u_viewInvere * gl_Position).xyz;
}
`

const skyboxFS = `
precision highp float;

varying vec3 v_cubeCoord;
varying vec2 v_coord;
uniform float u_time;

mat3 rotationX(float a);
mat3 rotationY(float a);
mat3 rotationZ(float a);
float noise3D(in vec3 coord, in float wavelength);

#define PI 3.1415926538
#define SIN60 0.8660254037844386
#define SIN45 0.7071067811865475
#define SIN30 0.49999999999999994
#define DEG45 0.7853981633974483

vec3 calcCubeDir(vec3 coord) {
  float noise = noise3D(coord * 1.5, 0.0025);
  float saturatedNoise = pow(1.0 - clamp(noise - 0.3 * noise, 0.0, 1.0), 100.0);
	return vec3(saturatedNoise);
}

vec3 calcLayer(vec3 cubeCoord) {
  vec3 col = vec3(0);

  col += smoothstep(SIN30, SIN45, cubeCoord.x) * calcCubeDir(vec3(1,0,0) + cubeCoord * vec3(0,1,1));
  col += smoothstep(SIN30, SIN45, -cubeCoord.x) * calcCubeDir(vec3(-1,0,0) + cubeCoord * vec3(0,1,1));
  col += smoothstep(SIN45, SIN60, cubeCoord.y) * calcCubeDir(vec3(0,1,0) + cubeCoord * vec3(1,0,1));
  col += smoothstep(SIN45, SIN60, -cubeCoord.y) * calcCubeDir(vec3(0,-1,0) + cubeCoord * vec3(1,0,1));
  col += smoothstep(SIN30, SIN45, cubeCoord.z) * calcCubeDir(vec3(0,0,1) + cubeCoord * vec3(1,1,0));
  col += smoothstep(SIN30, SIN45, -cubeCoord.z) * calcCubeDir(vec3(0,0,-1) + cubeCoord * vec3(1,1,0));

  return col;
}

void main() {
  vec3 cubeCoord = normalize(v_cubeCoord);
  vec3 col = vec3(0);

  col += calcLayer(rotationZ(0.0) * rotationY(0.0) * cubeCoord);
  col += calcLayer(rotationY(-DEG45) * rotationX(-DEG45) * cubeCoord);
  col += calcLayer(rotationY(-DEG45 * 5.0) * rotationX(-DEG45) * cubeCoord);

  gl_FragColor = vec4(col, 1);
}

mat3 rotationX(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat3(
    vec3(1, 0, 0),
    vec3(0, c, s),
    vec3(0, -s, c)
  );
}
mat3 rotationY(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat3(
    vec3(c, 0, -s),
    vec3(0, 1, 0),
    vec3(s, 0, c)
  );
}
mat3 rotationZ(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat3(
    vec3(c, s, 0),
    vec3(-s, c, 0),
    vec3(0, 0, 1)
  );
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
    skybox: twgl.createProgramInfo(gl, [skyboxVS, skyboxFS], programOptions),
  }
}
