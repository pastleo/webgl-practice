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
