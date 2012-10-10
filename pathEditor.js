function start() {
	canvas = document.getElementById('primaryCanvas')
	canvas.width = window.innerWidth
	canvas.height = window.innerHeight - 200
	ctx = canvas.getContext('2d')

	// Paint it black
  ctx.fillStyle = "rgba(0, 0, 0, 1)"
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  outText = document.getElementById('output')
  outText.style.height = 200
  outText.style.width = window.innerWidth - 200

  computeButton = document.getElementById('compute')
  computeButton.addEventListener('click', renderFromText)

  displayDiv = document.getElementById('display')
  displayDiv.style.height = canvas.height
  displayDiv.style.right = '0px'

  // Don't ask, ugh
  highlightedLine = 1

  canvas.addEventListener('click', function(e) {
  	for (var i = 0; i < currentPointList.length; i++) {
  		var marginOfError = 15
  		if (Math.abs((e.pageX - (canvas.width/2)) - currentPointList[i][0]) < marginOfError &&
  				Math.abs((e.pageY - (canvas.height/2)) - currentPointList[i][1]) < marginOfError) {
  			// OK, identified our culprit, let's highlight their cell
	  		highlightPoint(i)
			}
  	}
  })
}

function highlightPoint(i) {
	if (highlightedLine) {
		document.getElementById('l' + highlightedLine).style.color = ''
	}
	highlightedLine = i
	document.getElementById('l' + highlightedLine).style.color = 'red'

	// Redraw the whole thing as to get rid of any old hilight circles
	drawFromPointList(currentPointList)

	ctx.save()
	ctx.translate(canvas.width/2, canvas.height/2)
	ctx.beginPath()
	ctx.arc(currentPointList[i][0], currentPointList[i][1], 5, 0, 2*Math.PI, 0)
	ctx.strokeStyle = 'red'
	ctx.lineWidth = 1
	ctx.stroke()
	ctx.restore()
}

function renderFromText() {
	var pointList = JSON.parse(outText.value)

  // Set a global var because we're gonna need this later
  currentPointList = pointList
	drawFromPointList(pointList)

	// Now update our display div
	displayDiv.innerHTML = ''
	for (var i = 0; i < pointList.length; i++) {
		lineSpan = document.createElement('span')
		lineSpan.id = 'l' + i
		lineSpan.innerText = JSON.stringify(pointList[i])

		displayDiv.appendChild(lineSpan)
		displayDiv.innerHTML += '<br />\n'

	}

	// Uhh, apparently we can't add event listeners before we insert objects
	// into the DOM. For the loss
	for (var i = 0; i < pointList.length; i++) {
		document.getElementById('l' + i).addEventListener('click', function() {
			highlightPoint(this.id.substring(1))
		})
	}
}

function shift(axis, quantity) {
	renderFromText()

	for (var i = 0; i < currentPointList.length; i++) {
		currentPointList[i][axis=='x'?0:1] += quantity
	}

	pointListToOut()
	renderFromText()
}

function pointListToOut() {
	var foo = JSON.stringify(currentPointList).replace(/],/g, '],\n')
	foo
	outText.value = foo
}

function drawFromPointList(pointList) {
  ctx.fillStyle = "rgba(0, 0, 0, 1)"
  ctx.fillRect(0, 0, canvas.width, canvas.height)

	ctx.save()
  ctx.translate(canvas.width/2, canvas.height/2)
  ctx.beginPath()

  for (var motionIndex = 0; motionIndex < pointList.length; motionIndex++) {
    var motion = pointList[motionIndex] 
    if (motion[2] == 'l') {
      ctx.lineTo(motion[0], motion[1])
    }
    else if (motion[2] == 'm') {
      ctx.moveTo(motion[0], motion[1])
    }
  }
  ctx.strokeStyle = 'white'
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.restore()
}