class FaceTracker {
  constructor(video, game, beep) {
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
    this.durationThresholdOnScreen = 1000; // 1.5s
    this.durationThresholdOffScreen = 4000; // 4s

    this.beep = beep;
    this.isBeeping = false; // Track if beep is playing
    this.isAlerting = false; // Track if alertChallenge is active

    this.hand = document.getElementById("hand");
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

      /*
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

      */

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
          if (this.alertTriggeredOnScreen) {
            this.startAlerting("OPEN YOUR EYES!");
          }
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
          if (this.alertTriggeredOnScreen) {
            this.startAlerting("LOOK AT THE SCREEN!");
          }
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
          if (this.alertTriggeredOnScreen) {
            this.startAlerting("STOP LOOKING AT THE PHONE!");
          }
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
          if (this.alertTriggeredOnScreen) {
            this.startAlerting("LOOK AT THE SCREEN!");
          }
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
        if (this.alertTriggeredOffScreen) {
          this.startAlerting("DON'T LEAVE YOUR COMPUTER WHILE WORKING!");
        }
      }
    }

    let oscillatingOpacity = sin(millis() / 200) * 100 + 100;

    if (this.alertTriggeredOnScreen || this.alertTriggeredOffScreen) {
      this.alertOpacity = lerp(this.alertOpacity, oscillatingOpacity, 0.1);
      this.startBeeping();
    } else {
      this.alertOpacity = lerp(this.alertOpacity, 0, 0.1);
      this.stopBeeping();
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

      this.trueGazeX = this.gazeX - 40;
      this.trueGazeY = this.gazeY - 40;

      if (this.hand) {
        this.hand.style.left = `${this.trueGazeX}px`;
        this.hand.style.top = `${this.trueGazeY}px`;
      }
    } else {
      console.error("Left or right pupil data is missing");
      this.gazeX = null;
      this.gazeY = null;
    }
  }

  startBeeping() {
    if (!this.isBeeping) {
      this.isBeeping = true;
      this.beep.play();
    }
  }

  stopBeeping() {
    if (this.isBeeping) {
      this.isBeeping = false;
      this.beep.stop();
    }
  }

  startAlerting(word) {
    if (!this.isAlerting) {
      this.isAlerting = true;
      alertChallenge(word);
    }
  }

  stopAlerting(word) {
    if (this.isAlerting) {
      this.isAlerting = false;
    }
  }
}

/* **************************************************************************************** */

class FollowTheBall {
  constructor(faceTracker, game) {
    this.faceTracker = faceTracker; // Use shared FaceTracker
    this.game = game;

    this.ballX = window.innerWidth / 2;
    this.ballY = window.innerHeight / 2;
    this.ballColorNormal = "yellow";
    this.ballColorAccept = "green";
    this.ballColor = this.ballColorNormal;

    this.ballSize = 200; // Start big
    this.minBallSize = 10; // Smallest size
    this.shrinkRate = 50; // Decrease size every 30 sec

    this.noiseOffsetX = Math.random() * 1000;
    this.noiseOffsetY = Math.random() * 1000;

    this.moneyBatch = document.querySelector("#money_batch"); // Select the image
    if (this.moneyBatch) {
      this.moneyBatch.style.position = "absolute";
    }

    this.handImage = document.querySelector("#hand img"); // Get the hand image element

    // Example: Call alertChallenge when a new challenge begins
    setTimeout(() => {
      alertChallenge("Follow the money with your head's hand!");
    }, 2000);

    this.startTime = Date.now(); // Store the current time when the game starts
    this.penaltyDelay = 5000; // 5 seconds delay for starting penalties
  }

  updateBallSpeed() {
    let seconds = this.game.getTimeInSeconds();
    if (seconds < 30) {
      this.ballSpeedMultiplier = 1;
    } else if (seconds < 60) {
      this.ballSpeedMultiplier = 1.5;
    } else if (seconds < 90) {
      this.ballSpeedMultiplier = 2;
    } else {
      this.ballSpeedMultiplier = 3; // Fastest mode
    }
  }

  updateBallSize() {
    let seconds = this.game.getTimeInSeconds();

    // Shrink the ball every 60 seconds
    let shrinkStep = Math.floor(seconds / 60);
    this.ballSize = Math.max(
      200 - shrinkStep * this.shrinkRate,
      this.minBallSize
    );
  }

