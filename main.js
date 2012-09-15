GLOBAL_AIR_FRICTION = 0.2 // Coeddicient of friction, factor of reduction of speed per second
ACCELERATION_FORCE = 100 // Pixles per second accelerated per second
PLAYER_TURN_SPEED = 3 // Radians turned per second, basically pi but hoping to avoid float arithmatic
NUMBER_OF_STARS = 5000 // Number of stars to simultaniously track
X_BOUNDRY = 5000
Y_BOUNDRY = 5000
DEV_MODE = true // Set true for additional debugging and performance stats

/* A Quick Note Regarding Colission Detection :

I have no idea how to do colission detection, so I'm just running with some ad-hoc
scheme that should work. The idea is that all items that can collide are added
to the itemsToDraw array. On each game tick they'll be checked. Checking is kind of
retarded, each object's colRadius is used to determine a "hit circle". This hit circle
is centered on (obj.xPos, obj.yPos), so make sure objects sorta confrom to that circle.

Any more than you and you're on your own, you poor poor soul.  
*/

function LinearMover() {
  this.xSpeed = 0
  this.ySpeed = 0
  this.xPos = 0
  this.yPos = 0
  this.rotation = 0
  this.rotationalVelocity = 0
  this.colRadius = 0
  this.colType = 'env'

  this.additionalUpdate = function() {}
  this.draw = function() {
    ctx.save()
    ctx.translate(canvas.width/2, canvas.height/2)
    ctx.translate(this.xPos - player.xPos, this.yPos - player.yPos)
    ctx.rotate(this.rotation)

    this.geometryDraw()

    ctx.restore()
  }

  this.update = function() {
    this.additionalUpdate()

    this.xPos += (this.xSpeed * timePassed)
    this.yPos += (this.ySpeed * timePassed)
    this.rotation += (this.rotationalVelocity * timePassed)

  }

  this.collide = function() {
    console.log('Collision detected')
  }
}

function projectile() {
  this.colType = 'projectile'
  this.colRadius = 1

  this.geometryDraw = function() {
    ctx.beginPath()
    ctx.moveTo(-15, 0)
    ctx.lineTo(0, 0)
    ctx.lineWidth = 1
    ctx.strokeStyle = 'yellow'
    ctx.stroke()
  }

  this.collide = function(obj) {
    if (obj.colType == 'projectile') return
    var i = itemsToDraw.lastIndexOf(this)
    itemsToDraw.splice(i, i) 
  }
}
projectile.prototype = new LinearMover()
 

function enemyFighter() {
  this.colRadius = 15
  this.colType = 'ship'
  this.totalSpeed = 100

  this.additionalUpdate = function() {
    // Point the fighter at the player
    // Find the cartesian distance
    var deltaX = player.xPos - this.xPos
    var deltaY = player.yPos - this.yPos

    this.rotation = Math.atan2(deltaY, deltaX)
    this.xSpeed = Math.cos(this.rotation) * this.totalSpeed
    this.ySpeed = Math.sin(this.rotation) * this.totalSpeed
  }

  this.geometryDraw = function() {
    ctx.beginPath()
    ctx.moveTo(15, 0)
    ctx.lineTo(-15, 10)
    ctx.lineTo(-10, 0)
    ctx.lineTo(-15, -10)
    ctx.lineTo(15, 0)
    ctx.lineWidth = 1
    ctx.strokeStyle = 'red'
    ctx.stroke()
  }

  this.collide = function(target) {
    this.explosionStartTime = new Date()
    this.explosionRadius = 0
    this.maxExplosionRadius = 80
    this.explosionTime = 600
    this.colRadius = -canvas.width
    this.xSpeed = 0
    this.ySpeed = 0

    this.additionalUpdate = function() {
      var percentComplete = (new Date().getTime() - this.explosionStartTime.getTime()) / this.explosionTime
      if (percentComplete > 1) {
        itemsToDraw.splice(itemsToDraw.lastIndexOf(this), itemsToDraw.lastIndexOf(this)) 
      }
      this.explosionRadius = this.maxExplosionRadius * percentComplete
    }
    this.geometryDraw = function() {
      ctx.beginPath()
      ctx.arc(0, 0, this.explosionRadius, 0, 2*Math.PI, 1)
      ctx.lineWidth = 1
      ctx.strokeStyle = "red"
      ctx.stroke()
    }
  }
}
enemyFighter.prototype = new LinearMover()

