import express from 'express';
import path from 'path';
import bodyParser from 'body-parser';
import http from 'http';
import passport from "passport";

const app = express();

app.set('port', 80);
app.use(express.static('public'))

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use(passport.session());

app.post('/moves/notification', (req, res) => {
  const { body } = req;
  const { userId, storylineUpdates } = body;
  console.log('update for user ', userId);
  console.log(JSON.stringify(storylineUpdates, null, 2));
  return res.send(200);
});

require("./moves")(app);
require("./photos")(app);

http.createServer(app).listen(app.get('port'), () => {
  console.info(`Express server listening on port ${app.get('port')}`);
});