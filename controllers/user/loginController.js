const User          = require('../../models/userMdl')
const bcrypt        = require("bcrypt")
const nodemailer    = require("nodemailer")
const twilio        = require('../../config/twilio')
require('dotenv').config()

//Sign up
const signUp = async (req, res) => {
    try {
        res.render('signup', { title: 'Fresh Cart- Sign Up', message: '', signup: true })
    } catch (error) {
        console.log(error);
    }
}

const sendEMailVerification = async (firstname, lastname, email, userid) => {
    try {
        const emailTransporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: 'freshcart23@gmail.com',
                pass: 'fdvdipxxmphvvbla',
            }
        })
        const mailOptions = {
            from: 'freshcart23@gmail.com',
            to: email,
            subject: 'Verify your email address',
            html: '<p>Hi ' + firstname + ' ' + lastname + ', please click here to <a href="'+process.env.APP_URL+'/user/verify?email=' + email + '""> Verify</a> your email</p>',
        }
        emailTransporter.sendMail(mailOptions, function (error, res) {
            if (error)
                console.log(error);
            else
                console.log("Email has been sent: ", res.response);
        })

    } catch (error) {
        console.log(error.message);
    }

}

const createUser = async (req, res) => {
    try {
        const checkUser = await User.findOne({ email: req.body.email })
        if (checkUser == null) {
            const user = User({
                first_name: req.body.first_name,
                last_name: req.body.last_name,
                email: req.body.email,
                password: await bcrypt.hash(req.body.password, 10),
                phone: req.body.phone,
                status: 1,
                is_verified: 0,
                token: 0,
                wallet: 0,
            });

            const userDetails = await user.save()
            if (userDetails) {
                sendEMailVerification(req.body.first_name, req.body.last_name, req.body.email, userDetails._id)
                res.render('signup', { message: "Registered successfully.Please check the mail to verify your account" })
            } else
                res.render('signup', { error: "Registration failed" })
        }
        else {
            res.render('signup', { error: 'Email already taken' })
        }
    } catch (error) {
        console.log(error.message);
    }
}
const verifyMail = async (req, res) => {
    try {
        const updateUserDetails = await User.updateOne({ email: req.query.email }, { $set: { is_verified: true } })
        res.render('email-verification')
    } catch (error) {
        console.log(error.message);
    }
}
//Sign In
const signin = async (req, res) => {
    let  isLogged = false
    try {
        if(req.session.user){
            isLogged = true
        }
        res.render('login', { title: 'Fresh Cart- Sign In', message: '',checkUser:isLogged })
    } catch (error) {
        console.log(error.message);
    }
}

const authenticate = async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email ,status:true})
        if (user) {
            if(user.is_verified){
                    bcrypt.compare(req.body.password, user.password, (err, data) => {
                        if (data){
                            req.session.user = user.email;
                            res.redirect('/')
                        }else
                            res.render('login', { err: "Incorrect password !!" })
                    })
            }
            else{
                res.render('login', { err: "Please verify your email !!" })
            }   
        } else
            res.render('login', { err: "Incorrect email !!" })
    } catch (error) {
        console.log('success', error);
    }
}
const sendOtp = async(req,res)=>{
    try {
        const userPhone = await User.find({email:req.body.email},{phone:1})
        const phone ='+91'+userPhone[0].phone
        const OTP = twilio.generateOTP();
        const client = twilio.client
        client.messages.create({
            body:OTP,
            to: phone,
            from: '+18575242437'
         }).then(async()=>{
            console.log(9888);
            message => console.log(`Message SID ${message.sid}`)
            const user = await User.findOneAndUpdate({email:req.body.email},{$set:{token:OTP}})
            console.log(user);
            res.json({message:'success',id:userPhone[0].id})
         }) .catch(error => console.log(error))
          
    } catch (error) {
        console.log(error);
    }
}

const otpViewPage = async(req,res)=>{
    try {
        res.render('reset-password-otp',{id:req?.params?.id})
    } catch (error) {
        console.log(error);
    }
}

const validateOtp = async(req,res)=>{
    try {
        console.log(req.body);
        const validateOtp = await User.find({_id:req.body.id},{_id:0,token:1})
        console.log(validateOtp);
        if(validateOtp[0].token == req.body.otp){
            const removeToken = await User.updateOne({_id:req.body.id},{$set:{token:''}})
            res.render('change-password',{userId:req.body.id, message:"Otp validated !! Update your password here"})
        }
        else
           res.render('reset-password-otp',{error:'Invalid Error'})
    } catch (error) {
        console.log(error);
    }
}

const updatePassword = async(req,res)=>{
    try {
        console.log(req.body);
        if(req.body.password == req.body.confirmPassword){
            const hashPassword =  await bcrypt.hash(req.body.password, 10)
            const updatePassword = await User.updateOne({_id:req.body.id},{$set:{password:hashPassword }})
            res.render('login',{message:'Password updated successfully !!!'})
        } else{
            res.render('change-password',{error:'Password mismatch !!!',userId:req.body.id})
        }            
    } catch (error) {
        console.log(error);
    }
}

module.exports = {
    signUp,
    createUser,
    verifyMail,
    signin,
    sendOtp,
    validateOtp,
    otpViewPage,
    authenticate,
    updatePassword
}