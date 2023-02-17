const User = require("../../models/userMdl");
const Product = require("../../models/productMdl");
const Category = require("../../models/categoryMdl");
const Order = require("../../models/ordersMdl");
const Coupon = require("../../models/couponMdl");
const Invoice = require("../../models/invoiceMdl");
const isAuth = require("../../helper/isAuth");
const mathHelper = require("../../helper/mathHelper").createOrderId;
const moment = require("moment");

/* ----------------Home Page--------------  */
const userHome = async (req, res) => {
  try {
    const user = await isAuth(req.session.user);
    const products = await Product.aggregate([
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
    res.render("home", {
      title: "Fresh Cart- Home",
      headerData: user,
      categories: user.categories,
      cartCount: user.cartCount,
      products: products,
    });
  } catch (error) {
    console.log(error);
  }
};
/* ----------------showProducts--------------  */
const showProducts = async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  try {
    const categoryProducts = await Product.find({
      category_id: req.params.id,
      status: true,
    })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean()
      .exec();

    const count = await Product.countDocuments();
    const nextPage = parseInt(page + 1);
    res.render("products", {
      categoryProducts: categoryProducts,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      // nextPage: nextPage,
    });
  } catch (error) {
    console.log(error);
  }
};

/* ----------------Search Products--------------  */
const searchProducts = async (req, res) => {
  try {
    const search = req.body.search;
    const getProduct = await Product.find({
      status: { $ne: false },
      name: { $regex: `${search}.*`, $options: "i" },
    }).lean();
    const categories = await Category.find({ status: true }).lean();
    res.render("product-search", {
      products: getProduct,
      categories: categories,
    });
  } catch (error) {
    console.log(error);
  }
};

/* ----------------Product Details--------------  */
const productDetails = async (req, res) => {
  const products = await Product.aggregate([
    { $match: { name: req.params.productName } },
    {
      $lookup: {
        from: "categories",
        localField: "category_id",
        foreignField: "_id",
        as: "category",
      },
    },
  ]);
  const user = await isAuth(req.session.user);
  res.render("productDetails", {
    title: "Fresh Cart- Product Deatails",
    categories: user.categories,
    headerData: user,
    cartCount: user.cartCount,
    products: products,
  });
};

/* ----------------Add to Cart--------------  */
const addToCart = async (req, res) => {
  if (req.session.user) {
    const userCartProduct = await User.findOne({
      email: req.session.user,
      cart: { $elemMatch: { productId: req.params.productId } },
    });
    if (userCartProduct) {
      const updateUserCart = await User.updateOne(
        {
          email: req.session.user,
          cart: { $elemMatch: { productId: req.params.productId } },
        },
        { $inc: { "cart.$.quantity": Number(req.body.quantity) } }
      );
    } else {
      const addProductToCart = await User.updateOne(
        {
          email: req.session.user,
        },
        {
          $push: {
            cart: {
              productId: req.params.productId,
              quantity: req.body.quantity,
            },
          },
        }
      );
    }
    res.send("success");
  } else {
    res.send("error");
  }
};

let actualCartAmount;
/* ----------------Cart Items--------------  */
const cartItems = async (sessionId) => {
  try {
    const userCartProducts = await User.aggregate([
      { $unwind: "$cart" },
      { $match: { email: sessionId } },
      { $project: { cart: 1 } },
      {
        $lookup: {
          from: "products",
          localField: "cart.productId",
          foreignField: "_id",
          as: "product",
        },
      },
    ]);

    let totalCartSum = 0;
    userCartProducts.forEach((item, i) => {
      item.productAmount = Number(
        (item?.cart?.quantity * item?.product?.[0]?.price).toFixed(2)
      );
      totalCartSum = totalCartSum + item.productAmount;
    });

    actualCartAmount = totalCartSum;
    let amt = 0;
    const cartItems = {
      items: userCartProducts,
      total: actualCartAmount,
    };
    return cartItems;
  } catch (error) {
    console.log(error);
  }
};

/* ----------------Show Cart--------------  */
const showCart = async (req, res) => {
  try {
    const getCartItems = await cartItems(req.session.user);
    const user = await isAuth(req.session.user);
    res.render("shop-cart", {
      cartItems: getCartItems.items,
      categories: user.categories,
      headerData: user,
      cartCount: user.cartCount,
      totalCartSum: getCartItems.total,
    });
  } catch (error) {
    console.log(error);
  }
};

/* ----------------Remove item from cart--------------  */
const removeItem = async (req, res) => {
  try {
    const result = await User.findOneAndUpdate(
      { email: req.session.user },
      {
        $pull: {
          cart: { productId: req.params.id },
        },
      },
      { new: true }
    );
    if (result) {
      res.json("success");
    }
  } catch (error) {
    console.log(error);
  }
};

/* ----------------Update cart Quantity--------------  */
const updateCart = async (req, res) => {
  try {
    const updateCart = await User.updateOne(
      {
        email: req.session.user,
        cart: { $elemMatch: { productId: req.params.id } },
      },
      {
        $set: { "cart.$.quantity": req.body.quantity },
      }
    );
    res.json("success");
  } catch (error) {
    console.log(error);
  }
};

/* ----------------Profile--------------  */
const accountSettings = async (req, res) => {
  try {
    const user = await isAuth(req.session.user);
    res.render("account-settings", {
      accountSettings: true,
      categories: user.categories,
      headerData: user,
      cartCount: user.cartCount,
      message: "",
    });
  } catch {
    console.log(error);
  }
};

const updateAccountSettings = async (req, res) => {
  try {
    const { first_name, last_name, phone, email } = req.body;
    const updateDetails = await User.findOneAndUpdate(
      { email },
      {
        $set: {
          first_name,
          last_name,
          phone,
        },
      }
    );
    const user = await isAuth(req.session.user);
    if (updateDetails)
      res.render("account-settings", {
        message: "Account updated successfully !!!",
        categories: user.categories,
        headerData: user,
        cartCount: user.cartCount,
        accountSettings: true,
      });
  } catch {
    console.log(error);
  }
};

const deleteAccount = async (req, res) => {
  const deleteUser = await User.dropUser("req.params.email");
  if (deleteAccount) {
    delete req.session.user;
    res.redirect("/user/signin");
  }
};

/* ----------------Address--------------  */
const accountAddresses = async (req, res) => {
  const user = await isAuth(req.session.user);
  const address = await User.find({ email: req.session.user }).lean();

  res.render("address", {
    address: true,
    categories: user.categories,
    headerData: user,
    cartCount: user.cartCount,
    userAddress: address?.[0]?.address,
  });
};

/* ----------------Add address--------------  */
const addAddress = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      address1,
      address2,
      city,
      state,
      country,
      zipCode,
      addrname,
    } = req.body;

    const details = {
      id: Math.floor(Date.now() / 1000),
      firstName: firstName,
      lastName: lastName,
      address1: address1,
      address2: address2,
      city: city,
      state: state,
      country: country,
      zipCode: zipCode,
      addrname: addrname,
    };
    const user = await User.updateOne(
      { email: req.body.email },
      {
        $push: {
          address: details,
        },
      }
    );
    res.redirect("/account-address");
  } catch (error) {
    console.log(error);
  }
};

