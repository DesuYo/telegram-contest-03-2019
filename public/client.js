class FancyChart {
  constructor (id) {
    this.container = document.getElementById(id)
    
    const canvas = this.container.appendChild(document.createElement('canvas'))
    canvas.width = window.innerWidth * 0.9
    canvas.height = 500
    canvas.addEventListener('mousemove', this.handlePointSelection.bind(this)) //can be disabled for better perfomance
    canvas.addEventListener('click', this.handlePointSelection.bind(this))
    this.ctx = canvas.getContext('2d')
    
    const chartMap = this.container.appendChild(document.createElement('canvas'))
    chartMap.width = window.innerWidth * 0.9
    chartMap.height = 150
    chartMap.style.cursor = 'pointer'
    chartMap.addEventListener('click', this.changeChartArea.bind(this))
    this.mapCtx = chartMap.getContext('2d')
    
    this.descriptionWindow = this.container.appendChild(document.createElement('div'))
    this.descriptionWindow.classList.add('description')
    this.descriptionDate = this.descriptionWindow.appendChild(document.createElement('span'))
    this.descriptionValues = this.descriptionWindow.appendChild(document.createElement('div'))
    this.descriptionValues.classList.add('values')
    this.descriptionLabels = this.descriptionWindow.appendChild(document.createElement('div'))
    this.descriptionLabels.classList.add('labels')

    this.checkBoxesFlexContainer = this.container.appendChild(document.createElement('div'))
    this.checkBoxesFlexContainer.classList.add('flex-container')
    
    this.viewPortAreaCtrl = {}

    this.xAxisGap = 20
    this.lines = []
    this.xScale = 1
    this.yScale = 1
    this.selectedIndex = null

    this.dragTimer = null

    addEventListener('resize', this.handleResize.bind(this))
  }

  loadChart = ({ columns = [], types, colors, names }) => {
    columns.forEach(([ label, ...values ]) => {
      if (types[label] === 'x')
        this.xAxis = values.sort((a, b) => a - b)
      else {
        const fancyCheckBoxContainer = this.checkBoxesFlexContainer.appendChild(document.createElement('div'))
        fancyCheckBoxContainer.id = label
        const fancyCheckBoxLabel = fancyCheckBoxContainer.appendChild(document.createElement('label'))
        fancyCheckBoxLabel.innerText = label
        fancyCheckBoxLabel.style.color = colors[label]
        fancyCheckBoxLabel.classList.add('container')
        const fancyCheckBox = fancyCheckBoxLabel.appendChild(document.createElement('input'))
        fancyCheckBox.setAttribute('type', 'checkbox')
        fancyCheckBox.setAttribute('checked', true)
        fancyCheckBox.addEventListener('change', this.toggleLine.bind(this, label))
        const fancyCheckMark = fancyCheckBoxLabel.appendChild(document.createElement('span'))
        fancyCheckMark.classList.add('checkmark')
        fancyCheckMark.style.backgroundColor = colors[label]
        
        this.lines.push([ label, ...values ])
      }
    })
    
    this.start = 0
    this.end = Math.round((this.xAxis.length - 1) / 4) 
    this.disabledLines = []
    this.colors = colors
    this.names = names
    this.setViewPort(this.start, this.end)
    this.renderMap()
  }

  calcYScale (steps) {
    const { ctx: { canvas: { height } }, lines, start, end, xAxisGap, yScale } = this
    this.maxY = Math.max(...[].concat(...lines.map(([ _, ...Y ]) => Y.slice(start, end))))
    this.dyScale = ((height - xAxisGap - 25) / this.maxY - yScale) / steps
    this.ySteps = steps
  }
  
  animateYScale () {
    const { dyScale, ySteps } = this
    if (ySteps > 1) 
      requestAnimationFrame(this.animateYScale.bind(this))
    this.ySteps--
    this.yScale += dyScale
    this.render()
  }

  calcCanvasPointY (y) {
    const { ctx: { canvas: { height } }, xAxisGap, yScale } = this
    return height - xAxisGap - y * yScale
  }

  calcXScale (steps) {
    const { ctx: { canvas: { width } }, xAxis, start, end, xScale } = this 
    this.dxScale = (width / (xAxis[end] - xAxis[start]) - xScale) / steps
    this.xSteps = steps
  }

  animateXScale () {
    const { dxScale, xSteps } = this
    if (xSteps > 1)
      requestAnimationFrame(this.animateXScale.bind(this))

    this.xSteps--
    this.xScale += dxScale
    this.render()
  }

  calcCanvasPointX (x) {
    const { xAxis, xScale, start } = this
    return (x - xAxis[start]) * xScale
  }

  handleResize () {
    this.ctx.canvas.width = window.innerWidth * 0.9
    this.mapCtx.canvas.width = window.innerWidth * 0.9
    this.renderMap()
    this.calcXScale(20)
    this.animateXScale()
  }

  handlePointSelection ({ x }) {
    const { ctx: { canvas: { offsetLeft } }, xAxis, start, end, lineStep } = this
    let nearestIndex = start
    const relX = x - offsetLeft
    for (let i = start; i < end; i += lineStep) {
      nearestIndex = 
        Math.abs(relX - this.calcCanvasPointX(xAxis[i])) < Math.abs(relX - this.calcCanvasPointX(xAxis[nearestIndex]))
        ? i
        : nearestIndex
    }
    
    this.selectedIndex = nearestIndex
    //this.drawDescriptionWindow()
    this.render()
  }

  toggleLine (name) {
    const el = document.getElementById(name)
    if (el.querySelector('input').getAttribute('checked'))
      el.querySelector('span').style.backgroundColor = this.colors[name]
    
    console.log(name)
    const index = this.lines.findIndex(([ label ]) => label === name)
    if (index === -1) {
      this.lines.push(
        ...this.disabledLines.splice(this.disabledLines.findIndex(([ label ]) => label === name), 1)
      )
    }
    else {
      this.disabledLines.push(...this.lines.splice(index, 1))
    }
    //this.drawDescriptionWindow()
    //this.renderMap()
    this.calcYScale(20)
    this.animateYScale()
  }

  setViewPort (start, end) {
    this.start = start
    this.end = end
    this.lineStep = end - start > 30 ? Math.round((end - start) / 30) : 1
    this.renderMap()
    this.calcXScale(30)
    this.calcYScale(20)
    this.animateXScale()
    this.animateYScale()
  }

  render () {
    const { ctx: { canvas: { width, height, offsetTop } }, 
      ctx, xAxis, lines, start, end, maxY, colors, lineStep, selectedIndex } = this
    ctx.clearRect(0, 0, width, height)

    ctx.beginPath()
    ctx.font = "14px Myriad Pro, sans-serif"
    ctx.fillStyle = 'grey'
    for (let i = xAxis[start]; i < xAxis[end]; i += ~~((xAxis[end] - xAxis[start]) / 5.3)) {
      const date = new Date(i).toLocaleDateString('us', {
        month: 'short',
        day: 'numeric'
      })
      ctx.fillText(date, this.calcCanvasPointX(i), height - 5)
    }

    //ctx.beginPath()
    ctx.strokeStyle = 'grey'
    ctx.lineWidth = 1
    for (let i = 0; i < maxY; i += ~~(maxY / 5.3)) {
      const y = this.calcCanvasPointY(i)
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.fillText(i, 5, y - 5)
    }
    ctx.stroke()

    const selectedX = this.calcCanvasPointX(xAxis[selectedIndex])

    if (selectedIndex) {
      this.descriptionWindow.style.display = 'block'
      this.descriptionWindow.style.left = Math.abs(selectedX - this.descriptionWindow.clientWidth - 50) + 'px'
      this.descriptionWindow.style.top = offsetTop + 50 + 'px'
      this.descriptionDate.innerText = new Date(xAxis[selectedIndex]).toLocaleDateString('us', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      })

      this.descriptionValues.innerHTML = lines.map(([ label, ...Y ]) => `
        <span style='color: ${colors[label]}'>${Y[selectedIndex]}</span>
      `).join('')
      this.descriptionLabels.innerHTML = lines.map(([ label ]) => `
        <span style='color: ${colors[label]}'>${label}</span>
      `).join('')
    }

    lines.forEach(([ label, ...Y ]) => {
      ctx.beginPath()
      ctx.strokeStyle = colors[label]
      ctx.lineJoin = 'round'
      ctx.lineWidth = 3
      ctx.moveTo(0, this.calcCanvasPointY(Y[start]))
      for (let i = start + lineStep; i < end; i += lineStep) {
        //console.log(this.calcCanvasPointX(xAxis[i]))
        ctx.lineTo(this.calcCanvasPointX(xAxis[i]), this.calcCanvasPointY(Y[i]))
      }
      ctx.stroke()

      ctx.beginPath()
      ctx.fillStyle = "white"
      ctx.arc(selectedX, this.calcCanvasPointY(Y[selectedIndex]), 8, 0, 360)
      ctx.fill()
      ctx.stroke()
    })

    //console.log('CHART', this)
  }

  renderMap () {
    const { mapCtx: { canvas: { width, height } }, mapCtx: ctx, 
      xAxis, lines, disabledLines, start, end, colors, lineStep } = this
    ctx.clearRect(0, 0, width, height)

    this.mapXScale = width / (xAxis[xAxis.length - 1] - xAxis[0])
    console.log('MAP X SCALE', this.mapXScale)
    const allLines = [ ...lines, ...disabledLines ]
    const maxY = Math.max(...[].concat(...allLines.map(([ _, ...Y ]) => Y)))
    this.mapYScale = height / maxY

    allLines.forEach(([ label, ...Y ]) => {
      ctx.beginPath()
      ctx.strokeStyle = colors[label]
      ctx.lineJoin = 'round'
      ctx.lineWidth = 1
      ctx.moveTo(0, height - Y[0] * this.mapYScale)
      for (let i = lineStep; i < Y.length; i += lineStep) {
        ctx.lineTo((xAxis[i] - xAxis[0]) * this.mapXScale, height - Y[i] * this.mapYScale)
      }
      ctx.stroke()
    })

    ctx.beginPath()
    ctx.strokeStyle = 'rgba(100, 100, 100, .3)'
    ctx.fillStyle = 'rgba(100, 100, 100, .3)'
    ctx.lineWidth = 1
    this.viewPortAreaCtrl['start'] = Math.round((xAxis[start] - xAxis[0]) * this.mapXScale)
    this.viewPortAreaCtrl['end'] = Math.round((xAxis[end] - xAxis[0]) * this.mapXScale)
    console.log(this.viewPortAreaCtrl)
    ctx.fillRect(0, 0, this.viewPortAreaCtrl.start, height)
    ctx.stroke()
    ctx.beginPath()
    ctx.fillRect(this.viewPortAreaCtrl.end, 0, width - this.viewPortAreaCtrl.end, height)
    ctx.stroke()
  }

  /*startChangeChartArea ({ target }) {
    target.addEventListener('mousemove', this.changeChartArea.bind(this))
  }*/

  changeChartArea ({ x }) {
    const { mapCtx: { canvas: { offsetLeft, width } }, xAxis, start, end, viewPortAreaCtrl } = this
    x = x - offsetLeft
    console.log(x)
    let selectedIndex = Math.round(xAxis.length * x / width)
    if (((x - viewPortAreaCtrl.start < 15 && x - viewPortAreaCtrl.start > 0) 
    || (viewPortAreaCtrl.end - x < 15 && viewPortAreaCtrl.end - x > 0)) && end - start > xAxis.length * 0.25) {
      this.start = start + Math.round(xAxis.length * 0.1)
      this.end = end - Math.round(xAxis.length * 0.1)
      console.log(this.start)
    }
    else if (start < selectedIndex && end > selectedIndex) {
      console.log(start - Math.round(xAxis.length * 0.1))
      this.start = start - Math.round(xAxis.length * 0.1)
      this.end = end + Math.round(xAxis.length * 0.1)
    }
    else {
      this.end = selectedIndex
      this.start = this.end - end + start
    }
    if (this.start < 0) this.start = 0
    if (this.end > xAxis.length - 1) this.end = xAxis.length - 1

    console.log('START', this.start)
    this.setViewPort(this.start, this.end)
  }



  /*stopChangeChartArea () {
    target.removeEventListener('mousemove', this.changeChartArea.bind(this))
  }*/
}

JSON_DATA.forEach(data => {
  const chart = new FancyChart('app')
  chart.loadChart(data)
})

