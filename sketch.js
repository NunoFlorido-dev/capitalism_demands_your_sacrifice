class FaceTracker {
  constructor(video, game) {
    this.video = video;
    this.game = game; // Add reference to GameSystem
    this.faces = [];
    this.alertTriggeredOnScreen = false;
    this.alertTriggeredOffScreen = false;
    this.alertOpacity = 0; // Initialize alert opacity

    // Timers
    this.eyesClosedStartTime = null;
    this.faceTurnedStartTime = null;
    this.faceDownStartTime = null;
    this.faceUpStartTime = null;
    this.faceOffScreenStartTime = null;

    // Thresholds
    this.durationThresholdOnScreen = 2000; // 2s
    this.durationThresholdOffScreen = 4000; // 4s
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
          this.game.addScore(2); // Add points for alert
        }
      } else {
        this.eyesClosedStartTime = null;
      }

      // Check if face is turned sideways
      if (this.isFaceLookingSideways(face, box)) {
        if (this.faceTurnedStartTime === null) {
          this.faceTurnedStartTime = millis();
        } else if (
          millis() - this.faceTurnedStartTime >=
          this.durationThresholdOnScreen
        ) {
          this.alertTriggeredOnScreen = "THE WORK IS ON THE COMPUTER, DUMMY!";
          this.game.addScore(2); // Add points for alert
        }
      } else {
        this.faceTurnedStartTime = null;
      }

      // Check if face is looking down
      if (this.isFaceLookingDown(face, box)) {
        if (this.faceDownStartTime === null) {
          this.faceDownStartTime = millis();
        } else if (
          millis() - this.faceDownStartTime >=
          this.durationThresholdOnScreen
        ) {
          this.alertTriggeredOnScreen = "STOP SCROLLING, GET WORKING!";
          this.game.addScore(2); // Add points for alert
        }
      } else {
        this.faceDownStartTime = null;
      }

      // Check if face is looking up
      if (this.isFaceLookingUp(face, box)) {
        if (this.faceUpStartTime === null) {
          this.faceUpStartTime = millis();
        } else if (
          millis() - this.faceUpStartTime >=
          this.durationThresholdOnScreen
        ) {
          this.alertTriggeredOnScreen = "BE FOCUSED AND RETURN TO WORK!";
          this.game.addScore(2); // Add points for alert
        }
      } else {
        this.faceUpStartTime = null;
      }

      // Eye gaze tracking
      this.eyeGazeTracking(face, box);
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
        this.game.addScore(5); // More points for leaving screen
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

  // Getter method to access gaze data
  getGazeData() {
    if (this.gazeX !== undefined && this.gazeY !== undefined) {
      return [this.gazeX, this.gazeY];
    }
    return null;
  }

  eyeGazeTracking(face) {
    let leftPupil = face.keypoints[159];
    let rightPupil = face.keypoints[386];

    if (leftPupil && rightPupil) {
      this.gazeX = (leftPupil.x + rightPupil.x) / 2;
      this.gazeY = (leftPupil.y + rightPupil.y) / 2;

      fill(0, 0, 255);
      circle(this.gazeX, this.gazeY, 20); // Draw gaze location on screen
    } else {
      console.error("Left or right pupil data is missing");
      this.gazeX = null;
      this.gazeY = null;
    }
  }
}

class FollowTheBall {
  constructor(faceTracker) {
    this.faceTracker = faceTracker; // Use the existing face tracker

    this.ballX = width / 2;
    this.ballY = height / 2;
    this.ballColorNormal = color(255, 255, 0);
    this.ballColorAccept = color(0, 255, 0);
    this.ballColor = this.ballColorNormal;

    // Initial noise offset values for X and Y
    this.noiseOffsetX = random(1000);
    this.noiseOffsetY = random(1000);
  }

  moveBall() {
    // Update noise values over time for smooth movement
    this.randomSpdX = noise(this.noiseOffsetX);
    this.randomSpdY = noise(this.noiseOffsetY);

    // Apply the Perlin noise to the ball's position, but with slower movement
    this.ballX += (this.randomSpdX - 0.5) * 2; // Adjust the multiplier for slower movement
    this.ballY += (this.randomSpdY - 0.5) * 2; // Adjust the multiplier for slower movement

    // Increment noise offsets to get continuous movement
    this.noiseOffsetX += 0.01;
    this.noiseOffsetY += 0.01;

    // Constrain ball's position to make sure it stays within the screen bounds
    this.ballX = constrain(this.ballX, 200, width - 200);
    this.ballY = constrain(this.ballY, 250, height - 250);
  }

  drawBall() {
    noStroke();
    if (this.getCircleProximity()) {
      this.ballColor = this.ballColorAccept;
    } else {
      this.ballColor = this.ballColorNormal;
    }
    fill(
      this.ballColor.levels[0],
      this.ballColor.levels[1],
      this.ballColor.levels[2],
      200
    );
    circle(this.ballX, this.ballY, 50);
    noTint();
  }

  // Get the distance between the eye gaze and the ball
  getDistance(x1, y1, x2, y2) {
    return dist(x1, y1, x2, y2);
  }

  getCircleProximity() {
    let gazeData = this.faceTracker.getGazeData(); // Use shared FaceTracker
    if (!gazeData) return false;

    let gazeX = gazeData[0];
    let gazeY = gazeData[1];

    let distance = this.getDistance(this.ballX, this.ballY, gazeX, gazeY);
    console.log("Distance to Ball: ", distance);

    return distance <= 27.5;
  }
}

class GameSystem {
  constructor(ballgame) {
    this.ballgame = ballgame;
    this.level = 1;
    this.score = 0;
    this.maxScore = 100;

    // Get UI elements
    this.scoreBar = document.getElementById("scoreBar");
    this.scoreText = document.getElementById("scoreText");
  }

  addScore(points) {
    this.score = Math.min(this.score + points, this.maxScore);
    this.updateScoreBar();
  }

  resetScore() {
    this.score = 0;
    this.updateScoreBar();
  }

  updateScoreBar() {
    let progress = (this.score / this.maxScore) * 100;
    this.scoreBar.style.width = progress + "%";
    this.scoreText.textContent = `Score: ${this.score} / ${this.maxScore}`;
  }
}

let faceMesh;
let tracker;
let video;
let gestures;
let ballgame;
let game;

function preload() {
  faceMesh = ml5.faceMesh({
    maxFaces: 1,
    refineLandmarks: false,
    flipped: true,
  });
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  video = createCapture(VIDEO, { flipped: true });
  video.size(width, height);
  video.hide();

  game = new GameSystem(); // Create game instance
  tracker = new FaceTracker(video, game); // Pass game to tracker
  ballgame = new FollowTheBall(tracker);

  faceMesh.detectStart(video, (results) => {
    tracker.updateFaces(results);
  });
}

function draw() {
  background(220);
  image(video, 0, 0, width, (width * video.height) / video.width);
  tracker.detect();
  tracker.drawAlerts();
  ballgame.moveBall();
  ballgame.drawBall();
}
