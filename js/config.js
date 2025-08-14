/**
 * The script just contains handlers for making the game configurable. Nothing of much interest here ^__^
 * 
 * Author @nellex
 */

var isEnvironmentStatic = true;
var displayTarget = false;

function gameSpeedChange(curSpeed) {
    clearInterval(eventLoop);
    // Map slider (0-100) to interval and steps per frame
    // Keep a minimum interval to avoid blocking UI, increase stepsPerFrame for training throughput
    var speed = parseInt(curSpeed,10);
    var minInterval = 16; // ~60fps
    var baseInterval = 100 - speed; // original behavior
    var interval = Math.max(minInterval, baseInterval);
    // Steps per frame grows when speed near max
    // At speed 40 (default), stepsPerFrame ~1
    // At speed 100 (max slider value) stepsPerFrame ~ (1 +  (speed-40)/4 ) => ~16 (capped)
    var extra = Math.max(0, speed - 40);
    stepsPerFrame = 1 + Math.floor(extra / 4);
    if (stepsPerFrame > 20) stepsPerFrame = 20; // safety cap
    eventLoop = setInterval(loop, interval);
}

function toggleDisplayTarget(showTarget) {
    if (showTarget == "Yes") {
        displayTarget = true;
    } else {
        displayTarget = false;
    }
}

function environmentChange(curEnv) {
    if (curEnv == "Static") {
        isEnvironmentStatic = true;
    } else {
        isEnvironmentStatic = false;
    }
}

function saveModel() {
    window.localStorage.setItem("flappybird-qtable", JSON.stringify(Q_table));
    alert("Model was saved successfully!");
}

function loadModel() {
    if (window.localStorage.getItem("flappybird-qtable") != null) {
        Q_table = JSON.parse(window.localStorage.getItem("flappybird-qtable"));
        alert("Model was loaded successfully!");
    } else {
        alert("No saved model found in local storage");
    }
}

var getJSON = function(url) {
  return new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open('get', url, true);
    xhr.responseType = 'json';
    xhr.onload = function() {
      var status = xhr.status;
      if (status == 200) {
        resolve(xhr.response);
      } else {
        reject(status);
      }
    };
    xhr.send();
  });
};

function loadPreModel() {
    var href = window.location.href;
    var host = href.substring(0, href.lastIndexOf('/'));
    getJSON(host + "/model/qtable-x3-y6.json").then(function(data) {
        Q_table = eval(data);
        alert("Model loaded successfully!");
    }, function(status) {
    alert("Failure in loading pre-trained model");
    });
}