// Policy visualization (Option 5: Action Preference Arrows / Glyphs)
// Renders a 2D map of diffY vs speedY; each aggregated state bucket shows a glyph
// colored by argmax action (Jump/Stay) with size proportional to |Q_jump - Q_stay|.
// X-axis: diffY (how far from ideal center). Y-axis: speedY (vertical velocity)
// Bucketing compresses continuous values so we don't draw too many glyphs.

(function(){
  var canvas = document.getElementById('policyMap');
  if(!canvas) return; // page not loaded yet
  var ctx = canvas.getContext('2d');
  var auto = true;
  var lastDrawnCount = 0;
  var FRAME_INTERVAL = 30; // frames between auto redraws
  var frameCounter = 0;

  // Public toggles
  window.togglePolicyAuto = function(){
    auto = !auto;
    var btn = document.getElementById('togglePolicyAutoBtn');
    if(btn){
      btn.setAttribute('aria-pressed', auto ? 'true' : 'false');
      btn.innerText = auto ? 'Auto On' : 'Auto Off';
    }
  };
  window.updatePolicyMap = function(force){
    drawPolicy(force);
  };

  // Hook into main loop by wrapping existing loop or using requestAnimationFrame
  // We'll piggy-back on setInterval: add a small ticker.
  var origLoop = window.loop;
  if(typeof origLoop === 'function'){
    window.loop = function(){
      origLoop();
      if(auto){
        frameCounter++;
        if(frameCounter % FRAME_INTERVAL === 0){
          drawPolicy(false);
        }
      }
    };
  }

  function drawPolicy(force){
    if(!ctx) return;
    var keys = Object.keys(Q_table || {});
    var emptyEl = document.getElementById('policyMapEmpty');
    if(keys.length < 15){
      if(emptyEl) emptyEl.style.display = 'flex';
      ctx.clearRect(0,0,canvas.width, canvas.height);
      return;
    } else if(emptyEl) {
      emptyEl.style.display = 'none';
    }
    // Avoid re-draw if no growth and not forced
    if(!force && keys.length === lastDrawnCount) return;
    lastDrawnCount = keys.length;

    // Parse states and aggregate
    // Key structure: diffY,speedY,tubeX,action
    var buckets = {}; // bucketKey -> {diffY,speedY,count, qJump, qStay}
    var maxGap = 0;

    for(var i=0;i<keys.length;i++){
      var parts = keys[i].split(',');
      if(parts.length !== 4) continue;
      var diffY = parseInt(parts[0],10);
      var speedY = parseInt(parts[1],10);
      var tubeX = parseInt(parts[2],10);
      var action = parseInt(parts[3],10);
      // Only consider tubeX close to bird when decisions happen most (optional filter)
      if(tubeX > 28) continue; // we act when tube near
      // Bucket resolutions
      var bDiffY = Math.round(diffY / 3) * 3; // collapse into steps of 3 px
      var bSpeedY = Math.round(speedY / 20) * 20; // since speed was scaled *100
      var bKey = bDiffY + '|' + bSpeedY;
      var rec = buckets[bKey];
      if(!rec){
        rec = buckets[bKey] = {diffY:bDiffY, speedY:bSpeedY, qJump:0, qStay:0, hasJump:false, hasStay:false};
      }
      var qVal = Q_table[keys[i]];
      if(action === actionSet.JUMP){
        rec.qJump += qVal; rec.hasJump=true;
      } else if(action === actionSet.STAY){
        rec.qStay += qVal; rec.hasStay=true;
      }
    }

    // Determine value ranges
    var items = Object.values(buckets);
    if(!items.length){
      ctx.clearRect(0,0,canvas.width, canvas.height);
      if(emptyEl) emptyEl.style.display = 'flex';
      return;
    }
    items.forEach(function(it){
      var gap = Math.abs(it.qJump - it.qStay);
      if(gap > maxGap) maxGap = gap;
    });

    // Define scales: map diffY to X, speedY to Y
    // diffY can vary widely; compute min/max
    var minDiffY = Infinity, maxDiffY = -Infinity;
    var minSpeedY = Infinity, maxSpeedY = -Infinity;
    items.forEach(function(it){
      if(it.diffY < minDiffY) minDiffY = it.diffY;
      if(it.diffY > maxDiffY) maxDiffY = it.diffY;
      if(it.speedY < minSpeedY) minSpeedY = it.speedY;
      if(it.speedY > maxSpeedY) maxSpeedY = it.speedY;
    });
    if(minDiffY === maxDiffY) { minDiffY -= 1; maxDiffY += 1; }
    if(minSpeedY === maxSpeedY) { minSpeedY -= 1; maxSpeedY += 1; }

    function xScale(v){ return ( (v - minDiffY) / (maxDiffY - minDiffY) ) * (canvas.width - 40) + 30; }
    function yScale(v){ return canvas.height - ( (v - minSpeedY) / (maxSpeedY - minSpeedY) ) * (canvas.height - 40) - 30; }

    ctx.clearRect(0,0,canvas.width, canvas.height);
    ctx.font = '10px sans-serif';
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#444';

    // Grid lines
    ctx.save();
    ctx.globalAlpha = 0.25;
    for(var gx=0; gx<=5; gx++){
      var xv = minDiffY + (gx/5)*(maxDiffY-minDiffY);
      var x = xScale(xv);
      ctx.beginPath(); ctx.moveTo(x,10); ctx.lineTo(x,canvas.height-10); ctx.stroke();
    }
    for(var gy=0; gy<=5; gy++){
      var yv = minSpeedY + (gy/5)*(maxSpeedY-minSpeedY);
      var y = yScale(yv);
      ctx.beginPath(); ctx.moveTo(10,y); ctx.lineTo(canvas.width-10,y); ctx.stroke();
    }
    ctx.restore();

    // Axes
    ctx.strokeStyle = '#666';
    ctx.beginPath(); ctx.moveTo(20,10); ctx.lineTo(20,canvas.height-20); ctx.lineTo(canvas.width-10,canvas.height-20); ctx.stroke();
    ctx.fillStyle = '#888';
    ctx.fillText('diffY', canvas.width/2 - 12, canvas.height-6);
    ctx.save();
    ctx.translate(8, canvas.height/2 + 20);
    ctx.rotate(-Math.PI/2);
    ctx.fillText('speedY',0,0);
    ctx.restore();

    // Draw glyphs
    items.forEach(function(it){
      var x = xScale(it.diffY);
      var y = yScale(it.speedY);
      var gap = Math.abs(it.qJump - it.qStay) || 0.01;
      var size = 4 + (maxGap ? (gap / maxGap) * 10 : 0); // radius
      var action = it.qJump > it.qStay ? 'jump' : 'stay';
      var color = action === 'jump' ? '#ff3161' : '#2dd6a7';
      ctx.save();
      ctx.translate(x,y);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(0,0,size,0,Math.PI*2);
      ctx.fill();
      // orientation arrow: upward triangle for jump, downward for stay
      ctx.globalAlpha = 1;
      ctx.beginPath();
      if(action==='jump'){
        ctx.moveTo(0,-size*0.7); ctx.lineTo(size*0.6,size*0.5); ctx.lineTo(-size*0.6,size*0.5);
      } else {
        ctx.moveTo(0,size*0.7); ctx.lineTo(size*0.6,-size*0.5); ctx.lineTo(-size*0.6,-size*0.5);
      }
      ctx.closePath();
      ctx.fillStyle = '#111';
      ctx.fill();
      ctx.restore();
    });
  }

  // Initial deferred draw
  setTimeout(function(){ drawPolicy(true); }, 1000);
})();
