const Admin = require("../../models/adminMdl");
const Category = require("../../models/categoryMdl");
const Product = require("../../models/productMdl");
const User = require("../../models/userMdl");
const Order = require("../../models/ordersMdl");
const Coupon = require("../../models/couponMdl");
const Invoice = require("../../models/invoiceMdl");
const bcrypt = require("bcrypt");
const moment = require("moment");
const { isLogin } = require("../../middleware/userAuth");

const adminLogin = async (req, res, next) => {
  try {
    res.render("login", { title: "Fresh Cart - Login", error: "" });
  } catch (error) {
    next(error);
  }
};

const authenticate = async (req, res, next) => {
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
  } catch (error) {
    next(error);
  }
};

const adminHome = async (req, res, next) => {
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
    next(error);
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
    next(error);
  }
};
const addProductView = async (req, res, next) => {
  try {
    const categories = await Category.find({ status: true }).lean();
    res.render("product/addProduct", {
      title: "Products",
      categories: categories,
    });
  } catch (error) {
    next(error);
  }
};
const addProduct = async (req, res, next) => {
  try {
    if (!req.error) {
      req.body.images = req.files.product_images.map(function (obj) {
        return obj.filename;
      });
      if (req.thumbnail_image) {
        req.body.thumbnail_image = req.thumbnail_image;
      }
      req.body.status = 1;
      const newProduct = await Product.insertMany(req.body);
      res.redirect("/admin/products");
    } else {
      const categories = await Category.find({ status: true }).lean();
      res.render("product/addProduct", {
        productImgError: "Upload valid image",
        categories: categories,
      });
    }
  } catch (error) {
    next(error);
  }
};

const editProductView = async (req, res, next) => {
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
    next(error);
  }
};

