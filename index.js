const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { UserModel, videosModel, bookmarkModel } = require('./model/User'); // Corrected the VideosModel import
const multer = require('multer');
const path = require('path')
const jwt = require('jsonwebtoken');

require('dotenv').config();
const port = process.env.PORT || 3001;
const dbUrl = process.env.DB_URL;
const SECRET_KEY = process.env.SECRET;


const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

mongoose.connect(dbUrl);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
      cb(null, 'public/images');
  },
  filename: (req, file, cb) => {
      const extname = path.extname(file.originalname); // Get the file extension
      cb(null, `${Date.now()}${extname}`); // Append extension to the filename
  }
});

const upload = multer({
  storage: storage
});


const trailerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
      cb(null, 'public/trailer');
  },
  filename: (req, file, cb) => {
      const extname = path.extname(file.originalname); // Get the file extension
      cb(null, `${Date.now()}${extname}`); // Append extension to the filename
  }
});

const trailerUpload = multer({
  storage: trailerStorage
});

app.post('/admin/trailer/:id', trailerUpload.single('trailer'), (req, res) => {

  const id = req.params.id
  videosModel.findByIdAndUpdate(id, { $set: { trailer: req.file.filename } }, { new: true })
  .then(updatedVideo => {
      if (!updatedVideo) {
          return res.status(404).json({ error: 'Video not found' });
      }
      res.json(updatedVideo);
  })
  .catch(err => {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
  });

});


const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
      cb(null, 'public/video');
  },
  filename: (req, file, cb) => {
      const extname = path.extname(file.originalname); // Get the file extension
      cb(null, `${Date.now()}${extname}`); // Append extension to the filename
  }
});

const videoUpload = multer({
  storage: videoStorage
});
  
app.post('/admin/video/:id', videoUpload.single('video'), (req, res) => {

  const id = req.params.id
  videosModel.findByIdAndUpdate(id, { $set: { video: req.file.filename } }, { new: true })
  .then(updatedVideo => {
      if (!updatedVideo) {
          return res.status(404).json({ error: 'Video not found' });
      }
      res.json(updatedVideo);
  })
  .catch(err => {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
  });

});


  // Uncomment and modify the following code to save file information to your database
  /*
  videosModel.create()
  .then(result => res.json(result))
  .catch(err => res.status(500).json({ error: err.message }));
  */


app.post('/signUp', (req, res) => {
    UserModel.create(req.body)
        .then(result => res.json(result))
        .catch(err => console.log(err))
    // console.log(req.body);
})



app.get('/', (req, res) => {
    UserModel.find()
        .then(users => res.json(users))
        .catch(err => res.json(err));
});

app.get('/admin/video', (req, res) => {
  videosModel.find()
      .then(users => res.json(users))
      .catch(err => res.json(err));
});


app.post('/videos', upload.single('image'), (req, res) => {
    videosModel.create({ 
        ...req.body, 
        date: new Date().toISOString().slice(0, 10), 
        image: req.file.filename 
    })
    .then(result => res.json(result))
    .catch(err => console.log(err));
});


// app.get('/videos/', async(req, res) => {
//   // console.log(req.params.userName)
//   try {
//     const videos = await videosModel.aggregate([
//       {
//         $lookup: {
//           from: bookmarkModel.collection.name, // Get the actual collection name from bookmarkModel
//           let: { videoId: { $toString: "$_id" } }, // Convert _id to string
//           pipeline: [
//               {
//                   $match: {
//                       $expr: {
//                           $eq: ["$$videoId", "$video_id"] // Compare converted _id with video_id
//                       }
//                   }
//               }
//           ],
//           as: 'joinedData' // Name of the field to store the joined data
//         }
//       },
      
      
//       // Add more stages of the aggregation pipeline as needed
//     ]);
    
//     res.json(videos);
//   } catch (err) {
//     res.json(err);
//   }
// });



