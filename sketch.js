class FaceTracker {
  constructor(video) {
    this.video = video;
    this.faces = [];
    this.alertOpacity = 0;
    this.alertTriggeredOnScreen = false;
    this.alertTriggeredOffScreen = false;

    // Timers for tracking various conditions
    this.eyesClosedStartTime = null;
    this.faceTurnedStartTime = null;
    this.faceDownStartTime = null;
    this.faceUpStartTime = null;
    this.faceOffScreenStartTime = null;

    // Duration thresholds for alerts
    this.durationThresholdOnScreen = 2000; // 2 seconds
    this.durationThresholdOffScreen = 4000; // 4 seconds

    // Load warning image
    this.warningAsset = loadImage("./assets/warning/warning.jpg");
    this.warningFont = loadFont("./assets/fonts/PPFraktionMono-Bold.otf");
  }

  updateFaces(results) {
    this.faces = results;
  }

  detect() {
    this.alertTriggeredOnScreen = false;
    this.alertTriggeredOffScreen = false;

    if (this.faces.length > 0) {
      let face = this.faces[0];
      let box = face.box;

      let faceIsFullyVisible =
        box.xMin >= 0 &&
        box.yMin >= 0 &&
        box.xMin + box.width <= width &&
        box.yMin + box.height <= height;

      if (faceIsFullyVisible) {
        this.faceOffScreenStartTime = null;
      }

      // Draw bounding box (REMOVE LATER)
      noFill();
      stroke(0, 0, 255);
      strokeWeight(2);
      rect(box.xMin, box.yMin, box.width, box.height);

      // Draw the keypoints of the face mesh (REMOVE LATER)
      for (let j = 0; j < face.keypoints.length; j++) {
        let keypoint = face.keypoints[j];
        fill(0, 255, 0);
        noStroke();
        circle(keypoint.x, keypoint.y, 5);
      }

      // Check for closed eyes
      if (this.eyeCloseTracking(face, box)) {
        if (this.eyesClosedStartTime === null) {
          this.eyesClosedStartTime = millis();
        } else if (
          millis() - this.eyesClosedStartTime >=
          this.durationThresholdOnScreen
        ) {
          this.alertTriggeredOnScreen = "SLEEPY WORKER, WAKE UP!";
        }
      } else {
        this.eyesClosedStartTime = null;
      }

      // Check if face is turned sideways
      if (this.isFaceLookingSideways(face)) {
        if (this.faceTurnedStartTime === null) {
          this.faceTurnedStartTime = millis();
        } else if (
          millis() - this.faceTurnedStartTime >=
          this.durationThresholdOnScreen
        ) {
          this.alertTriggeredOnScreen = "THE WORK IS ON THE COMPUTER, DUMMY!";
        }
      } else {
        this.faceTurnedStartTime = null;
      }

      // Check if face is looking down
      if (this.isFaceLookingDown(face)) {
        if (this.faceDownStartTime === null) {
          this.faceDownStartTime = millis();
        } else if (
          millis() - this.faceDownStartTime >=
          this.durationThresholdOnScreen
        ) {
          this.alertTriggeredOnScreen = "STOP SCROLLING, GET WORKING!";
        }
      } else {
        this.faceDownStartTime = null;
      }

      // Check if face is looking up
      if (this.isFaceLookingUp(face)) {
        if (this.faceUpStartTime === null) {
          this.faceUpStartTime = millis();
        } else if (
          millis() - this.faceUpStartTime >=
          this.durationThresholdOnScreen
        ) {
          this.alertTriggeredOnScreen = "BE FOCUSED AND RETURN TO WORK!";
        }
      } else {
        this.faceUpStartTime = null;
      }

      // Eye gaze tracking
      this.eyeGazeTracking(face);
    } else {
      // Face is off-screen
      if (this.faceOffScreenStartTime === null) {
        this.faceOffScreenStartTime = millis();
      } else if (
        millis() - this.faceOffScreenStartTime >=
        this.durationThresholdOffScreen
      ) {
        this.alertTriggeredOffScreen =
          "YOU MAY ONLY LEAVE WHEN THE WORK IS DONE!";
      }
    }

    let oscillatingOpacity = sin(millis() / 200) * 100 + 100;

    if (this.alertTriggeredOnScreen || this.alertTriggeredOffScreen) {
      this.alertOpacity = lerp(this.alertOpacity, oscillatingOpacity, 0.1);
    } else {
      this.alertOpacity = lerp(this.alertOpacity, 0, 0.1);
    }
  }

  drawAlerts() {
    if (this.alertOpacity > 1) {
      fill(255, 0, 0, this.alertOpacity);
      rect(0, 0, width, height);

      textFont(this.warningFont);
    }
  }

  eyeCloseTracking(face, box) {
    return (
      this.individualEyeCloseTracking(face, box, 145, 159) &&
      this.individualEyeCloseTracking(face, box, 374, 386)
    );
  }

  individualEyeCloseTracking(face, box, a, b) {
    let keypointA = face.keypoints[a];
    let keypointB = face.keypoints[b];
    let d = dist(keypointA.x, keypointA.y, keypointB.x, keypointB.y);
    let threshold = box.width * 0.045;
    return d <= threshold;
  }

  isFaceLookingSideways(face) {
    let noseX = face.keypoints[1].x * width;
    let leftEyeX = face.keypoints[33].x * width;
    let rightEyeX = face.keypoints[263].x * width;
    let eyeCenterX = (leftEyeX + rightEyeX) / 2;
    let threshold = Math.abs(rightEyeX - leftEyeX) * 0.35;
    return Math.abs(noseX - eyeCenterX) > threshold;
  }

  isFaceLookingDown(face) {
    let noseY = face.keypoints[1].y * height;
    let foreheadY = face.keypoints[10].y * height;
    let chinY = face.keypoints[152].y * height;
    return noseY > foreheadY + (chinY - foreheadY) * 0.7;
  }

  isFaceLookingUp(face) {
    let noseY = face.keypoints[1].y * height;
    let foreheadY = face.keypoints[10].y * height;
    let chinY = face.keypoints[152].y * height;
    return noseY < foreheadY - (chinY - foreheadY) * 0.4;
  }

  eyeGazeTracking(face) {
    // Get pupil positions
    let leftPupil = face.keypoints[159];
    let rightPupil = face.keypoints[386];

    if (leftPupil && rightPupil) {
      // Estimate gaze direction
      let gazeX = (leftPupil.x + rightPupil.x) / 2;
      let gazeY = (leftPupil.y + rightPupil.y) / 2;

      fill(0, 255, 0);
      textSize(16);
      text(`Gaze at: ${gazeX.toFixed(2)}, ${gazeY.toFixed(2)}`, 10, 20);

      fill(0, 0, 255);
      circle(gazeX.toFixed(2), gazeY.toFixed(2), 20);
    } else {
      console.error("Left or right pupil data is missing");
    }
  }
}

let faceMesh;
let tracker;
let video;
let gestures;

function preload() {
  faceMesh = ml5.faceMesh({
    maxFaces: 1,
    refineLandmarks: false,
    flipped: true,
  });
}

function faceReady() {
  faceApi.detect(gotFaces);
}

function gotFaces(error, result) {
  if (error) {
    console.log(error);
    return;
  }
  detections = result;
  faceApi.detect(gotFaces);
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  video = createCapture(VIDEO, { flipped: true });
  video.size(width, height);
  video.hide();
  tracker = new FaceTracker(video);

  // Start detecting faces and pass results to both tracker and gestures
  faceMesh.detectStart(video, (results) => {
    tracker.updateFaces(results);
  });
}

function draw() {
  background(220);
  image(video, 0, 0, width, (width * video.height) / video.width);
  tracker.detect();
  tracker.drawAlerts();
}
