let faceMesh;
let options = { maxFaces: 1, refineLandmarks: false, flipped: true };

let width, height;
let video;

let faces = [];

let eyesClosed;

function preload() {
  faceMesh = ml5.faceMesh(options); //preload facemesh
}

function gotFaces(results) {
  faces = results;
}

function individualEyeCloseTracking(face, a, b) {
  let keypointA = face.keypoints[a];
  let keypointB = face.keypoints[b];
  let d = dist(keypointA.x, keypointA.y, keypointB.x, keypointB.y);
  let threshold = 12;

  if (d <= threshold) {
    return true;
  } else {
    return false;
  }
}

function eyeCloseTracking(face) {
  let leftEyeTracking = individualEyeCloseTracking(face, 145, 159);
  let rightEyeTracking = individualEyeCloseTracking(face, 374, 386);

  if (leftEyeTracking === true && rightEyeTracking == true) {
    return true;
  } else {
    return false;
  }
}

function isFaceLookingSideways(face) {
  let nose = face.keypoints[1]; // Nose tip
  let leftEye = face.keypoints[33]; // Left eye corner
  let rightEye = face.keypoints[263]; // Right eye corner

  // Convert normalized keypoints to actual pixel positions
  let noseX = nose.x * width;
  let leftEyeX = leftEye.x * width;
  let rightEyeX = rightEye.x * width;

  // Find the midpoint between eyes
  let eyeCenterX = (leftEyeX + rightEyeX) / 2;

  // Compute how far the nose is from the eye center
  let noseOffset = noseX - eyeCenterX;

  // Use a proportion of eye distance as a threshold
  let eyeDistance = Math.abs(rightEyeX - leftEyeX);
  let threshold = eyeDistance * 0.35; // Adjust as needed

  return Math.abs(noseOffset) > threshold;
}

function setup() {
  width = windowWidth;
  height = windowHeight;
  createCanvas(width, height);

  video = createCapture(VIDEO, { flipped: true });
  video.size(width, height);
  video.hide();

  faceMesh.detectStart(video, gotFaces);
}

function draw() {
  background(220);
  width = windowWidth;
  height = windowHeight;

  image(video, 0, 0, width, (width * video.height) / video.width);

  eyesClosed = false;
  if (faces.length > 0) {
    let face = faces[0];

    for (let j = 0; j < face.keypoints.length; j++) {
      let keypoint = face.keypoints[j];
      fill(0, 255, 0);
      noStroke();
      circle(keypoint.x, keypoint.y, 5);
    }
    if (eyeCloseTracking(face)) {
      eyesClosed = true;
    }

    if (eyesClosed) {
      fill(255, 0, 0);
      textSize(64);
      text("EYES CLOSED", width / 2, height / 2);
    }

    if (isFaceLookingSideways(face)) {
      fill(0, 0, 255);
      textSize(64);
      text("FACE TURNED", width / 2, height / 2 + 80);
    }
  }
}
