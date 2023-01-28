const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;
require('dotenv').config();
const jwt = require('jsonwebtoken');

//middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.mktejfv.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    // console.log(req.headers.authorization);
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'unauthorized access!' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (error, decoded) {
        if (error) {
            return res.status(401).send({ message: 'unauthorized access!' });
        }
        req.decoded = decoded;
        next();
    });
}

async function run() {
    try {
        const productsCollection = client.db('products-crud').collection('products');
        const storeProductsCollection = client.db('products-crud').collection('storeProducts');
        const ordersCollection = client.db('products-crud').collection('orders');

        ///product store starts///

        app.get('/store', async (req, res) => {
            const page = parseInt(req.query.page);
            const size = parseInt(req.query.size);
            // console.log(page, size);

            const query = {};
            const cursor = storeProductsCollection.find(query);
            const storeProducts = await cursor.skip(page * size).limit(size).toArray();
            const count = await storeProductsCollection.estimatedDocumentCount();
            res.send({ count, storeProducts });
        });

        //orders
        app.get('/orders', verifyJWT, async (req, res) => {
            const decoded = req.decoded;
            console.log(decoded);

            if (decoded.email !== req.query.email) {
                res.status(403).send({ message: 'Forbidden Access!' });
            }

            let query = {};
            if (req.query.email) {
                query = {
                    useremail: req.query.email
                }
            }
            const cursor = ordersCollection.find(query);
            const orders = await cursor.toArray();
            res.send(orders);
        });

        app.post('/orders', async (req, res) => {
            const order = req.body;
            const result = await ordersCollection.insertOne(order);
            console.log(result)
            res.send(result);
        });

        //jwt token
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "1h" });
            res.send({ token });
        });




        ///product store ends///


        ///adding and managing own products starts///
        app.get('/products', async (req, res) => {
            const query = {};
            const cursor = productsCollection.find(query);
            const products = await cursor.toArray();
            res.send(products);
        });
        // for showing the data to update 
        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const user = await productsCollection.findOne(query);
            res.send(user);

        });

        //for update
        app.put('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const product = req.body;
            // console.log(updatedProduct);

            const option = { upsert: true };
            const updatedProduct = {
                $set: {
                    name: product.name,
                    price: product.price,
                    quantity: product.quantity
                }
            }

            const result = await productsCollection.updateOne(query, updatedProduct, option);
            res.send(result);



        });


        //insering data
        app.post('/products', async (req, res) => {
            const product = req.body;
            console.log(product);
            const result = await productsCollection.insertOne(product);
            res.send(result);
        });

        //for delete
        app.delete('/products/:id', async (req, res) => {
            const id = req.params.id;
            console.log('Trying to delete id: ' + id);
            const query = { _id: ObjectId(id) };
            const result = await productsCollection.deleteOne(query);
            console.log(result);
            res.send(result);
        });

        ///adding and managing own products ends///

        //search items
        app.get('/search', async (req, res) => {
            const searchString = req.query.string;
            const query = { $text: { $search: searchString } };
            const cursor = storeProductsCollection.find(query);
            const products = await cursor.toArray();
            res.send(products);
        });


    }
    finally {

    }
}

run().catch(error => console.log(error));

app.get('/', (req, res) => {
    res.send('Hello from node mongo crud server');
});

app.listen(port, () => {
    console.log(`Listening to port ${port}`);
});