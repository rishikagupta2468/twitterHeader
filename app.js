import axios from 'axios';
import fs from 'fs';
import dotenv from 'dotenv';
import sharp from 'sharp';
import cloudinary from 'cloudinary';
import client from "twitter-api-client";
import http from 'http';
dotenv.config();

//****************KEYS******************* //
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET,
    secure: true
});
const twitterClient = new client.TwitterClient({
    apiKey: process.env.TWITTER_API_KEY,
    apiSecret: process.env.TWITTER_API_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});
// *************************************** //


async function youtubeThumbnail() {
    cloudinary.v2.search.expression(
        'folder:youtube/*'
    ).max_results(1).execute().then(result => {
        processImage(result.resources[0].url, 'thumbnail.png', false, { width: 350, height: 200 }).then(() => {
            return 0 });
    });
}

async function saveImage(follower) {
    let fileName = `${follower.screen_name}.png`;
    await processImage(follower.profile_image_url_https, fileName, true, { width: 60, height: 60 });
}
async function saveImageAndData(followers) {
    // console.log(followers);
    let index = 0;
    const image_data = [];
    for (let follower of followers.users) {
        let fileName = `${follower.screen_name}.png`;
        await saveImage(follower).then(() => {
            if (fs.existsSync(fileName)) {
                const follower_avatar = {
                    input: fileName,
                    top: 150,
                    left: parseInt(`${110 + 65 * index}`),
                };
                image_data.push(follower_avatar);
                index++;
            }
        });
        if (image_data.length == 5) {
            break;
        }
    }
    return image_data;
}

async function processImage(url, image_path, isUserImage, resizeData) {
    try {
        await axios({
            url,
            responseType: "arraybuffer",
        }).then(
            (response) =>
                new Promise((resolve) => {
                    if (isUserImage == true) {
                        const rounded_corners = new Buffer.from(
                            '<svg><rect x="0" y="0" width="60" height="60" rx="50" ry="50"/></svg>');
                        resolve(
                            sharp(response.data)
                                .resize(resizeData.width, resizeData.height)
                                .composite([
                                    {
                                        input: rounded_corners,
                                        blend: "dest-in",
                                    },
                                ])
                                .png()
                                .toFile(image_path)
                        );
                    } else {
                        resolve(
                            sharp(response.data)
                                .resize(resizeData.width, resizeData.height)
                                .png()
                                .toFile(image_path)
                        );
                    }
                })
        )
        .catch((err) => {
            console.log("error in getting profile url");
        });
    }
    catch (err) {
        console.log(image_path + " " +err);
    }
}

async function drawImage(image_data) {
    try {
        const hour = new Date().getHours() + 6;
        const theme = ["Morning.png", "Afternoon.png", "Evening.png", "Night.png"];
        let twitterFile = theme[3];
        console.log(hour);

        console.log(image_data);
        if (hour < 12 && hour > 6) twitterFile = theme[0];
        else if (hour < 18 && hour >= 12) twitterFile = theme[1];
        else if (hour < 22 && hour >= 18) twitterFile = theme[2];
        else if (hour <= 24 || hour <= 6) twitterFile = theme[3];
        await sharp("banner/" + twitterFile)
            .composite(image_data)
            .toFile("twitterBanner.png")
    } catch (error) {
        console.log("Catch" + error);
    }
}

async function uploadBanner(image_data) {
    try {
        const base64Banner = fs.readFileSync("twitterBanner.png", {
            encoding: "base64",
        });
        await twitterClient.accountsAndUsers.accountUpdateProfileBanner({ banner: base64Banner }).then(() => {
            deleteFiles(image_data);
        });
    }

    catch (err) {
        //upload default image in case of error
        const base64Banner = fs.readFileSync("banner/Default.png", {
            encoding: "base64",
        });
        await twitterClient.accountsAndUsers.accountUpdateProfileBanner({ banner: base64Banner }).then(() => {
            deleteFiles(image_data);
        });
    }
}

async function deleteFiles(files) {
    try {
        files.forEach((file) => {
            if (file.input.includes(".png")) {
                fs.unlinkSync(file.input);
            }
        });
    } catch (err) {
        console.error("Not able to delete" + err);
    }
}


async function getFollowers() {
    const params = {
        screen_name: 'rishika5000',
        count: 10
    }
    await twitterClient.accountsAndUsers.followersList(params).then((followers) => {
        saveImageAndData(followers).then((image_data) => {
            youtubeThumbnail().then(() => {
                image_data.push({
                    input: 'thumbnail.png',
                    top: 200,
                    left: 1100,
                });
                drawImage(image_data).then(() => {
                    uploadBanner(image_data);
                });
            });
        })
        .catch (() => {
            console.log("error in save image");
        });
    });
}

getFollowers();
setInterval(() => {
    getFollowers();
}, 60000);

// http
// .createServer(function (req, res) {
//     res.send("it is running\n");
// })
// .listen(process.env.PORT || 5000);
