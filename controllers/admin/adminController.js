const Admin = require("../../models/adminMdl");
const Category = require("../../models/categoryMdl");
const Product = require("../../models/productMdl");
const User = require("../../models/userMdl");
const Order = require("../../models/ordersMdl");
const Coupon = require("../../models/couponMdl");
const Invoice = require("../../models/invoiceMdl");
const bcrypt = require("bcrypt");
const moment = require("moment");

const adminLogin = async (req, res) => {
  try {
    res.render("login", { title: "Fresh Cart - Login", error: "" });
  } catch (error) {
    console.log(error.message);
  }
};

const authenticate = async (req, res) => {
  try {
    let checkUser = await Admin.findOne({ email: req.body.email });
    if (checkUser) {
      bcrypt.compare(req.body.password, checkUser.password, (err, data) => {
        if (data) {
          req.session.admin = checkUser.email;
          res.redirect("/admin/home");
        } else res.render("login", { error: "Incorrect password !!" });
      });
    } else {
      res.render("login", { error: "Incorrect Credential !!" });
    }
  } catch (error) {}
};

const adminHome = async (req, res) => {
  try {
    const categories = await Category.find({ status: true }).lean();
    const topProducts = await bestSellingProducts((limit = 3));
    const totalRevenue = await Order.aggregate([
      { $match: { status: "Delivered" } },
      { $group: { _id: null, totalRevenue: { $sum: "$total_amount" } } },
    ]);
    const totalRefunds = await Order.aggregate([
      { $match: { status: "Cancelled" } },
      { $group: { _id: null, totalRefunds: { $sum: "$total_amount" } } },
    ]);
    const totalOrders = await Order.find({}).count();
    const totalProducts = await Product.find({}).count();
    const totalUsers = await User.find({}).count();
    const recentOrder = await Order.find({}).sort({ date: -1 }).limit(4).lean();
    recentOrder.map((item) => {
      return (item.date = moment(item.date).format("Do MMM YYYY"));
    });
    const cashOnDelivery = await Order.aggregate([
      {
        $group: {
          _id: "$payment_method",
          totalAmount: { $sum: "$total_amount" },
        },
      },
      { $match: { _id: { $eq: "Cash on delivery" } } },
      { $project: { _id: 1, totalAmount: 1 } },
    ]);
    const paypalTransaction = await Order.aggregate([
      {
        $group: {
          _id: "$payment_method",
          totalAmount: { $sum: "$total_amount" },
        },
      },
      { $match: { _id: { $eq: "paypal" } } },
      { $project: { _id: 1, totalAmount: 1 } },
    ]);
    const totalCouponAmount = await Order.aggregate([
      { $group: { _id: null, total: { $sum: "$couponAmount" } } },
      { $project: { _id: 0, total: 1 } },
    ]);

    res.render("dashboard", {
      title: "Fresh Cart - Home",
      categories: categories,
      topProducts: topProducts,
      totalRevenue: totalRevenue?.[0]?.totalRevenue,
      totalRefunds: totalRefunds?.[0]?.totalRefunds,
      totalOrders: totalOrders,
      totalProducts: totalProducts,
      totalUsers: totalUsers,
      recentOrder: recentOrder,
      cashOnDelivery: cashOnDelivery?.[0]?.totalAmount,
      paypalTransaction: paypalTransaction?.[0]?.totalAmount,
      totalCouponAmount: totalCouponAmount?.[0]?.total,
    });
  } catch (error) {
    console.log(error.message);
  }
};
//Product
const products = async (req, res) => {
  try {
    const productList = await Product.aggregate([
      { $match: { status: true } },
      {
        $lookup: {
          from: "categories",
          localField: "category_id",
          foreignField: "_id",
          as: "category",
        },
      },
    ]);
    res.render("product/products", { products: productList });
  } catch (error) {
    console.log(error.message);
  }
};
const addProductView = async (req, res) => {
  try {
    const categories = await Category.find({status:true}).lean();
    res.render("product/addProduct", {
      title: "Products",
      categories: categories,
    });
  } catch (error) {
    console.log(error.message);
  }
};
const addProduct = async (req, res) => {
  try {
      if(!req.error){
        req.body.images = req.files.product_images.map(function (obj) {
          return obj.filename;
        }) ;
        if (req.thumbnail_image) {
          req.body.thumbnail_image = req.thumbnail_image;
        }
        req.body.status = 1;
        const newProduct = await Product.insertMany(req.body);
        res.redirect("/admin/products");
      }else{
        res.render('product/addProduct',{productImgError:"Upload valid image"})
      }
  } catch (error) {
    console.log(error.message);
  }
};

