const express = require('express'); 
const { MongoClient, ObjectId } = require('mongodb'); 
const bodyParser = require('body-parser'); 

const app = express();
const port = process.env.PORT || 3000; 

// Set up EJS as the template engine
app.use(bodyParser.json()); // Parse JSON bodies
app.set('view engine', 'ejs');
app.use(express.static('public')); // Folder for static assets like CSS
app.use(bodyParser.urlencoded({ extended: true }));

// MongoDB connection URL and database info
const mongoURL = 'mongodb+srv://sarayutpoo:4bVGYdz9oCNQmDgF@cluster0.qrth7pb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const client = new MongoClient(mongoURL);
const dbName = 'test';
const collectionName = 'geojsons';

// Home page: Display all documents
app.get('/', async (req, res) => {
    try {
        await client.connect();
        const database = client.db(dbName);
        const collection = database.collection(collectionName);
        const data = await collection.find({}).toArray();

        res.render('index', { data: data });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    } finally {
        await client.close();
    }
});

// Add new document
app.post('/add', async (req, res) => {
    const { geometryType, coordinates0, coordinates1, className, confidence } = req.body;

    try {
        await client.connect();
        const database = client.db(dbName);
        const collection = database.collection(collectionName);

        // Get the highest existing id to calculate the next one
        const lastItem = await collection.find().sort({ id: -1 }).limit(1).toArray(); 
        const nextId = lastItem.length > 0 ? lastItem[0].id + 1 : 1; 

        // Insert new data with optional fields
        await collection.insertOne({
            id: nextId,  
            type: "FeatureCollection",
            features: [{
                type: "Feature",
                geometry: {
                    type: geometryType || "Unknown",  // Fallback to "Unknown" if not provided
                    coordinates: [
                        parseFloat(coordinates0) || 0,  // Default to 0 if empty
                        parseFloat(coordinates1) || 0   // Default to 0 if empty
                    ]
                },
                properties: {
                    className: className || "Unnamed",  // Default to "Unnamed"
                    confidence: parseFloat(confidence) || 0.0,  // Default to 0 if empty
                    markerCounter: 1
                }
            }]
        });

        res.redirect('/');
    } catch (error) {
        console.error('Error adding data to MongoDB:', error);
        res.status(500).send('Internal Server Error');
    } finally {
        await client.close();
    }
});




// Update document
app.put('/update/:id', async (req, res) => {
    const id = req.params.id;
    const { geometryType, coordinates0, coordinates1, className, confidence } = req.body;

    try {
        await client.connect();
        const database = client.db(dbName);
        const collection = database.collection(collectionName);

        // Prepare the update object
        let updateData = {};

        // Add fields to updateData only if they are provided
        if (geometryType !== undefined && geometryType !== '') {
            updateData["features.0.geometry.type"] = geometryType;  // Update Geometry Type
        }
        if (coordinates0 !== undefined && coordinates1 !== undefined) {
            updateData["features.0.geometry.coordinates"] = [
                parseFloat(coordinates0) || null,  // Update Latitude
                parseFloat(coordinates1) || null   // Update Longitude
            ];
        }
        if (className !== undefined && className !== '') {
            updateData["features.0.properties.className"] = className;  // Update Class Name
        }
        if (confidence !== undefined && confidence !== '') {
            updateData["features.0.properties.confidence"] = parseFloat(confidence) || null;  // Update Confidence
        }

        // Perform the update only if there are changes
        if (Object.keys(updateData).length > 0) {
            const result = await collection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updateData }
            );

            // Check if the update was successful
            if (result.modifiedCount === 0) {
                return res.status(404).send('No records updated.');  // No documents matched the query
            }
        }

        res.redirect('/');  // Redirect after update
    } catch (error) {
        console.error('Error updating data:', error);
        res.status(500).send('Internal Server Error');
    } finally {
        await client.close();  // Close the connection
    }
});


// Delete document
app.delete('/delete/:id', async (req, res) => {
    const id = req.params.id;

    try {
        await client.connect();
        const database = client.db(dbName);
        const collection = database.collection(collectionName);

        await collection.deleteOne({ _id: new ObjectId(id) });

        res.redirect('/');
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    } finally {
        await client.close();
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
