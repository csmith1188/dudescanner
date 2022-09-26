const express = require('express');
const path = require('path')
const bodyParser = require('body-parser')
const fs = require('fs')
const app = express()
const port = 6063

//can be used wherever it is needed.
rawdata = fs.readFileSync('data.json');


app.use(bodyParser.urlencoded({ extended: true }));

app.set('view engine', 'ejs'); //sets view engine to EJS


app.get("/", (req, res) => {
    res.render("index.ejs")
    //renders index
})

app.get("/register",function (req, res) {
    res.render("register.ejs")
    rawdata = fs.readFileSync('data.json');
    let dataFile = JSON.parse(rawdata);
    console.log(dataFile.accounts);
})

app.post("/register",function (req, res) {
    //variables here cannot be used anywhere outside of these brackets
    var name = req.body.name //username
    var password = req.body.password //password for account
    var accNum = req.body.accNum //school ID number
    console.log(req.body)
    var data = {name: name, password: password, accNum: accNum}
    if (data.name && data.password && data.accNum) {
      var rawdata = fs.readFileSync('data.json') //reads JSON file for data
      var oldData = JSON.parse(rawdata) //parses data into things ledgible for the computer
      oldData['accounts'].push(data) //push back to the array
      var sendData = JSON.stringify(oldData)
      fs.writeFile('data.json', sendData, 'utf8', function() {
        console.log('data successfully written to JSON');
      })
      //writes to file
      res.redirect('/register')
    }
})

app.listen(port)

