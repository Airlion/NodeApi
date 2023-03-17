let mysql = require( 'mysql' )

let db = mysql.createPool( {
  host: '127.0.0.1',     //数据库IP地址
  user: 'root',          //数据库登录账号
  password: 'bc123456',      //数据库登录密码
  database: 'wx_msg',   //要操作的数据库
  multipleStatements: true //允许多条查询语句
} )

module.exports = db
