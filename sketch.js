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
    this.durationThresholdOnScreen = 3000; // 3s
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
          this.game.addPenaltyAlert(2); // Add points for alert
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
          this.game.addPenaltyAlert(2); // Add points for alert
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
          this.game.addPenaltyAlert(2); // Add points for alert
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
          this.game.addPenaltyAlert(2); // Add points for alert
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
        this.game.addPenaltyAlert(4); // More points for leaving screen
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

/* **************************************************************************************** */

class FollowTheBall {
  constructor(faceTracker, game) {
    this.faceTracker = faceTracker; // Use the existing face tracker
    this.game = game;

    this.ballX = width / 2;
    this.ballY = height / 2;
    this.ballColorNormal = color(255, 255, 0);
    this.ballColorAccept = color(0, 255, 0);
    this.ballColor = this.ballColorNormal;

    // Initial noise offset values for X and Y
    this.noiseOffsetX = random(1000);
    this.noiseOffsetY = random(1000);

    this.moneyBatch = select("#money_batch"); // Select the image
    if (this.moneyBatch) {
      this.moneyBatch.style("position", "absolute");
    }
  }

  moveBall() {
    // Update noise values over time for smooth movement
    this.randomSpdX = noise(this.noiseOffsetX);
    this.randomSpdY = noise(this.noiseOffsetY);

    // Apply the Perlin noise to the ball's position, but with slower movement
    this.ballX += (this.randomSpdX - 0.5) * 2 * this.game.ballSpeedMultiplier; // Adjust the multiplier for speed
    this.ballY += (this.randomSpdY - 0.5) * 2 * this.game.ballSpeedMultiplier; // Adjust the multiplier for speed

    // Increment noise offsets to get continuous movement
    this.noiseOffsetX += 0.01;
    this.noiseOffsetY += 0.01;

    // Constrain ball's position to make sure it stays within the screen bounds
    this.ballX = constrain(this.ballX, 200, width - 200);
    this.ballY = constrain(this.ballY, 250, height - 250);
  }

  drawBall() {
    if (this.getCircleProximity()) {
      this.moneyBatch.style("filter", "none");
    } else {
      this.moneyBatch.style(
        "filter",
        "hue-rotate(-60deg) saturate(3) brightness(1)"
      );
    }
    if (this.moneyBatch) {
      this.moneyBatch.style("left", this.ballX + "px");
      this.moneyBatch.style("top", this.ballY + "px");
      this.moneyBatch.style("transform", "translate(-50%, -50%)");
    }
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

    return distance <= 40;
  }

  playBall() {
    this.moveBall();
    this.drawBall();

    if (!this.getCircleProximity()) {
      this.game.addPenaltyGame(3);
    }
  }
}

class SayTheWords {
  constructor(soundClassifier, game) {
    this.soundClassifier = soundClassifier;
    this.game = game;

    this.wordContainer = document.createElement("div");
    this.wordContainer.id = "word_container";

    this.wordDisplay = document.createElement("p");
    this.wordDisplay.id = "word_display";

    document.body.appendChild(this.wordContainer);
    this.wordContainer.appendChild(this.wordDisplay);

    this.wordArray = [
      "Boss",
      "Work",
      "Coworker",
      "Shareholder",
      "Profit",
      "Company",
      "BABJEEBZIGUAAA",
      "DORRREEEEPSIAA",
      "GUPTLOOOOTZAA",
      "CRRPSOOOBCHIA",
    ];

    this.currentWord = "";
    this.wordTimeout = null;
    this.listenTimeout = null;
    this.waitTime = 4000; // 4 sec before showing a new word
    this.listenTime = 2000; // 2 sec to say the word
    this.isListening = false;
  }

  /** Starts the loop to show words based on timers */
  startWordChallenge() {
    this.scheduleNextWord();
  }

  /** Schedules the next word after waitTime */
  scheduleNextWord() {
    clearTimeout(this.wordTimeout);
    this.wordTimeout = setTimeout(() => this.pickRandomWord(), this.waitTime);
  }

  /** Picks and displays a new word */
  pickRandomWord() {
    let wordsToUse =
      this.game.level === 5
        ? this.wordArray.slice(-4)
        : this.wordArray.slice(0, -4);

    let newWord;

    do {
      newWord = wordsToUse[Math.floor(Math.random() * wordsToUse.length)];
    } while (newWord === this.currentWord); // Keep choosing until it's different

    this.currentWord = newWord;
    this.wordDisplay.textContent = this.currentWord;
    this.wordDisplay.style.color = "#f0d946";
    this.isListening = true;

    // Start listen timer
    clearTimeout(this.listenTimeout);
    this.listenTimeout = setTimeout(
      () => this.evaluateWord(false),
      this.listenTime
    );
  }

