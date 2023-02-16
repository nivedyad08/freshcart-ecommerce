const port = process.env.PORT || 3000
const app = require('./app')
app.set(port)
app.listen(port)