const editProduct = async (req, res, next) => {
  try {
    if (!req.error) {
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
            description: req.body.description,
            thumbnail_image: req.body.thumbnail_image,
          },
          $push: {
            images: { $each: req.body.images ?? [] },
          },
        }
      );
      res.redirect("/admin/products");
    } else {
      const productDetails = await Product.findOne({
        _id: req.params.productId,
      }).lean();
      const categories = await Category.find({ status: true }).lean();
      res.render("product/editProduct", {
        productDetails: productDetails,
        categories: categories,
        error: "Upload valid image !!",
      });
    }
  } catch (error) {
    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.productId },
      { $set: { status: false } }
    );
    if (product) res.send("success");
    else res.send("error");
  } catch (error) {}
};
//Delete product image
const deleteProductImage = async (req, res, next) => {
  try {
    const { productId, filename } = req.query;
    const productImg = await Product.updateOne(
      { _id: productId },
      { $pull: { images: filename } }
    );
    if (productImg) {
      res.json("success");
    }
  } catch (error) {
    next(error);
  }
};
//Category
const categories = async (req, res, next) => {
  try {
    const categoryList = await Category.find({ status: true }).lean();
    res.render("category/categories", {
      title: "Category",
      category: categoryList,
    });
  } catch (error) {
    next(error);
  }
};
const addCategoryView = async (req, res, next) => {
  try {
    res.render("category/addCategory", { error: "" });
  } catch (error) {
    next(error);
  }
};
const addCategory = async (req, res, next) => {
  try {
    if (!req.error) {
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
    } else {
      res.render("category/addCategory", {
        error: "Upload valid image",
      });
    }
  } catch (error) {
    next(error);
  }
};
const categoryDetails = async (req, res, next) => {
  try {
    const categoryDetails = await Category.findOne({
      _id: req.params.categoryId,
    });
    res.send(categoryDetails);
  } catch (error) {
    next(error);
  }
};
const editCategory = async (req, res, next) => {
  try {
    if (!req.error) {
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
        res.json("success");
      }
    } else {
      res.json("error");
      // res.render("categories",{error:"Upload valid image !!"})
    }
  } catch (error) {
    next(error);
  }
};
const deleteCategory = async (req, res, next) => {
  try {
    const deleteCategory = await Category.findOneAndUpdate(
      { _id: req.params.categoryId },
      { $set: { status: false } }
    );
    if (deleteCategory) res.send("success");
    else res.send("error");
  } catch (error) {
    next(error);
  }
};
//User
const users = async (req, res, next) => {
  try {
    const usersList = await User.find({}).lean();
    res.render("user/users", { users: usersList });
  } catch (error) {
    next(error);
  }
};
const addUserView = async (req, res, next) => {
  try {
    res.render("user/addUser");
  } catch (error) {
    next(error);
  }
};
const verifyUser = async (req, res, next) => {
  try {
    const user = await User.findOneAndUpdate(
      { _id: req.params.userId },
      { $set: { is_verified: true } }
    );
    if (user) res.send("success");
    else res.send("error");
  } catch (error) {
    next(error);
  }
};
const blockUser = async (req, res, next) => {
  try {
    const userInfo = await User.findOne({ _id: req.params.userId }).then(
      async (data, err) => {
        if (data.status) {
          const user = await User.findOneAndUpdate(
            { _id: req.params.userId },
            { $set: { status: false } }
          );
          delete req.session.user;
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
    next(error);
  }
};
const deleteUser = async (req, res, next) => {
  try {
    const product = Product.findOneAndUpdate(
      { _id: userId },
      { $set: { status: 0 } }
    );
  } catch (error) {}
};

/* ----------------Order--------------  */
const ordersList = async (req, res, next) => {
  const ordersList = await Order.find({}).sort({_id:-1}).lean();
  ordersList.forEach((item, i) => {
    item.cancelStatus =
      item.status == "Cancelled" || item.status == "Delivered" ? "yes" : "";
    item.date = moment(item.date).format("Do MMM YYYY");
  });
  res.render("orders/order", { title: "Orders", ordersList: ordersList });
};

/* ----------------Order Details--------------  */
const orderDetails = async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id }).lean();
    const date = moment(order.date).format("MMMM Do YYYY, h:mm a");
    const products = order.product;
    const address = await User.findOne(
      { "address.id": order.addressId },
      { _id: 0, address: { $elemMatch: { id: order.addressId } } }
    ).lean();
    const subtotal = order.couponAmount
      ? order.total_amount + order.couponAmount
      : order.total_amount;
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
const cancelOrder = async (req, res, next) => {
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
const changeOrderStatus = async (req, res, next) => {
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
const listCoupons = async (req, res, next) => {
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
const createCouponView = async (req, res, next) => {
  try {
    const categories = await Category.find({ status: true }).lean();
    const coupons = await Coupon.find().lean();
    const date = moment().format("yy-MM-DD");
    res.render("coupon/addCoupon", {
      categories: categories,
      coupons: coupons,
      date: date,
    });
  } catch (error) {
    console.log(error);
  }
};
/* ----------------Create Coupon--------------  */
const createCoupon = async (req, res, next) => {
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
const activateCoupon = async (req, res, next) => {
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
const editCoupon = async (req, res, next) => {
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
const updateCoupon = async (req, res, next) => {
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
const topSalesReport = async (req, res, next) => {
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
const salesReport = async (req, res, next) => {
  try {
    let { fromdate, todate } = req?.query ?? {};
    let salesReport;
    let total = 0;

    if (fromdate && todate) {
      fromdate = new Date(fromdate);
      todate = new Date(todate);

      if (req?.query?.fromdate == req?.query?.todate && todate && fromdate)
        todate.setDate(todate.getDate() + 1);

      salesReport = await Order.find({
        date: { $gte: fromdate, $lt: todate },
      }).lean();
      salesReport.map((item) => {
        item.date = moment(item.date).format("Do MMMM YYYY");
        total = total + item.total_amount;
      });
    } else {
      salesReport = await Order.find({}).limit(10).lean();
      salesReport.map((item) => {
        item.date = moment(item.date).format("Do MMMM YYYY");
        total = total + item.total_amount;
      });
    }
    res.render("sales/sales-report", {
      salesReport: salesReport,
      total: total,
      fromDate: req.query.fromdate,
      toDate: req.query.todate,
    });
  } catch (error) {
    console.log(error);
  }
};
/* ----------------Revenue Report--------------  */
const revenueReport = async (req, res, next) => {
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
    res.redirect("/admin/login");
  } catch (error) {
    next(error);
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
  deleteProductImage,
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
