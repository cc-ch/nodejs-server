var express = require('express');
var router = express.Router();
var util = require("util");
var dbcon = require("./mysqlconn.js");
var moment = require('moment');
var ldap = require("ldapjs");
var http = require("http");
var tokenServer = require('./serviceToken.js');
var config = require('../config');

function sqlStrValid(str) {
	if (!str)
		return "";
	str = str.replace(/'/g, "''");
	return str;
}

function dbLoginCheck(req, res, next) {
	// console.log("check:::",req.body);
	var bd = req.body;
	if (!bd) {
		next({
			msg: "对象未传递!"
		});
		return;
	}
	var userid = bd.strUserId || "";
	userid = sqlStrValid(userid);
	var userpwd = bd.strPassword || "";
	var client = ldap.createClient({
		url: 'ldap://company.information:port'
	});

	function sendErr(msg) {
		if (typeof(msg) == "string")
			next({
				status: 401,
				msg: msg
			});
		else
			next(msg);
	}

	//创建账户时，同步创建或更新FTP账户
	function createOrUpdateFTPAccount(sn){
		// try{
		// 	//创建账户时，同步创建或更新FTP账户
		// 	http.get('http://localhost:'+process.env.PORT+"/api/gpu/ftp/user/"+sn, function(res) {
		// 	  console.info(">>>createOrUpdateFTPAccount,1>",res.statusCode);
		// 	  res.resume();
		// 	}).on('error', function(e){
		// 	  console.error(">>>createOrUpdateFTPAccount,2>",e);
		// 	});
			
		// }catch(er){
		// 	console.error(er);
		// }
	}

	function adduvlog(req,val){
		var time = moment().format("YYYYMMDDHHmmss")
		var ip = req.headers['x-real-ip'];
		var sqlstr = "INSERT INTO t_uv (nUid, strTime, ip) VALUES ('"+ val +"','"+time+"','"+ ip +"')";
		dbcon(sqlstr, function(err, vals) {
			if(err){
				console.log(err);
			}

		});
	}

	function addOrUpdateRight(req,userid){
		req.session = req.session || {};
		req.session.userId = userid;
		req.session.loginTime = (new Date()).getTime();
		return tokenServer.addOrUpdateToken(userid);
	}

	function updateUserInfo(entry) {
		//console.log("updateUserInfo:", entry, entry.sn, entry.givenName);
		if (!entry || !entry.sn || !entry.givenName) {
			sendErr("用户名信息获取失败!");
			return;
		}
		var sqlstr = "SELECT * FROM t_user WHERE strUserId='" + userid + "'";
		dbcon(sqlstr, function(err, vals, fields) {
			if (err) {
				sendErr(err);
			} else {
				//console.log(sqlstr, vals);
				if (vals && vals[0]) {
					var user = vals[0];
					var rs = {
						status: 1,
						data: [user]
					};
					res.set('token', addOrUpdateRight(req,user.nId));
				
					adduvlog(req,vals[0].nId);

					var sql = "UPDATE t_user set nLastLoginTime=%d,strLastLoginIp='%s' where nId=%d";
					sql = util.format(sql, moment().format("YYYYMMDDHHmmss"), req.ip, user.nId);
					dbcon(sql);
					createOrUpdateFTPAccount(entry.sn);

					res.send(rs);
				} else {
					var sql = "insert into t_user (strUserId,strName,strEmail,nLastLoginTime,strLastLoginIp) values('%s','%s','%s',%d,'%s')";
					sql = util.format(sql, entry.sn, entry.givenName, entry.mail || "", moment().format("YYYYMMDDHHmmss"), req.ip);

					dbcon(sql, function(err, val2) {
						createOrUpdateFTPAccount(entry.sn);

						res.set('token', addOrUpdateRight(req,val2.insertId));
						// console.log(req.headers);
						adduvlog(req,val2.insertId);
						res.send({
							status: 1,
							data: [{
								nId: val2.insertId,
								strUserId: entry.sn,
								strName: entry.givenName,
								strEmail: entry.mail
							}]
						});
					});
				}
			}
		});
	}
	
	client.bind('company\\' + userid, userpwd, function(err, ret) {
		if (err || !userid) {
			sendErr("用户名密码错误!");
			return;
		}
		var opts = {
			filter: '(sn=' + userid + ')', //查询条件过滤器，查找uid=kxh的用户节点
			scope: 'sub', //查询范围
			timeLimit: 500 //查询超时
		};
		client.search('companyData', opts, function(err, res2) {

			//查询结果事件响应
			res2.on('searchEntry', function(entry) {
				//获取查询的对象
				updateUserInfo(entry && entry.object);

			});

			res2.on('searchReference', function(referral) {
				console.log('referral: ' + referral.uris.join());
			});

			//查询错误事件
			res2.on('error', function(err) {
				console.error('error: ' + err.message);
				//unbind操作，必须要做
				client.unbind();
				sendErr("用户名信息获取失败!" + err.message);
			});

			//查询结束
			res2.on('end', function(result) {
				console.log('search status: ' + result.status);
				//unbind操作，必须要做
				client.unbind();
			});
		});
		// res.send({status: 0,data:"xxx"});
	});

}
//登录
router.post('/', dbLoginCheck);

module.exports = router;