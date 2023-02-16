const express       = require("express")
const app           = express();
require('./config/database').connectDb()
const path          = require('path');
const nocache       = require("nocache");
const authRoute     = require('./routes/authRoute')
const userRoute     = require('./routes/userRoute')
const adminLoginRoute    = require('./routes/adminLoginRoute')
const adminRoute    = require('./routes/adminRoute')

app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs')
app.use(express.json()) //the data is converted into json and parsed
app.use(express.urlencoded({extended:false})) //will convert the form data to json according to the data(if its string or an array)
app.use(nocache());

app.use('/user', authRoute);
app.use('/',userRoute)
app.use('/admin/login', adminLoginRoute)
app.use('/admin', adminRoute)

module.exports = app