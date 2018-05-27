const fs = require('fs')
const path = require('path')
const ffmpeg = require('fluent-ffmpeg')
const rimraf = require('rimraf')
const Jimp = require('jimp')
const range = require('lodash.range')
const async = require('async')
const exec = require('child_process').exec

const inputPath = './input.mp4'

const r = 100
const xc = 640
const yc = 360
const circSampleCount = 420
  
const frameDir = './frames'
let framePaths = null

exec(`ffmpeg -i ${inputPath} -vf fps=1 ${frameDir}/out%d.png`, err => {
  if (err) throw err
  fs.readdir(frameDir, (err, frameFiles) => {
    if (err) throw err
    assembleImageFrom(frameFiles)
  })
})
  
rimraf(path.join(frameDir, '*'), () => {
  console.log('removing old frames')
})

function frameToPixelRow (frameFile, cb) {
  const framePath = path.join(frameDir, frameFile)
  Jimp.read(framePath, (err, image) => {
    if (err) cb(err)
    const coords = range(0, 2 * Math.PI, 2 * Math.PI / circSampleCount).map(theta => ({
      x: parseInt(xc + r * Math.cos(theta)),
      y: parseInt(yc + r * Math.sin(theta))
    }))
    const pixelRow = coords.map(({ x, y }) => image.getPixelColor(x, y))
    cb(null, pixelRow)
  })
}

function assembleImageFrom (frameFiles) {
  async.map(frameFiles, frameToPixelRow, (err, pixelMatrix) => {
    if (err) throw err
    const image = new Jimp(circSampleCount, pixelMatrix.length)
    pixelMatrix.forEach((pixelRow, y) => {
      pixelRow.forEach((pixel, x) => {
        image.setPixelColor(pixel, x, y)
      })
    })
    image.write(`./done.jpg`)
  })
}
