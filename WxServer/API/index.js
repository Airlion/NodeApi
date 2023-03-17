let express = require( 'express' )
let db = require( '../db/index' )
let router = express.Router()
const { evaluate, sum, add } = require( 'mathjs' )
const request = require( 'request' );
// 业务逻辑
var mywxid = "wxid_2v37ocs4vk0a22"; //机器人wxid
var url = "http://127.0.0.1:7777/DaenWxHook/httpapi/?wxid=" + mywxid;
var path = "DaenWxHook/httpapi/"
let chatId = 0
let isSet = false
let code = ''
let unNum = false
// 初始化
let __Admin = []
const admql = 'select * from admin'

router.post( '/', ( req, res ) => {
  req.on( "data", function ( MSG ) {
    try {
      var params = JSON.parse( MSG.toString() );
    } catch ( error ) {
      return;
    }
    console.log( '消息人的id: ', params.data.data.finalFromWxid );
    if ( params.data.data.fromType == '2' ) { //是群聊消息
      //处理添加管理员消息'

      if ( isSet == true ) {
        if ( parseInt( params.data.data.msg ) == parseInt( code ) ) {
          let isql = 'insert into admin(adid) value(?)'
          db.query( isql, [params.data.data.finalFromWxid], ( err, data ) => {
          } )
          code = 0
          isSet = false
          sendMessage( {
            "type": "Q0001",
            "data": {
              wxid: wxName,
              msg: '设置成功'
            }
          } )
        }
      }
      if ( params.data.data.msg.substring( 0, 5 ) == '@@管理员' ) {
        console.log( "开启了添加管理员模式" );
        isSet = true
        code = params.data.data.msg.substring( 5 )
        setTimeout( () => {
          isSet = false
        }, 40000 )
      }
      db.query( admql, ( err, results ) => {
        __Admin = JSON.stringify( results ) // 配置管理员身份id
        if ( __Admin.indexOf( params.data.data.finalFromWxid ) != -1 ) {
          switch ( params.event ) {
            case 10008: // 群聊消息
              if ( params.data.data.msgSource == 0 ) {
                chatMsg( params.data.data )
              }
              break
            // 后续开发
            case 10009:
          }
          // 
        }
      } )


    }


  } )
} )

// 定义方法函数