/* ----------------Delete address--------------  */
const deleteAddress = async (req, res) => {
  try {
    const deleteAddress = await User.updateOne(
      {
        email: req.session.user,
        address: { $elemMatch: { id: req.params.id } },
      },
      {
        $pull: {
          address: { id: req.params.id },
        },
      }
    );
    if (deleteAddress) res.json("success");
  } catch (error) {
    console.log(error);
  }
};

/* ----------------Edit Address--------------  */
const editAddress = async (req, res) => {
  const address = await User.find(
    { "address.id": req.params.id },
    { _id: 0, address: { $elemMatch: { id: req.params.id } } }
  );
  res.json(address[0]);
};

/* ----------------Update Address--------------  */
const updateAddress = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      address1,
      address2,
      city,
      state,
      country,
      zipCode,
      addrname,
    } = req.body;
    const id = req.params.id;
    const update = await User.updateOne(
      { email: req.session.user, "address.id": req.params.id },
      {
        $set: {
          "address.$": {
            id,
            firstName,
            lastName,
            address1,
            address2,
            city,
            state,
            country,
            zipCode,
            addrname,
          },
        },
      }
    );
    if (update) res.json("success");
  } catch (error) {
    console.log(error);
  }
};
let Global_Coupon;
let Global_CouponAmount;
//Checkout
const checkout = async (req, res) => {
  const getCartItems = await cartItems(req.session.user);
  const user = await isAuth(req.session.user);
  const address = await User.find({ email: req.session.user }).lean();
  res.render("checkout", {
    cartItems: getCartItems.items,
    categories: user.categories,
    headerData: user,
    cartCount: user.cartCount,
    totalCartSum: getCartItems.total,
    userAddress: address[0].address,
  });
};

