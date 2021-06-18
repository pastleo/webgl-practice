export const matrix3 = {
  multiply: (a, b, dst = new Float32Array(9)) => {
    const multiplied = [
      b[0]*a[0] + b[1]*a[3] + b[2]*a[6], /**/ b[0]*a[1] + b[1]*a[4] + b[2]*a[7], /**/ b[0]*a[2] + b[1]*a[5] + b[2]*a[8],
      b[3]*a[0] + b[4]*a[3] + b[5]*a[6], /**/ b[3]*a[1] + b[4]*a[4] + b[5]*a[7], /**/ b[3]*a[2] + b[4]*a[5] + b[5]*a[8],
      b[6]*a[0] + b[7]*a[3] + b[8]*a[6], /**/ b[6]*a[1] + b[7]*a[4] + b[8]*a[7], /**/ b[6]*a[2] + b[7]*a[5] + b[8]*a[8],
    ]
    if (Array.isArray(dst)) {
      dst.splice(0, 9, ...multiplied)
    } else {
      dst.set(multiplied);
    }
    return dst;
  },

  identity: () => ([
    1, 0, 0,
    0, 1, 0,
    0, 0, 1,
  ]),
  projection: (width, height) => ([
    2 / width, 0, 0,
    0, -2 / height, 0,
    -1, 1, 1,
  ]),

  translate: (m, tx, ty) => matrix3.multiply(m, matrix3.translation(tx, ty)),
  translation: (tx, ty) => ([
    1,  0,  0,
    0,  1,  0,
    tx, ty, 1,
  ]),

  rotate: (m, angleInRadians) => matrix3.multiply(m, matrix3.rotation(angleInRadians)),
  rotation: angleInRadians => {
    const c = Math.cos(angleInRadians);
    const s = Math.sin(angleInRadians);
    return [
      c, -s, 0,
      s, c, 0,
      0, 0, 1,
    ]
  },

  scale: (m, sx, sy) => matrix3.multiply(m, matrix3.scaling(sx, sy)),
  scaling: (sx, sy) => ([
    sx, 0,  0,
    0,  sy, 0,
    0,  0,  1,
  ]),

  inspect: m => { // for debug
    console.log('-------------')
    console.log(m.slice(0, 3))
    console.log(m.slice(3, 6))
    console.log(m.slice(6))
    return m;
  }
};

