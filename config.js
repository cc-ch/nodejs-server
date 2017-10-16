var config = {
  debug:false,
  authorize:true,//是否使用鉴权
  webport:7105,
  showsql:false,
  nIdName:"nId",
  tempdir:'_temp_/',
  mysql:{
    host: '127.0.0.1',
    user: 'root',
    password: 'mysql57',
    database: 'cop',
    port: 3306
  }
};

module.exports = config;
