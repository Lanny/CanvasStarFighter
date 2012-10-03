GLOBAL_AIR_FRICTION = 0.2 // Coefficient of friction, factor of reduction of speed per second
ACCELERATION_FORCE = 200 // Pixles per second accelerated per second
PLAYER_TURN_SPEED = 3 // Radians turned per second, basically pi but hoping to avoid float arithmatic
NUMBER_OF_STARS = 5000 // Number of stars to simultaniously track
BULLET_VELOCITY = 500 // Pixels per second that a conventional fighter bullet travels
DREADNOUGHT_BULLET_VELOCITY = 1000 
DREADNOUGHT_RATE_OF_FIRE = 1000 
CONVERSION_CORE_WARMUP_TIME = 500 // Time in milliseconds that it takes to convert momentum
FIGHTER_TARGETING_DISTANCE_SQUARED = Math.pow(1000, 2) // Distance that fighters have to be from their target before firing
CARRIER_SPAWN_TIME = 3 * 1000 // Time between fighter spawns per carrier
X_BOUNDRY = 5000 // Size of the game, passing beyond this distance from 0,0 is lethal
Y_BOUNDRY = 5000 // Also it's marked with a big red line ;)
DRAW_HIT_CIRCLES = false // Draw hit circles for movers
DEV_MODE = true // Set true for additional debugging and performance stats

/* A Quick Note Regarding Colission Detection :

I have no idea how to do colission detection, so I'm just running with some ad-hoc
scheme that should work. The idea is that all items that can collide are added
to the itemsToDraw array. On each game tick they'll be checked. Checking is kind of
retarded, each object's colRadius is used to determine a "hit circle". This hit circle
is centered on (obj.xPos, obj.yPos), so make sure objects sorta confrom to that circle.

Any more than you and you're on your own, you poor poor soul. */

function drawHitCircle(target) {
  ctx.beginPath()
  ctx.arc(0, 0, target.colRadius, 0, 2*Math.PI, 1)
  ctx.strokeStyle = 'yellow'
  ctx.stroke()

  if (target.colType == 'complex') {
    target.colCircleArray.forEach(function(circ, index, array) {
      //circ = [(circ[0] * Math.cos(target.rotation)), (circ[1] * Math.sin(target.rotation)), circ[2]]
      ctx.beginPath()
      ctx.arc(circ[0], circ[1], circ[2], 0, 2*Math.PI, 1)
      ctx.strokeStyle = 'yellow'
      ctx.stroke()
    })
  }
}

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

    if (DRAW_HIT_CIRCLES) drawHitCircle(this)
    ctx.restore()
  }

  this.update = function() {
    this.additionalUpdate()

    this.xPos += (this.xSpeed * timePassed)
    this.yPos += (this.ySpeed * timePassed)
    this.rotation += (this.rotationalVelocity * timePassed)

  }

  this.collide = function() {
    return
  }
}

function physMover() {
  // A super-class for objects that accelerate and obey game physics as opposed to just
  // floating freely
  this.xSpeed = 0
  this.ySpeed = 0
  this.accelerating = false;
  this.acceleratoryPower = 1
  this.xPos = 0
  this.yPos = 0
  this.rotation = 0
  this.colRadius = 0
  this.colType = 'env'

  this.additionalUpdate = function() {}

  this.update = function() {
    this.additionalUpdate()

    // Adjust our location
    this.xPos += (this.xSpeed * timePassed)
    this.yPos += (this.ySpeed * timePassed)

    // Adjust for acceleration
    if (this.accelerating) {
      this.xSpeed += Math.cos(this.rotation) * this.acceleratoryPower * timePassed
      this.ySpeed += Math.sin(this.rotation) * this.acceleratoryPower * timePassed
    }

    // Adjust our speed for air friction
    this.xSpeed -= this.xSpeed * GLOBAL_AIR_FRICTION * timePassed
    this.ySpeed -= this.ySpeed * GLOBAL_AIR_FRICTION * timePassed
  }

  this.draw = function() {
    ctx.save()
    ctx.translate(canvas.width/2, canvas.height/2)
    ctx.translate(this.xPos - player.xPos, this.yPos - player.yPos)
    ctx.rotate(this.rotation)

    this.geometryDraw()

    if (DRAW_HIT_CIRCLES) drawHitCircle(this)
    ctx.restore()
  }
} 

