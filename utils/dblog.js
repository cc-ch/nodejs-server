var dbcon = require("../routes/mysqlconn.js");
var util = require('util');
var moment = require('moment');

function sqlStrValid(str) {
    if (typeof(str) == "string") {
        str = str.replace(/'/g, "''");
        return str;
    }
    return str;
}

function dblog(req, strContent, nType) {
    try {
        var userid = sqlStrValid(req.headers['userid']) || "";
        var sql = "insert into t_log(strUserId,nType,nTime,strContent,strHttpUri,strHttpMethod) " +
            "values('%s','%d','%d','%s','%s','%s')";
        if (!nType) {
            switch (req.method) {
                case "GET":
                    nType = 2;
                    break;
                case "POST":
                    nType = 3;
                    break;
                case "PUT":
                    nType = 4;
                    break;
                case "DELETE":
                    nType = 5;
                    break;
            }
        }
        var tt = moment().format("YYYYMMDDHHmmss");
        sql = util.format(sql, userid, nType || 0,  tt, strContent, req.originalUrl || "", req.method);
        dbcon(sql);

    } catch (er) {
        console.warn(er);
    }
}

module.exports = dblog;
