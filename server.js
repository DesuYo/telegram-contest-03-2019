const express = require('express')
const { join } = require('path')

express()
  .use(express.static(join(__dirname, 'public')))
  .get('/', (_, res) => res.sendFile('./public/index.html'))  
  .listen('777')