const editProductView = async (req, res) => {
  try {
    const productDetails = await Product.findOne({
      _id: req.params.productId,
    }).lean();
    const categories = await Category.find({ status: true }).lean();
    res.render("product/editProduct", {
      title: "Edit Product",
      productDetails: productDetails,
      categories: categories,
    });
  } catch (error) {
    console.log(error.message);
  }
};

const editProduct = async (req, res) => {
  try {
    if (req.files.product_images) {
      req.body.images = req.files.product_images.map(function (obj) {
        return obj.filename;
      });
    }
    if (req.files.thumbnail_image) {
      const thumbnail = req.files.thumbnail_image;
      req.body.thumbnail_image = thumbnail[0].filename;
    }
    const updateProduct = await Product.findOneAndUpdate(
      { _id: req.params.productId },
      {
        $set: {
          name: req.body.name,
          category_id: req.body.category_id,
          price: req.body.price,
          unit: req.body.unit,
          quantity: req.body.quantity,
          images: req.body.images,
          description: req.body.description,
          thumbnail_image: req.body.thumbnail_image,
        },
      }
    );
    res.redirect("/admin/products");
  } catch (error) {
    console.log(error.message);
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.productId },
      { $set: { status: false } }
    );
    if (product) res.send("success");
    else res.send("error");
  } catch (error) {}
};
//Category
const categories = async (req, res) => {
  try {
    const categoryList = await Category.find({ status: true }).lean();
    res.render("category/categories", {
      title: "Category",
      category: categoryList,
    });
  } catch (error) {
    console.log(error.message);
  }
};
const addCategoryView = async (req, res) => {
  try {
    res.render("category/addCategory", { error: "" });
  } catch (error) {
    console.log(error.message);
  }
};
const addCategory = async (req, res) => {
  try {
    const category = await Category.findOne({
      name: { $regex: `${req.body.name}.*`, $options: "i" },
    });
    if (!category) {
      req.body.image = req.file.filename;
      req.body.status = 1;
      const newCategory = await Category.insertMany(req.body);
      res.redirect("/admin/categories");
    } else {
      res.render("category/addCategory", { error: "Category already taken" });
    }
  } catch (error) {
    console.log(error.message);
  }
};
const categoryDetails = async (req, res) => {
  try {
    const categoryDetails = await Category.findOne({
      _id: req.params.categoryId,
    });
    res.send(categoryDetails);
  } catch (error) {
    console.log(error.message);
  }
};
const editCategory = async (req, res) => {
  try {
    let imageName = "";
    if (req.file) {
      imageName = req.file.filename;
    } else {
      imageName = req.body.image;
    }
    let updateCategory = await Category.updateOne(
      { _id: req.body.categoryId },
      {
        $set: {
          name: req.body.name,
          image: imageName,
          offer: req.body.offer,
        },
      }
    );
    if (updateCategory) {
      res.redirect("/admin/categories");
    }
  } catch (error) {
    console.log(error.message);
  }
};
const deleteCategory = async (req, res) => {
  try {
    const deleteCategory = await Category.findOneAndUpdate(
      { _id: req.params.categoryId },
      { $set: { status: false } }
    );
    if (deleteCategory) res.send("success");
    else res.send("error");
  } catch (error) {
    console.log(error.message);
  }
};
//User
const users = async (req, res) => {
  try {
    const usersList = await User.find({}).lean();
    res.render("user/users", { users: usersList });
  } catch (error) {
    console.log(error.message);
  }
};
const addUserView = async (req, res) => {
  try {
    res.render("user/addUser");
  } catch (error) {
    console.log(error.message);
  }
};
const verifyUser = async (req, res) => {
  try {
    const user = await User.findOneAndUpdate(
      { _id: req.params.userId },
      { $set: { is_verified: true } }
    );
    if (user) res.send("success");
    else res.send("error");
  } catch (error) {
    console.log(error.message);
  }
};
const blockUser = async (req, res) => {
  try {
    const userInfo = await User.findOne({ _id: req.params.userId }).then(
      async (data, err) => {
        if (data.status) {
          const user = await User.findOneAndUpdate(
            { _id: req.params.userId },
            { $set: { status: false } }
          );
        } else {
          const user = await User.findOneAndUpdate(
            { _id: req.params.userId },
            { $set: { status: true } }
          );
        }
        res.send("success");
      }
    );
  } catch (error) {
    console.log(error.message);
  }
};
const deleteUser = async (req, res) => {
  try {
    const product = Product.findOneAndUpdate(
      { _id: userId },
      { $set: { status: 0 } }
    );
  } catch (error) {}
};