/* ----------------Order Placement--------------  */
let paypalUserId;
let paypalTotalAmount;
let paypalAddress;
const orderPlacement = async (req, res) => {
  try {
    const { userId, selectedMethod, selectedAdress } = req.body;
    paypalUserId = userId;
    paypalAddress = selectedAdress;
    if (req.body.coupon) {
      Global_Coupon = req.body.coupon;
      const couponApplied = await Coupon.findOne(
        { code: req.body.coupon },
        { _id: 0, discount: 1 }
      );
      Global_CouponAmount = couponApplied.discount;
      if (Global_Coupon && actualCartAmount) {
        const amt = (actualCartAmount * Global_CouponAmount) / 100;
        totalCartSum = actualCartAmount - amt;
      }
    } else {
      totalCartSum = actualCartAmount;
    }
    paypalTotalAmount = totalCartSum;
    if (req.body.selectedMethod == 1) {
      res.json({
        method: "paypal",
        total: totalCartSum,
        userId: userId,
        address: selectedAdress,
      });
    } else {
      const checkout = await checkoutFunc(
        userId,
        selectedMethod,
        selectedAdress
      );
      if (checkout.message == "success") res.json("success");
      else res.json("error");
    }
  } catch (error) {
    console.log(error);
  }
};

/* ---------------Paypal Integration--------------  */
const paypalCheckout = async (req, res) => {
  const userId = req.params.userId
  const user = await isAuth(req.session.user);

  res.render("paypal-integration", {
    categories: user.categories,
    headerData: user,
    cartCount: user.cartCount,
    totalAmount: paypalTotalAmount,
    userId: userId,
    address: paypalAddress,
  });
};

/* ----------------Paypal Checkout--------------  */
const paypalSummary = async (req, res) => {
  try {
    const userId = req.body.userId;
    const selectedMethod = 1;
    const checkout = await checkoutFunc(userId, selectedMethod, paypalAddress);
    console.log(checkout);
    if (checkout.message == "success") {
      const generateInvoice = await Invoice.invoiceGeneration(
        userId,
        checkout.orderId
      );
      res.json("success");
    } else res.json("error");
  } catch (error) {
    console.log(error);
  }
};

