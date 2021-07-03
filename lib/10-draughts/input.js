import { degToRad } from '../utils.js';

export default function listenToInputs(canvas, scene) {
  const input = {};

  document.addEventListener('keydown', event => {
    input[event.code] = true;
  })
  document.addEventListener('keyup', event => {
    input[event.code] = false;
  })
  document.addEventListener('keyup', event => {
    input[event.code] = false;
  })
  canvas.addEventListener('mousedown', event => {
    if (event.button === 0) {
      input.mousedown = true;
      input.mouseCoord = [event.clientX, event.clientY];
    }
  })
  canvas.addEventListener('mouseup', () => {
    input.mousedown = false;
  })
  canvas.addEventListener('touchstart', event => {
    input.touched = true;
    input.touchCoord = [event.touches[0].clientX, event.touches[0].clientY];
  })
  canvas.addEventListener('touchend', () => {
    input.touched = false;
    delete input.multiTouchClient;
    delete input.touchCoord;
  })

  input.moveCameraAngle = (clientX, clientY, preClientX, preClientY) => {
    scene.cameraAngle[0] += (preClientY - clientY) / 100;
    if (scene.cameraAngle[0] > 0) {
      scene.cameraAngle[0] = 0;
    } else if (scene.cameraAngle[0] < degToRad(-60)) {
      scene.cameraAngle[0] = degToRad(-60);
    }
    scene.cameraAngle[1] += (preClientX - clientX) / (100 * window.devicePixelRatio);
  };
  input.moveViewing = viewingMove => {
    const dx = viewingMove[0] * Math.cos(-scene.cameraAngle[1]) - viewingMove[1] * Math.sin(-scene.cameraAngle[1]);
    const dz = viewingMove[0] * Math.sin(-scene.cameraAngle[1]) + viewingMove[1] * Math.cos(-scene.cameraAngle[1]);
    scene.cameraViewing[0] += dx * scene.cameraDistance / 10;
    scene.cameraViewing[2] += dz * scene.cameraDistance / 10;
  };
  input.adjCameraDistance = delta => {
    scene.cameraDistance += delta;
    if (scene.cameraDistance > 100) scene.cameraDistance = 100;
    else if (scene.cameraDistance < 4) scene.cameraDistance = 4;
  }

  canvas.addEventListener('mousemove', event => {
    if (input.mousedown) {
      const { clientX, clientY } = event;
      const [preClientX, preClientY] = input.mouseCoord;

      input.moveCameraAngle(clientX, clientY, preClientX, preClientY);

      input.mouseCoord = [clientX, clientY];
    }
  })
  canvas.addEventListener('touchmove', event => {
    if (input.touched) {
      if (input.touched === 2 || event.touches.length >= 2) {
        const clientX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
        const clientY = (event.touches[0].clientY + event.touches[1].clientY) / 2;
        const pitchSq = (event.touches[0].clientX - event.touches[1].clientX) * (event.touches[0].clientX - event.touches[1].clientX) + (event.touches[0].clientY - event.touches[1].clientY) * (event.touches[0].clientY - event.touches[1].clientY)

        if (input.touched === 2) {
          const [preClientX, preClientY] = input.touchCoord;
          input.moveCameraAngle(clientX, clientY, preClientX, preClientY);

          const prePicthSq = input.pitchSq;
          input.adjCameraDistance((prePicthSq - pitchSq) / 2000);
        }
        input.touched = 2;
        input.touchCoord = [clientX, clientY];
        input.pitchSq = pitchSq;
      } else {
        const { clientX, clientY } = event.touches[0];
        const [preClientX, preClientY] = input.touchCoord;

        input.moveViewing([(preClientX - clientX) / 100, (preClientY - clientY) / 100]);

        input.touchCoord = [clientX, clientY];
      }
    }
  });

  canvas.addEventListener('wheel', event => {
    input.adjCameraDistance(event.deltaY / 50);
  })

  return input;
}
