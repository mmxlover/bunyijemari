const video = document.getElementById('webcam');
const canvas = document.getElementById('output');
const ctx = canvas.getContext('2d');

// Gesture-to-note mapping
const GESTURE_TO_NOTE = {
  thumb_up: 261.63,   // C4
  point_index: 293.66, // D4
  peace: 329.63,      // E4
  victory: 349.23,    // F4
};

let currentNote = null;

// Initialize MediaPipe Hands
const hands = new Hands({
  locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});
hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7
});

hands.onResults(onResults);

// Setup Camera
const camera = new Camera(video, {
  onFrame: async () => await hands.send({ image: video }),
  width: 640,
  height: 480
});
camera.start();

function onResults(results) {
  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  canvas.width = results.imageWidth;
  canvas.height = results.imageHeight;

  if (results.multiHandLandmarks && results.multiHandedness) {
    for (let i = 0; i < results.multiHandLandmarks.length; i++) {
      const classification = results.multiHandedness[i].label;
      const landmarks = results.multiHandLandmarks[i];

      drawLandmarks(landmarks);

      const gesture = classifyGesture(landmarks, classification);
      if (gesture && gesture !== currentNote) {
        console.log("Detected gesture:", gesture);
        playNote(GESTURE_TO_NOTE[gesture]);
        currentNote = gesture;
      }
    }
  } else {
    currentNote = null;
  }

  ctx.restore();
}

function drawLandmarks(landmarks) {
  for (let i = 0; i < landmarks.length - 1; i++) {
    const a = landmarks[i];
    const b = landmarks[i + 1];
    ctx.beginPath();
    ctx.moveTo(a.x * canvas.width, a.y * canvas.height);
    ctx.lineTo(b.x * canvas.width, b.y * canvas.height);
    ctx.strokeStyle = "lime";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function classifyGesture(landmarks) {
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const middleTip = landmarks[12];
  const ringTip = landmarks[16];
  const pinkyTip = landmarks[20];

  const isThumbUp =
    thumbTip.y < landmarks[3].y &&
    indexTip.y > landmarks[6].y &&
    middleTip.y > landmarks[10].y &&
    ringTip.y > landmarks[14].y &&
    pinkyTip.y > landmarks[18].y;

  const isIndexPointed =
    indexTip.y < landmarks[6].y &&
    middleTip.y > landmarks[10].y &&
    ringTip.y > landmarks[14].y &&
    pinkyTip.y > landmarks[18].y;

  const isPeace =
    indexTip.y < landmarks[6].y &&
    middleTip.y < landmarks[10].y &&
    ringTip.y > landmarks[14].y &&
    pinkyTip.y > landmarks[18].y;

  const isVictory =
    indexTip.y < landmarks[6].y &&
    middleTip.y < landmarks[10].y &&
    ringTip.y > landmarks[14].y &&
    pinkyTip.y > landmarks[18].y;

  if (isThumbUp) return 'thumb_up';
  if (isIndexPointed) return 'point_index';
  if (isPeace) return 'peace';
  if (isVictory) return 'victory';

  return null;
}

function playNote(frequency) {
  const audioCtx = new AudioContext();
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  oscillator.start();
  oscillator.stop(audioCtx.currentTime + 0.5); // play for 0.5 sec
}
