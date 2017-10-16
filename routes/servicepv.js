var dbcon = require("./mysqlconn.js");
var config = require('../config');

servicepv = function(req,res,next,url){
  if(url.parse(req.url).pathname == "/api/t_service"){
   	var arg = url.parse(req.url, true).query;
    if(arg.nId){
    	var sqlstr = "SELECT * FROM t_service WHERE nId="+arg.nId;
    	dbcon(sqlstr, function(err, vals, fields) {
			if (err) {
				if(config.showsql)
					err.sql = sqlstr;
				next(err);
			} else {
				var str = JSON.stringify(vals);
				var json=JSON.parse(str);
				var pv = json[0].pv + 1;
				var strsql = "UPDATE t_service SET pv='" + pv +"' WHERE nId=" + arg.nId;
				dbcon(strsql, function(err, vals, fields) {
					console.log(vals);
				});
			}
		});

    }
  }

  next();
}

module.exports = servicepv;