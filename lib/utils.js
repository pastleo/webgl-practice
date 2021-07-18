export const pipe = (value, ...fns) => fns.reduce((cur, fn) => fn(cur), value);

export const loadImage = url => {
  return new Promise(resolve => {
    const image = new Image();
    image.onload = function() {
      resolve(image);
    };
    image.src = url;
  })
}

export const createSlider = (id, sliderSettings) => {
  let div = document.getElementById(id);
  if (!div) {
    div = document.createElement('div');
    div.id = id;
    document.getElementById('ui').appendChild(div);
  }
  webglLessonsUI.setupSlider(`#${id}`, sliderSettings);
}

export const degToRad = d => d * Math.PI / 180;
export const radToDeg = r => r * 180 / Math.PI;

export const encodeIntVec4 = i => ([
  ((i >>  0) & 0xFF) / 0xFF,
  ((i >>  8) & 0xFF) / 0xFF,
  ((i >> 16) & 0xFF) / 0xFF,
  ((i >> 24) & 0xFF) / 0xFF,
]);

export const decodeVec4Int = vec => (
  (vec[0] << 0) + (vec[1] << 8) +
  (vec[2] << 16) + (vec[3] << 24)
);