function projectile() {
  this.colType = 'projectile'
  this.colRadius = 1

  this.geometryDraw = function() {
    ctx.beginPath()
    ctx.lineTo(-10, 0)
    ctx.lineTo(0, 0)
    ctx.lineWidth = 1
    ctx.strokeStyle = 'yellow'
    ctx.stroke()
  }

  this.collide = function(obj) {
    if (obj.colType == 'projectile') return
    var i = itemsToDraw.lastIndexOf(this)
    itemsToDraw.splice(i, 1) 
  }
}
projectile.prototype = new LinearMover()

function dreadnoughtProjectile() {
  this.colType = 'projectile'
  this.colRadius = 1

  this.geometryDraw = function() {
    ctx.beginPath()
    ctx.lineTo(-20, 0)
    ctx.lineTo(0, 0)
    ctx.lineWidth = 1
    ctx.strokeStyle = 'red'
    ctx.stroke()
  }

  this.collide = function(obj) {
    if (obj.colType == 'projectile' || obj.gameType == "friendly_ship") return
    var i = itemsToDraw.lastIndexOf(this)
    itemsToDraw.splice(i, 1) 
  }
}
dreadnoughtProjectile.prototype = new LinearMover()



function enemyFighter() {
  this.colRadius = 15
  this.colType = 'ship'
  this.gameType = 'enemy_ship'
  this.acceleratoryPower = 100
  this.accelerating = true
  this.lastShotFired = new Date().getTime()
  this.rateOfFire = 3000
  this.target = player
  this.searchDistance = 300
  this.thingsToRunFrom = null

  this.callMeWhenYouFoundSomethingYouGraveySuckingPigDog = function(foundItem) {
    if (foundItem.gameType == 'environmental' || foundItem.gameType == 'enemy_ship') {
      this.thingsToRunFrom = foundItem
    }
 }

  this.additionalUpdate = function() {
    if (this.thingsToRunFrom) {
      // Will eventually be an item in array kind of thing
      var runTarget = this.thingsToRunFrom

      var deltaX = runTarget.xPos - this.xPos
      var deltaY = runTarget.yPos - this.yPos

      // Don't want to run forever!
      if (Math.pow(deltaX + deltaY, 2) > Math.pow(this.searchDistance, 2)) {
        this.thingsToRunFrom = null
        return
      }

      // antiAngle, yeah, that's totally a thing...
      var antiAngle = Math.atan2(deltaY, deltaX)

      // Negative reciprocal, right? right? Please be right
      this.rotation = antiAngle + Math.PI
    }
    else {
      // Point the fighter at the player
      // Find the cartesian distance
      var deltaX = this.target.xPos - this.xPos
      var deltaY = this.target.yPos - this.yPos

      this.rotation = Math.atan2(deltaY, deltaX)
      
      if (!(tickCount % 40)) {
        if (Math.pow(deltaX, 2) + Math.pow(deltaY, 2) < FIGHTER_TARGETING_DISTANCE_SQUARED) {
          if ((new Date().getTime() - this.lastShotFired ) > this.rateOfFire) {
            this.shoot()
          }
        }
      }
    }
  }

  this.shoot = function() {
    var shot = new projectile()
    shot.rotation = this.rotation
    var cos = Math.cos(shot.rotation)
    var sin = Math.sin(shot.rotation)
    // This mess is here so a shot doesn't hit the thing that fired it. What we're doing is :
    // Take the shooter position. Offset by the collision radius so shot doesn't spawn inside
    // then add the speed of the shooter so it doesn't collide next tick. Add to that the acceleration
    // of the shooter because it's going to increase by next tic, and multiply that by time
    // passed. Could still backfire if this tick is significantly shorter than the next one
    // but we added a 5px buffer earlier so hopefully it'll work out.
    shot.xPos = this.xPos + ((this.colRadius + 15) * cos) + ((this.xSpeed + (this.acceleratoryPower * cos)) * timePassed )
    shot.yPos = this.yPos + ((this.colRadius + 15) * sin) + ((this.ySpeed + (this.acceleratoryPower * sin)) * timePassed )
    shot.xSpeed = BULLET_VELOCITY * cos
    shot.ySpeed = BULLET_VELOCITY * sin
    this.lastShotFired = new Date().getTime()
    itemsToDraw.push(shot)
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
    induceExplosion(this)
  }

  this.isDead = function() {
    // Plays on the fact that exploded fighters have a colRadius of 0. Kinda sneaky, but w/e
    return !this.colRadius
  }
}
enemyFighter.prototype = new physMover()

