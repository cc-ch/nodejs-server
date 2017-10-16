var mysql=require("mysql");
var config = require('../config');
//var express = require('express');
var pool = mysql.createPool(config.mysql);

var query=function(sql,callback){
    pool.getConnection(function(err,conn){
        // console.log("SQL Start:",sql);
        if(err){
            console.warn("SQL Error:",err);
            callback && callback(err,null,null);
            if(config && config.showsql)
                err.sql = sql;
        }else{
            conn.query(sql,function(qerr,vals,fields){
                // console.log("SQL End: OK;ROWS:",vals?(vals.length||vals.affectedRows||0):0);
                //释放连接
                conn.release();
                //事件驱动回调
                callback && callback(qerr,vals,fields);
            });
        }
    });
};

module.exports=query;
