var express = require('express');
var router = express.Router();
var util = require("util");
var path = require("path");
var dbcon = require("./mysqlconn.js");
var moment = require('moment');
var fs = require('fs');
var xlsx = require('node-xlsx');
var config = require('../config');

var NID = config.nIdName || "nId";

function dbQueryDealer(sqlstr, req, res, next, sendBefore) {
	dbcon(sqlstr, function(err, vals, fields) {
		if (err) {
			if(config.showsql)
				err.sql = sqlstr;
			next(err);
		} else {
			var rs = {
				status: 1,
				data: vals
			};
			if(config.showsql)
				rs.sql = sqlstr;
			if (sendBefore) {
				var b = sendBefore(rs, vals);
				//被阻止
				if (b === true)
					return;
			}
			res.send(rs);
		}
	});
}

//查询
function dbQueryCommList(req, res, next) {
	var wantCount = parseQueryIsCount(req);
	var sqlstr = "";
	if (wantCount) {
		sqlstr = getQuerySql(req, true);
		dbQueryDealer(sqlstr, req, res, next, function(rs, vals) {
			// console.log("COUNT:",rs);
			var cnt = rs && rs.data && rs.data[0] && rs.data[0]["COUNT"];
			res.set('X-Total-Count', cnt);
			var qstr = getQuerySql(req, false);
			dbQueryDealer(qstr, req, res, next);
			return true;
		});
	} else {
		sqlstr = getQuerySql(req, false);
		dbQueryDealer(sqlstr, req, res, next);
	}
}

function getQuerySql(req, isCount) {
	var table = req.params.tbl || "";
	var fds = isCount ? " COUNT(*) as COUNT " : parseQueryFields(req);
	var sqlstr = "SELECT " + fds + " FROM " + table;
	var sqltag = parseQueryParams(req, isCount);
	if (sqltag)
		sqlstr += " WHERE " + sqltag;
	//非COUNT但没有限制那么默认限制返回5万条
	if (!isCount && sqltag.indexOf(" LIMIT ") < 0)
		sqlstr += " LIMIT 50000";
	return sqlstr;
}

function dbQueryCommById(req, res, next) {
	var table = req.params.tbl || "";
	var id = req.params.id || 0;
	var fds = parseQueryFields(req);
	var sqlstr = "SELECT " + fds + " FROM " + table + " WHERE "+NID;
	if (id && id.indexOf(",") > 0)
		sqlstr += " in (" + id + ")";
	else
		sqlstr += "=" + id;
	sqlstr += " AND " + parseQueryParams(req);
	dbQueryDealer(sqlstr, req, res, next);
}

function dbDeleteComm(req, res, next) {
	var table = req.params.tbl || "";
	var sqlstr = "DELETE FROM " + table + " WHERE ";
	sqlstr += parseQueryParams(req);
	dbQueryDealer(sqlstr, req, res, next);
	writeOpreationLog(req);
}

function dbDeleteCommById(req, res, next) {
	var table = req.params.tbl || "";
	var id = req.params.id || 0;
	var sqlstr = "DELETE FROM " + table + " WHERE "+NID;
	if (id && id.indexOf(",") > 0)
		sqlstr += " in (" + id + ")";
	else
		sqlstr += "=" + id;
	sqlstr += " AND " + parseQueryParams(req);
	dbQueryDealer(sqlstr, req, res, next);
	writeOpreationLog(req);
}

function dbInsertComm(req, res, next) {
	dbInsertOrUpdateComm(req, res, next, "post");
}

function dbUpdateComm(req, res, next) {
	dbInsertOrUpdateComm(req, res, next, "put");
}

function dbInsertOrUpdateComm(req, res, next, method) {
	var table = req.params.tbl || "";
	var bd = req.body;
	if (!bd) {
		next({
			msg: "对象未传递!"
		});
		return;
	}
	var sqlstr;
	//UPDATE:
	if (method == "put") {
		var id = bd[NID] || req.params.id;
		if (isNaN(id))
			sqlstr = "SELECT * FROM " + table;
		else {
			sqlstr = "SELECT * FROM " + table + " WHERE "+NID+"=" + id;
		}
		// console.log(1,sqlstr);
		dbcon(sqlstr, function(err, vals, fields) {
			if (err)
				next(err);
			else {
				if (vals && vals[0]) {
					delete bd[NID];
					sqlstr = getUpdateSql(table, bd, id);
					sqlstr += " AND " + parseQueryParams(req);
					// console.log(2,sqlstr);
					dbQueryDealer(sqlstr, req, res, next);
					writeOpreationLog(req);
				} else
					next({
						msg: "对象未找到!"
					});
			}
		});
	} else {
		sqlstr = getInsertSql(table, bd);
		dbQueryDealer(sqlstr, req, res, next);
		writeOpreationLog(req);
	}

}