app.get('/videos/:userName', async (req, res) => {
  const { userName } = req.params;

  try {
    const videos = await videosModel.aggregate([
      {
        $lookup: {
          from: bookmarkModel.collection.name,
          let: { videoId: { $toString: '$_id' } },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$$videoId', '$video_id'] },
                    { $eq: [userName, '$email'] } // Assuming 'email' is the field in bookmarkModel that stores user's email
                  ]
                }
              }
            }
          ],
          as: 'joinedData'
        }
      },
      // Additional stages of the aggregation pipeline can be added here as needed
    ]);

    res.json(videos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



// Login route
app.post('/login', async (req, res) => {
    const { userName, password } = req.body;

  try {
    // Find the user in the database
    const user = await UserModel.findOne({ Email : userName });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Compare passwords
    const passwordMatch = await UserModel.findOne({ Password : password });
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, SECRET_KEY, { expiresIn: '1h' });
    
    res.cookie('token', token, { maxAge: 3600000, httpOnly: true });
    
    res.status(200).json({ token, userName });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// const SECRET_KEY = 'your_secret_key'; // Replace 'your_secret_key' with your actual secret key

app.get('/check-token-validity', async (req, res) => {
  // Extract the token from the request headers
  const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Token not provided' });
  }

  try {
    // Verify the token using the secret key
    const decodedToken = jwt.verify(token, SECRET_KEY);
    
    // Optionally, you can perform additional checks on the decoded token here
    // For example, check if the user exists in the database or if the token has expired
    
    res.status(200).json({'decodedToken' : decodedToken, valid: true });
  } catch (error) {
    console.error('Invalid token:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
});


app.post('/bookmark', (req, res) => {
  bookmarkModel.create(req.body)
    .then(result => res.json(result))
    .catch(err => console.log(err));
})

app.get('/bookmark/:userName', async(req, res) => {
  const {userName} = req.params;
  // bookmarkModel.find({email: userName})
  //     .then(users => res.json(users))
  //     .catch(err => res.json(err));

  try {
    const videos = await videosModel.aggregate([
      {
        $lookup: {
          from: bookmarkModel.collection.name, // Get the actual collection name from bookmarkModel
          let: { videoId: { $toString: "$_id" } }, // Convert _id to string
          pipeline: [
              {
                  $match: {
                      $expr: {
                          $eq: ["$$videoId", "$video_id"] // Compare converted _id with video_id
                      }
                  }
              }
          ],
          as: 'joinedData' // Name of the field to store the joined data
        }
      },
      // Add more stages of the aggregation pipeline as needed
    ]);
    
    res.json(videos);
  } catch (err) {
    res.json(err);
  }

});


app.delete('/bookmark/:value', async (req, res) => {
  const { value } = req.params;
  try {
    // Use await to wait for the deletion operation to complete
    await bookmarkModel.findOneAndDelete({ 'video_id': value });
    
    // Send a success response back to the client
    res.status(200).json({ message: 'Bookmark deleted successfully' });
  } catch (error) {
    console.error('Error deleting bookmark:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});



app.get('/trending/:userName', async (req, res) => {
  const { userName } = req.params;

  try {
    const videos = await videosModel.aggregate([
      { $sample: { size: 10 } },
      {
        $lookup: {
          from: bookmarkModel.collection.name,
          let: { videoId: { $toString: '$_id' } },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$$videoId', '$video_id'] },
                    { $eq: [userName, '$email'] } // Assuming 'email' is the field in bookmarkModel that stores user's email
                  ]
                }
              }
            }
          ],
          as: 'joinedData'
        }
      },
      // Additional stages of the aggregation pipeline can be added here as needed
    ]);

    res.json(videos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// app.get('/recommend/', async(req, res) => {
//   try {
//     // Fetch 10 random videos from the database
//     const randomVideos = await videosModel.aggregate([
//       { $sample: { size: 10 } }, // Randomly sample 10 documents
//       {
//         $lookup: {
//           from: bookmarkModel.collection.name, // Get the actual collection name from bookmarkModel
//           let: { videoId: { $toString: "$_id" } }, // Convert _id to string
//           pipeline: [
//               {
//                   $match: {
//                       $expr: {
//                           $eq: ["$$videoId", "$video_id"] // Compare converted _id with video_id
//                       }
//                   }
//               }
//           ],
//           as: 'joinedData' // Name of the field to store the joined data
//         }
//       },
//       // Add more stages of the aggregation pipeline as needed
//     ]);
    
//     res.json(randomVideos);
//   } catch (err) {
//     res.json(err);
//   }
// });


app.get('/recommend/:userName', async (req, res) => {
  const { userName } = req.params;

  try {
    const videos = await videosModel.aggregate([
      { $sample: { size: 10 } },
      {
        $lookup: {
          from: bookmarkModel.collection.name,
          let: { videoId: { $toString: '$_id' } },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$$videoId', '$video_id'] },
                    { $eq: [userName, '$email'] } // Assuming 'email' is the field in bookmarkModel that stores user's email
                  ]
                }
              }
            }
          ],
          as: 'joinedData'
        }
      },
      // Additional stages of the aggregation pipeline can be added here as needed
    ]);

    res.json(videos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(port, () => {
    console.log("server is running on 3001");
});