  evaluateWord(correct) {
    this.isListening = false;

    if (correct) {
      clearTimeout(this.listenTimeout); // Prevents late penalty!
      this.wordDisplay.style.color = "#15eb4e";
    } else {
      this.wordDisplay.style.color = "#ed221f";
      this.game.addPenaltyGame(5); // Deduct points for wrong answer
    }

    this.scheduleNextWord();
  }

  /** Checks if the predicted word is correct */
  displayWord(predictedWord) {
    if (
      this.isListening &&
      predictedWord.toLowerCase().trim() ===
        this.currentWord.toLowerCase().trim()
    ) {
      this.evaluateWord(true);
    }
  }
}

/* **************************************************************************************** */

class TrashTheMails {
  constructor(game) {
    this.game = game;

    this.mail = select("#email");
    this.flag = select("#white_flag");
    this.outbox = select("#outbox_tray");
    this.trash = select("#waste_basket");

    this.item = this.mail;
    this.interval = null;

    this.initDrag();
  }

  // Initialize drag events for both mail and flag
  initDrag() {
    [this.mail, this.flag].forEach((obj) => {
      obj.mousePressed((e) => this.startDrag(e, obj));
      obj.mouseReleased(() => this.stopDrag());
    });

    // Listen for global mouse movement
    document.addEventListener("mousemove", (e) => this.drag(e));
  }

  startDrag(event, obj) {
    this.dragging = true;
    this.item = obj;
    this.offsetX = event.clientX - this.item.position().x;
    this.offsetY = event.clientY - this.item.position().y;
  }

  stopDrag() {
    this.dragging = false;
  }

  drag(event) {
    if (this.dragging) {
      this.item.style("left", `${event.clientX - this.offsetX}px`);
      this.item.style("top", `${event.clientY - this.offsetY}px`);
    }
  }

  // Function to position the objects randomly
  setRandomPositions() {
    const objects = [this.item, this.outbox, this.trash];
    const positions = [];
    const minDistance = 100;

    function getRandomPosition() {
      return {
        x: Math.random() * (window.innerWidth - 150),
        y: Math.random() * (window.innerHeight - 150),
      };
    }

    function isFarEnough(pos) {
      return positions.every(
        (p) => Math.hypot(pos.x - p.x, pos.y - p.y) > minDistance
      );
    }

    objects.forEach((obj) => {
      let pos;
      do {
        pos = getRandomPosition();
      } while (!isFarEnough(pos));
      positions.push(pos);
      this.positionElements(obj, pos.x, pos.y);
    });
  }

  // Position the element based on the calculated X, Y coordinates
  positionElements(element, x, y) {
    element.style("position", "absolute");
    element.style("left", `${x}px`);
    element.style("top", `${y}px`);
  }

  // Function to randomly choose mail or flag
  chooseRandomItem() {
    if (Math.random() < 0.5) {
      this.item = this.mail;
      this.mail.style("display", "block");
      this.flag.style("display", "none");
    } else {
      this.item = this.flag;
      this.flag.style("display", "block");
      this.mail.style("display", "none");
    }
  }

  // Timer function that resets and includes the penalty
  timer() {
    this.setRandomPositions();
    if (this.interval) clearInterval(this.interval);

    // Add penalty when the timer restarts
    this.game.addPenaltyGame(5); // Penalty is applied every time the challenge resets

    this.interval = setInterval(() => {
      this.chooseRandomItem();
      this.setRandomPositions();

      // Add penalty on every timer reset (can adjust this logic if necessary)
      this.game.addPenaltyGame(5); // Apply penalty for each reset (optional)
    }, 5000); // Reposition every 5 seconds
  }

  playChallenge() {
    this.timer();
  }
}

/* **************************************************************************************** */

class GameSystem {
  constructor() {
    this.level = 1;
    this.score = 0;
    this.maxScore = 100;
    this.lastPenaltyTime = 0;

    // Penalty Time
    this.penaltyTimeAlert = 1000;
    this.penaltyTimeGame = 4000;

    // Alert opacity for red screen
    this.alertOpacity = 0;
    this.alertFlashDuration = 500;
    this.alertFlashStartTime = null;

    // Level and timer properties
    this.levelStartTime = millis(); // Start the timer for level 1
    this.levelDuration = 30000; // 30 seconds per level
    this.levelEndTime = this.levelStartTime + this.levelDuration; // End time for the current level

    // Get UI elements
    this.scoreBar = document.getElementById("scoreBar");
    this.scoreText = document.getElementById("scoreText");

    // HTML elements for level and timer
    this.levelDisplay = document.getElementById("levelDisplay");
    this.timerDisplay = document.getElementById("timerDisplay");

    // Ball speed modifier based on level
    this.ballSpeedMultiplier = 1;
  }