  moveBall() {
    this.updateBallSpeed();
    this.updateBallSize();

    let randomSpdX =
      (noise(this.noiseOffsetX) - 0.5) * 2 * this.ballSpeedMultiplier;
    let randomSpdY =
      (noise(this.noiseOffsetY) - 0.5) * 2 * this.ballSpeedMultiplier;

    this.ballX += randomSpdX;
    this.ballY += randomSpdY;

    this.noiseOffsetX += 0.01;
    this.noiseOffsetY += 0.01;

    this.ballX = Math.max(200, Math.min(this.ballX, window.innerWidth - 200));
    this.ballY = Math.max(250, Math.min(this.ballY, window.innerHeight - 250));
  }

  drawBall() {
    if (this.getCircleProximity()) {
      this.moneyBatch.style.filter = "none";
    } else {
      this.moneyBatch.style.filter =
        "hue-rotate(-60deg) saturate(3) brightness(1)";
    }

    if (this.moneyBatch) {
      this.moneyBatch.style.width = `${this.ballSize}px`;
      this.moneyBatch.style.height = `${this.ballSize}px`;
      this.moneyBatch.style.left = `${this.ballX}px`;
      this.moneyBatch.style.top = `${this.ballY}px`;
      this.moneyBatch.style.transform = "translate(-50%, -50%)";
    }
  }

  getDistance(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
  }

  getCircleProximity() {
    let gazeData = this.faceTracker.getGazeData();
    if (!gazeData) return false;

    let gazeX = gazeData[0];
    let gazeY = gazeData[1];

    let distance = this.getDistance(this.ballX, this.ballY, gazeX, gazeY);
    return distance <= this.ballSize / 2;
  }

  playBall() {
    this.moveBall();
    this.drawBall();

    // Start counting penalties only after the delay
    if (Date.now() - this.startTime >= this.penaltyDelay) {
      let gazeOverBall = this.getCircleProximity();

      if (gazeOverBall) {
        this.handImage.src = "./assets/images/facepunch.webp";
      } else {
        this.handImage.src =
          "./assets/images/raised_hand_with_fingers_splayed.webp";
        this.game.addPenaltyGame(3); // Add penalty if no gaze
      }
    }
  }
}

class SayTheWords {
  constructor(soundClassifier, game, beep) {
    this.soundClassifier = soundClassifier;
    this.game = game;
    this.beep = beep;

    // Main container
    this.wordContainer = document.createElement("div");
    this.wordContainer.id = "word_container";
    this.wordContainer.style.display = "flex";
    this.wordContainer.style.flexDirection = "column";
    this.wordContainer.style.alignItems = "center";
    this.wordContainer.style.justifyContent = "center";
    this.wordContainer.style.position = "absolute";
    this.wordContainer.style.top = "50%";
    this.wordContainer.style.left = "50%";
    this.wordContainer.style.transform = "translate(-50%, -50%)";
    this.wordContainer.style.textAlign = "center";

    // Question text (Fixed position)
    this.questionDisplay = document.createElement("p");
    this.questionDisplay.id = "question_display";
    this.questionDisplay.style.position = "fixed";
    this.questionDisplay.style.color = "#1b6ef5";
    this.questionDisplay.style.margin = "0";
    this.questionDisplay.style.marginBottom = "10%";
    this.questionDisplay.style.fontSize = "2.5rem"; // Slightly smaller for clarity
    this.questionDisplay.style.height = "50px"; // Fixed height to prevent shifting

    // Word text (Will grow dynamically)
    this.wordDisplay = document.createElement("p");
    this.wordDisplay.id = "word_display";
    this.wordDisplay.style.color = "#edde3b";
    this.wordDisplay.style.margin = "10px 0 0 0";
    this.wordDisplay.style.fontSize = "72px";
    this.wordDisplay.style.transition = "font-size 0.1s ease-out"; // Smooth scaling

    // Append elements
    document.body.appendChild(this.wordContainer);
    this.wordContainer.appendChild(this.questionDisplay);
    this.wordContainer.appendChild(this.wordDisplay);

    this.wordArray = [
      "Boss",
      "Work",
      "Coworker",
      "Shareholder",
      "Profit",
      "Company",
    ];

    this.wordQuestions = {
      Boss: "Say who's the best",
      Work: "Say what do we do here",
      Coworker: "Say who do you work with",
      Shareholder: "Say who owns the company",
      Profit: "Say what do we strive for",
      Company: "Say where do you work",
    };

    this.weirdWords = [
      {
        word: "BABJEEBZIGUAAA",
        question: "You won't achieve anything",
      },
      {
        word: "DORRREEEEPSIAA",
        question: "You will never be successful in my company",
      },
      { word: "GUPTLOOOOTZAA", question: "You won't know this one" },
      {
        word: "CRRPSOOOBCHIA",
        question: "You know you will be fired, don't you?",
      },
    ];

    this.currentWord = "";
    this.fontSize = 72;
    this.isListening = false;
    this.wordStartTime = null;
    this.day = 2;
  }

