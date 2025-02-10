let faceMesh; //variable for facemesh
let options = { maxFaces: 1, refineLandmarks: false, flipped: true }; //settings for the facemesh object

let width, height; //width and height of the canvas
let video;

let faces = []; //faces array (faces appearing on the camera)

let logBoxWidth = false;

//function to preload facemesh
function preload() {
  faceMesh = ml5.faceMesh(options); //preload facemesh
}

//function to get the number of faces
function gotFaces(results) {
  faces = results; //function for updating the faces array with the results
}

//function to detect if each eye is closed
function individualEyeCloseTracking(face, box, a, b) {
  let keypointA = face.keypoints[a]; //get upper eye keypoint
  let keypointB = face.keypoints[b]; //get lower eye keypoint
  let d = dist(keypointA.x, keypointA.y, keypointB.x, keypointB.y); //get distance between the keypoints

  let threshold = box.width * 0.045; //threshold for signalling

  if (d <= threshold) {
    return true;
  } else {
    return false;
  }
}

//function to detect if both eyes are closed
function eyeCloseTracking(face, box) {
  let leftEyeTracking = individualEyeCloseTracking(face, box, 145, 159); //left eye tracking
  let rightEyeTracking = individualEyeCloseTracking(face, box, 374, 386); //right eye tracking

  //if both eyes are closed
  if (leftEyeTracking === true && rightEyeTracking == true) {
    return true;
  } else {
    return false;
  }
}

//function to detect if face is looking sideways
function isFaceLookingSideways(face) {
  let nose = face.keypoints[1]; //nose tip
  let leftEye = face.keypoints[33]; //left eye corner
  let rightEye = face.keypoints[263]; //right eye corner

  //convert normalized keypoints to actual pixel positions
  let noseX = nose.x * width;
  let leftEyeX = leftEye.x * width;
  let rightEyeX = rightEye.x * width;

  //find the midpoint between eyes
  let eyeCenterX = (leftEyeX + rightEyeX) / 2;

  //compute how far the nose is from the eye center
  let noseOffset = noseX - eyeCenterX;

  //use a proportion of eye distance as a threshold
  let eyeDistance = Math.abs(rightEyeX - leftEyeX);
  let threshold = eyeDistance * 0.35; //adjust as needed

  return Math.abs(noseOffset) > threshold;
}

function setup() {
  width = windowWidth; //width is the window width
  height = windowHeight; //height is the window height
  createCanvas(width, height); //create canvas with the width and height of the window

  video = createCapture(VIDEO, { flipped: true }); //create capture object (flipped)
  video.size(width, height); //capture size is the width and height of the window
  video.hide(); //hide capture and use an image with it as an input

  faceMesh.detectStart(video, gotFaces); //start detection with the capture object and the gotFaces function
}

function draw() {
  background(220);
  width = windowWidth;
  height = windowHeight; //update width and height constantly

  image(video, 0, 0, width, (width * video.height) / video.width); //display image

  eyesClosed = false; //eyes are open as default
  if (faces.length > 0) {
    let face = faces[0]; //if there is a face, create a variable for the only face on screen

    let box = face.box; //create box object (for face bounding box)

    //draw bounding box (REMOVE LATER)
    noFill();
    stroke(0, 0, 255);
    strokeWeight(2);
    rect(box.xMin, box.yMin, box.width, box.height);

    //draw the keypoints of the face mesh (REMOVE LATER)
    for (let j = 0; j < face.keypoints.length; j++) {
      let keypoint = face.keypoints[j];
      fill(0, 255, 0);
      noStroke();
      circle(keypoint.x, keypoint.y, 5);
    }

    //if eyes are closed, add text to tell that to the user (REMOVE TEXT LATER)
    if (eyeCloseTracking(face, box)) {
      fill(255, 0, 0);
      textSize(64);
      text("EYES CLOSED", width / 2, height / 2);
    }

    //if face is sideways, add text to tell that to the user (REMOVE TEXT LATER)
    if (isFaceLookingSideways(face)) {
      fill(0, 0, 255);
      textSize(64);
      text("FACE TURNED", width / 2, height / 2 + 80);
    }
  }
}