function SquareDroid() {
  this.xSpeed = 20
  this.ySpeed = 20
  this.colRadius = 30
  this.rotationalVelocity = 2

  this.geometryDraw = function() {
    // Do the actual drawing
    ctx.beginPath()
    ctx.moveTo(-25, -25)
    ctx.lineTo(25, -25)
    ctx.lineTo(25, 25)
    ctx.lineTo(-25, 25)
    ctx.lineTo(-25, -25)
    ctx.lineWidth = 1
    ctx.strokeStyle = 'white'
    ctx.stroke()
  }
}
SquareDroid.prototype = new LinearMover()

 
function Player() {
  this.xSpeed = 0
  this.ySpeed = 0
  this.accelerating = false;
  this.xPos = 150
  this.yPos = 150
  this.rotation = 0
  this.rotationalVelocity = 0
  this.colRadius = 15
  this.colType = 'player'
  this.health = 10

  this.shoot = function() {
    var shot = new projectile()
    shot.rotation = this.rotation
    var cos = Math.cos(shot.rotation)
    var sin = Math.sin(shot.rotation)
    shot.xPos = this.xPos + ((this.colRadius + 5) * cos) + (this.xSpeed * timePassed)
    shot.yPos = this.yPos + ((this.colRadius + 5) * sin) + (this.ySpeed * timePassed)
    shot.xSpeed = 500 * cos
    shot.ySpeed = 500 * sin
    itemsToDraw.push(shot)
  }

  this.update = function() {
    // Adjust our location
    this.xPos += (this.xSpeed * timePassed)
    this.yPos += (this.ySpeed * timePassed)
    this.rotation += (this.rotationalVelocity * timePassed)

    // Adjust for acceleration
    if (this.accelerating) {
      this.xSpeed += Math.cos(this.rotation) * ACCELERATION_FORCE * timePassed
      this.ySpeed += Math.sin(this.rotation) * ACCELERATION_FORCE * timePassed
    }

    // Adjust our speed for air friction
    this.xSpeed -= this.xSpeed * GLOBAL_AIR_FRICTION * timePassed
    this.ySpeed -= this.ySpeed * GLOBAL_AIR_FRICTION * timePassed
  }

  this.draw = function() {
    // Save this because shit is about to get messy
    ctx.save()
    // Move to top left of where we want to draw
    ctx.translate(canvas.width/2, canvas.height/2)
    // Rotate our whole coord system
    ctx.rotate(this.rotation)

    // Let's try something different
    ctx.beginPath()
    ctx.moveTo(15, 0)
    ctx.lineTo(-15, 10)
    ctx.lineTo(-10, 0)
    ctx.lineTo(-15, -10)
    ctx.lineTo(15, 0)
    ctx.lineWidth = 1
    ctx.strokeStyle = 'blue'
    ctx.stroke()

    ctx.restore()

    if (X_BOUNDRY - canvas.halfWidth < Math.abs(this.xPos)) {
      var x = canvas.halfWidth + ((this.xPos>0?X_BOUNDRY:-X_BOUNDRY) - this.xPos)
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvas.height)
      ctx.lineWidth=4
      ctx.strokeStyle = "red"
      ctx.stroke()
    }

    if (Y_BOUNDRY - canvas.halfHeight < Math.abs(this.yPos)) {
      var y = canvas.halfHeight + ((this.yPos>0?Y_BOUNDRY:-Y_BOUNDRY) - this.yPos)
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
      ctx.lineWidth=4
      ctx.strokeStyle = "red"
      ctx.stroke()
    }
 
  }

  this.collide = function(type) {
    // We're dead, stop the game
    keepOnTicking = false

    // And tell the player that it is so :
    ctx.font = "42px Verdana"
    ctx.fillStyle = "#FF0000"
    ctx.fillText("You're dead dawg!", (canvas.width/2) - 200, canvas.height/2)
  }
}

