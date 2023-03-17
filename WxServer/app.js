let express = require( 'express' )
let cors = require( 'cors' )
let bodyParser = require( 'body-parser' )
let router = require( './API/index' )
let app = express()
// app.use( bodyParser.json() );  //配置解析，用于解析json和urlencoded格式的数据
app.use( '/public', express.static( 'public' ) );//将文件设置成静态
// app.use( bodyParser.urlencoded( { extended: false } ) );
app.use( cors() )              //配置跨域
app.use( router )              //配置路由

app.listen( 8815, () => {
  console.log( '服务器启动成功' );
} )
