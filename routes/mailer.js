var nodemailer = require("nodemailer");
var smtpTransport = require('nodemailer-smtp-transport');


var transport = nodemailer.createTransport(smtpTransport({
    host: 'szsmtp06.zte.com.cn',
    port: 25,
    // secure:true,
    auth: {
        user: 'DingHui117748', //你真实的邮箱
        pass: '10017748' //真实的密码
    }
}));


function sendMail(subject, towhos, content, cb) {

    var mailOptions = {
        from: '"GPU分布式平台" <ding.hui@zte.com.cn>',
        subject: subject,
        html: content
    };
    if (typeof(towhos) == "array")
        mailOptions.to = towhos.join(",");
    else
        mailOptions.to = String(towhos);
    transport.sendMail(mailOptions, function(error, info) {
        console.log("MAIL RESP：",error,info);
        if (error) {
            cb && cb(error);
        } else {
            cb && cb(null,info.response);
        }
    });
}

//sendMail("TEST MAIL","zhu.xi@zte.com.cn",'<p style="color: #777;margin: 10px 50px;">第一步：SMTP使用申请人账户名进行验证  请登录网站 https://szsmtp06.zte.com.cn/ 设置一个新密码 用户名：DingHui117748 密 码： 10017748  在修改密码的时候，点了提交按钮后，页面显示Password change request  submitted，则修改成功,如返回登录界面，重新输入用户名和初始密码登录重新设置新密码。  <br>第二步：使用新设置账户名和密码，在绑定了固定IP的电脑客户端上配置smtp.smtp服务器为 szsmtp06.zte.com.cn  ，如果解析有问题可以直接用IP：10.30.18.230，建议尽量使用域名，防止服务器的IP发生变更引起</p>');

module.exports = sendMail;