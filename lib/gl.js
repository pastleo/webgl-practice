import { loadImage } from './utils.js';

export const createAttributeBuffer = (gl, program, name, size, type = gl.FLOAT, normalize = false, stride = 0, offset = 0) => {
  const attributeLocation = gl.getAttribLocation(program, name);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

  gl.enableVertexAttribArray(attributeLocation);

  gl.vertexAttribPointer(
    attributeLocation, size, type, normalize,
    stride, // 0 = move forward size * sizeof(type) each iteration to get the next position
    offset, // start at the beginning of the buffer
  );

  return buffer;
}
export const transferToBuffer = (gl, buffer, data) => {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
}

export const setTextureToUnifrom = (gl, unit, uniform, texture) => { // unit can be from 0-31
  gl.uniform1i(uniform, unit);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.activeTexture(gl[`TEXTURE${unit}`]); // from gl.TEXTURE0 to gl.TEXTURE31
}

export const createImageTexture = (gl, urlOrImg) => {
  const texture = gl.createTexture();

  if (typeof urlOrImg === 'string') {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    // Fill the texture with a 1x1 blue pixel.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
                new Uint8Array([0, 0, 255, 255]));

    loadImage(urlOrImg).then(image => {
      setImgToTexture(gl, texture, image);
    });
  } else {
    setImgToTexture(gl, texture, urlOrImg);
  }

  return texture;
}

export const hslGlsl = `
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
`;

const setImgToTexture = (gl, texture, image) => {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0, // level
    gl.RGBA, // internalFormat
    gl.RGBA, // format
    gl.UNSIGNED_BYTE, // type
    image, // data
  );
  gl.generateMipmap(gl.TEXTURE_2D);
}