  /** Starts the loop to show words */
  startWordChallenge() {
    this.pickRandomWord();
  }

  pickRandomWord() {
    let newWord;
    if (this.game.getDay() >= 2) {
      this.wordArray = [
        "Boss",
        "Work",
        "Coworker",
        "Shareholder",
        "Profit",
        "Company",
        ...this.weirdWords.map((item) => item.word),
      ];
      const weirdWord =
        this.weirdWords[Math.floor(Math.random() * this.weirdWords.length)];
      newWord = weirdWord.word;
      this.wordQuestions[newWord] = weirdWord.question;
    } else {
      do {
        newWord =
          this.wordArray[Math.floor(Math.random() * this.wordArray.length)];
      } while (newWord === this.currentWord);
    }

    this.currentWord = newWord;
    this.wordDisplay.textContent = this.currentWord;
    this.questionDisplay.textContent = this.wordQuestions[this.currentWord];
    this.wordDisplay.style.color = "#edde3b";
    this.wordDisplay.style.fontSize = "72px";
    this.fontSize = 72;

    this.isListening = true;
    this.wordStartTime = performance.now();
    this.increaseFontSize();
  }

  /** Makes the word bigger the longer it takes */
  increaseFontSize() {
    if (!this.isListening) return;

    let elapsed = performance.now() - this.wordStartTime;
    let maxFontSize = window.innerWidth * 0.8;
    let newSize = 72 + Math.pow(elapsed / 100, 1.5);
    if (newSize > maxFontSize) newSize = maxFontSize;

    this.wordDisplay.style.fontSize = `${newSize}px`;
    requestAnimationFrame(() => this.increaseFontSize());
  }

  /** Checks if the predicted word is correct */
  displayWord(predictedWord) {
    if (
      this.isListening &&
      predictedWord.toLowerCase().trim() ===
        this.currentWord.toLowerCase().trim()
    ) {
      this.isListening = false;
      this.wordDisplay.style.color = "#15eb4e";
      setTimeout(() => this.pickRandomWord(), 1000);
    }
  }
}

/* **************************************************************************************** */

class TrashTheMails {
  constructor(game, beep) {
    this.game = game;
    this.mails = []; // Store multiple mail elements
    this.outbox = document.getElementById("outbox_tray");
    this.draggingMail = null;
    this.timerId = null;
    this.spawnInterval = 5000; // Time before adding a new mail
    this.beep = beep;

    this.outbox.style.display = "block";
    this.outbox.style.left = "89.25%";
    this.outbox.style.top = "1%";
  }

  // Create and add a new mail
  addNewMail() {
    const mail = this.createMailElement();
    this.mails.push(mail);
    this.initDrag(mail);
    this.setRandomPosition(mail);
  }

  // Create mail element dynamically
  createMailElement() {
    const mail = document.createElement("div");
    const img = document.createElement("img");
    img.src = "./assets/images/email.webp";
    img.style.width = "100%";
    img.style.height = "100%";
    img.draggable = false;
    mail.appendChild(img);
    mail.classList.add("mail");
    mail.style.position = "absolute";
    mail.style.width = "80px";
    mail.style.height = "80px";
    mail.style.zIndex = "3";
    mail.style.cursor = "pointer";
    document.body.appendChild(mail);
    return mail;
  }

  // Initialize drag events for each mail
  initDrag(mail) {
    mail.addEventListener("mousedown", (e) => this.startDrag(e, mail));
    document.addEventListener("mouseup", () => this.stopDrag());
    document.addEventListener("mousemove", (e) => this.drag(e));
  }

  startDrag(event, mail) {
    this.draggingMail = mail;
    this.offsetX = event.clientX - mail.getBoundingClientRect().left;
    this.offsetY = event.clientY - mail.getBoundingClientRect().top;
  }

