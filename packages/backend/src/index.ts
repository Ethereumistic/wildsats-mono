import dotenv from 'dotenv';
import express from 'express';
import { MongoClient } from 'mongodb';
import cors from 'cors';

dotenv.config();

const app = express();
app.use(cors({
    origin: '*', // or whatever URL your frontend is running on
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

const uri = process.env.MONGODB_URI || "mongodb://192.168.1.153:27017";
const client = new MongoClient(uri);

async function connectToDatabase() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Could not connect to MongoDB", error);
    process.exit(1);
  }
}

connectToDatabase();

const database = client.db("wildsats");
const users = database.collection("users");

app.post('/api/users', async (req, res) => {
    try {
      const { nostrName, npub } = req.body;
      const result = await users.updateOne(
        { npub },
        { 
          $set: { 
            nostrName, 
            npub,
            lastLogin: new Date()
          }, 
          $setOnInsert: { 
            characters: ['Dog'], // Changed this line
            inventory: [],
            createdAt: new Date()
          } 
        },
        { upsert: true }
      );
      res.status(200).json({ message: "User data updated", result });
    } catch (error) {
      console.error("Error updating user data:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

app.post('/api/users/:npub/characters', async (req, res) => {
  try {
    const { npub } = req.params;
    const { character } = req.body;
    const result = await users.updateOne(
      { npub },
      { $push: { characters: character } }
    );
    res.status(200).json({ message: "Character added", result });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

//fetching characters from the database
app.get('/api/users/:npub/characters', async (req, res) => {
    try {
        const { npub } = req.params;
        const user = await users.findOne({ npub });
        if (user) {
            res.status(200).json({ characters: user.characters });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        console.error('Error fetching user characters:', error);
        res.status(500).json({ error: (error as Error).message });
    }
});

app.post('/api/users/:npub/inventory', async (req, res) => {
  try {
    const { npub } = req.params;
    const { item } = req.body;
    const result = await users.updateOne(
      { npub },
      { $push: { inventory: item } }
    );
    res.status(200).json({ message: "Item added to inventory", result });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/test', (req, res) => {
    res.status(200).json({ message: "Server is working" });
});

app.post('/api/users/:npub/buy-animal', async (req, res) => {
    console.log('Received buy-animal request');
    console.log('Params:', req.params);
    console.log('Body:', req.body);
    try {
        const { npub } = req.params;
        const { animal } = req.body;
        console.log(`Attempting to add animal: ${animal} for user: ${npub}`);
        const result = await users.updateOne(
            { npub },
            { $addToSet: { characters: animal } }
        );
        console.log('MongoDB update result:', result);
        res.status(200).json({ message: "Animal added to characters", result });
    } catch (error) {
        console.error('Error in buy-animal endpoint:', error);
        res.status(500).json({ error: (error as Error).message });
    }
});

app.use('/api/users/:npub/buy-animal', (req, res) => {
    console.log('Fallback route hit');
    console.log('Method:', req.method);
    console.log('Params:', req.params);
    console.log('Body:', req.body);
    res.status(404).json({ 
        error: 'Route not found',
        message: 'The requested endpoint does not exist or the HTTP method is not supported.',
        requestedMethod: req.method,
        requestedUrl: req.originalUrl
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

process.on('SIGINT', async () => {
  await client.close();
  console.log('MongoDB connection closed');
  process.exit(0);
});