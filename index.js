const express = require('express');
const path = require('path')
const bodyParser = require('body-parser')
const fs = require('fs')
const app = express()
const port = 6063

rawdata = fs.readFileSync('data.json');


app.use(bodyParser.urlencoded({extended: true}));

app.set('view engine', 'ejs');


app.get("/", (req, res) => {
    res.render("index.ejs")
})

app.get("/register", (req, res) => {
    res.render("register.ejs")
    rawdata = fs.readFileSync('data.json');
    let dataFile = JSON.parse(rawdata);
    console.log(dataFile.comments);
})

app.post("/register", (req, res) => {
    
    var name = req.body.name 
    var password = req.body.password
    var accNum = req.body.accNum
    console.log(req.body)
    var data = {name: name, password: password, accNum: accNum}
    if (data.name && data.password && data.accNum) {
      var rawdata = fs.readFileSync('data.json')
      var data = JSON.parse(rawdata)
      data['data'].push(data)
      var sendData = JSON.stringify(data)
      fs.writeFile('data.json', sendData, 'utf8', function(){
        console.log('data successfully written to JSON');
      })
      res.redirect('/register')
    }
})

app.listen(port)

