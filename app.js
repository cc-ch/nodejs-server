var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var bodyParser = require('body-parser');
var config = require('./config');
var _ = require("lodash");
var url = require("url");


process.env.PORT = config.webport||7081;

var app = express();

app.use(cookieParser());
process.env.ROOT = path.join(__dirname, './');
process.env.WEBROOT = path.join(process.env.ROOT, '../../../webapp');
process.env.TMPDIR = path.join(process.env.WEBROOT, config.tempdir);
app.use(express.static(process.env.WEBROOT));
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
app.use(bodyParser({ keepExtensions: true}));

app.use(logger('dev'));
require('./utils/logger').use(app);

app.use(session({
  secret: '62ed076363f277cb796277c66572ad01',
  rolling:true,
  cookie: {
    maxAge: 60000 * 60 //1小时后过期
  },
  key:'connect.sId'
}));

var mailer = require('./routes/mailer');
var routeslogin = require('./routes/login');
var fileload = require('./routes/fileload');
var routesdb = require('./routes/db');
var authorize = require('./routes/authorize');
var servicepv = require('./routes/servicepv.js');

app.use(function(req, res, next) {
  authorize(req, res, next, session);
});

app.use(function(req, res, next) {
  servicepv(req, res, next, url);
});

//上传先不验证
// app.use('/api', routesindex);
app.use('/gpuapi', require('./routes/serviceGpu').router);
app.use('/api/g', require('./routes/serviceGpu').router);
app.use('/api', routesdb);
app.use('/login', routeslogin);
app.use('/api', fileload);

// catch 404 and forward to error handler
// app.use(function(req, res, next) {
//   var err = new Error('Not Found');
//   err.status = 404;
//   next(err);
// });

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  if(!err){
    err = new Error('Not Found');
    err.status = 404;
  }
  res.status(err.status || 500);
  err.msg = err.msg || err.message;
  res.send({status:0,msg:err.msg,detail:err});
});

app.listen(process.env.PORT);
module.exports = app;

console.log("WEB on port:",process.env.PORT);

process.on('uncaughtException', function (err) {
    console.error('>>>>>An uncaught error occurred!');
    console.error(err.stack);
});