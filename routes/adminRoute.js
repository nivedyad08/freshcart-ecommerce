const express           = require('express')
const adminRoute        = express()
const session           = require('../config/session')
const categoryUpload    = require('../config/multer').categoryUpload
const productUpload     = require('../config/multer').productUpload
const authCheck         = require('../middleware/adminAuth')
adminRoute.use(session)
//importing layouts
const hbs       = require('express-handlebars')
adminRoute.engine('hbs', hbs.engine({
    extname: 'hbs',
    defaultLayout: 'admin-layout',
    layoutsDir: __dirname + '../../views/layouts/',
    partialsDir: __dirname + '../../views/partials/'
}))
adminRoute.set('views', './views/admin')

const adminController = require('../controllers/admin/adminController')

//Home
adminRoute.get('/home',authCheck.isAdmin,adminController.adminHome)
//product
const cpUpload = productUpload.fields([{ name: 'thumbnail_image', maxCount: 1 }, { name: 'product_images', maxCount: 8 }])

adminRoute.get('/products',authCheck.isAdmin,adminController.products)
adminRoute.get('/add/product',authCheck.isAdmin,adminController.addProductView)
adminRoute.get('/product/edit/:productId',authCheck.isAdmin,adminController.editProductView)
adminRoute.post('/product/edit/:productId',cpUpload,adminController.editProduct)
adminRoute.put('/product/delete/:productId',adminController.deleteProduct)
adminRoute.post('/add/product',cpUpload,adminController.addProduct)
//Category
adminRoute.get('/categories',authCheck.isAdmin,adminController.categories)
adminRoute.get('/add/category',authCheck.isAdmin,adminController.addCategoryView)
adminRoute.post('/add/category',categoryUpload.single('category_image'),adminController.addCategory)
adminRoute.get('/category/details/:categoryId',authCheck.isAdmin,adminController.categoryDetails)
adminRoute.put('/category/delete/:categoryId',adminController.deleteCategory)
adminRoute.post('/category/edit',categoryUpload.single('category_image'),adminController.editCategory)
//User
adminRoute.get('/users',authCheck.isAdmin,adminController.users)
adminRoute.get('/add/user',authCheck.isAdmin,adminController.addUserView)
adminRoute.get('/user/verify_user/:userId',authCheck.isAdmin,adminController.verifyUser)
adminRoute.get('/user/block/:userId',authCheck.isAdmin,adminController.blockUser)
//Orders
adminRoute.get('/orders',authCheck.isAdmin,adminController.ordersList)
adminRoute.get('/order-details/:id',authCheck.isAdmin,adminController.orderDetails)
adminRoute.put('/change/order/status/:id',authCheck.isAdmin,adminController.changeOrderStatus)
//Coupon
adminRoute.get('/coupons',authCheck.isAdmin,adminController.listCoupons)
adminRoute.get('/create/coupon',authCheck.isAdmin,adminController.createCouponView)
adminRoute.post('/create/coupon',authCheck.isAdmin,adminController.createCoupon)
adminRoute.put('/coupon/activate/:id',authCheck.isAdmin,adminController.activateCoupon)
adminRoute.get('/coupon/edit/:id',authCheck.isAdmin,adminController.editCoupon)
adminRoute.post('/coupon/update/:id',authCheck.isAdmin,adminController.updateCoupon)
adminRoute.put('/cancel/order/:id',authCheck.isAdmin ,adminController.cancelOrder)
//Sales Report
adminRoute.get('/top-sales/report',authCheck.isAdmin,adminController.topSalesReport)
adminRoute.get('/sales/report',authCheck.isAdmin,adminController.salesReport)
//Revenue Report
adminRoute.get('/revenue/report',authCheck.isAdmin,adminController.revenueReport)
//logout
adminRoute.get('/logout',adminController.logout)

module.exports = adminRoute