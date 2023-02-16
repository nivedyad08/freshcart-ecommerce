const express           = require('express')
const adminLoginRoute   = express()
const session           = require('../config/session')
const authCheck         = require('../middleware/adminAuth')
adminLoginRoute.use(session)

adminLoginRoute.set('views', './views/admin')

const adminController = require('../controllers/admin/adminController')

//Login
adminLoginRoute.get('/',authCheck.isAdminLogin ,adminController.adminLogin)
adminLoginRoute.post('/',adminController.authenticate)

module.exports = adminLoginRoute