/* ----------------Order--------------  */
const ordersList = async (req, res) => {
  const ordersList = await Order.find({}).lean();
  ordersList.forEach((item, i) => {
    item.status == "Cancelled" ? (item.cancelStatus = "yes") : "";
    item.date = moment(item.date).format("Do MMM YYYY");
  });

  res.render("orders/order", { title: "Orders", ordersList: ordersList });
};

/* ----------------Order Details--------------  */
const orderDetails = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id }).lean();
    const date = moment(order.date).format("MMMM Do YYYY, h:mm a");
    const products = order.product;
    const address = await User.findOne(
      { "address.id": order.addressId },
      { _id: 0, address: { $elemMatch: { id: order.addressId } } }
    ).lean();
    const subtotal = order.total_amount + order.couponAmount;
    res.render("orders/orderDetails", {
      orderDetails: order,
      products: products,
      orderDate: date,
      address: address.address,
      subtotal: subtotal,
    });
  } catch (error) {
    console.log(error);
  }
};

/* ----------------Cancel Order--------------  */
const cancelOrder = async (req, res) => {
  const cancelOrder = await Order.findOneAndUpdate(
    { _id: req.params.id },
    { $set: { status: "Cancelled" } },
    { new: true }
  );
  if (cancelOrder) {
    const products = cancelOrder.product;
    const incrementQuantity = products.forEach(async function (item, i) {
      await Product.findByIdAndUpdate(item.id, {
        $inc: { quantity: item.quantity },
      });
    });
    const amount = cancelOrder.total_amount;
    const addToWallet = await User.updateOne(
      { _id: cancelOrder.userId },
      { $inc: { wallet: amount } }
    );
    res.json("success");
  } else res.json("error");
};
//Order Status chage
const changeOrderStatus = async (req, res) => {
  try {
    const updateStatus = await Order.findOneAndUpdate(
      { _id: req.params.id },
      { $set: { status: req.body.status } },
      { new: true }
    );
    console.log(updateStatus.orderId);
    if (req.body.status == "Delivered") {
      const generateInvoice = await Invoice.invoiceGeneration(
        updateStatus.userId,
        updateStatus._id
      );
    }
    if (updateStatus) {
      res.json("success");
    }
  } catch (error) {
    console.log(error);
  }
};
//Coupon
const listCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.aggregate([
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
    ]);
    const categories = await Category.find({ status: true }).lean();
    res.render("coupon/listCoupon", {
      coupons: coupons,
      categories: categories,
      message: "",
    });
  } catch (error) {
    console.log(error);
  }
};
//Create Coupon view
const createCouponView = async (req, res) => {
  try {
    const categories = await Category.find({ status: true }).lean();
    const coupons = await Coupon.find().lean();
    res.render("coupon/addCoupon", {
      categories: categories,
      coupons: coupons,
    });
  } catch (error) {
    console.log(error);
  }
};
/* ----------------Create Coupon--------------  */
const createCoupon = async (req, res) => {
  try {
    const checkCouponCode = await Coupon.find({ code: req.body.code });
    if (checkCouponCode.length == 0) {
      if (req.body.status) req.body.status = true;
      else req.body.status = false;
      const addCoupon = await Coupon.insertMany(req.body);
      if (addCoupon) res.redirect("/admin/coupons");
    } else {
      res.render("coupon/addCoupon", {
        error: "Coupon Code already exists !!",
      });
    }
  } catch (error) {
    console.log(error);
  }
};
//Activate/deactivate coupon
const activateCoupon = async (req, res) => {
  try {
    const updateCouponStatus = await Coupon.findById(req.params.id);
    if (updateCouponStatus.status == true) {
      await Coupon.findByIdAndUpdate(req.params.id, { status: false });
    } else {
      await Coupon.findByIdAndUpdate(req.params.id, { status: true });
    }
    res.send("success");
  } catch (error) {
    console.log(error);
  }
};
//Edit Coupon
const editCoupon = async (req, res) => {
  try {
    const editCoupon = await Coupon.findById(req.params.id).lean();
    if (editCoupon) {
      res.json({ editCoupon: editCoupon });
    }
  } catch (error) {
    console.log(error);
  }
};
//Update Coupon
const updateCoupon = async (req, res) => {
  try {
    req.body.data.status
      ? (req.body.data.status = true)
      : (req.body.data.status = false);
    const update = await Coupon.updateOne(
      { _id: req.params.id },
      { $set: req.body.data }
    );
    if (update) {
      res.json("success");
    }
  } catch (error) {
    console.log(error);
  }
};