//UPDATE
function getUpdateSql(tb, obj, id) {
	var sql = "UPDATE " + tb + " SET ";
	var fields = [];
	for (var k in obj) {
		var v = obj[k];
		v = sqlStrValid(v);
		fields.push(" " + k + " = '" + v + "' ");
	}
	sql += fields.join(" , ") + " WHERE " + (isNaN(id) ? "1=1" : NID+"=" + id);
	return sql;
}

//INSERT
function getInsertSql(tb, obj) {
	var sql = "INSERT INTO " + tb;
	var keys = [];
	var values = [];
	for (var k in obj) {
		keys.push(k);
		var v = obj[k];
		v = sqlStrValid(v);
		values.push("'" + v + "'");
	}
	sql += "( " + keys.join(" , ") + " ) VALUES ( " + values.join(" , ") + " )";
	return sql;
}

function sqlStrValid(str) {
	if (typeof(str) == "string") {
		str = str.replace(/'/g, "''");
		return str;
	}
	return str;
}

//问号后的解析 -- 生成查询字段
function parseQueryFields(req) {
	if (req.query) {
		for (var k in req.query) {
			if (k == "FIELDS")
				return req.query[k];
		}
	}
	return "*";
}

//问号后的解析 -- 是否要统计总数
function parseQueryIsCount(req) {
	if (req.query) {
		for (var k in req.query) {
			var v = req.query[k];
			if (k == "LIMIT" && v.indexOf(",") > 0) {
				return v.split(",")[0] == 0;
			}
		}
	}
	return false;
}

function makeKV(k, v) {
	var field;
	if (v.indexOf("%") >= 0) {
		field = " " + k + " like '" + v + "'";
	} else if (v.indexOf(",") > 0) {
		field = " " + k + " in (" + v + ")";
	} else if (v == "NULL") {
		field = " " + k + " is null";
	} else if (v == "NOTNULL") {
		field = " " + k + " is not null";
	} else
		field = " " + k + "='" + v + "'";
	return field;
}

//问号后的解析 -- 生成WHERE 条件
function parseQueryParams(req, isCount) {
	var sql = "";
	if (req.query) {
		var fields = ["1=1"];
		var limit;
		var order;
		var group;
		var descOrAsc;
		for (var k in req.query) {
			var v = req.query[k];
			if (k == "FIELDS")
				continue;
			//计算COUNT就不要这些属性
			if (isCount === true && (k == "LIMIT" || k == "DESC" || k == "ASC")) {
				continue;
			}
			if (k == "LIMIT") {
				limit = " LIMIT " + v + " ";
			} else if (k == "GROUPBY") {
				group = " GROUP BY " + v + " ";
			} else if (k == "ORDERBY") {
				order = " ORDER BY " + v + " ";
			} else if (k == "DESC" || k == "ASC") {
				descOrAsc = v + " ";
			} else {
				var ww = "";
				var fd;
				if (k.indexOf("str") == 0)
					v = sqlStrValid(v);

				if (k.indexOf(",") > 0) {
					var ks = k.split(",");
					var fds = [];
					ks.forEach(function(it) {
						fd = makeKV(it, v);
						fds.push(fd);
					})
					fields.push(" (" + fds.join(" OR ") + ") ");
				} else {
					fd = makeKV(k, v);
					fields.push(fd);
				}
			}
		}
		if (fields.length > 0) {
			sql += fields.join(" AND ");
		}
		if (group)
			sql += group;
		if (order)
			sql += order;
		if (descOrAsc)
			sql += descOrAsc;
		if (limit)
			sql += limit;
	}
	//console.log("QUERY TAG:", sql);
	return sql;
}

function dbLoginCheck(req, res, next) {
	console.log("Login now>>>");
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
	var sqlstr = "SELECT * FROM t_sys_user WHERE strUserId='" + userid + "'";
	dbcon(sqlstr, function(err, vals, fields) {
		if (err) {
			next(err);
		} else {
			if (vals && vals[0]) {
				var user = vals[0];
				if (user.strPassword == userpwd) {
					var rs = {
						status: 1,
						data: [user]
					};
					sqlstr = "SELECT * FROM t_sys_role WHERE "+NID+"=" + user.nRoleId;
					dbcon(sqlstr, function(err, vals, fields) {
						if (err) {
							next(err);
						} else {
							if (vals && vals[0]) {
								rs.data.push(vals[0]);
								res.send(rs);
								writeOpreationLog(req);
							} else {
								next({
									status: 401,
									msg: "您无权限登录或角色已被删除!"
								});
							}
						}
					});
				} else {
					next({
						status: 401,
						msg: "密码错误!"
					});
				}
			} else
				next({
					status: 401,
					msg: "用户不存在!"
				});
		}
	});
}

function writeOpreationLog(req) {
	// var userid = parseInt(req.cookies.userId) || 0;
	// //console.log(req.headers);
	// var nMenuId = req.headers['menu-nid'] || 0;
	// var current = moment().format("YYYYMMDDHHmmss");
	// var nOprType = req.method == "POST" ? 3 : 4;
	// var httpUrl = req.originalUrl || "";
	// var sqlstr = "INSERT INTO \
	// 	t_sys_log(nUserId,nMenuId,nOprTime,strOprContent,nOprType,strHttpUri,strHttpMethod) \
	// 	   VALUES(%d     ,%d     ,%s      ,'%s'         ,%d      ,'%s'      ,'%s'         )";
	// sqlstr = util.format(
	// 	sqlstr, userid, nMenuId, current, "", nOprType, httpUrl, req.method);
	// dbcon(sqlstr, function(err, vals, fields) {
	// 	if (err) {
	// 		console.log(sqlstr, userid, nMenuId, nOprType, httpUrl, req.method);
	// 		console.error(err);
	// 	}
	// });
}

function dbExportCommList(req, res, next) {
	//console.log("dbExportCommList!!");
	var table = req.params.tbl || "";
	var fds = parseQueryFields(req);
	var sqlstr = "SELECT " + fds;
	var xlsName = moment().format("YYYYMMDDHHmmssSSS") + ".xlsx";
	var pp = process.env.TMPDIR + xlsName;
	pp = path.normalize(pp);
	// pp = pp.replace(/\\/g, "/");
	// sqlstr += " INTO OUTFILE  '" + pp + "' CHARACTER SET gbk ";
	sqlstr += " FROM " + table;
	var sqltag = parseQueryParams(req);
	if (sqltag)
		sqlstr += " WHERE " + sqltag;
	dbQueryDealer(sqlstr, req, res, next, function(rs, vals) {
		
		var fn = config.tempdir + xlsName;
		rs.data = rs.data || [];
		var len = rs.data.length;
		var xlData = [];
		var xlHeads = [];
		for(var i in rs.data){
			var r = rs.data[i];
			var row = [];
			for(var k in r){
				var v = r[k];
				if(i==0){
					xlHeads.push(k);
				}
				if(v==null)
					v = "";
				row.push(String(v));
			}
			xlData.push(row);
		}
		xlData.unshift(xlHeads);
		// console.log(xlData);
		rs.data = {};
		try{
			var buffer = xlsx.build([{name: table, data: xlData}]);
			fs.writeFileSync(pp, buffer, 'binary');
			rs.data.fileUrl = fn;
			rs.data.affectedRows = len;
		}catch(err){
			console.error(err);
		}
	});
}

//直接sql---正常情况请勿使用
router.get('/sql/:sql', function(req, res, next) {
	var sqlstr = req.params.sql || "";
	dbQueryDealer(sqlstr, req, res, next);
});

//通用导出某表
router.get('/export/:tbl', dbExportCommList);

//通用查询某表
router.get('/:tbl', dbQueryCommList);

//通用查询某表ByID
router.get('/:tbl/:id', dbQueryCommById);

//通用删除某表
router.delete('/:tbl', dbDeleteComm);

//通用删除某表ByID
router.delete('/:tbl/:id', dbDeleteCommById);

//通用新增某表
router.post('/:tbl', dbInsertComm);

//通用更新某表
router.put('/:tbl', dbUpdateComm);

router.put('/:tbl/:id', dbUpdateComm);

module.exports = router;