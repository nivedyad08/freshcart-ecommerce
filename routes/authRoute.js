const express = require("express")
const authRoute = express()
const authCheck = require('../middleware/userAuth')
const session = require('../config/session')
authRoute.use(session)
const hbs = require('express-handlebars')
//importing layouts
// const importLayout  = require('../config/layouts')
// authRoute.importLayout
authRoute.engine('hbs', hbs.engine({
  extname: 'hbs',
  defaultLayout: 'user-layout',
  layoutsDir: __dirname + '../../views/layouts/',
  partialsDir: __dirname + '../../views/partials/'
}))
authRoute.set('views', './views/user')

const loginController = require('../controllers/user/loginController')

//Sign Up
authRoute.get('/signup', authCheck.isLogin, loginController.signUp)
authRoute.post('/signup', loginController.createUser)
authRoute.get('/verify', loginController.verifyMail)

authRoute.post('/reset-password/send-otp', authCheck.isLogin ,loginController.sendOtp)
authRoute.get('/reset-password-otp/:id', authCheck.isLogin ,loginController.otpViewPage)
authRoute.post('/validate/otp', authCheck.isLogin ,loginController.validateOtp)
authRoute.post('/update/password', authCheck.isLogin ,loginController.updatePassword)
//Sign In
authRoute.get('/signin', authCheck.isLogin, loginController.signin)
authRoute.post('/signin', loginController.authenticate)


module.exports = authRoute