function chatMsg( data ) {  // 处理群聊消息
  //初始化这两个数据
  chatId = 0
  wxName = data.fromWxid //群聊id
  const sq1 = 'select chatid from user where wxname = ?'
  db.query( sq1, [wxName], ( err, result ) => {  //寻找这条消息的群聊id chatid
    if ( result.length > 0 ) {
      chatId = result[0].chatid
    } else {  //没有寻找到就创建一个
      const esq1 = 'insert into user(wxname) value(?);SELECT LAST_INSERT_ID()' //插入一条群聊信息，id为自增，并且记录chatid = 群聊的id
      const esq2 = 'insert into asum(allsum,chatid) value(0,?)'  //为这个id初始化一个总金额为0
      db.query( esq1, [wxName], ( err, result, fid ) => {
        if ( result[1].length > 0 ) {
          chatId = JSON.stringify( result[1][0]['LAST_INSERT_ID()'] )
          db.query( esq2, [chatId] )
          sendMessage( {
            "type": "Q0001",
            "data": {
              wxid: wxName,
              msg: '初始化成功，请重新使用'
            }
          } )
        } else {
          chatId = 0
        }

      } )

    }
    //得到群聊id开始处理消息    业务逻辑层

    if ( chatId ) {
      // 初始化
      let chatid = chatId
      let dbData = {}
      unNum = false
      // 处理#号消息
      console.log( data.msg );
      if ( data.msg.includes( '-' ) || data.msg.includes( '+' ) ) { //截取第一个字符串 是否为 #
        //初始化
        let reg = /^[0-9].+?[0-9]*$/;
        let sum = data.msg.substring( 0, 1 )
        console.log( '符号是什么', sum );
        let newSum = data.msg.substring( 1 )
        console.log( '公式是什么', newSum );
        let news = newSum.split( '*' )

        if ( news.length > 1 ) {


          if ( reg.test( news[0] ) && reg.test( news[1] ) ) {

          } else {

            unNum = true
          }

        }
        if ( newSum.includes( '*' ) ) {

        } else if ( newSum.includes( '/' ) ) {
        } else if ( newSum.includes( '×' ) ) {

          newSum = newSum.replace( '×', '*' )

        }
        else {

          let reg1 = /^[0-9].+?[0-9]*$/;

          if ( reg1.test( newSum ) ) {
            newSum = `${newSum}*1`
          } else {

            unNum = true
          }
        }
        switch ( sum ) {
          case '-':
            let sym = '-'
            dbData = {
              newSum,
              sym,
              chatid
            }
            sumAdd( dbData )
            break
          case '+':
            let sy = '+'
            dbData = {
              newSum,
              sym: sy,
              chatid
            }
            sumAdd( dbData )
            break
        }
      }

      //处理 /显示 消息
      if ( data.msg == '/显示' ) {
        selcSum( chatid )
      }

      //处理 /整合 消息
      if ( data.msg == '/整合' ) {
        let sele1 = 'select * from dbsum where chatid = ?' // 根据id查询这个id下的每一项的金额
        let sele2 = 'select * from asum where chatid = ?' //根据id查询总金额
        let sq3 = 'update asum set allsum = ? where chatid = ?' //根据chatid更新总金额
        let sq4 = 'DELETE from dbsum WHERE chatid = ?'  // 根据id删除每一项的数据
        let sq5 = 'DELETE from supdbsum WHERE chatid = ?'  // 根据id删除每一项的数据
        let allSum = []

        db.query( sele2, [chatid], ( err, data ) => {   //把没结算的总金额加入到allSum数组准备运算
          if ( data.length > 0 ) {
            allSum.push( data[0].allsum )
          }
        } )

        db.query( sele1, [chatid], ( err, data ) => {  //把总金额和每一项的金额进行查询
          let nsumb = []
          if ( data.length > 0 ) {
            data.forEach( ( item ) => { //查询 每一项的allSum总金额，如果是sym是-号就把这个值变成负数
              if ( item.sym == '-' ) {
                parseFloat
                allSum.push( `-${parseFloat( item.allsum ).toFixed( 2 )}` )
              } else {
                allSum.push( parseFloat( item.allsum ).toFixed( 2 ) )
              }
            } )
            if ( allSum.length > 1 ) {

              let alsum = sum( allSum ).toFixed( 2 )
              nsumb.push( `总余额: ${alsum}` )
              nsumb.unshift( `整合数据\r实时余额: ${alsum}` )
              db.query( sq3, [alsum, chatid] )
              db.query( sq4, [chatid] )
              db.query( sq5, [chatid] )
            }
          } else {

            nsumb.push( `总余额: ${allSum[0].toFixed( 2 )}` )
            nsumb.unshift( `整合数据\r实时余额: ${parseFloat( allSum[0] ).toFixed( 2 )}` )
          }

          let nsum = nsumb.join( "\r" )
          sendMessage( {
            "type": "Q0001",
            "data": {
              wxid: wxName,
              msg: nsum
            }
          } )
        } )
      }
      //处理 /撤回 消息
      if ( data.msg == '/撤回' ) {
        let sq1 = 'SELECT id,sym,sumone,sumtwo,chatid FROM supdbsum WHERE chatid = ? ORDER BY creattime DESC LIMIT 1'
        db.query( sq1, [chatid], ( err, data ) => { //查询需要被删除数据的信息
          console.log( data );
          if ( data.length > 0 ) {
            let nData = data[0]
            let isq1 = 'DELETE FROM supdbsum WHERE id = ?'
            db.query( isq1, [nData.id], ( err, data1 ) => {
              if ( data.length > 0 ) {
                let oldsum = nData.sumone //查询没有叠加的数据的one值
                let sid = nData.chatid
                let sym = nData.sym
                let sumtwo = nData.sumtwo
                //先查询然后再更新
                let iisql = 'select sumone,id from dbsum where chatid = ? && sumtwo = ? && sym = ?'
                db.query( iisql, [nData.chatid, nData.sumtwo, nData.sym], ( err, data ) => {
                  if ( data.length > 0 ) {
                    let iisq2 = 'UPDATE dbsum SET sumone = ? , allsum = ? WHERE sym = ? && sumtwo =? && chatid = ?'
                    let isu = sum( data[0].sumone - oldsum )
                    if ( isu == 0 ) {
                      let iisq3 = 'DELETE FROM dbsum WHERE id = ?'
                      db.query( iisq3, [data[0].id] )
                    } else {
                      db.query( iisq2, [isu, sum( isu * sumtwo ), sym, sumtwo, sid] )
                    }
                    selcSumTwo( chatid )
                  }

                } )
              } else {
                sendMessage( {
                  "type": "Q0001",
                  "data": {
                    wxid: wxName,
                    msg: '出现未知错误10002'
                  }
                } )
              }
            } )

          } else {
            sendMessage( {
              "type": "Q0001",
              "data": {
                wxid: wxName,
                msg: '没有可以撤回的数据'
              }
            } )
          }
        } )
      }
      //处理 /清账 消息
      if ( data.msg == '/清账' ) {
        let sele1 = 'select * from dbsum where chatid = ?' // 根据id查询这个id下的每一项的金额
        let sele2 = 'select * from asum where chatid = ?' //根据id查询总金额
        let sq3 = 'update asum set allsum = ? where chatid = ?' //根据chatid更新总金额
        let sq4 = 'DELETE from dbsum WHERE chatid = ?'  // 根据id删除每一项的数据
        let sq5 = 'DELETE from supdbsum WHERE chatid = ?'  // 根据id删除每一项的数据
        let allSum = []

        db.query( sele2, [chatid], ( err, data ) => {   //把没结算的总金额加入到allSum数组准备运算
          if ( data.length > 0 ) {
            allSum.push( data[0].allsum )
          }
        } )

        db.query( sele1, [chatid], ( err, data ) => {  //把总金额和每一项的金额进行查询
          let nsumb = []
          if ( data.length > 0 ) {
            data.forEach( ( item ) => { //查询 每一项的allSum总金额，如果是sym是-号就把这个值变成负数
              if ( item.sym == '-' ) {
                parseFloat
                allSum.push( `-${parseFloat( item.allsum ).toFixed( 2 )}` )
              } else {
                allSum.push( parseFloat( item.allsum ).toFixed( 2 ) )
              }
            } )
            if ( allSum.length > 1 ) {

              let alsum = sum( allSum ).toFixed( 2 )
              nsumb.push( `总余额: ${alsum}` )
              nsumb.unshift( `清账数据\r实时余额: ${alsum}` )
              db.query( sq4, [chatid] )
              db.query( sq5, [chatid] )
            }
          } else {

            nsumb.push( `总余额: ${allSum[0].toFixed( 2 )}` )
            nsumb.unshift( `清账数据\r实时余额: ${parseFloat( allSum[0] ).toFixed( 2 )}` )
          }
          db.query( sq3, [0, chatid] )
          let nsum = nsumb.join( "\r" )
          sendMessage( {
            "type": "Q0001",
            "data": {
              wxid: wxName,
              msg: nsum
            }
          } )
          setTimeout( () => {
            sendMessage( {
              "type": "Q0001",
              "data": {
                wxid: wxName,
                msg: '清账完成，数据初始化'
              }
            } )

          }, 2000 )
          setTimeout( () => {
            selcSum( chatid )
          }, 3500 )
        } )
      }
    }



    // 业务逻辑结束

  } )
}


