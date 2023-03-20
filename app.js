// Import Modules
const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const { request } = require('express');
const fs = require('fs')

// Database Setup
const database = new sqlite3.Database('./database.db', sqlite3.OPEN_READWRITE);


// Express Setup
const app = express();
app.use(express.static(__dirname + '/static'));
app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));
app.set('view engine', 'ejs');
app.use(session({
  secret: 'D$jtDD_}g#T+vg^%}qpi~+2BCs=R!`}O',
  resave: false,
  saveUninitialized: false
}));


// Setup Variables
const port = 3000; // port the localhost will be running from

const pagePermissions = {
  acc: 1,
  login: 3,
  signup: 3,
  logout: 2,
  changePassword: 2,
  deleteAccount: 2
}

teacher = false

// Functions
function isAuthenticated(request, response, next) {
  if (request.session.user) next();
  else response.redirect('/login');
}
function permCheck(request, response, next) {
  if (request.url) {
      // Defines users desired endpoint
      let urlPath = request.url
      // Checks if url has a / in it and removes it from the string
      if (urlPath.indexOf('/') != -1) {
          urlPath = urlPath.slice(urlPath.indexOf('/') + 1)
      }
      // Check for ?(urlParams) and removes it from the string
      if (urlPath.indexOf('?') != -1) {
          console.log(urlPath.indexOf('?'));
          urlPath = urlPath.slice(0, urlPath.indexOf('?'))
      }
      // Checks if users permissions are high enough
      console.log([request.session.perms])
      if ([request.session.perms] <= pagePermissions[urlPath]) {
          next()
      } else {
          response.send('<script>alert("Not High Enough Permissions"); window.location.href = "/"; </script>')
      }
  }
}


// Webpages
app.get('/', isAuthenticated, function (request, response) {
  try {
    database.get(`SELECT * FROM users Where username = ?`, [request.session.user], function (error, results) {
      //      console.log(results);
      response.render('index.ejs', {
        user: request.session.user,
        perms: results.perms
      });
    })
  } catch (error) {
    response.send(error.message);
  }
})

app.get('/login', function (request, response) {
  try {
    response.render('login.ejs');
  } catch (error) {
    response.send(error.message);
  }
})

app.post('/login', function (request, response) {
  const {
    username,
    password
  } = request.body;
  request.session.regenerate(function (error) {
    if (error) throw error;
    if (username && password) {
      database.get(`SELECT * FROM users Where username = ?`, [username], function (error, results) {
        if (error) throw error;
        if (results) {
          let databasePassword = results.password
          bcrypt.compare(password, databasePassword, (error, isMatch) => {
            if (isMatch) {
              if (error) throw error;
              request.session.user = username;
              request.session.perms = results.perms
              response.redirect('/');
            } else response.redirect('/login');
          })
        } else response.redirect('/login')
      })
    } else response.redirect('/login')
  })
})

app.get('/signup', function (request, response) {
  try {
    response.render('signup.ejs');
  } catch (error) {
    response.send(error.message);
  }
})

app.post('/signup', function (request, response) {
  const {
    username,
    password,
    confirmPassword
  } = request.body;
  request.session.regenerate(function (error) {
    if (error) throw error;
    if (username && password && confirmPassword) {
      database.get(`SELECT * FROM users Where username = ?`, [username], (error, results) => {
        if (error) throw error;
        if (!results) {
          if (password == confirmPassword) {
            bcrypt.hash(password, 10, function (error, hashedPassword) {
              if (error) throw error;
              // Checks the database for any users with admin perms
              database.get(`SELECT * FROM users Where perms = 0`, (error, results) => {
                // If there are no users with admin perms, give the account admin permissions. Otherwise, give them basic permissions.
                if (error) throw error;
                if (!results) {
                  database.get(`INSERT INTO users (username, password, perms) VALUES (?, ?, ?)`, [username, hashedPassword, 0], (error) => {
                    if (error) throw error;
                    request.session.user = username;
                    response.redirect('/');
                  })
                } else {
                  database.get(`INSERT INTO users (username, password, perms) VALUES (?, ?, ?)`, [username, hashedPassword, 2], (error) => {
                    if (error) throw error;
                    request.session.user = username;
                    response.redirect('/');
                  })
                }
              })
            })
          } else response.redirect('/signup');
        } else response.redirect('/signup');
      })
    } else response.redirect('/signup');
  })
})

app.get('/logout', function (request, response) {
  console.log(3);
  request.session.user = null;
  request.session.save(function (error) {
    console.log(4);
    if (error) throw error;
    request.session.regenerate(function (error) {
      console.log(5);
      if (error) throw error;
      response.redirect('/login');
    })
  })
})

app.get('/changePassword', function (request, response) {
  try {
    response.render('changePassword.ejs');
  } catch (error) {
    response.send(error.message);
  }
})

app.post('/changePassword', function (request, response) {
  const {
    currentPassword,
    newPassword,
    confirmNewPassword
  } = request.body;
  const username = request.session.user;
  database.get(`SELECT password FROM users Where username = ?`, [username], function (error, results) {
    if (error) throw error;
    if (results) {
      bcrypt.compare(currentPassword, results.password, (error, isMatch) => {
        if (error) throw error;
        if (isMatch && newPassword == confirmNewPassword) {
          bcrypt.hash(newPassword, 10, (error, hashedPassword) => {
            if (error) throw error;
            database.get('UPDATE users SET password = ? WHERE username = ?', [hashedPassword, username], (error, results) => {
              if (error) throw error;
              response.redirect('/logout');
            })
          })
        } else response.redirect('/');
      })
    } else response.redirect('/');
  })
})


app.get('/deleteAccount', function (request, response) {
  console.log(1);
  username = request.session.user;
  database.get('DELETE FROM users WHERE username = ?', [username], (error, results) => {
    console.log(2);
    if (error) throw error;
    response.redirect('/logout');
  })
})

app.get('/acc', permCheck, function (request, response) {
  database.get(`SELECT * FROM users Where perms = 0`, (error, results) => {
    if (results) {
      database.get('SELECT * FROM users', function (error, results) {
        console.log(results)
        response.render('acc.ejs', {
          user: request.session.user,
          perms: results.perms
        })
      })
    } else {
      response.render('/')
    }
  })
})
app.get('/goingsomewhere', function (request, response) {
  // Select every entry in the users table
  studentid = request.session.studentid
  database.all('SELECT * FROM users Where studentid = ?',[studentid], function (error, users) {
    // console.log(users)
    // console.log(request.session.user);
    response.render('goingsomewhere.ejs', {
      studentid: studentid
    })
  })
})

app.post('/scan', function (request, response) {
  response.render('scan.ejs')
})


app.listen(port, function (err) {
  if (err) {
    console.error(err);
  } else {
    console.log(`Running on port ${port}`);
  }
})