/* ----------------Checkout function--------------  */
const checkoutFunc = async (userId, selectedMethod, paypalAddress) => {
  const userCartDetails = await User.findById(userId);
  //Order Id
  const datetime = moment().format("YYYY-MM-DD");
  const orderId = mathHelper();
  let method = "";

  if (selectedMethod == 1) {
    method = "paypal";
  } else if (selectedMethod == 3) {
    method = "Cash on delivery";
  }

  const cart = userCartDetails.cart;
  let totalOrderAmount = 0;
  let discount;
  const product = await Promise.all(
    cart.map(async (item) => {
      const productDetails = await Product.findOne({ _id: item.productId });
      const productPrice = item.quantity * productDetails.price;
      totalOrderAmount = totalOrderAmount + productPrice;
      return {
        id: productDetails._id,
        quantity: item.quantity,
        name: productDetails.name,
        image: productDetails.thumbnail_image,
        price: productDetails.price,
        unit: productDetails.unit,
      };
    })
  );
  if (Global_CouponAmount) {
    discount = (totalOrderAmount * Global_CouponAmount) / 100;
    totalOrderAmount = totalOrderAmount - discount;
  }
  const data = {
    userId: userId,
    userName:
      userCartDetails?.first_name + " " + userCartDetails?.last_name,
    product: product,
    orderId: orderId,
    coupon: Global_Coupon,
    couponAmount: Global_CouponAmount,
    date: datetime,
    status: "Pending",
    payment_method: method,
    addressId: paypalAddress,
    total_amount: totalOrderAmount,
  };

  try {
    const response = await Order.insertMany(data);
    console.log(response);
    console.log(response[0]._id);
    const clearAll = await User.updateOne(
      { _id: userId },
      { $set: { cart: [] } }
    );
    const decrementQuantity = cart.forEach(async (item, i) => {
      const decrementCount = await Product.updateOne(
        { _id: item.productId },
        { $inc: { quantity: -item.quantity } }
      );
    });
    if (Global_Coupon) {
      const coupon = await Coupon.updateOne(
        { code: Global_Coupon },
        { $addToSet: { user: userId } }
      );
    }

    return { message: "success", orderId: response?.[0]?._id };
  } catch (error) {
    console.log(error);
    try {
      const deleteResponse = await Order.deleteMany({ orderId: data.orderId });
      console.log(deleteResponse);
    } catch (error) {
      console.log(error);
    }
  }
};
/* ----------------Orders--------------  */
const orders = async (req, res) => {
  const user = await isAuth(req.session.user);
  const ordersList = await Order.find({ userId: user.user._id })
    .sort({ date: -1 })
    .lean();
  let date = moment().format("MMMM Do YYYY, h:mm:ss a");
  ordersList.forEach((item, i) => {
    item.status == "Cancelled" ? (item.cancelStatus = "yes") : "";
    item.date = moment(item.date).format("Do MMM YYYY");
  });
  res.render("orders", {
    orders: ordersList,
    categories: user.categories,
    headerData: user,
    cartCount: user.cartCount,
  });
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

/* ----------------Order Details--------------  */
const orderDetails = async (req, res) => {
  try {
    let invoice = true;
    const order = await Order.findOne({ _id: req.params.id }).lean();
    if (order.status != "Delivered") {
      invoice = false;
    }
    const products = order.product;
    const date = moment(order.date).format("Do MMMM YYYY");
    const address = await User.findOne(
      { "address.id": order.addressId },
      { _id: 0, address: { $elemMatch: { id: order.addressId } } }
    ).lean();
    const subtotal = order.couponAmount
      ? order.total_amount + order.couponAmount
      : order.total_amount;

      res.render("orderDetails", {
      orderDetails: order,
      products: products,
      orderDate: date,
      address: address.address,
      subtotal: subtotal,
      invoice: invoice,
    });
  } catch (error) {
    console.log(error);
  }
};

/* ----------------Wallet--------------  */
const wallet = async (req, res) => {
  try {
    const userWallet = await User.find(
      { email: req.session.user },
      { wallet: 1 }
    ).lean();
    const walletTransaction = await Order.find({
      userId: userWallet[0]._id,
      status: "Cancelled",
    }).lean();
    walletTransaction.forEach((item) => {
      item.date = moment(item.date).format("Do MMMM YYYY");
    });
    res.render("wallet", {
      wallet: true,
      userWallet: userWallet,
      walletTransaction: walletTransaction,
    });
  } catch (error) {
    console.log(error);
  }
};

/* ----------------Redeem Coupon--------------  */
const redeemCoupon = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.session.user }, { _id: 1 });
    const validateCouponUsed = await Coupon.findOne({
      code: req.body.coupon,
      user: [user._id],
    });
    if (!validateCouponUsed) {
      const coupon = await Coupon.find({
        $and: [{ code: req.body.coupon }, { status: true }],
      });
      if (coupon.length >= 1) {
        var todayDate = moment().format("YYYY-MM-DD");
        var pastDate = coupon[0].date;
        if (pastDate > todayDate) {
          res.json({ success: "success", amount: coupon[0].discount });
        } else res.json({ error: "Invalid coupon !!" });
      } else {
        res.json({ error: "Invalid coupon !!" });
      }
    } else {
      res.json({ error: "Coupon already used!!" });
    }
  } catch (error) {
    console.log(error);
  }
};

/* ----------------invoice--------------  */
const invoice = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.orderId }).lean();
    const products = order.product;
    const invoice = await Invoice.invoice.findOne({
      orderId: req.params.orderId,
    });
    const invoiceDate = moment(invoice.date).format("Do MMMM YYYY");
    res.json({
      products: products,
      invoice: invoice,
      invoiceDate: invoiceDate,
    });
  } catch (error) {
    console.log(error);
  }
};

/* ----------------Logout--------------  */
const logout = async (req, res, next) => {
  try {
    delete req.session.user;
    res.redirect("/user/signin");
  } catch (error) {
    console.log(error.message);
  }
};

module.exports = {
  userHome,
  showProducts,
  searchProducts,
  productDetails,
  addToCart,
  showCart,
  removeItem,
  updateCart,
  accountSettings,
  updateAccountSettings,
  accountAddresses,
  addAddress,
  deleteAccount,
  deleteAddress,
  editAddress,
  updateAddress,
  checkout,
  orders,
  orderPlacement,
  paypalCheckout,
  cancelOrder,
  orderDetails,
  paypalSummary,
  redeemCoupon,
  wallet,
  invoice,
  logout,
};
