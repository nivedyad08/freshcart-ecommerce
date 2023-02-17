const  mongoose   = require('mongoose')
const Schema      = mongoose.Schema, 

ObjectId = Schema.ObjectId; 

const productSchema = new Schema({ 

    name        :{
        type    : String,
        required:true
    },
    category_id :{
        type    : ObjectId,
        required:true
    },
    quantity        :{
        type    : Number,
        required:true
    },
    price        :{
        type     :Number,
        required:true
    },
    unit        :{
        type    : String,
        required:true
    },
    images      :{
        type    : Array,
        required:false
    },
    description :{
        type    : String,
        required:false
    },
    thumbnail_image :{
        type    : String,
        required:true
    },
    status        :{
        type    : Boolean,
        required:true
    },

});


module.exports = mongoose.model('product',productSchema)