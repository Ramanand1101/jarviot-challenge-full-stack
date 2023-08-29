const express = require('express');
const {google}=require("googleapis");
const axios = require("axios");
const app=express()
const bodyParser=require("body-parser");
const cors=require("cors");
const {driveRouter}=require("./Router/driveRoute");
const {riskRouter}=require("./Router/riskRoute");
const credentials=require("./credentials.json")

const client_id=credentials.web.client_id;
const client_secret=credentials.web.client_secret;
const redirect_uris=credentials.web.redirect_uris;
const oAuth2Client=new google.auth.OAuth2(client_id,client_secret,redirect_uris[0])

require("dotenv").config()

app.use(cors())
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());
app.use(driveRouter);
app.use(riskRouter);

app.get("/",(req,res)=>{
    res.send("Home-Page")
})

/* ----------------------------------------------------- Dont touch above code------------------------------- */





/* -------------------------- Don't touch below code ------------------ */
const port=process.env.PORT||5000
app.listen(port,async()=>{
    try{
        await app
        console.log(`Server running in port ${port}`)
    }
    catch(err){
        console.log(err.message)
    }
})