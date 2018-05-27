const path = require('path')
const ffmpeg = require('fluent-ffmpeg')
const rimraf = require('rimraf')
const Jimp = require('jimp')
const range = require('lodash.range')
const async = require('async')

const cmd = ffmpeg('./fingerbib.mp4')

const r = 50
const xc = 300
const yc = 300
const circSampleCount = 420
  
const frameDir = './frames'
let framePaths = null
  
rimraf(path.join(frameDir, '*'), () => {
  console.log('removing old frames')
})
  
cmd.ffprobe((err, data) => {
  const seconds = parseInt(data.format.duration)
  cmd.on('filenames', filenames => {
    framePaths = filenames.map(fn => path.join(frameDir, fn))
    console.log(`generating ${framePaths.length} files. could take some time.`)
  })
  cmd.on('end', () => {
    console.log('screenshots taken')
    async.map(framePaths, (framePath, cb) => {
      Jimp.read(framePath, (err, image) => {
        if (err) cb(err)
        
        const coords = range(0, 2 * Math.PI, 2 * Math.PI / circSampleCount).map(theta => {
          const y = parseInt(yc + r * Math.sin(theta))
          const x = parseInt(xc + r * Math.cos(theta))
          return { x, y }
        })
        
        const pixelRow = coords.map(({ x, y }) => {
          return image.getPixelColor(x, y)
        })
        
        cb(null, pixelRow)
      })
    }, (err, pixelMatrix) => {
      if (err) throw err
      const image = new Jimp(circSampleCount, pixelMatrix.length)
      pixelMatrix.forEach((pixelRow, y) => {
        pixelRow.forEach((pixel, x) => {
          image.setPixelColor(pixel, x, y)
        })
      })
      image.write(`./done.jpg`)
    })
  })
  cmd.screenshots({
    count: seconds,
    folder: './frames'
  })
})
