var config = require('../config');
var tokenServer = require('./serviceToken');

//session失效时长1小时；
var expires = 60000 * 60;

//检测授权信息
authorize = function(req, res, next, session) {
    // console.log(req.ip,req.hostname);
    var isLoginPath = req.path.indexOf("/login")==0;
    var issafePath = req.path == "/api/v_user_service_relation";
    if (!isLoginPath) {
        //需要鉴权的接口
        if ( !issafePath
              && (req.path.indexOf("/api") == 0 || req.path.indexOf("/upload") == 0)
              && req.hostname != "localhost"){
            var userid = req.session && req.session.userId || tokenServer.getTokenUserid(req.headers.token);
            if (userid >= 0  || !config.authorize) {
                //延长
                req.session.cookie.expires = new Date(Date.now() + expires);
                req.session.cookie.maxAge = expires;
                next();
            } else {
                var err = new Error("session expired");
                err.status = 0;
                err.msg = '注销或会话失效，请重新登录...';
                res.status(419);
                res.send(err);
                return;
            }
        }
        else{
            next();
        }
    //登陆的接口
    } else {
        if (req.method.toLowerCase() == "delete") {
            if(req.headers && req.headers.token)
                tokenServer.deleteToken(req.headers.token);
            req.session.destroy();
            res.send({status:1});
            return;
        }
        next();
    }
};

module.exports = authorize;