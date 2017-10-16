var _ = require('lodash');
var tokenMap = {};
var crypto = require('crypto')

//session失效时长1小时；
var expires = 60000 * 60;

function cryptoString(str) {
    str = String(str);
    console.log("HASH1:",str);
    var hash = crypto.createHash('sha256');
    hash.update(str);
    str = hash.digest('hex');
    hash = crypto.createHash('md5');
    hash.update(str);
    str = hash.digest('hex');
    console.log("HASH2:",str);
    return str;
}

function getTokenUserid(token) {
    if (!token)
        return -1;
    var info = tokenMap[token];
    if (info && info.userId) {
        var diftime = Date.now() - info.time;
        if (diftime < expires) {
            expireToken(token); //自动延长
            return info.userId;
        }
    }
    return -1;
}

//延长
function expireToken(token) {
    if (token) {
        var info = tokenMap[token];
        if (info)
            info.time = Date.now();
    }
}

//新增或更新TOKEN
function addOrUpdateToken(uid) {
    uid = uid || "";
    var dn = Date.now();
    var uinfo;
    var tokenTag;
    _.each(tokenMap,function(v,k){
        if(v && v.userId == uid){
            tokenTag = k;
            uid = tokenMap[k];
        }
    });
    if(uinfo){
        uinfo.time = dn;
    }
    else{
        tokenTag = cryptoString(uid+""+dn);
        tokenMap[tokenTag] = {
            userId: uid,
            time: dn
        };
    }
    return tokenTag;
}

//删除
function deleteToken(token){
    var uinfo = tokenMap[token];
    if(uinfo){
        var userId = uinfo.userId;
        _.each(tokenMap,function(v,k){
            if(v && v.userId == userId)
                delete tokenMap[k];
        });
    }
}

//一分钟检测老化
setInterval(function() {
    _.forEach(tokenMap, function(info, key) {

        if (info) {
            var diftime = Date.now() - info.time || 0;
            //超时，则老化
            if (diftime > expires) {
                delete tokenMap[key];
            }
        }
    });
}, 1000 * 60);

var tokenServer = {
    getTokenUserid: getTokenUserid,
    expireToken: expireToken,
    addOrUpdateToken: addOrUpdateToken,
    deleteToken:deleteToken
}

module.exports = tokenServer;