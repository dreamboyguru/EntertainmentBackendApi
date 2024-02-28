const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    Name: String,
    Email: String,
    DOB: String,
    Password: String
})
const UserModel = mongoose.model("users", UserSchema)


const videosSchema = new mongoose.Schema({
    type: String,
    tittle: String,
    desc: String,
    language: String,
    year: Number,
    grade: Number,
    actors: String,
    genre: String,
    date: String,
    image: String,
    video: String,
    trailer: String
})
const videosModel = mongoose.model("videos", videosSchema)

const bookmarkSchema = new mongoose.Schema({
    email: String,
    video_id: String
})
const bookmarkModel = mongoose.model('bookmark', bookmarkSchema)


module.exports = {UserModel, videosModel, bookmarkModel};