  stopDrag() {
    if (!this.draggingMail) return;

    const itemBounds = this.draggingMail.getBoundingClientRect();
    const outboxBounds = this.outbox.getBoundingClientRect();

    if (this.isOverlapping(itemBounds, outboxBounds)) {
      console.log("Mail added to OUTBOX.");
      this.draggingMail.remove(); // Remove mail from DOM
      this.mails = this.mails.filter((mail) => mail !== this.draggingMail); // Remove from list

      if (this.mails.length === 0) {
        console.log("All mails cleared! Resetting challenge.");
        this.restartChallenge();
      }
    }
    this.draggingMail = null;
  }

  drag(event) {
    if (this.draggingMail) {
      this.draggingMail.style.left = `${event.clientX - this.offsetX}px`;
      this.draggingMail.style.top = `${event.clientY - this.offsetY}px`;
    }
  }

  isOverlapping(rect1, rect2) {
    return !(
      rect1.right < rect2.left ||
      rect1.left > rect2.right ||
      rect1.bottom < rect2.top ||
      rect1.top > rect2.bottom
    );
  }

  setRandomPosition(element) {
    element.style.left = `${Math.random() * (window.innerWidth - 150)}px`;
    element.style.top = `${Math.random() * (window.innerHeight - 150)}px`;
  }

  startMailSpawnTimer() {
    this.timerId = setInterval(() => {
      if (this.mails.length > 0) {
        console.log("Time ran out! Adding a new mail.");
        this.addNewMail();
      }
    }, this.spawnInterval);
  }

  restartChallenge() {
    if (this.timerId) clearInterval(this.timerId);
    this.mails.forEach((mail) => mail.remove());
    this.mails = [];
    this.addNewMail();
    this.startMailSpawnTimer();
  }

  playChallenge() {
    this.restartChallenge();
  }
}

/* **************************************************************************************** */

class GameSystem {
  constructor(beep) {
    this.score = 0;
    this.maxScore = 100;
    this.lastPenaltyTime = 0;

    // Penalty Timing
    this.penaltyTimeAlert = 1000;
    this.penaltyTimeGame = 4000;

    // Alert opacity for red screen
    this.alertOpacity = 0;
    this.alertFlashDuration = 500;
    this.alertFlashStartTime = null;

    // Game Timer
    this.startTime = Date.now(); // Game start time
    this.gameTime = 0; // Tracks elapsed time in milliseconds
    this.baseSpeed = 1; // Base difficulty multiplier

    // Get UI elements
    this.scoreBar = document.getElementById("scoreBar");
    this.scoreText = document.getElementById("scoreText");
    this.timerDisplay = document.getElementById("timerDisplay");
    this.dayDisplay = document.getElementById("dayDisplay");

    // Ball speed modifier
    this.ballSpeedMultiplier = 1;

    this.beep = beep;
  }

  updateTime() {
    this.gameTime = Date.now() - this.startTime;
    this.increaseDifficulty();
  }

  getTimeInSeconds() {
    return Math.floor(this.gameTime / 1000);
  }

  // Dynamically calculate the day based on elapsed game time
  getDay() {
    let seconds = this.getTimeInSeconds();
    return Math.floor(seconds / 60); // 1 "real" minute = 1 full day
  }

  increaseDifficulty() {
    let day = this.getDay(); // Get current game day

    // Difficulty scaling based on time
    if (day === 1) {
      this.baseSpeed = 1.5;
    } else if (day === 2) {
      this.baseSpeed = 2;
    } else if (day >= 3) {
      this.baseSpeed = 3;
    }

    // Prevent redundant challenge restarts
    if (this.getTimeInSeconds() >= 30 && !this.wordChallengeStarted) {
      setTimeout(() => {
        alertChallenge(
          "Watch out for the words! Say them to remove from the screen"
        );
      }, 2000);
      wordgame.startWordChallenge();
      this.wordChallengeStarted = true;
    }

    if (day === 1 && !this.mailChallengeStarted) {
      // Start mailgame on Day 2
      console.log("Starting mail challenge.");
      setTimeout(() => {
        alertChallenge("To remove the mails, drag them to the top right bin");
      }, 2000);
      mailgame.addNewMail(); // Start with one mail
      mailgame.startMailSpawnTimer();
      mailgame.playChallenge();
      this.ballSpeedMultiplier = 10;
      this.mailChallengeStarted = true;
    }

    if (day === 3 && !this.finalDifficultyStarted) {
      this.ballSpeedMultiplier = 20;
      this.finalDifficultyStarted = true;
    }
  }

