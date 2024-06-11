const express = require('express');
const admin = require('firebase-admin');
const bodyparser = require('body-parser');
const bcrypt = require('bcrypt');
const serviceAccount = require('C:/Users/laksh/Downloads/401 module - 2/.vscode/full401/401hanum-95794-firebase-adminsdk-lo3sa-c452964a1d.json');
const session = require('express-session');
const path = require('path'); // Added to handle file paths

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

//express basic set up
const app = express();
const PORT = 3004;

app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: true }));

// Session middleware setup
app.use(
  session({
    secret: 'thisIsASecret', // Secret used to sign the session ID cookie
    resave: false, 
    saveUninitialized: false, // Don't create session until something stored
    cookie: { secure: !true }, // 'true' is recommended for production for HTTPS. Use 'false' for HTTP.
  })
);

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');

// Serve the sign-up page
app.get('/signup', (req, res) => {
  res.render('signup');
});

// Handle sign-up form submission
app.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10); // Hash the password
  // Store user in Firestore
  await db.collection('users').doc(email).set({
    username,
    email,
    password: hashedPassword,
  });
  res.redirect('/login'); // Redirect to the login page after sign up
});

// Serve the login page
app.get('/login', (req, res) => {
  const loggedOutMsg = req.query.loggedOut ? "Logged out successfully..." : null;
  res.render('login', { loggedOutMsg });
});

// Handle login form submission
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const userDoc = await db.collection('users').doc(email).get();

  if (!userDoc.exists) {
    // User not found
    return res.status(400).send('User does not exist');
  }

  const user = userDoc.data();
  // Compare submitted password with stored hashed password
  const isMatch = await bcrypt.compare(password, user.password);

  if (isMatch) {
    // Authentication successful, setting user data in session
    req.session.userId = userDoc.id; // Or any unique identifier from the user data
    req.session.username = user.username; // Example: also storing username in session

    // Redirecting to the landing page upon successful login
    res.redirect('/dashboard');
  } else {
    // Authentication failed
    res.status(400).send('Incorrect password');
  }
});

// Logout and redirect to login with message
app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login?loggedOut=true');
  });
});


// Redirect from root URL to /login
app.get('/', (req, res) => {
  res.redirect('/login');
});

// Serve the landing page as a dashboard
app.get('/dashboard', (req, res) => {
  if (!req.session.userId) {
    // Not authenticated, redirecting to login page
    return res.redirect('/login');
  }

  // if User is authenticated, render the landing page 
  res.render('landing-page', { username: req.session.username }); 
});

app.listen(PORT, () => {
  console.log(`Listening to the server on http://localhost:${PORT}`);
});
