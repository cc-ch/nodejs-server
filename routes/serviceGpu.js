var express = require('express');
var router = express.Router();
var config = require('../config');
var cp = require('child_process');
var exec = cp.execFile;
var spawn = cp.spawn;
var util = require("util");
var path = require("path");
var dbcon = require("./mysqlconn.js");
var httpUtil = require('../utils/httpUtil');
var fs = require("fs");
var sendMail = require("./mailer");

function getScriptPath() {
    return config.ceate_ftp_user_path || process.env.ROOT + "/externaltools/";
}

//邮件通知服务
function mailNotify(jobid){
    var sql = "select nMailNotify,strEmail,u.strUserId,j.strName as strJobName,u.strName as strUserName,j.nState,j.nStartTime,j.nEndTime from t_job as j,t_user as u where j.strUserId=u.strUserId and j.nId="+jobid;

    dbcon(sql, function(serr, ret) {
        if (ret && ret[0]){
            var job = ret[0];
            var subject = "GPU平台通知：您的计算任务【"+job.strJobName+"】";
            if(!job.nMailNotify){
                return;
            }
            if(job.nState == 2){
                subject += " 正在运行中";
            }
            else if(job.nState == 3){
                subject += " 已经执行成功";
            }
            else if(job.nState == 4){
                subject += " 已经执行失败";
            }
            else{
                return;
            }
            sendMail(subject,job.strEmail,'<p style="color: #444;margin: 10px 50px;">点击登录我们的平台查看详情：<a href="http://10.42.10.35:7090/">GPU平台</a></p>');
        }
    });
}

/***
执行shell脚本
***/
function runShell(cmd, args, cb) {
    try {
        var sh = spawn(cmd, args);
        var infos = "";

        sh.stdout.on('data', function(data) {
            infos += data;
        });

        sh.stderr.on('data', function(data) {
            infos += data;
        });

        sh.on('close', function(code) {
            cb && cb(null, infos);
        });
    } catch (er) {
        cb && cb(er);
    }
}

/***
ceate_ftp_user.sh 10011234 
1、入参为userid
2、返回值采用echo打印出来
{"userid":"10011234","path":"/home/ftp/10011234","password":"23#@^#@^#*"}
***/
function runCreateFTPUser(userid, bk) {
    // var cwd = process.cwd();
    if (!userid) {
        bk && bk(new Error("用户ID未传入。"));
        return;
    }
    var sliceExe = process.platform == "win32" ? "create_ftp_user.bat" : "./create_ftp_user.sh";
    exec(sliceExe, [userid], {
            cwd: getScriptPath()
        },
        function(error, stdout, stderr) {
            if (error !== null || !stdout) {
                console.error("ceate_ftp_user Error:", error);
                console.error("ceate_ftp_user stdout:", stdout);
                var er = new Error("调用创建FTP用户程序执行失败！");
                if (bk)
                    bk(er);
            } else {
                try {
                    var rst = JSON.parse(stdout);
                    bk && bk(null, rst);
                } catch (er) {
                    bk && bk(new Error("创建FTP用户程序结果解析失败," + stdout));
                }
            }
        }
    );
}

/***
create_ftp_job.sh 10011234   1234
1、入参为userid，jobid
2、返回值采用echo打印出来
{"jobpath":"/home/ftp/10011234/1234"}
***/
function runCreateFTPJob(userid, jobid, bk) {
    // var cwd = process.cwd();
    if (!userid) {
        bk && bk(new Error("用户ID未传入。"));
        return;
    }
    if (!jobid) {
        bk && bk(new Error("JOB ID未传入。"));
        return;
    }
    var sliceExe = process.platform == "win32" ? "create_ftp_job.bat" : "./create_ftp_job.sh";
    exec(sliceExe, [userid, jobid], {
            cwd: getScriptPath()
        },
        function(error, stdout, stderr) {
            if (error !== null || !stdout) {
                console.error("create_ftp_job Error:", error);
                console.error("create_ftp_job stdout:", stdout);
                var er = new Error("调用创建FTP JOB程序执行失败！");
                if (bk)
                    bk(er);
            } else {
                try {
                    var rst = JSON.parse(stdout);
                    bk && bk(null, rst);
                } catch (er) {
                    bk && bk(new Error("创建FTP JOB程序结果解析失败," + stdout));
                }
            }
        }
    );
}

