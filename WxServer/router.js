let express = require( 'express' )
let router = express.Router()
let axio = require( './API/index' )
router.get( '/getkey', axio.getkey )
module.exports = router