export const matrix4 = {
  multiply: (a, b, dst = new Float32Array(16)) => {
    const multiplied = [
      b[0]*a[0] + b[1]*a[4] + b[2]*a[8] + b[3]*a[12],     /**/ b[0]*a[1] + b[1]*a[5] + b[2]*a[9] + b[3]*a[13],     /**/ b[0]*a[2] + b[1]*a[6] + b[2]*a[10] + b[3]*a[14],     /**/ b[0]*a[3] + b[1]*a[7] + b[2]*a[11] + b[3]*a[15],
      b[4]*a[0] + b[5]*a[4] + b[6]*a[8] + b[7]*a[12],     /**/ b[4]*a[1] + b[5]*a[5] + b[6]*a[9] + b[7]*a[13],     /**/ b[4]*a[2] + b[5]*a[6] + b[6]*a[10] + b[7]*a[14],     /**/ b[4]*a[3] + b[5]*a[7] + b[6]*a[11] + b[7]*a[15],
      b[8]*a[0] + b[9]*a[4] + b[10]*a[8] + b[11]*a[12],   /**/ b[8]*a[1] + b[9]*a[5] + b[10]*a[9] + b[11]*a[13],   /**/ b[8]*a[2] + b[9]*a[6] + b[10]*a[10] + b[11]*a[14],   /**/ b[8]*a[3] + b[9]*a[7] + b[10]*a[11] + b[11]*a[15],
      b[12]*a[0] + b[13]*a[4] + b[14]*a[8] + b[15]*a[12], /**/ b[12]*a[1] + b[13]*a[5] + b[14]*a[9] + b[15]*a[13], /**/ b[12]*a[2] + b[13]*a[6] + b[14]*a[10] + b[15]*a[14], /**/ b[12]*a[3] + b[13]*a[7] + b[14]*a[11] + b[15]*a[15],
    ]
    if (Array.isArray(dst)) {
      dst.splice(0, 16, ...multiplied)
    } else {
      dst.set(multiplied);
    }
    return dst;
  },

  identity: () => ([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]),
  projection: (width, height, depth) => ([
    2 / width, 0, 0, 0,
    0, -2 / height, 0, 0,
    0, 0, 2 / depth, 0,
    -1, 1, 0, 1,
  ]),
  perspective: (fieldOfView, aspect, near, far) => {
    const f = Math.tan(Math.PI / 2 - fieldOfView / 2);
    const rangeInv = 1.0 / (near - far);
    return [
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (near + far) * rangeInv, -1,
      0, 0, far * near * rangeInv * 2, 0,
    ]
  },
  perspectiveWithLinearZMapping: (fieldOfView, aspect, near, far) => {
    const f = Math.tan(Math.PI / 2 - fieldOfView / 2);
    return [
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, 2 / (near - far), -1,
      0, 0, (far + near) / (near - far), 0,
    ]
  },

  translate: (m, tx, ty, tz, dst) => {
    // This is the optimized version of
    // return multiply(m, translation(tx, ty, tz), dst);
    dst = dst || new Float32Array(16);

    var m00 = m[0];
    var m01 = m[1];
    var m02 = m[2];
    var m03 = m[3];
    var m10 = m[1 * 4 + 0];
    var m11 = m[1 * 4 + 1];
    var m12 = m[1 * 4 + 2];
    var m13 = m[1 * 4 + 3];
    var m20 = m[2 * 4 + 0];
    var m21 = m[2 * 4 + 1];
    var m22 = m[2 * 4 + 2];
    var m23 = m[2 * 4 + 3];
    var m30 = m[3 * 4 + 0];
    var m31 = m[3 * 4 + 1];
    var m32 = m[3 * 4 + 2];
    var m33 = m[3 * 4 + 3];

    if (m !== dst) {
      dst[ 0] = m00;
      dst[ 1] = m01;
      dst[ 2] = m02;
      dst[ 3] = m03;
      dst[ 4] = m10;
      dst[ 5] = m11;
      dst[ 6] = m12;
      dst[ 7] = m13;
      dst[ 8] = m20;
      dst[ 9] = m21;
      dst[10] = m22;
      dst[11] = m23;
    }

    dst[12] = m00 * tx + m10 * ty + m20 * tz + m30;
    dst[13] = m01 * tx + m11 * ty + m21 * tz + m31;
    dst[14] = m02 * tx + m12 * ty + m22 * tz + m32;
    dst[15] = m03 * tx + m13 * ty + m23 * tz + m33;

    return dst;
  },
  translation: (tx, ty, tz) => ([
    1,  0,  0,  0,
    0,  1,  0,  0,
    0,  0,  1,  0,
    tx, ty, tz, 1,
  ]),

  xRotate: (m, angleInRadians) => matrix4.multiply(m, matrix4.xRotation(angleInRadians)),
  xRotation: angleInRadians => {
    const c = Math.cos(angleInRadians);
    const s = Math.sin(angleInRadians);
    return [
      1, 0,  0, 0,
      0, c,  s, 0,
      0, -s, c, 0,
      0, 0,  0, 1,
    ]
  },
  yRotate: (m, angleInRadians) => matrix4.multiply(m, matrix4.yRotation(angleInRadians)),
  yRotation: angleInRadians => {
    const c = Math.cos(angleInRadians);
    const s = Math.sin(angleInRadians);
    return [
      c, 0, -s, 0,
      0, 1, 0,  0,
      s, 0, c,  0,
      0, 0, 0,  1,
    ]
  },
  zRotate: (m, angleInRadians) => matrix4.multiply(m, matrix4.zRotation(angleInRadians)),
  zRotation: angleInRadians => {
    const c = Math.cos(angleInRadians);
    const s = Math.sin(angleInRadians);
    return [
      c,  s, 0, 0,
      -s, c, 0, 0,
      0,  0, 1, 0,
      0,  0, 0, 1,
    ]
  },

  scale: (m, sx, sy, sz) => matrix4.multiply(m, matrix4.scaling(sx, sy, sz)),
  scaling: (sx, sy, sz) => ([
    sx, 0,  0,  0,
    0,  sy, 0,  0,
    0,  0,  sz, 0,
    0,  0,  0,  1,
  ]),

  inverse: m => {
    var m00 = m[0 * 4 + 0];
    var m01 = m[0 * 4 + 1];
    var m02 = m[0 * 4 + 2];
    var m03 = m[0 * 4 + 3];
    var m10 = m[1 * 4 + 0];
    var m11 = m[1 * 4 + 1];
    var m12 = m[1 * 4 + 2];
    var m13 = m[1 * 4 + 3];
    var m20 = m[2 * 4 + 0];
    var m21 = m[2 * 4 + 1];
    var m22 = m[2 * 4 + 2];
    var m23 = m[2 * 4 + 3];
    var m30 = m[3 * 4 + 0];
    var m31 = m[3 * 4 + 1];
    var m32 = m[3 * 4 + 2];
    var m33 = m[3 * 4 + 3];
    var tmp_0  = m22 * m33;
    var tmp_1  = m32 * m23;
    var tmp_2  = m12 * m33;
    var tmp_3  = m32 * m13;
    var tmp_4  = m12 * m23;
    var tmp_5  = m22 * m13;
    var tmp_6  = m02 * m33;
    var tmp_7  = m32 * m03;
    var tmp_8  = m02 * m23;
    var tmp_9  = m22 * m03;
    var tmp_10 = m02 * m13;
    var tmp_11 = m12 * m03;
    var tmp_12 = m20 * m31;
    var tmp_13 = m30 * m21;
    var tmp_14 = m10 * m31;
    var tmp_15 = m30 * m11;
    var tmp_16 = m10 * m21;
    var tmp_17 = m20 * m11;
    var tmp_18 = m00 * m31;
    var tmp_19 = m30 * m01;
    var tmp_20 = m00 * m21;
    var tmp_21 = m20 * m01;
    var tmp_22 = m00 * m11;
    var tmp_23 = m10 * m01;

    var t0 = (tmp_0 * m11 + tmp_3 * m21 + tmp_4 * m31) -
             (tmp_1 * m11 + tmp_2 * m21 + tmp_5 * m31);
    var t1 = (tmp_1 * m01 + tmp_6 * m21 + tmp_9 * m31) -
             (tmp_0 * m01 + tmp_7 * m21 + tmp_8 * m31);
    var t2 = (tmp_2 * m01 + tmp_7 * m11 + tmp_10 * m31) -
             (tmp_3 * m01 + tmp_6 * m11 + tmp_11 * m31);
    var t3 = (tmp_5 * m01 + tmp_8 * m11 + tmp_11 * m21) -
             (tmp_4 * m01 + tmp_9 * m11 + tmp_10 * m21);

    var d = 1.0 / (m00 * t0 + m10 * t1 + m20 * t2 + m30 * t3);

    return [
      d * t0,
      d * t1,
      d * t2,
      d * t3,
      d * ((tmp_1 * m10 + tmp_2 * m20 + tmp_5 * m30) -
           (tmp_0 * m10 + tmp_3 * m20 + tmp_4 * m30)),
      d * ((tmp_0 * m00 + tmp_7 * m20 + tmp_8 * m30) -
           (tmp_1 * m00 + tmp_6 * m20 + tmp_9 * m30)),
      d * ((tmp_3 * m00 + tmp_6 * m10 + tmp_11 * m30) -
           (tmp_2 * m00 + tmp_7 * m10 + tmp_10 * m30)),
      d * ((tmp_4 * m00 + tmp_9 * m10 + tmp_10 * m20) -
           (tmp_5 * m00 + tmp_8 * m10 + tmp_11 * m20)),
      d * ((tmp_12 * m13 + tmp_15 * m23 + tmp_16 * m33) -
           (tmp_13 * m13 + tmp_14 * m23 + tmp_17 * m33)),
      d * ((tmp_13 * m03 + tmp_18 * m23 + tmp_21 * m33) -
           (tmp_12 * m03 + tmp_19 * m23 + tmp_20 * m33)),
      d * ((tmp_14 * m03 + tmp_19 * m13 + tmp_22 * m33) -
           (tmp_15 * m03 + tmp_18 * m13 + tmp_23 * m33)),
      d * ((tmp_17 * m03 + tmp_20 * m13 + tmp_23 * m23) -
           (tmp_16 * m03 + tmp_21 * m13 + tmp_22 * m23)),
      d * ((tmp_14 * m22 + tmp_17 * m32 + tmp_13 * m12) -
           (tmp_16 * m32 + tmp_12 * m12 + tmp_15 * m22)),
      d * ((tmp_20 * m32 + tmp_12 * m02 + tmp_19 * m22) -
           (tmp_18 * m22 + tmp_21 * m32 + tmp_13 * m02)),
      d * ((tmp_18 * m12 + tmp_23 * m32 + tmp_15 * m02) -
           (tmp_22 * m32 + tmp_14 * m02 + tmp_19 * m12)),
      d * ((tmp_22 * m22 + tmp_16 * m02 + tmp_21 * m12) -
           (tmp_20 * m12 + tmp_23 * m22 + tmp_17 * m02)),
    ];
  },

  cross: (a, b) => ([
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ]),
  subtractVectors: (a, b) => ([
    a[0] - b[0], a[1] - b[1], a[2] - b[2]
  ]),
  normalize: v => {
    var length = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    // make sure we don't divide by 0.
    if (length > 0.00001) {
      return [v[0] / length, v[1] / length, v[2] / length];
    } else {
      return [0, 0, 0];
    }
  },
  lookAt: (cameraPosition, target, up) => {
    var zAxis = matrix4.normalize(
        matrix4.subtractVectors(cameraPosition, target)
    );
    var xAxis = matrix4.normalize(matrix4.cross(up, zAxis));
    var yAxis = matrix4.normalize(matrix4.cross(zAxis, xAxis));

    return [
      xAxis[0], xAxis[1], xAxis[2], 0,
      yAxis[0], yAxis[1], yAxis[2], 0,
      zAxis[0], zAxis[1], zAxis[2], 0,
      cameraPosition[0],
      cameraPosition[1],
      cameraPosition[2],
      1,
    ];
  },

  inspect: m => { // for debug
    console.log('-------------')
    console.log(m.slice(0, 4))
    console.log(m.slice(4, 8))
    console.log(m.slice(8, 12))
    console.log(m.slice(12))
    return m;
  },

  makeZToWMatrix: fudgeFactor => ([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, fudgeFactor,
    0, 0, 0, 1,
  ]),
  transformVector: (m, v) => {
    var dst = [];
    for (var i = 0; i < 4; ++i) {
      dst[i] = 0.0;
      for (var j = 0; j < 4; ++j) {
        dst[i] += v[j] * m[j * 4 + i];
      }
    }
    return dst;
  },
  transpose: (m, dst) => {
    dst = dst || new Float32Array(16);

    dst[ 0] = m[0];
    dst[ 1] = m[4];
    dst[ 2] = m[8];
    dst[ 3] = m[12];
    dst[ 4] = m[1];
    dst[ 5] = m[5];
    dst[ 6] = m[9];
    dst[ 7] = m[13];
    dst[ 8] = m[2];
    dst[ 9] = m[6];
    dst[10] = m[10];
    dst[11] = m[14];
    dst[12] = m[3];
    dst[13] = m[7];
    dst[14] = m[11];
    dst[15] = m[15];

    return dst;
  }
};
