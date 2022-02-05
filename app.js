import axios from 'axios';
import fs from 'fs';
import dotenv from 'dotenv';
import sharp from 'sharp';
import cloudinary from 'cloudinary';
import client from "twitter-api-client";
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
        processImage(result.resources[0].url, 'thumbnail.png', false, { width: 320, height: 180 })
    });
}

async function saveImage(follower) {
    let fileName = `${follower.screen_name}.png`;
    await processImage(follower.profile_image_url, fileName, true, { width: 50, height: 50 });
}
async function saveImageAndData(followers) {
    let index = 0;
    const image_data = [];
    for (let follower of followers.users) {
        let fileName = `${follower.screen_name}.png`;
        await saveImage(follower)
        const follower_avatar = {
            input: fileName,
            top: 130,
            left: parseInt(`${120 + 60 * index}`),
        };
        image_data.push(follower_avatar);
        index++;
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
                            '<svg><rect x="0" y="0" width="50" height="50" rx="50" ry="50"/></svg>');
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
        );
    }
    catch (err) {
        console.log(err);
    }
}

async function drawImage(image_data) {
    try {
        const hour = new Date().getHours();
        const theme = ["Morning.png", "Afternoon.png", "Evening.png", "Night.png"];
        let twitterFile = theme[3];

        console.log(image_data);
        if (hour < 12 && hour > 6) twitterFile = theme[0];
        else if (hour < 18 && hour >= 12) twitterFile = theme[1];
        else if (hour < 22 && hour >= 18) twitterFile = theme[2];
        else if (hour <= 24 || hour <= 6) twitterFile = theme[3];
        await sharp("banner/" + twitterFile)
            .composite(image_data)
            .toFile("twitterBanner.png");

        uploadBanner(image_data);
    } catch (error) {
        console.log("Catch" + error);
    }
}

async function uploadBanner(image_data) {
    try {
        const base64Banner = fs.readFileSync("twitterBanner.png", {
            encoding: "base64",
        });
        await twitterClient.accountsAndUsers.accountUpdateProfileBanner({banner: base64Banner}).then(() => {
            deleteFiles(image_data);
        });
    }

catch(err) {
    console.log("error");
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
        count: 5 
     }
    await twitterClient.accountsAndUsers.followersList(params).then((followers) => {
        saveImageAndData(followers).then((image_data) => {
            youtubeThumbnail().then(() => {
                image_data.push({
                    input: 'thumbnail.png',
                    top: 200,
                    left: 1100,
                });
                drawImage(image_data);
            });
        })
    });
}

getFollowers();
setInterval(() => {
    get_followers();
}, 60000);

