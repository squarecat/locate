var passport = require("passport");
var InstagramStrategy = require("passport-instagram").Strategy;
var InstagramAPI = require('instagram-api');

const JAMES_INSTAGRAM_TOKEN = "314386862.d6e40d2.667529ca407948ae98106fac0f38e69d";
const DANIELLE_INSTAGRAM_TOKEN = "610710.d6e40d2.048bc953a1f74cdbae12ba16ccc04d8e";
var INSTAGRAM_CLIENT_ID = "d6e40d2608c8407ab934e4c80f282b52"
var INSTAGRAM_CLIENT_SECRET = "9f700d3a5d1f433ea80383099b3017e3";

var ig = new InstagramAPI(JAMES_INSTAGRAM_TOKEN);
var igDanielle = new InstagramAPI(DANIELLE_INSTAGRAM_TOKEN);

passport.serializeUser(function(user, done) {
  console.log(user);
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

passport.use(new InstagramStrategy({
    clientID: INSTAGRAM_CLIENT_ID,
    clientSecret: INSTAGRAM_CLIENT_SECRET,
    callbackURL: "http://localhost/auth/instagram/callback"//"https://locate.squarecat.io/auth/instagram/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    // asynchronous verification, for effect...
    process.nextTick(function () {
      console.log('access', accessToken);
      console.log('refresh', refreshToken);
      // To keep the example simple, the user's Instagram profile is returned to
      // represent the logged-in user.  In a typical application, you would want
      // to associate the Instagram account with a user record in your database,
      // and return that user instead.
      return done(null, profile);
    });
  }
));


module.exports = function (app) {
  // GET /auth/instagram
  //   Use passport.authenticate() as route middleware to authenticate the
  //   request.  The first step in Instagram authentication will involve
  //   redirecting the user to instagram.com.  After authorization, Instagram
  //   will redirect the user back to this application at /auth/instagram/callback
  app.get('/auth/instagram',
    passport.authenticate('instagram'),
    function(req, res){
      // The request will be redirected to Instagram for authentication, so this
      // function will not be called.
    });

  // GET /auth/instagram/callback
  //   Use passport.authenticate() as route middleware to authenticate the
  //   request.  If authentication fails, the user will be redirected back to the
  //   login page.  Otherwise, the primary route function function will be called,
  //   which, in this example, will redirect the user to the home page.
  app.get('/auth/instagram/callback', passport.authenticate('instagram', { failureRedirect: '/login' }),
    function(req, res) {
      res.redirect('/');
    });

  app.get('/photos', (req, res) => {
    return Promise.all([
      igDanielle.userSelfMedia().then(function(result) {
        console.log('got danielle photos');
        return result;
      }),
      ig.userSelfMedia().then(function(result) {
        console.log('got james photos');
        return result;
      })
    ])
    .then(function(photos) {
      console.log(photos);
      return photos.reduce(function(all, list) {
        return all.concat(list);
      }, [])
    })
    .then(function(photos) {
      res.send(photos);
    })
    .catch(function(err) {
      console.error(err);
      return res.send(err);
    });
  });
}