  update() {
    let currentTime = millis();

    // Check if it's time to move to the next level
    if (currentTime >= this.levelEndTime) {
      this.level++;
      if (this.level > 5) {
        this.level = 1; // Reset to level 1 after level 5
      }
      this.levelStartTime = currentTime;
      this.levelEndTime = this.levelStartTime + this.levelDuration; // Reset the level end time

      // Update the ball speed multiplier based on the level
      if (this.level === 1) {
        this.ballSpeedMultiplier = 1;
      } else if (this.level === 2) {
        wordgame.startWordChallenge();
      } else if (this.level === 3) {
        this.ballSpeedMultiplier = 10;
      } else if (this.level === 5) {
        this.ballSpeedMultiplier = 20;
      }
    }
  }

  addPenaltyAlert(points) {
    let currentTime = millis();

    if (currentTime - this.lastPenaltyTime >= this.penaltyTimeAlert) {
      this.score = Math.min(this.score + points, this.maxScore);
      this.lastPenaltyTime = currentTime;
      this.updateScoreBar();

      // Trigger the red screen alert for penalty
      this.triggerRedAlert();
    }
  }

  addPenaltyGame(points) {
    let currentTime = millis();

    if (currentTime - this.lastPenaltyTime >= this.penaltyTimeGame) {
      this.score = Math.min(this.score + points, this.maxScore);
      this.lastPenaltyTime = currentTime;
      this.updateScoreBar();

      // Trigger the red screen alert for penalty
      this.triggerRedAlert();
    }
  }

  triggerRedAlert() {
    this.alertOpacity = lerp(this.alertOpacity, 255, 0.5);
  }

  resetScore() {
    this.score = 0;
    this.updateScoreBar();
  }

  updateScoreBar() {
    let progress = (this.score / this.maxScore) * 100;
    this.scoreBar.style.width = progress + "%";
    this.scoreText.textContent = `${this.score}% of ${this.maxScore}% unemployed`;
  }

  drawAlerts() {
    // Drawing the red alert screen logic
    if (
      this.alertFlashStartTime !== null &&
      millis() - this.alertFlashStartTime <= this.alertFlashDuration
    ) {
      fill(255, 0, 0, this.alertOpacity);
      rect(0, 0, width, height);
    } else if (this.alertOpacity > 1) {
      this.alertOpacity = lerp(this.alertOpacity, 0, 0.1);
      fill(255, 0, 0, this.alertOpacity);
      rect(0, 0, width, height);
    }
  }

  // Display level and timer on the screen
  drawLevelAndTimer() {
    let remainingTime = Math.max(0, this.levelEndTime - millis());
    let remainingSeconds = Math.ceil(remainingTime / 1000); // Convert milliseconds to seconds

    // Update HTML elements with level and timer info
    this.levelDisplay.textContent = `Shift: ${this.level}`;
    this.timerDisplay.textContent = `Time Left: ${remainingSeconds}s`;
  }
}

/* **************************************************************************************** */

let faceMesh;

let classifier;
let predictedWord = "";

let tracker;
let video;
let gestures;
let ballgame;
let wordgame;
let mailgame;
let game;

function preload() {
  faceMesh = ml5.faceMesh({
    maxFaces: 1,
    refineLandmarks: false,
    flipped: true,
  });

  let soundOptions = { probabilityThreshold: 0, overlapFactor: 0.5 };
  classifier = ml5.soundClassifier(
    "https://teachablemachine.withgoogle.com/models/bE_DNF6Y3/",
    soundOptions
  );
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  video = createCapture(VIDEO, { flipped: true });
  video.size(width, height);
  video.hide();

  game = new GameSystem();
  tracker = new FaceTracker(video, game);
  ballgame = new FollowTheBall(tracker, game);
  wordgame = new SayTheWords(classifier, game);
  mailgame = new TrashTheMails(game);

  faceMesh.detectStart(video, (results) => {
    tracker.updateFaces(results);
  });

  classifier.classifyStart(gotResult);

  mailgame.playChallenge();
}

// A function to run when we get any errors and the results
function gotResult(results) {
  // The results are in an array ordered by confidence
  console.log(results);

  predictedWord = results[0].label;
}

function draw() {
  background(220);
  image(video, 0, 0, width, (width * video.height) / video.width);

  game.update();
  tracker.detect();
  tracker.drawAlerts();
  game.drawAlerts();
  ballgame.playBall();
  wordgame.displayWord(predictedWord);
  game.drawLevelAndTimer();
}