/****
./Gftp -user 10000001 -passwd 123456 -newpasswd 888888
{"state":"ok"}
***/
function runSetFTPPwd(userid, newpwd, oldpwd, bk) {
    // var cwd = process.cwd();
    if (!userid) {
        bk && bk(new Error("用户ID未传入。"));
        return;
    }
    if (!newpwd) {
        bk && bk(new Error("密码未传入。"));
        return;
    }
    var sliceExe = process.platform == "win32" ? "gpu_change_passwd.bat" : "./gpu_change_passwd.sh";
    exec(sliceExe, [userid, oldpwd, newpwd], {
            cwd: getScriptPath()
        },
        function(error, stdout, stderr) {
            if (error !== null || !stdout) {
                console.error("gpu_change_passwd Error:", error);
                console.error("gpu_change_passwd stdout:", stdout);
                var er = new Error("调用修改FTP 用户密码程序执行失败！");
                if (bk)
                    bk(er);
            } else {
                try {
                    var rst = JSON.parse(stdout);
                    if (rst.state != "ok") {
                        bk && bk(new Error("修改FTP 用户密码失败:" + rst.state), rst);
                    } else
                        bk && bk(null, rst);
                } catch (er) {
                    bk && bk(new Error("修改FTP 用户密码程序结果解析失败," + stdout));
                }
            }
        }
    );
}

var service = {};

function sendResult(res, status, data, msg) {
    var d = {
        status: status
    };
    if (data) d.data = data;
    if (msg) d.msg = d.error = msg;
    res.status(status ? 200 : 500).send(d);
}

router.post('/callback', function(req, res, next) {
    sendResult(res, 1, null, 'TEST OK！');
});

//创建FTP用户
router.get('/ftp/user/:userid', function(req, res, next) {
    var userid = req.params.userid || "";
    runCreateFTPUser(userid, function(err, ret) {
        if (err || !ret) {
            if (!err)
                err = new Error("执行结果未返回");
            next(err);
        } else {
            ret.userid = ret.UserID || "";
            ret.password = ret.Password || "";
            ret.path = ret.Path || "";
            ret.quota = ret.Quota || "";
            var sql = "update t_user set strFtpName='%s',strFtpPassword='%s',strFtpPath='%s',strQuota='%s' where strUserId='%s'";
            sql = util.format(sql, ret.userid, ret.password, ret.path, ret.quota,userid);
            dbcon(sql, function(serr, ret) {
                if (serr)
                    next(serr);
                else
                    sendResult(res, 1, {
                        strFtpName: ret.userid,
                        strFtpPassword: ret.password,
                        strFtpPath: ret.path,
                        strQuota:ret.quota
                    });
            });
        }
    });
});

//修改FTP用户密码
router.put('/ftp/password', function(req, res, next) {
    var userid = req.body.strUserId || "";
    var oldpwd = req.body.strOldPwd || "";
    var newpwd = req.body.strNewPwd || "";
    runSetFTPPwd(userid, newpwd, oldpwd, function(err, ret) {
        if (err || !ret) {
            if (!err)
                err = new Error("执行结果未返回");
            next(err);
        } else {
            var sql = "update t_user set strFtpPassword='%s' where strUserId='%s'";
            sql = util.format(sql, newpwd, userid);
            dbcon(sql, function(serr, ret) {
                if (serr)
                    next(serr);
                else
                    sendResult(res, 1, {});
            });
        }
    });
});

//创建任务
router.get('/ftp/job/:userid/:jobid', function(req, res, next) {
    var jobid = parseInt(req.params.jobid) || 0;
    // console.log("CRT JOB:",req.params);
    runCreateFTPJob(req.params.userid, jobid, function(err, ret) {
        if (err || !ret) {
            if (!err)
                err = new Error("执行结果未返回");
            next(err);
        } else {
            ret.jobpath = ret.Path || "";
            var sql = "update t_job set strFtp='%s' where nId=%d";
            sql = util.format(sql, ret.jobpath, jobid);
            dbcon(sql, function(serr, ret) {
                if (serr)
                    next(serr);
                else
                    sendResult(res, 1, {
                        strFtp: ret.jobpath
                    });
            });
        }
    });
});

