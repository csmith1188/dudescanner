// Import Modules
const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
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

// if (!fs.existsSync(newFilePath)) { // check if file already exists
//   const templateFile = fs.readFileSync(templateFilePath, 'utf8'); // read the contents of the template file

//   fs.writeFileSync(newFilePath, templateFile); // create a new file and write the template file's contents to it
//   console.log('New file created based on the template file.'); // log a success message to the console
// } else {
//   console.log('File already exists.'); // log a message to the console if the file already exists
// }

// Functions
// if there is a user signed in, continue. Otherwise, redirect them to the login page.
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
      response.send('Not High Enough Permissions')
    }
  }
}


// Webpages
app.get('/', isAuthenticated, function (request, response) {
  try {
    // Database selects the user currently signed in, and displays their information onto index.ejs
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

// login page
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
    // If a username and password were provided, search the database for a match
    if (username && password) {
      database.get(`SELECT * FROM users Where username = ?`, [username], function (error, results) {
        if (error) throw error;
        if (results) {
          let databasePassword = results.password
          // if the provided password matches the one in the database, send the user to the root
          // and sign them in
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
                if (error) throw error;
                // if there are no users with teacher perms, the account will be made with teacher perms instead.
                if (!results) {
                  // Insert the data provided into the database. Selects the user's username and encrypted password, provides the perms of a teacher, and
                  // assigns a random student ID. <!!! Will be changed into a user provided student ID for when the scanner is working !!!>
                  database.get(`INSERT INTO users (username, password, perms, studentid) VALUES (?, ?, ?, ?)`, [username, hashedPassword, 0, Math.floor(100000 + Math.random() * 900000)], (error) => {
                    if (error) throw error;
                    request.session.user = username;
                    response.redirect('/');
                  })
                } else {
                  // Insert the data provided into the database. Selects the user's username and encrypted password, provides the perms of a student, and
                  // assigns a random student ID. <!!! Will be changed into a user provided student ID for when the scanner is working !!!>
                  database.get(`INSERT INTO users (username, password, perms, studentid) VALUES (?, ?, ?, ?)`, [username, hashedPassword, 2, Math.floor(100000 + Math.random() * 900000)], (error) => {
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

// Logout page
app.get('/logout', function (request, response) {
  // removes the current user from the session
  request.session.user = null;
  request.session.save(function (error) {
    if (error) throw error;
    request.session.regenerate(function (error) {
      if (error) throw error;
      response.redirect('/login');
    })
  })
})

// change password page
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
  // Select the password of the user signed in from the database
  database.get(`SELECT password FROM users Where username = ?`, [username], function (error, results) {
    if (error) throw error;
    if (results) {
      // if there is a password found, compare it to the current password.
      bcrypt.compare(currentPassword, results.password, (error, isMatch) => {
        if (error) throw error;
        // if the passwords did match, and the new passwords matched, encrypt the new password
        if (isMatch && newPassword == confirmNewPassword) {
          bcrypt.hash(newPassword, 10, (error, hashedPassword) => {
            if (error) throw error;
            // Update the current password with the newly encrypted password
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

// delete account page
app.get('/deleteAccount', function (request, response) {
  username = request.session.user;
  // Delete the user currently signed in from the database
  database.get('DELETE FROM users WHERE username = ?', [username], (error, results) => {
    if (error) throw error;
    response.redirect('/logout');
  })
})

app.get('/acc', isAuthenticated, permCheck, function (request, response) {
  // Select every entry in the users table
  database.all('SELECT * FROM users', function (error, users) {
    // console.log(users)
    // console.log(request.session.user);
    response.render('acc.ejs', {
      user: users
    })
  })
})

app.post('/scan', function (request, response) {
  response.render('scan.ejs')
})

// Listen for a properly running server. If there are no runtime issues, send 
// the port it's running off of to the console.
app.listen(port, function (err) {
  if (err) {
    console.error(err);
  } else {
    console.log(`Running on port ${port}`);
  }
})