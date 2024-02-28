import express from "express";

const app = express();

app.use("/", (req, res)=> {
    res.json({
        message: "hello from express js baby...!"
    })
})

app.listen(9000, () => {
    console.log('start');
});