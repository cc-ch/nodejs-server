
var config = require('../config');
var http = require('http');
var _ = require('lodash');


function sethttpproxy(options){
	if(config.proxyhost && config.debug){
	  options.path = "http://"+options.hostname+":"+ (options.port||80) + options.path;
	  options.hostname = config.proxyhost;
	  options.port = config.proxyport;

	  console.log("external api:",options.path);
	}
}

var httpUtil = function(hostname,port){

	hostname = hostname || "127.0.0.1";
	port = port || 80;

	var httpSend = function(opt,postData,cb){

		var options = {
			hostname: hostname,
			port: port,
			// path: '/??',
			method: 'GET',
		};

		if (opt)
			options = _.extend(options, opt);

		if(!opt.path){
			cb && cb(new Error("参数错误：path未传入"));
			return;
		}
		sethttpproxy(options);
		postData = postData || {};

		console.log("CALL OUT API:",opt,postData);

		var req = http.request(options, function(res) {
			//console.log('STATUS: ' + res.statusCode);
			//console.log('HEADERS: ' + JSON.stringify(res.headers));
			res.setEncoding('utf8');
			var body = "";
			res.
			on('data', function(chunk) {
				body += (chunk);
				//console.log('chunk: ' + chunk);
			})
				.on('end', function() {
					console.log("CALL OUT API RESP:",body);
					if(cb){
						try{
							var resdata = JSON.parse(body);
							cb(null, resdata);
						}
						catch(er){
							cb && cb(null,body);
						}
					}
				})
		})
			.on('error', function(e) {
				cb && cb(e);
			});


		// write data to request body
		req.write(JSON.stringify(postData));
		req.end();
	}

	return {
		get:function(uri,cb){
			httpSend({path:uri,method:"GET"},null,cb);
		},
		post:function(uri,postdata,cb){
			httpSend({path:uri,method:"POST"},postdata,cb);
		},
		put:function(uri,postdata,cb){
			httpSend({path:uri,method:"PUT"},postdata,cb);
		},
		delete:function(uri,postdata,cb){
			httpSend({path:uri,method:"DELETE"},null,cb);
		},
	};
}

module.exports = httpUtil;
