const express=require("express");
const {google}=require("googleapis");

const fs=require("fs");
const formidable=require("formidable")
const axios = require("axios");
const driveRouter=express.Router();

const credentials=require("../credentials.json")


const client_id=credentials.web.client_id;
const client_secret=credentials.web.client_secret;
const redirect_uris=credentials.web.redirect_uris;
const oAuth2Client=new google.auth.OAuth2(client_id,client_secret,redirect_uris[0])


const SCOPE = ['https://www.googleapis.com/auth/drive.metadata.readonly https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/drive.file']

require("dotenv").config()

driveRouter.get("/getAuthURL",(req,res)=>{
    const authURL=oAuth2Client.generateAuthUrl({
        access_type:'offline',
        scope:SCOPE,
    })
    res.send(authURL)
    console.log(authURL)
    return(authURL)
})
driveRouter.post('/getToken', (req, res) => {
    if (req.body.code == null) return res.status(400).send('Invalid Request');
    oAuth2Client.getToken(req.body.code, (err, token) => {
        if (err) {
            console.error('Error retrieving access token', err);
            return res.status(400).send('Error retrieving access token');
        }
        res.send(token);
    });
});
driveRouter.post('/getUserInfo', (req, res) => {
    if (req.body.token == null) return res.status(400).send('Token not found');
    oAuth2Client.setCredentials(req.body.token);
    const oauth2 = google.oauth2({ version: 'v2', auth: oAuth2Client });

    oauth2.userinfo.get((err, response) => {
        if (err) res.status(400).send(err);
        console.log(response.data);
        res.send(response.data);
    })
});

driveRouter.post('/readDrive', (req, res) => {
    if (req.body.token == null) return res.status(400).send('Token not found');
    oAuth2Client.setCredentials(req.body.token);
    const drive = google.drive({ version: 'v3', auth: oAuth2Client });
    drive.files.list({
        pageSize: 10,
    }, (err, response) => {
        if (err) {
            console.log('The API returned an error: ' + err);
            return res.status(400).send(err);
        }
        const files = response.data.files;
        if (files.length) {
            console.log('Files:');
            files.map((file) => {
                console.log(`${file.name} (${file.id})`);
            });
        } else {
            console.log('No files found.');
        }
        res.send(files);
    });
});
driveRouter.post('/fileUpload', (req, res) => {
    const form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
        if (err) return res.status(400).send(err);

        const token = JSON.parse(fields.token);
        if (token == null) return res.status(400).send('Token not found');
        oAuth2Client.setCredentials(token);

        const drive = google.drive({ version: "v3", auth: oAuth2Client });

        const uploadedFile = files[''][0]; // Assuming 'files' is the field name in your form

        if (!uploadedFile) {
            return res.status(400).send('File not found');
        }

        const fileMetadata = {
            name: uploadedFile.originalFilename,
        };

        const media = {
            mimeType: uploadedFile.mimetype,
            body: fs.createReadStream(uploadedFile.filepath), // Corrected 'uploadedFile.filepath'
        };

        drive.files.create(
            {
                resource: fileMetadata,
                media: media,
                fields: "id",
            },
            (err, file) => {
                oAuth2Client.setCredentials(null);
                if (err) {
                    console.error(err);
                    res.status(400).send(err);
                } else {
                    res.send('Successful');
                }
            }
        );
    });
});




oAuth2Client
driveRouter.post('/deleteFile/:id', (req, res) => {
    if (req.body.token == null) {
        return res.status(400).send('Token not found');
    }

    const fileId = req.params.id;

    if (!fileId) {
        return res.status(400).send('File ID not provided');
    }

    oAuth2Client.setCredentials(req.body.token);
    const drive = google.drive({ version: 'v3', auth: oAuth2Client });

    drive.files.delete({ fileId: fileId })
        .then((response) => {
            res.send(response.data);
        })
        .catch((err) => {
            console.error(err.message);
            res.status(500).send('Error deleting file'); // You can customize the error message and status code
        });
});

driveRouter.post('/download/:id', (req, res) => {
    if (req.body.token == null) return res.status(400).send('Token not found');
    oAuth2Client.setCredentials(req.body.token);
    const drive = google.drive({ version: 'v3', auth: oAuth2Client });
    var fileId = req.params.id;
    drive.files.get({ fileId: fileId, alt: 'media' }, { responseType: 'stream' },
        function (err, response) {
            response.data
                .on('end', () => {
                    console.log('Done');
                })
                .on('error', err => {
                    console.log('Error', err);
                })
                .pipe(res);
        });

});




driveRouter.post('/revokeAccess', (req, res) => {
    if (req.body.token == null) {
        return res.status(400).send('Token not found');
    }

    const token = req.body.token; // No need to parse again
    if (token.access_token == null) {
        return res.status(400).send('Access token not found');
    }

    const revokeUrl = `https://accounts.google.com/o/oauth2/revoke?token=${token.access_token}`;

    // Send a request to Google's token revocation endpoint
    axios.get(revokeUrl)
        .then(() => {
            res.send('Access revoked successfully');
        })
        .catch((error) => {
            console.error('Error revoking access:', error);
            res.status(500).send('Error revoking access');
        });
});

/* ------------------------------------------------ Export Code here------------------------------------- */
module.exports={
    driveRouter
}