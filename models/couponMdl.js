const mongoose  = require('mongoose')
const Schema    =  mongoose.Schema
ObjectId = Schema.ObjectId
const couponSchema =  new Schema({
    title    :{
        type     : String,
        required :true
    },
    code    :{
        type     : String,
        required :true
    },
    discount    :{
        type     : Number,
        required :true
    },
    date    :{
        type     : String,
        required :true
    },
    user    :[
        {type    :ObjectId},
    ],
    status    :{    
        type     : Boolean,
        required :true
    },
})

module.exports  = mongoose.model('coupon',couponSchema)