  update() {
    this.updateTime();
  }

  addPenaltyAlert(points) {
    let currentTime = Date.now();

    if (currentTime - this.lastPenaltyTime >= this.penaltyTimeAlert) {
      this.score = Math.min(this.score + points, this.maxScore);
      this.lastPenaltyTime = currentTime;
      this.updateScoreBar();
      this.triggerRedAlert();
    }
  }

  addPenaltyGame(points) {
    let currentTime = Date.now();

    if (currentTime - this.lastPenaltyTime >= this.penaltyTimeGame) {
      this.score = Math.min(this.score + points, this.maxScore);
      this.lastPenaltyTime = currentTime;
      this.updateScoreBar();
      this.beep.play();
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
    let remainingHeight = 100 - progress;

    this.scoreBar.style.height = remainingHeight + "%";
    this.scoreText.textContent = `${100 - this.score}%`;
  }

  drawAlerts() {
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

  drawTimer() {
    let totalSeconds = Math.ceil(this.getTimeInSeconds());

    // Map 60 seconds to 1 full day
    let days = this.getDay(); // Dynamically calculate day based on time
    let hours = Math.floor((totalSeconds % 60) * (24 / 60)); // Scale seconds to 24-hour range
    let minutes = Math.floor(((totalSeconds % 60) * (24 / 60) - hours) * 60); // Convert remaining fraction to minutes
    // Format the time display
    this.timerDisplay.textContent = `Time Elapsed: ${hours}h ${minutes}m`;

    // Update the day display
    if (this.dayDisplay) {
      this.dayDisplay.textContent = `Day ${days + 1}`; // Day 1 starts at 0 seconds
    }
    // Redirect when score reaches max
    if (this.score >= this.maxScore) {
      setTimeout(() => {
        window.location.href = `gameover.html?days=${days}&hours=${hours}&minutes=${minutes}`; // Redirect to game over page with time
      }, 1000); // Small delay before redirect
    }
  }
}

/* **************************************************************************************** */
function alertChallenge(instruction) {
  pingSound.play();
  const instructionText = document.getElementById("instruction_text");

  // Set instruction text
  instructionText.innerText = instruction;
  instructionText.style.display = "flex";

  // Hide instruction after 5 seconds
  setTimeout(() => {
    instructionText.style.display = "none";
  }, 5000);

  // Start challenge logic here
  console.log("Challenge started!");
}

/* **************************************************************************************** */

let faceMesh;

let classifier;
let predictedWord = "";

let wrongSound;
let pingSound;

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

  wrongSound = loadSound("./assets/sound/buzzer-or-wrong-answer-20582.mp3");
  pingSound = loadSound("./assets/sound/ping-82822.mp3");
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  video = createCapture(VIDEO, { flipped: true });
  video.size(width, height);
  video.hide();

  game = new GameSystem(wrongSound);
  tracker = new FaceTracker(video, game, wrongSound);
  ballgame = new FollowTheBall(tracker, game);
  wordgame = new SayTheWords(classifier, game, wrongSound);
  mailgame = new TrashTheMails(game, wrongSound);

  faceMesh.detectStart(video, (results) => {
    tracker.updateFaces(results);
  });

  classifier.classifyStart(gotResult);
}

// A function to run when we get any errors and the results
function gotResult(results) {
  // The results are in an array ordered by confidence

  predictedWord = results[0].label;
}

function startGame() {
  if (millis() >= 3000) {
    game.update();
  }

  tracker.detect();
  tracker.drawAlerts();
  game.drawAlerts();
  ballgame.playBall();
  wordgame.displayWord(predictedWord);
  game.drawTimer();
}

function draw() {
  background(220);
  video.loadPixels();
  for (let i = 0; i < video.pixels.length; i += 4) {
    let r = video.pixels[i]; // Red channel (assuming grayscale based on red)
    video.pixels[i] = r; // Red
    video.pixels[i + 1] = r; // Green
    video.pixels[i + 2] = r; // Blue
    // Alpha (i+3) remains unchanged
  }
  video.updatePixels();
  image(video, 0, 0, width, (width * video.height) / video.width);

  startGame();
}