//取最新的待执行任务
router.get('/job', function(req, res, next) {
    // sql = util.format(sql,ret.jobpath,jobid);
    var gpuType = req.query.gpu_type;
    var gpuNum = req.query.gpu_num;
    var gpuparam = gpuType?(gpuType+"*"+gpuNum):"";
    var sql = "select * from t_job where nState=1 %s order by nPubTime asc limit 1";
    sql = util.format(sql,(gpuparam?(" and strCpu='"+gpuparam+"'"):""));
    console.log(sql);
    dbcon(sql, function(serr, ret) {
        if (serr)
            next(serr);
        else {
            var job = ret && ret[0];
            if (job) {
                var sql = "update t_job set nState=2,nStartTime=%d where nId=%d";
                sql = util.format(sql, (new Date).getTime(),job.nId);
                dbcon(sql,function(){
                    mailNotify(job.nId);
                });
                res.send({
                    job: job.nId,
                    path: job.strFtp,
                    main: job.strEntryFile,
                    cf: job.strCf
                });
            } else {
                res.send({});
            }
        }
    });
});


//更新执行情况
router.post('/job', function(req, res, next) {
    // console.log("CALL>>",req.body,typeof(req.body));
    var jobid = req.body.job;
    var state = (req.body.state == "finished") ? 3 : 4;
    var sql = "update t_job set nState=%d,nEndTime=%d where nId=%d";
    sql = util.format(sql, state,(new Date).getTime() ,jobid);
    if (!jobid || !state) {
        res.send("参数有误");
        return;
    }
    dbcon(sql, function(serr, ret) {
        mailNotify(jobid);
        if (serr)
            next(serr);
        else {
            res.send("ok");
        }
    });
});


//执行SHELL
router.post("/shell/:cmd", function(req, res, next) {
    var cmd = req.params.cmd || "ls";
    var args = req.body || [];
    runShell(cmd, args, function(er, dt) {
        if (er)
            next(er);
        else
            sendResult(res, 1, dt);
    })
});


//日志显示。
router.get("/log/:jobid", function(req, res, next) {
    var jobid = req.params.jobid || 0;
    var sql = "select * from t_job where nId=%d";
    sql = util.format(sql, jobid);
    dbcon(sql, function(serr, ret) {
        var job = ret && ret[0];
        if (serr || !job || !job.strFtp)
            next(serr||(new Error("未找到任务或任务路径")));
        else {
            var logfile = "/mnt/bigdata"+job.strFtp+"/log.txt";
            var b = fs.existsSync(logfile);
            console.log("LOG PATH:",logfile,b);
            if(b){
                runShell("tail", ["-100",logfile], function(er, dt) {
                    if (er)
                        next(er);
                    else
                        sendResult(res, 1, dt);
                })
            }
            else{
                sendResult(res, 1, "");
            }
        }
    });
});

//日志下载。
router.get("/log/download/:jobid", function(req, res, next) {
    var jobid = req.params.jobid || 0;
    var sql = "select * from t_job where nId=%d";
    sql = util.format(sql, jobid);
    dbcon(sql, function(serr, ret) {
        var job = ret && ret[0];
        if (serr || !job || !job.strFtp)
            next(serr||(new Error("未找到任务或任务路径")));
        else {
            var logfile = "/mnt/bigdata"+job.strFtp+"/log.txt";
            var b = fs.existsSync(logfile);
            if(b)
                res.download(logfile);
            else
                next(new Error("暂无日志信息"));
        }
    });
});

//终止任务
router.put("/job/:jobid", function(req, res, next) {
    var jobid = req.params.jobid;
    var sql = "update t_job set nState=%d where nId=%d";
    sql = util.format(sql, 5, jobid);
    dbcon(sql, function(serr, ret) {
        if (serr)
            next(serr);
        else {
            httpUtil("127.0.0.1", 7081).post("/", {
            //httpUtil("gpu_cluster", 7081).post("", {
                "type": "cancel",
                "jid": jobid
            },function(er,rs){
                console.log("CANCAL POST:",er,rs);
            });
            sendResult(res, 1, {});
        }
    });
});

router.get("/control_wg/:what",function(req, res, next) {
    var what = req.params.what;
    httpUtil("openresty", 8384).get("/control_wg/configchange?id="+what, function(er,rs){
        console.log("control_wg REQ:",er,rs);
    });
    sendResult(res, 1, {});
});

service.router = router;

module.exports = service;