function SquareDroid() {
  this.xSpeed = 20
  this.ySpeed = 20
  this.colRadius = 30
  this.rotationalVelocity = 2

  // Apparenty we have "game types" now. Whatever that means.
  this.gameType = "environmental"

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

  this.collide = function(target) {
    // Let's make this baby bounce!
    if (target.colType == "boundry") {
      var grossSpeed = Math.sqrt(Math.pow(this.xSpeed, 2) + Math.pow(this.ySpeed, 2))
      var lineOfReflection = Math.atan2(target.ySpeed, target.xSpeed)
      var thisSlope = Math.atan2(this.ySpeed, this.xSpeed)
      var diff = lineOfReflection - thisSlope
      var newSlope = lineOfReflection - Math.PI + diff
      this.xSpeed = Math.cos(newSlope) * grossSpeed
      this.ySpeed = Math.sin(newSlope) * grossSpeed
    }

    else {
      var grossSpeed = Math.sqrt(Math.pow(this.xSpeed, 2) + Math.pow(this.ySpeed, 2))
      var newSlope = Math.atan2(target.yPos - this.yPos, target.xPos - this.yPos) + Math.PI
      this.xSpeed = Math.cos(newSlope) * grossSpeed
      this.ySpeed = Math.sin(newSlope) * grossSpeed
    }
  }
}
SquareDroid.prototype = new LinearMover()

function enemyCarrier() {
  this.colType = 'complex'
  this.colCircleArray = [[100,-20,40], [60,25,15], [0,0,50], [-90,0,50]]
  this.colRadius = 145
  this.lastFighterDeployed = new Date().getTime()
  this.gameType = 'enemy_ship'

  this.additionalUpdate = function() {
    if (!(tickCount % 20)) {
      // If we don't have a spawn time, carrier becomes passive
      if (!CARRIER_SPAWN_TIME) return

      // Otherwise check if enough time has passed. If it has then spawn a new fighter
      if (new Date().getTime() - this.lastFighterDeployed > CARRIER_SPAWN_TIME) {
        var insertionX = this.xPos + (Math.cos(this.rotation) * 140)
        var insertionY = this.yPos + (Math.cos(this.rotation) * 140)
        insertObject(enemyFighter, [insertionX, insertionY], 0, [0,0], 0)
        this.lastFighterDeployed = new Date().getTime()
      }
    }
  }

  this.geometryDraw = function() {
    ctx.beginPath()
    ctx.moveTo(150, -50)
    ctx.lineTo(150, -10)
    ctx.lineTo(50, 50)
    ctx.lineTo(20, 50)
    ctx.lineTo(-120, 50)
    ctx.lineTo(-140, 50)
    ctx.lineTo(-140, 40)
    ctx.lineTo(-130, 40)
    ctx.lineTo(-130, 20)
    ctx.lineTo(-140, 20)

    // Now draw the other side
    ctx.lineTo(-140, -20)
    ctx.lineTo(-130, -20)
    ctx.lineTo(-130, -40)
    ctx.lineTo(-140, -40)
    ctx.lineTo(-140, -50)
    ctx.lineTo(-120, -50)
    ctx.lineTo(-50, -50)
    ctx.lineTo(10, -50)
    ctx.lineTo(10, -30)
    ctx.lineTo(50, -30)
    ctx.lineTo(50, -50)
    ctx.lineTo(150, -50)

    ctx.strokeStyle = 'red'
    ctx.stroke()
  }
}
enemyCarrier.prototype = new LinearMover()


