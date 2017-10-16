var express = require('express');
var router = express.Router();
var fs = require('fs');
var path = require('path');
var fstool = require('../utils/fsTool.js');
var moment = require('moment');
var dbcon = require("./mysqlconn.js");
var _ = require("lodash");

var multiparty = require('connect-multiparty')({
  uploadDir: process.env.TMPDIR
});
fstool.clearDir(process.env.TMPDIR);

function uploadFiles(req) {
    // console.log(req.files,req.body);
  var f = req.files.file || {};
  var pt = require('path').relative(process.env.WEBROOT, f.path || "");
  return {
    url: pt,
    file:f
  };
}

function sendResult(res,status,data,msg){
  var d = {status:status};
  if(data) d.data = data;
  if(msg) d.msg = d.error = msg;
  res.status(status?200:500).send(d);
}

router.post('/upload/default', multiparty, function(req, res) {
  var file = uploadFiles(req);
  console.log(file);
  if (file && file.url){
    var ext = path.extname(file.url)
    var timestamp = moment().format("YYYYMMDDHHmm");
    var fname = timestamp + ext;
    var uri = "/store/temp/"+fname;
    var targetPath = process.env.WEBROOT+uri;
    // fstool.mkDirs(targetPath);
    fstool.moveFile(file.file.path,targetPath,function(){
      sendResult(res,1,uri);
    })
  }
  else {
    sendResult(res,0,null,'上传失败！');
  }
});



module.exports = router;