//判断是否当前的群聊id是否存在，并且查询他的id值


// 每一项记录的运算
function sumAdd( dbData ) {
  console.log( '是否有效表达式false表示可以', unNum )
  if ( !unNum ) {
    if ( dbData.newSum.includes( '*' ) ) {
      let news = dbData.newSum.split( '*' )


      let isum = sum( parseFloat( news[0] ).toFixed( 2 ) * parseFloat( news[1] ).toFixed( 2 ) )
      // let isum = evaluate( `${ news[0]} * ${ news[1]}` )
      let sq1 = 'INSERT into dbsum(sym,sumone,sumtwo,allsum,chatid,creattime) VALUE(?,?,?,?,?,now())'
      let sq4 = 'INSERT into supdbsum(sym,sumone,sumtwo,allsum,chatid,creattime) VALUE(?,?,?,?,?,now())'
      let sq2 = 'select sumone from dbsum where chatid = ? && sumtwo = ? && sym = ?' // 查询当前数据是否有一样的，如果有就进行合并
      let sq3 = 'update dbsum set sumone = ? , allsum = ?  where chatid = ? && sym = ? && sumtwo = ?' //更新数据
      db.query( sq2, [dbData.chatid, news[1], dbData.sym], ( err, data ) => {
        if ( data.length > 0 ) {
          let arr = []
          data.forEach( ( item ) => {
            arr.push( item.sumone )
          } )
          arr.push( news[0] )
          let isu = sum( arr )
          db.query( sq3, [isu, sum( isu * news[1] ), dbData.chatid, dbData.sym, news[1]], ( err, data ) => {
            if ( !err ) {
              //执行显示功能
              selcSum( dbData.chatid )
            }
          } )

        } else {
          db.query( sq1, [dbData.sym, news[0], news[1], isum, dbData.chatid], ( err, data ) => {
            if ( err ) {
              sendMessage( {
                "type": "Q0001",
                "data": {
                  wxid: wxName,
                  msg: '格式错误'
                }
              } )
            } else {
              //执行显示功能
              selcSum( dbData.chatid )
            }
          } )

        }

      } )
      db.query( sq4, [dbData.sym, news[0], news[1], isum, dbData.chatid], ( err, data ) => {  //给另外一张表也添加数据

        if ( err ) {
          console.log( '执行了这个吗' );
          sendMessage( {
            "type": "Q0001",
            "data": {
              wxid: wxName,
              msg: '格式错误'
            }
          } )
        } else {
          // 执行显示功能
          // 上一个函数已经执行过一次了，这里就不用执行了
        }
      } )

    } else {
      sendMessage( {
        "type": "Q0001",
        "data": {
          wxid: wxName,
          msg: '未添加的表达式'
        }
      } )
    }
  } else {

    sendMessage( {
      "type": "Q0001",
      "data": {
        wxid: wxName,
        msg: '未添加的表达式'
      }
    } )
  }
}