function friendlyDreadnought() {
  this.colType = 'complex'
  this.colCircleArray = [[90,0,50], [0,0,50], [-90,0,50]]
  this.colRadius = 145
  this.gunRotation = 0
  this.searchDistance = 1000
  this.target = null
  this.lastShotFired = new Date().getTime()
  this.rateOfFire = DREADNOUGHT_RATE_OF_FIRE
  this.gameType = 'friendly_ship'

  this.callMeWhenYouFoundSomethingYouGraveySuckingPigDog = function(foundItem) {
    // Holy christ this is an ugly line
    if (foundItem.gameType == 'enemy_ship' && this.target == null) {
      this.target = foundItem
    }
  }

  this.additionalUpdate = function() {
    if (this.target) {
      var deltaX = this.target.xPos - (this.xPos + Math.cos(this.rotation) * 90)
      var deltaY = this.target.yPos - (this.yPos + Math.sin(this.rotation) * 90)

      if (Math.pow(deltaX, 2) + Math.pow(deltaY, 2) > Math.pow(this.searchDistance, 2) || this.target.isDead()) {
        // Target has moved out of range
        this.target = null
        return
      }

      // Still here? Good, now aim at the target
      this.gunRotation = Math.atan2(deltaY, deltaX)

      // And if we're clear to do so, fire on those mofos
      if (!(tickCount % 40)) {
        if ((new Date().getTime() - this.lastShotFired ) > this.rateOfFire) {
          this.shoot()
        }
      }
    }
  }

  this.shoot = function() {
    var shot = new dreadnoughtProjectile()
    shot.rotation = this.gunRotation
    var cos = Math.cos(shot.rotation)
    var sin = Math.sin(shot.rotation)

    shot.xPos = this.xPos + Math.cos(this.rotation) * 90
    shot.yPos = this.yPos + Math.sin(this.rotation) * 90
    shot.xSpeed = DREADNOUGHT_BULLET_VELOCITY * cos
    shot.ySpeed = DREADNOUGHT_BULLET_VELOCITY * sin
    this.lastShotFired = new Date().getTime()
    itemsToDraw.push(shot)
  }

  this.geometryDraw = function() {
    ctx.beginPath()
    ctx.moveTo(150, -20)
    ctx.lineTo(150, 20)
    ctx.lineTo(90, 50)
    ctx.lineTo(50, 50)
    ctx.lineTo(50, 30)
    ctx.lineTo(10, 30)
    ctx.lineTo(10, 50)
    ctx.lineTo(-20, 50)
    ctx.lineTo(-20, 45)
    ctx.lineTo(-50, 45)
    ctx.lineTo(-50, 50)
    ctx.lineTo(-80, 50)
    ctx.lineTo(-80, 45)
    ctx.lineTo(-110, 45)
    ctx.lineTo(-110, 50)
    ctx.lineTo(-140, 50)
    ctx.lineTo(-140, 40)
    ctx.lineTo(-130, 40)
    ctx.lineTo(-130, 20)
    ctx.lineTo(-140, 20)
    // Now draw the other side
    ctx.lineTo(-140, -20)
    ctx.lineTo(-130, -20)
    ctx.lineTo(-130, -40)
    ctx.lineTo(-140, -40)
    ctx.lineTo(-140, -50)
    ctx.lineTo(-110, -50)
    ctx.lineTo(-110, -45)
    ctx.lineTo(-80, -45)
    ctx.lineTo(-80, -50)
    ctx.lineTo(-50, -50)
    ctx.lineTo(-50, -45)
    ctx.lineTo(-20, -45)
    ctx.lineTo(-20, -50)
    ctx.lineTo(10, -50)
    ctx.lineTo(10, -30)
    ctx.lineTo(50, -30)
    ctx.lineTo(50, -50)
    ctx.lineTo(90, -50)
    ctx.lineTo(150, -20)

    ctx.strokeStyle = 'green'
    ctx.stroke()

    // Draw gun
    ctx.translate(90, 0)
    ctx.rotate(this.gunRotation)

    ctx.beginPath()
    ctx.arc(0, 0, 20, 0.25, 2*Math.PI - 0.25, 0)
    ctx.moveTo(0,-5)
    ctx.lineTo(0, 5)
    ctx.lineTo(30, 5)
    ctx.lineTo(30, -5)
    ctx.lineTo(0,-5)
    ctx.strokeStyle = 'green'
    ctx.stroke()
  }
}
friendlyDreadnought.prototype = new LinearMover()

