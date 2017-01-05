var passport = require("passport");
var MovesStrategy = require("passport-moves").Strategy;
var request = require('request');
var moment = require('moment');
var apicache = require('apicache');

let cache = apicache.middleware
var me = {
    accessToken: "3RChvPsj68hTiQxyebOJc35O19d50mc8Psho2pkM3qWyafcuqxhp6X75cgFN4Tgy",
    refreshToken: "JtpHPa90MY5SKO0dewp75n2s9UwyBnAm8apQqmw9eH9sZ_157Nb3yIdTwr9FyGa7"
};

var local = false;

passport.use(new MovesStrategy({
    clientID: "oKl5DlH9Os2YLy9EdWslf9kVl9EQ8Q0q",
    clientSecret: "wAuXjCn4k8823uj8jKheLTbcnrcM1bQk61td_VxLrsF_GaB0H8N9Mx_U8s2Rv7Kn",
    callbackURL: "http://locate.squarecat.io/auth/moves/callback",
    scope: [ "default", "activity", "location" ]
  },
  function(accessToken, refreshToken, profile, done) {
    globalAccessToken = accessToken;
    globalRefreshToken = refreshToken;
    console.log(globalAccessToken, globalRefreshToken, profile);
    done();
  }
));

module.exports = function (app) {
  app.get('/auth/moves', passport.authenticate('moves'));

  app.get('/auth/moves/callback', passport.authenticate('moves', {
    failureRedirect: '/login'
  }), function(req, res) {
    // todo put into mongo for user
    res.send("Done!");
  });

  app.get("/moves/me", cache('24 hours'), (req, res) => {
    if (local) return res.send(require("../test/profile.json"));
    console.log("getting moves")
    request(`https://api.moves-app.com/api/1.1/user/profile?access_token=${me.accessToken}`, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        // console.log(body);
        return res.send(body)
      }
      return res.send(error);
    });
  });

  app.get("/moves/latest", cache('2 hours'), (req, res) => {
    if (local) return res.send(require("../test/today.json"));
    var now = moment().format("YYYYMMDD");
    request(`https://api.moves-app.com/api/1.1/user/storyline/daily?pastDays=5&trackPoints=true&access_token=${me.accessToken}`,
      function (error, response, body) {
        if (!error && response.statusCode == 200) {
        // console.log(body);
        return res.send(body);
      }
      return res.send(error);
    });
  });

  app.get("/moves/today", cache('2 hours'), (req, res) => {
    if (local) return res.send(require("../test/today.json"));
    var now = moment().format("YYYYMMDD");
    request(`https://api.moves-app.com/api/1.1/user/places/daily/${now}?access_token=${me.accessToken}`, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        // console.log(body);
        return res.send(body)
      }
      return res.send(error);
    });
  });

  app.post("/moves/notification", (req, res) => {
    console.log(req.body);
    res.sendStatus(200);
  });
}