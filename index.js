const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express()
const port = process.env.PORT || 5000

// middleware 

app.use(cors({
    origin: ['http://localhost:5174', 'http://localhost:5173'],
    credentials: true


}))
app.use(express.json())

app.use(cookieParser())

console.log(process.env.DB_PASS)




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vsymadz.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});




//  create middleware logger 

const logger = async (req, res, next) => {
    console.log('log:info', req.host, req.originalUrl)
    next()
}



//  create middleware verify

const verifyToken = async (req, res, next) => {
    const token = req.cookies?.token
    console.log('value of token in middleware', token)
    // no token available
    if (!token) {
        return res.status(401).send({ message: 'not authorized' })
    }

    // jwt verify 

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decode) => {
        // err 
        if (err) {
            console.log(err)
            return res.status(401).send({ message: 'unauthorized' })
        }
        console.log('value in the token', decode)
        req.user = decode
        next()
    })




}











async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();




        const serviceCollection = client.db('carDoctor').collection('services')

        const bookingCollection = client.db('carDoctor').collection('bookings')


        // auth related api module-61 login

        app.post('/jwt', logger, async (req, res) => {
            const user = req.body
            console.log('user for token', user)
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '12h' })

            res.cookie('token', token, {
                httpOnly: true,
                secure: true,
                sameSite: 'none'
            }).send({ success: true })

        })

        // auth related api module-61 logout
        app.post('/logout', async (req, res) => {
            const user = req.body
            console.log('user logout', user)
            res.clearCookie('token', { maxAge: 0 }).send({ success: true })
        })

        // module-60
        // app.post('/jwt', logger, async (req, res) => {
        //     const user = req.body
        //     console.log(user)
        //     const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '12h' })

        //     res
        //         .cookie('token', token, {
        //             httpOnly: true,
        //             secure: false,

        //         })
        //         .send({ success: true })
        // })





        // services related api 

        // get all data 

        app.get('/services', logger, async (req, res) => {
            const cursor = serviceCollection.find()
            const result = await cursor.toArray()
            res.send(result)
        })

        // get some data 

        app.get('/services/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const options = {

                // Include only the `title` and `imdb` fields in the returned document
                projection: { title: 1, price: 1, service_id: 1, img: 1 },
            };
            const result = await serviceCollection.findOne(query, options)
            res.send(result)
        })

        // bookings

        // bookings  get all data by email id

        app.get('/bookings', logger, verifyToken, async (req, res) => {
            console.log(req, express.query.email)
            // console.log('tok tok', req.cookies.token)

            console.log('user in the valid token', req.user)
            if (req.user.email !== req.query.email) {

                // module-60 
                // if (req.query.email !== req.query.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }

            let query = {}
            if (req.query?.email) {
                query = { email: req.query.email }
            }



            const result = await bookingCollection.find(query).toArray()
            res.send(result)
        })


        // bookings  client to server

        app.post('/bookings', async (req, res) => {
            const bookings = req.body
            console.log(bookings)
            const result = await bookingCollection.insertOne(bookings)
            res.send(result)
        })

        // booking put /patch

        app.patch('/bookings/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const updatedBooking = req.body
            console.log(updatedBooking)

            const updateDoc = {
                $set: {
                    status: updatedBooking.status
                }
            }
            const result = await bookingCollection.updateOne(filter, updateDoc)
            res.send(result)
        })

        // bookings delete 

        app.delete('/bookings/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await bookingCollection.deleteOne(query)
            res.send(result)
        })









        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);







app.get('/', (req, res) => {
    res.send('doctor is running')
})


app.listen(port, () => {
    console.log(`Car Doctor Server Is Running On port: ${port}`)
})