function induceExplosion(target) {
  target.explosionStartTime = new Date()
  target.explosionRadius = 0
  target.maxExplosionRadius = 80
  target.explosionTime = 600
  target.colRadius = 0
  target.xSpeed = 0
  target.ySpeed = 0

  target.additionalUpdate = function() {
    var percentComplete = (new Date().getTime() - this.explosionStartTime.getTime()) / this.explosionTime
    if (percentComplete > 1) {
      i = itemsToDraw.lastIndexOf(this)
      itemsToDraw.splice(i, 1) 
    }
    this.explosionRadius = this.maxExplosionRadius * percentComplete
  }
  target.geometryDraw = function() {
    ctx.beginPath()
    ctx.arc(0, 0, this.explosionRadius, 0, 2*Math.PI, 1)
    ctx.lineWidth = 1
    ctx.strokeStyle = "red"
    ctx.stroke()
  }
}
 
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

    // Sort of a callback type thing. I don't know
    this.additionalUpdate()
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

    this.additionalDraw()

    if (DRAW_HIT_CIRCLES) drawHitCircle(this)
    ctx.restore()

    // Only draw boundry lines if we're close enough to see them
    if (X_BOUNDRY - canvas.halfWidth < Math.abs(this.xPos)) {
      // Determine if we're approaching the positive or negative boundry
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

  this.additionalDraw = function() {}
  this.additionalUpdate = function() {}

  this.activateConversionCore = function() {
    // If we've already activated a conversion we shouldn't do it again
    // (Fuck javascript and its broken keydown even)
    if (this.ignoreConversion) {return}
      
    this.conversionStarted = new Date().getTime()
    this.conversionEffectRadius = 75
    this.ignoreConversion = true
    this.storedSpeed = Math.sqrt(Math.pow(this.xSpeed, 2) + Math.pow(this.ySpeed, 2))

    this.additionalUpdate = function() {
      // Zero out any speed, we're sitting still
      this.xSpeed = 0
      this.ySpeed = 0

      var warmUpCompletion = ((new Date().getTime()) - this.conversionStarted ) / CONVERSION_CORE_WARMUP_TIME

      if (warmUpCompletion > 1) {
        // Warmup done, let's rock :p
        this.xSpeed = Math.cos(this.rotation) * this.storedSpeed
        this.ySpeed = Math.sin(this.rotation) * this.storedSpeed

        this.conversionEffectRadius = 0
        this.additionalDraw = function() {}
        this.additionalUpdate = function() {}
      }

      // Contract our effect radius as needed
      this.conversionEffectRadius = 75 * (1-warmUpCompletion)
    }

    // Tack the effect draw function onto the player
    this.additionalDraw = function() {
      ctx.beginPath()
      ctx.arc(0, 0, this.conversionEffectRadius, 0, 2*Math.PI, 1)
      ctx.strokeStyle = "purple"
      ctx.stroke()
    }
  }

  this.deactivateConversionCore = function() {
    this.additionalDraw = function() {}
    this.additionalUpdate = function() {}
    this.conversionEffectRadius = 0
    this.ignoreConversion = false
  }

  this.collide = function(type) {
    // Might called twice becuase I'm a shitty coder
    if (!keepOnTicking) return

    // We're dead, stop the game
    keepOnTicking = false

    // Turn off game music and play our death tone ("death tone", that sounds badass)
    document.getElementById('game_music').pause()
    document.getElementById('death_music').play()

    // And tell the player that it is so :
    ctx.font = "42px Verdana"
    ctx.fillStyle = "#FF0000"
    
    var possibleText = ['You\'re a crying saucer',
                        'Keep it extra terestri-real',
                        'Looks like you spaced out']

    var i = Math.floor(Math.random()*3)
    var deathText = possibleText[i]

    ctx.fillText(deathText, (canvas.width/2) - 200, canvas.height/2)
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
  starGradient.addColorStop(0.2, "black")
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
    if (Math.abs(item.yPos) > Y_BOUNDRY) item.collide({colType:"boundry", xSpeed:0, ySpeed:1})
    if (Math.abs(item.xPos) > X_BOUNDRY) item.collide({colType:"boundry", xSpeed:1, ySpeed:0})

    // If the item in question is beyond the player's sight don't bother to draw or collision check
    if (Math.abs(item.xPos - player.xPos) > canvas.width || Math.abs(item.yPos - player.yPos) > canvas.height) return
    item.draw()

    // Check for collisions
    itemsToDraw.forEach(function collisionCheck(secondItem, index, array) {
      // Don't check an item against itself
      if (item == secondItem) return

      var distance = Math.sqrt(Math.pow(Math.abs(item.xPos - secondItem.xPos), 2) + Math.pow(Math.abs(item.yPos - secondItem.yPos), 2))
      if (distance <= item.colRadius + secondItem.colRadius) {
        // Collisions may have happened, definitely in the case of simple 
        // objects, maybe for complex ones
        if (item.colType == "complex" || secondItem.colType == "complex") {
          // Theoretically we only have to check item for complexity since
          // every possible item will be checked

          // Identify which object is the complex one. God help us when we have
          // two complex objects collide
          var complexObj = item.colType == "complex"?item:secondItem
          var simpleObj = item.colType == "complex"?secondItem:item

          complexObj.colCircleArray.forEach(function(subitem, index, array) {
            // Adjust each array from local to universal coords

            // Distance from complexObj of this sub-collider
            var dist = Math.sqrt(Math.pow(subitem[0], 2) + Math.pow(subitem[1], 2))
            // Angle of this subcollider relative to complexObj
            var angle = Math.atan2(subitem[1], subitem[0])
            // Calculate rotated coords relative to complexObj, then add complexObj coords for universal coords
            subitem = [(dist * Math.cos(angle + complexObj.rotation)) + complexObj.xPos, (dist * Math.sin(angle + complexObj.rotation)) + complexObj.yPos, subitem[2]]

            // And do our calculations
            var distance = Math.sqrt(Math.pow(Math.abs(subitem[0] - simpleObj.xPos), 2) + Math.pow(Math.abs(subitem[1] - simpleObj.yPos), 2))
            if (distance <= subitem[2] + simpleObj.colRadius) {
              item.collide(secondItem)
              secondItem.collide(item)
            }
          })
        }

        else {
          item.collide(secondItem)
          secondItem.collide(item)
        }
      }

      // Checked for collisions, now check for proximity if item needs it
      if (item.searchDistance && item.searchDistance >= distance) {
        item.callMeWhenYouFoundSomethingYouGraveySuckingPigDog(secondItem)
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

function insertObject(object, loc, rot, vol, rotVol) {
  var obj = new object()
  // If this gets set to true, we have to try agains with a shift
  var tryAgainFlag = false

  // Check if our insertion position is clear, and do something about it if not
  itemsToDraw.forEach(function(item, index, array) {
    var distance = Math.sqrt(Math.pow(loc[0] - item.xPos, 2) + Math.pow(loc[1] - item.yPos, 2))

    if (distance < obj.colRadius + item.colRadius) {
      // Oh shit, let's try shifting up a little bit
      tryAgainFlag = true
    }
  })

  if (tryAgainFlag) {
    insertObject(object, [loc[0], loc[1]+30], rot, vol, rotVol)
    return
  }

  // Got here? Ok, we're clear to insert
  obj.xPos = loc[0]
  obj.yPos = loc[1]
  obj.rotation = rot
  obj.xSpeed = vol[0]
  obj.ySpeed = vol[1]
  obj.rotationalVolicity = rotVol
  itemsToDraw.push(obj)

  return obj
}

function main(initCounts) {
  document.getElementById('game_music').play()
  curTime = new Date()

  // init our player and bind input
  player = new Player()

  window.addEventListener('keydown', function(e) {
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
        player.activateConversionCore()
        break
    }
  })

  window.addEventListener('keyup', function(e) {
    switch(e.keyCode) {
      case 37 : case 39 :
        player.rotationalVelocity = 0
        break
      case 38 :
        player.accelerating = false
        break
      case 32 :
        player.deactivateConversionCore()
        break
    }
  })

  // Stars are arrays of [x,y,size]. Currently size is more or less ignored, we'll see how we want
  // to procede with that in the future. Here we make the starfield.
  starField = []
  for (var i = 0; i < NUMBER_OF_STARS; i++) {
    var newStar = [(Math.random() - 0.5) * 2 * X_BOUNDRY, (Math.random() - 0.5) * 2 * Y_BOUNDRY, Math.random() * 5]
    starField.push(newStar)
  }

  itemsToDraw = [player]
  keepOnTicking = true

  for (var i = 0; i < initCounts.fighters; i++) {
    insertObject(enemyFighter, [(Math.random() - 0.5) * X_BOUNDRY * 2, (Math.random() - 0.5) * Y_BOUNDRY *2], 0, [0,0], 0)
  }

  for (var i = 0; i < initCounts.astroids; i++) {
    insertObject(SquareDroid, [(Math.random() - 0.5) * X_BOUNDRY * 2, (Math.random() - 0.5) * Y_BOUNDRY *2], 0, [(Math.random() - 0.5) * 300, (Math.random() - 0.5) * 300], (Math.random() - 0.5) * 2 * Math.PI)
  }
  
  //Test code
  insertObject(enemyCarrier, [(Math.random() - 0.5) * X_BOUNDRY * 2, (Math.random() - 0.5) * Y_BOUNDRY *2], 0, [0,0], 0)
  insertObject(enemyCarrier, [(Math.random() - 0.5) * X_BOUNDRY * 2, (Math.random() - 0.5) * Y_BOUNDRY *2], 0, [0,0], 0)
  insertObject(friendlyDreadnought, [0,0], 0, [0,0], 0)

  // Set up a sexy asteroid collision
  insertObject(SquareDroid, [0,0], 0, [20,-20], 0)
  insertObject(SquareDroid, [-500,500], 0, [100,-100], 50)

  //End test code

  FPSCounter = { size : 0,
                 avg : 0,
                 total : 0 } 

  tickCount = 0
  tick()
}

function addAudio(sauce, id, loop) {
  // Create a new audio element
  var audio = document.createElement('audio')
  audio.setAttribute('src', sauce)
  audio.setAttribute('preload', 'auto')
  audio.setAttribute('id', id)
  if (loop) audio.loop = true

  // And stick it into the DOM proper
  document.body.appendChild(audio)
  return audio
}

function start() {
  // Sizing etc.
  canvas = document.getElementById('primary_canvas')
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight

  // Precalculate these now because we'll be using them pretty often
  canvas.halfWidth = canvas.width/2
  canvas.halfHeight = canvas.height/2
  ctx = canvas.getContext('2d')

  // I see a blank canvas and I want to paint it black
  ctx.fillStyle = "rgba(0, 0, 0, 1)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Start the music
  var menu_music = addAudio('assets/audio/menu_music.mp3', 'menu_music', true)
  menu_music.play()

  // Preload our other music
  addAudio('assets/audio/death.mp3', 'death_music', false)
  addAudio('assets/audio/game_music.mp3', 'game_music', true)

  document.getElementById('start_button').onclick = function fireMain() {
    DEV_MODE = document.getElementById('dev_mode').checked
    DRAW_HIT_CIRCLES = document.getElementById('draw_hit_circles').checked
    X_BOUNDRY = document.getElementById('X_BOUNDRY').value / 2
    Y_BOUNDRY = document.getElementById('Y_BOUNDRY').value / 2
    NUMBER_OF_STARS = document.getElementById('star_count').value 
    GLOBAL_AIR_FRICTION = document.getElementById('air_friction').value 
    CARRIER_SPAWN_TIME = document.getElementById('carrier_spawn_time').value * 1000

    var initCounts = {}
    initCounts.fighters = document.getElementById('fighter_count').value
    initCounts.astroids = document.getElementById('astroid_count').value

    document.body.removeChild(document.getElementById('optionsDiv'))
    menu_music.pause()
    // End the intro screen animation
    introKeepOnTicking = false
    main(initCounts)
  }

  // Set up and engage the intro screen animation
  // Ugh, this thing is a fucking mess. At least it's gone once the game starts
  starField = []
  introKeepOnTicking = true
  pathFont = { 'A' : [
               [0,0,'m'],
               [0,70,'l'],
               [30,70,'l'],
               [30,0,'l'],
               [0,0,'l'],
               [15,70,'m'],
               [15,40,'l'],
               [15,30,'m'],
               [15,20,'l']],
  
               'B' : [
               [0,0,'m'],
               [0,70,'l'],
               [30,70,'l'],
               [30,0,'l'],
               [0,0,'l'],
               [30,35,'m'],
               [15,35,'l'],
               [15,10,'m'],
               [15,25,'l'],
               [15,45,'m'],
               [15,60,'l']],

               'D' : [
               [0,0,'m'],
               [0,70,'l'],
               [20,70,'l'],
               [30,60,'l'],
               [30,10,'l'],
               [20,0,'l'],
               [0,0,'l'],
               [15,20,'m'],
               [15,50,'l']],

               'E' : [
               [0,0,'m'],
               [0,70,'l'],
               [30,70,'l'],
               [30,0,'m'],
               [0,0,'l'],
               [30,25,'m'],
               [15,25,'l'],
               [30,45,'m'],
               [15,45,'l'],
               [30,0,'m'],
               [30,25,'l'],
               [25,25,'m'],
               [25,45,'l'],
               [30,45,'m'],
               [30,70,'l']],

               'O' : [
               [0,0,'m'],
               [0,70,'l'],
               [30,70,'l'],
               [30,0,'l'],
               [0,0,'l'],
               [15,20,'m'],
               [15,50,'l']],

               'I' : [
               [0,0,'m'],
               [0,20,'l'],
               [7.5,20,'l'],
               [7.5,50,'l'],
               [0,50,'l'],
               [0,70,'l'],
               [30,70,'l'],
               [30,50,'l'],
               [22.5,50,'l'],
               [22.5,20,'l'],
               [30,20,'l'],
               [30,0,'l'],
               [0,0,'l']],

               'R' : [
               [0,0,'m'],
               [0,70,'l'],
               [30,70,'l'],
               [30,10,'l'],
               [20,0,'l'],
               [0,0,'l'],
               [15,70,'m'],
               [15,45,'l'],
               [10,35,'l'],
               [15,25,'m'],
               [15,15,'l']],

               'S' : [
               [0,0,'m'],
               [0,70,'l'],
               [30,70,'l'],
               [30,0,'l'],
               [0,0,'l'],
               [30,20,'m'],
               [15,20,'l'],
               [15,30,'l'],
               [0,50,'m'],
               [15,50,'l'],],

               'T' : [
               [0,0,'m'],
               [0,20,'l'],
               [7.5,20,'l'],
               [7.5,70,'l'],
               [22.5,70,'l'],
               [22.5,20,'l'],
               [30,20,'l'],
               [30,0,'l'],
               [0,0,'l']],

               'Dash' : [
               [0,25,'m'],
               [0,45,'l'],
               [30,45,'l'],
               [30,25,'l'],
               [0,25,'l']
               ]
             }
  textCoOrds = [pathFont.B, pathFont.A, pathFont.D, [], pathFont.A, pathFont.S, pathFont.S, pathFont.Dash, pathFont.T, pathFont.E, pathFont.R, pathFont.O, pathFont.I, pathFont.D, pathFont.S]

  function addIntroScreenStar() {
    var newStar = [(Math.random() - 0.5) * (canvas.width / 4),
                   (Math.random() - 0.5) * (canvas.height / 4),
                   0.1,
                   new Date().getTime()]
    starField.push(newStar)
  }

  for (var i = 0; i < 100; i++) { addIntroScreenStar() }

  // Adjust our times so stars don't come in bursts
  var thisTime = new Date().getTime()
  for (var i = 0; i < 100; i++) { 
    starField[i][3] -= Math.random() * 5000
    starField[i][2] = (thisTime - starField[i][3]) / 1000
  }

  (function initalScreenTick() {
    if (!introKeepOnTicking) return
    var thisTime = new Date().getTime()

    ctx.fillStyle = "rgba(0, 0, 0, 1)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    starField.forEach(function(star, index, array) {
      for (var i = 1; i < 7; i++) {
        var x = (star[0] * (star[2] - (i/40))) + canvas.halfWidth
        var y = (star[1] * (star[2] - (i/40))) + canvas.halfHeight
        ctx.beginPath()
        ctx.arc(x, y, 1, 0, 2*Math.PI, 1)
        var shade = 255 - i * 20
        ctx.fillStyle = 'rgb(' + shade + ',' + shade + ',' + shade + ')'
        ctx.fill()

        star[2] = (thisTime - star[3]) / 1000
      }

      if (star[2] > 5) {
        var i = starField.indexOf(star)
        starField.splice(i,1)
        addIntroScreenStar()
      }
    })

    // Draw out the logo thing!
    ctx.save()
    ctx.translate(canvas.halfWidth - ((textCoOrds.length * 35)/2) - 35,50)
    for (var letterIndex = 0; letterIndex < textCoOrds.length; letterIndex++) {
      ctx.translate(35,0)
      ctx.beginPath()

      for (var motionIndex = 0; motionIndex < textCoOrds[letterIndex].length; motionIndex++) {
        var motion = textCoOrds[letterIndex][motionIndex] 
        if (motion[2] == 'l') {
          ctx.lineTo(motion[0], motion[1]);
        }
        else if (motion[2] == 'm') {
          ctx.moveTo(motion[0], motion[1])
        }
      }
      ctx.strokeStyle = 'white'
      ctx.strokeWidth = 2
      ctx.stroke()
    }
    ctx.restore()

    setTimeout(initalScreenTick, 5)
  })()
}
