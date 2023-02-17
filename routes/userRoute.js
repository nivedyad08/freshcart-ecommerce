const express   = require('express')
const userRoute = express()
const authCheck = require('../middleware/userAuth')
const session   = require('../config/session')
userRoute.use(session)
//importing layouts
const hbs       = require('express-handlebars')
userRoute.engine('hbs', hbs.engine({
    extname: 'hbs',
    defaultLayout: 'user-layout',
    layoutsDir: __dirname + '../../views/layouts/',
    partialsDir: __dirname + '../../views/partials/'
  }))
userRoute.set('views', './views/user')
//end
const userController = require('../controllers/user/userController')

//User Home
userRoute.get('/' , userController.userHome)
//product details
userRoute.get('/product/:productName/:productId' , userController.productDetails)
userRoute.put('/product/:productName/:productId' , userController.addToCart)
userRoute.get('/category/:name/:id' , userController.showProducts)
userRoute.post('/product/search' , userController.searchProducts)
//Cart
userRoute.get('/cart/view',authCheck.isUser, userController.showCart)
userRoute.put('/cart/remove/item/:id',authCheck.isUser, userController.removeItem)
userRoute.put('/cart/update/quantity/:id',authCheck.isUser, userController.updateCart)
//Logout
userRoute.get('/signout' ,userController.logout)
//Account
userRoute.get('/account-settings',authCheck.isUser ,userController.accountSettings)
userRoute.post('/account-settings',authCheck.isUser ,userController.updateAccountSettings)
userRoute.get('/delete/account/:email',authCheck.isUser ,userController.deleteAccount)
userRoute.get('/account-address',authCheck.isUser ,userController.accountAddresses)
userRoute.post('/add/address',authCheck.isUser ,userController.addAddress)
userRoute.put('/delete/address/:id',authCheck.isUser ,userController.deleteAddress)
userRoute.get('/address/edit/:id',authCheck.isUser ,userController.editAddress)
userRoute.post('/address/update/:id',authCheck.isUser ,userController.updateAddress)
//Checkout
userRoute.post('/checkout/:userId',authCheck.isUser ,userController.checkout)
userRoute.get('/paypal-checkout/:userId',authCheck.isUser ,userController.paypalCheckout)
userRoute.post('/paypal/place/order',authCheck.isUser ,userController.paypalSummary)
userRoute.post('/place/order',authCheck.isUser ,userController.orderPlacement)
//Orders
userRoute.get('/orders' ,authCheck.isUser,userController.orders)
userRoute.put('/cancel/order/:id',authCheck.isUser ,userController.cancelOrder)
userRoute.get('/orders/details/:id' ,authCheck.isUser,userController.orderDetails)
//wallet
userRoute.get('/wallet',authCheck.isUser,userController.wallet)
//coupon
userRoute.put('/redeem-coupon',authCheck.isUser,userController.redeemCoupon)
//Invoice
userRoute.put('/download/invoice/:orderId',authCheck.isUser,userController.invoice)
module.exports  = userRoute