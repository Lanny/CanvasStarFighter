GLOBAL_AIR_FRICTION = 0.2 // Coeddicient of friction, factor of reduction of speed per second
ACCELERATION_FORCE = 100 // Pixles per second accelerated per second
PLAYER_TURN_SPEED = 3 // Radians turned per second, basically pi but hoping to avoid float arithmatic
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
  this.draw = function() {}

  this.update = function() {
    this.additionalUpdate()

    this.xPos += (this.xSpeed * timePassed)
    this.yPos += (this.ySpeed * timePassed)
    this.rotation += (this.rotationalVelocity * timePassed)

    // Check if we've hit a boundry or colided
    if (this.xPos < 0) this.xPos = canvas.width
    else if (this.xPos > canvas.width) this.xPos = 0

    if (this.yPos < 0) this.yPos = canvas.height
    else if (this.yPos > canvas.height) this.yPos = 0
  }

  this.collide = function() {
    console.log('Collision detected')
  }
}

function projectile() {
  this.colType = 'projectile'
  this.colRadius = 1

  this.draw = function() {
    ctx.save()
    ctx.translate(this.xPos, this.yPos)
    ctx.rotate(this.rotation)

    ctx.beginPath()
    ctx.moveTo(-15, 0)
    ctx.lineTo(0, 0)
    ctx.lineWidth = 1
    ctx.strokeStyle = 'yellow'
    ctx.stroke()

    ctx.restore()
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

    // Check if a shorter path exist by running off edges
    // Calc possible distances off edges
    var rightEdgeDelta = player.xPos - (this.xPos - canvas.width)
    var leftEdgeDelta = player.xPos - (this.xPos + canvas.width)
    var topEdgeDelta = player.yPos - (this.yPos + canvas.height)
    var bottomEdgeDelta = player.yPos - (this.yPos + canvas.height)

    // Are any of those more efficient than going the regular way?
    if (Math.abs(rightEdgeDelta) < Math.abs(deltaX)) deltaX = rightEdgeDelta
    else if (Math.abs(leftEdgeDelta) < Math.abs(deltaX)) {deltaX = leftEdgeDelta; console.log('deltaX reassigned')}
    if (Math.abs(topEdgeDelta) < Math.abs(deltaY)) deltaY = topEdgeDelta
    else if (Math.abs(bottomEdgeDelta) < Math.abs(deltaY)) deltaY = bottomEdgeDelta

    this.rotation = Math.atan2(deltaY, deltaX)
    this.xSpeed = Math.cos(this.rotation) * this.totalSpeed
    this.ySpeed = Math.sin(this.rotation) * this.totalSpeed
  }

  this.draw = function() {
    ctx.save()
    ctx.translate(this.xPos, this.yPos)
    ctx.rotate(this.rotation)

    ctx.beginPath()
    ctx.moveTo(15, 0)
    ctx.lineTo(-15, 10)
    ctx.lineTo(-10, 0)
    ctx.lineTo(-15, -10)
    ctx.lineTo(15, 0)
    ctx.lineWidth = 1
    ctx.strokeStyle = 'red'
    ctx.stroke()

    ctx.restore()
 
  }

  this.collide = function(type) {
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
    this.draw = function() {
      ctx.beginPath()
      ctx.arc(this.xPos, this.yPos, this.explosionRadius, 0, 2*Math.PI, 1)
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

  this.draw = function() {
    ctx.save()

    // Set up our coord system with origin
    ctx.translate(this.xPos, this.yPos)
    ctx.rotate(this.rotation)

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

    ctx.restore()
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

    // Check if we've hit a boundry or colided
    if (this.xPos < 0) this.xPos = canvas.width
    else if (this.xPos > canvas.width) this.xPos = 0

    if (this.yPos < 0) this.yPos = canvas.height
    else if (this.yPos > canvas.height) this.yPos = 0
  }

  this.draw = function() {
    // Save this because shit is about to get messy
    ctx.save()
    // Move to top left of where we want to draw
    ctx.translate(this.xPos, this.yPos)
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

  itemsToDraw.forEach(function(item, index, array) {
    item.update()
    item.draw()

    // Check for collisions
    itemsToDraw.forEach(function collisionCheck(secondItem, index, array) {
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
  setTimeout(tick, 10)
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

  itemsToDraw = [player]
  keepOnTicking = true

  for (var i = 0; i < initCounts.fighters; i++) {
    randomInsertion(enemyFighter, [Math.random() * canvas.width, Math.random() * canvas.height], 0, [0,0], 0)
  }

  for (var i = 0; i < initCounts.astroids; i++) {
    randomInsertion(SquareDroid, [Math.random() * canvas.width, Math.random() * canvas.height], 0, [(Math.random() - 0.5) * 100, (Math.random() - 0.5) * 100], (Math.random() - 0.5) * 2 * Math.PI)
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