// 封装一个单独查询数据库函数 上面也重写了一次，解构没有设计好导致的函数

function selcSum( chatid ) {


  let arr = []
  let als = 0
  let Amount = 0 //没有结算前的总金额，如果没有分账。就直接使用这个值
  let sele1 = 'select * from dbSum where chatid = ?'
  let sele2 = 'select allsum from asum  where chatid = ?'  //根据chatid 查询 总金额

  db.query( sele2, [chatid], ( err, data ) => {
    if ( data.length > 0 ) {

      arr.push( `整合金额: ${parseFloat( data[0].allsum ).toFixed( 2 )}` )
      Amount = Number( parseFloat( data[0].allsum ).toFixed( 2 ) )
      db.query( sele1, [chatid], ( err, data ) => {
        if ( data.length > 0 ) {
          data.forEach( ( item ) => {
            let sumd = ''

            if ( item.sym == '-' ) {
              als = Number( sum( als - parseFloat( item.allsum ) ).toFixed( 2 ) )
              sumd = `${item.sym}  ${item.sumone} * ${item.sumtwo} = ${item.allsum}`
            } else {

              als = Number( sum( als + parseFloat( item.allsum ) ).toFixed( 2 ) )
              sumd = `${item.sym} ${item.sumone} * ${item.sumtwo} = ${item.allsum}`
            }
            arr.push( sumd )
          } )
          als = Number( als )

          arr.unshift( `实时余额: ${sum( als + Amount ).toFixed( 2 )} ` )
          let nsum = arr.join( '\r' )
          sendMessage( {
            "type": "Q0001",
            "data": {
              wxid: wxName,
              msg: nsum
            }
          } )
        } else {
          arr.unshift( `实时余额:${Amount.toFixed( 2 )} ` )
          let nsum = arr.join( '\r' )
          sendMessage( {
            "type": "Q0001",
            "data": {
              wxid: wxName,
              msg: nsum
            }
          } )
        }
      } )
    }
  } )


}

function selcSumTwo( chatid ) {


  let arr = []
  let als = 0
  let Amount = 0 //没有结算前的总金额，如果没有分账。就直接使用这个值
  let sele1 = 'select * from supdbSum where chatid = ?'
  let sele2 = 'select allsum from asum  where chatid = ?'  //根据chatid 查询 总金额

  db.query( sele2, [chatid], ( err, data ) => {
    if ( data.length > 0 ) {
      arr.push( `整合金额:${data[0].allsum} ` )
      Amount = data[0].allsum
      db.query( sele1, [chatid], ( err, data ) => {
        if ( data.length > 0 ) {
          data.forEach( ( item ) => {
            let sumd = ''
            if ( item.sym == '-' ) {
              als = sum( als - item.allsum )
              sumd = `${item.sym}  ${item.sumone}* ${item.sumtwo} = ${item.allsum} `
            } else {
              als = sum( als + item.allsum )
              sumd = `${item.sym} ${item.sumone}* ${item.sumtwo} = ${item.allsum} `
            }
            arr.push( sumd )
          } )

          arr.unshift( `实时余额:${sum( als + Amount )} ` )

          let nsum = arr.join( '\r' )
          sendMessage( {
            "type": "Q0001",
            "data": {
              wxid: wxName,
              msg: nsum
            }
          } )
        } else {
          arr.unshift( `实时余额:${Amount} ` )
          let nsum = arr.join( '\r' )
          sendMessage( {
            "type": "Q0001",
            "data": {
              wxid: wxName,
              msg: nsum
            }
          } )
        }
      } )
    }
  } )


}
// res 构造发送消息函数

function sendMessage( msgData ) { //发送消息
  let options = {
    url,
    path,
    method: 'POST',
    body: JSON.stringify( msgData )
  }
  request.post( options );
}
module.exports = router