function tick() {
  // Set up time
  lastTime = curTime
  curTime = new Date()
  timePassed = (curTime.getTime() - lastTime.getTime()) / 1000

  // Clear screen
  ctx.fillStyle = "rgba(0, 0, 0, 1)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw starfied
  var starGradient = ctx.createRadialGradient(0,0,0,0,0,15)
  starGradient.addColorStop(0, "grey")
  starGradient.addColorStop(0.1, "black")
  starGradient.addColorStop(1, "black")
  starField.forEach(function drawStarField(star, index, array) {
    // Most stars will be too far to see, don't draw them if so
    if (Math.abs(player.xPos - star[0]) > canvas.width/2) return
    else if (Math.abs(player.yPos - star[1]) > canvas.height/2) return

    // Still here? Good, let's draw some stars
    ctx.save()
    ctx.translate(canvas.width/2, canvas.height/2)
    ctx.translate(star[0] - player.xPos, star[1] - player.yPos)

    ctx.beginPath()
    ctx.arc(0, 0, star[2], 0, 2*Math.PI, 1)
    ctx.fillStyle=starGradient
    ctx.lineWidth = 1
    ctx.fill()
    
    ctx.restore()
  })

  // Draw everything else
  itemsToDraw.forEach(function(item, index, array) {
    item.update()
    // Check that the item hasn't floated beyond the field of battle
    if (Math.abs(item.xPos) > X_BOUNDRY || Math.abs(item.yPos) > Y_BOUNDRY) item.collide({colType:"boundry"})

    // If the item in question is beyond the player's sight don't bother to draw or collision check
    if (Math.abs(item.xPos - player.xPos) > canvas.width || Math.abs(item.yPos - player.yPos) > canvas.height) return
    item.draw()

    // Check for collisions
    itemsToDraw.forEach(function collisionCheck(secondItem, index, array) {
      // Don't check an item against itself
      if (item == secondItem) return
      

      var distance = Math.sqrt(Math.pow(Math.abs(item.xPos - secondItem.xPos), 2) + Math.pow(Math.abs(item.yPos - secondItem.yPos), 2))
      if (distance <= item.colRadius + secondItem.colRadius) {
        // Collision happened, call collide methods and pass each others collision types so each
        // object knows what to do
        item.collide(secondItem)
        secondItem.collide(item)
      }
    })
  })

  if (DEV_MODE) {
    ctx.font = "12px Verdana"
    ctx.fillStyle = "#0000FF"
    ctx.fillText("xPos: " + player.xPos, 5, 17)
    ctx.fillText("yPos: " + player.yPos, 5, 34)

    FPSCounter.total += 1/timePassed
    FPSCounter.size += 1
    FPSCounter.avg = FPSCounter.total / FPSCounter.size
    ctx.fillText("FPS: " +  FPSCounter.avg, 5, 51)

    if (!(tickCount % 50)) {
      FPSCounter.total = 0
      FPSCounter.size = 0
      FPSCounter.avg = 0
    }
  }

  if (!keepOnTicking) return
  tickCount++
  setTimeout(tick, 5)
}

function randomInsertion(object, loc, rot, vol, rotVol) {
  var obj = new object()
  obj.xPos = loc[0]
  obj.yPos = loc[1]
  obj.rotation = rot
  obj.xSpeed = vol[0]
  obj.ySpeed = vol[1]
  obj.rotationalVolicity = rotVol
  itemsToDraw.push(obj)
}

function main(initCounts) {
  curTime = new Date()

  // init our player and bind input
  player = new Player()

  window.onkeydown = function(e) {
    switch(e.keyCode) {
      case 37 :
        player.rotationalVelocity = -PLAYER_TURN_SPEED
        break
      case 39 :
        player.rotationalVelocity = PLAYER_TURN_SPEED
        break
      case 38 :
        player.accelerating = true
        break
      case 32 :
        player.shoot()
        break
    }
  }

  window.onkeyup = function(e) {
    switch(e.keyCode) {
      case 37 : case 39 :
        player.rotationalVelocity = 0
        break
      case 38 :
        player.accelerating = false
        break
    }
  }

  starField = []
  for (var i = 0; i < NUMBER_OF_STARS; i++) {
    var newStar = [(Math.random() - 0.5) * 2 * X_BOUNDRY,  (Math.random() - 0.5) * 2 * Y_BOUNDRY, Math.random() * 10]
    starField.push(newStar)
  }

  itemsToDraw = [player]
  keepOnTicking = true

  for (var i = 0; i < initCounts.fighters; i++) {
    randomInsertion(enemyFighter, [(Math.random() - 0.5) * X_BOUNDRY * 2, (Math.random() - 0.5) * Y_BOUNDRY *2], 0, [0,0], 0)
  }

  for (var i = 0; i < initCounts.astroids; i++) {
    randomInsertion(SquareDroid, [(Math.random() - 0.5) * X_BOUNDRY * 2, (Math.random() - 0.5) * Y_BOUNDRY *2], 0, [(Math.random() - 0.5) * 100, (Math.random() - 0.5) * 100], (Math.random() - 0.5) * 2 * Math.PI)
  }

  FPSCounter = { size : 0,
                 avg : 0,
                 total : 0 } 

  tickCount = 0
  tick()
}

function start() {
  // Sizing etc.
  canvas = document.getElementById('primary_canvas')
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  canvas.halfWidth = canvas.width/2
  canvas.halfHeight = canvas.height/2
  ctx = canvas.getContext('2d')

  // I see a blank canvas and I want to paint it black
  ctx.fillStyle = "rgba(0, 0, 0, 1)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  document.getElementById('start_button').onclick = function fireMain() {
    DEV_MODE = document.getElementById('dev_mode').checked

    var initCounts = {}
    initCounts.fighters = document.getElementById('fighter_count').value
    initCounts.astroids = document.getElementById('astroid_count').value

    console.log(initCounts)
    document.body.removeChild(document.getElementById('optionsDiv'))
    main(initCounts)
  }

  window.addEventListener('keypress', function(e) {if (e.keycode == 32) fireMain()})
}