/* ----------------Top Sales Report--------------  */
const topSalesReport = async (req, res) => {
  try {
    const topProductsReport = await bestSellingProducts();
    res.render("sales/top-sales-report", {
      topSaleProducts: topProductsReport,
    });
  } catch (error) {
    console.log(error);
  }
};

/* ----------------Sales Report--------------  */
const salesReport = async (req, res) => {
  try {
    let fromDate;
    let toDate;
    if (req.query) {
      fromDate = req.query.fromdate;
      toDate = req.query.todate;
    }
    const salesReport = await Order.find({
      date: {
        $gte: fromDate?.moment(fromDate).format("YYYY-MM-DD"),
        $lt: toDate?.moment(toDate).format("YYYY-MM-DD"),
      },
    }).lean();
    console.log(salesReport);
    salesReport.map((item) => {
      item.date = moment(item.date).format("Do MMMM YYYY");
    });
    const total = await Order.aggregate([
      { $group: { _id: null, total: { $sum: "$total_amount" } } },
    ]);
    res.render("sales/sales-report", {
      salesReport: salesReport,
      total: total[0].total,
      fromDate: fromDate,
      toDate: toDate,
    });
  } catch (error) {
    console.log(error);
  }
};
/* ----------------Revenue Report--------------  */
const revenueReport = async (req, res) => {
  try {
    const monthWiseRevenue = await Order.aggregate([
      { $match: { status: "Delivered" } },
      {
        $group: {
          _id: { $month: "$date" },
          count: { $sum: 1 },
          total: { $sum: "$total_amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    const yearWiseRevenue = await Order.aggregate([
      { $match: { status: "Delivered" } },
      {
        $group: {
          _id: { $month: "$date" },
          count: { $sum: 1 },
          total: { $sum: "$total_amount" },
        },
      },
      { $sort: { _id: -1 } },
    ]);

    const categoryRevenue = await Order.aggregate([
      { $match: { status: "Delivered" } },
      {
        $lookup: {
          from: "products",
          localField: "product.id",
          foreignField: "_id",
          as: "products",
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "products.category_id",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $group: {
          _id: { $first: "$category._id" },
          name: { $first: "$category.name" },
          total: { $sum: "$total_amount" },
        },
      },
    ]);

    res.json({
      monthWiseRevenue: monthWiseRevenue,
      yearWiseRevenue: yearWiseRevenue,
      categoryRevenue: categoryRevenue,
    });
  } catch (error) {
    console.log(error);
  }
};
/* ----------------Best Selling Product--------------  */
const bestSellingProducts = async (limit = 10) => {
  return await Order.aggregate([
    { $match: { status: "Delivered" } },
    { $unwind: "$product" },
    {
      $group: {
        _id: "$product.id",
        name: { $first: "$product.name" },
        image: { $first: "$product.image" },
        quantity: { $sum: "$product.quantity" },
        price: { $sum: "$product.price" },
      },
    },
    { $sort: { quantity: -1 } },
    { $limit: limit },
    {
      $project: {
        name: 1,
        image: 1,
        quantity: 1,
        price: 1,
        total: { $multiply: ["$price", "$quantity"] },
      },
    },
  ]);
};
/* ----------------Logout--------------  */
const logout = async (req, res, next) => {
  try {
    delete req.session.admin;
    console.log("The session has been destroyed!");

    // req.session.admin.destroy(() => {
    //   console.log("session destroyed");
    // });
    res.redirect("/admin/login");
  } catch (error) {
    console.log(error.message);
  }
};

module.exports = {
  adminLogin,
  authenticate,
  adminHome,
  products,
  addProductView,
  addProduct,
  editProduct,
  deleteProduct,
  categories,
  addCategoryView,
  addCategory,
  editCategory,
  editProductView,
  categoryDetails,
  deleteCategory,
  users,
  verifyUser,
  blockUser,
  addUserView,
  deleteUser,
  ordersList,
  cancelOrder,
  changeOrderStatus,
  orderDetails,
  listCoupons,
  createCoupon,
  activateCoupon,
  createCouponView,
  editCoupon,
  updateCoupon,
  topSalesReport,
  salesReport,
  revenueReport,
  logout,
};
