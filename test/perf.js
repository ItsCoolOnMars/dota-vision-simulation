const fs = require('fs');
let output = '';

function log(message) {
  output += message + '\n';
  console.log(message);
}

// Add initial logging to see if script starts
log('Starting performance test...');

try {
  var VisionSimulation = require("../src/vision-simulation.js");
  log('Successfully imported VisionSimulation module');
  
  var worlddata = require("../src/worlddata.json");
  log('Successfully imported worlddata');

  var start = Date.now();
  log('Initializing simulation...');
  
  // Add a timeout to detect stalled initialization
  var initTimeoutId = setTimeout(() => {
    log('Warning: VisionSimulation initialization may have stalled...');
  }, 10000);
  
  // Fix: Use the correct initialization pattern
  var vs = new VisionSimulation(worlddata);
  vs.initialize('./www/map_data.png', function (err) {
    // Clear the timeout since initialization completed
    clearTimeout(initTimeoutId);
    
    if (err) {
      log('Error during simulation initialization: ' + err);
      return;
    }
    log('load time ' + (Date.now() - start) + 'ms');
    var total = 0;
    try {
      for (var i = 0; i < 10; i++) {
        var c = profile();
        log('run ' + i + ' ' + c + 'ms');
        total += c
      }
      log('average run ' + (total/10) + 'ms');
    } catch (err) {
      log('Error during profile runs: ' + err.message);
      log(err.stack);
    }
  });

  function profile() {
    var t1 = Date.now();
    for (var i = 0; i < vs.gridWidth; i+=20) {
      for (var j = 0; j < vs.gridHeight; j+=20) {
        vs.updateVisibility(i, j);
      }
    }
    var t2 = Date.now()
    return t2 - t1;
  }
} catch (err) {
  log('Error in main script execution: ' + err.message);
  log(err.stack);
}

// Ensure output is written even if process exits prematurely
process.on('exit', () => {
  log('Process exiting, writing log file...');
  fs.writeFileSync('perf.log', output);
});

// Also handle other termination signals
['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach(signal => {
  process.on(signal, () => {
    log(`Received ${signal}, writing log file and exiting...`);
    fs.writeFileSync('perf.log', output);
    process.exit();
  });
});
