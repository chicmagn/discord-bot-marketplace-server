const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();
// const discord = require('discord.js')
const Datastore = require('nedb');

const botsDB = new Datastore({ filename: 'db/bots.db', autoload: true });
const serverDB = new Datastore({ filename: 'db/servers.db', autoload: true });
const emojiDB = new Datastore({ filename: 'db/emojis.db', autoload: true });

// const discordClient = new discord.Client();
botsDB.loadDatabase();
serverDB.loadDatabase();
emojiDB.loadDatabase();

const app = express(); // Create a web app
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use(cors({ origin: '*' }));

const port = process.env.SERVER_PORT || 3000;

app.get('/', (req, res) => {
    // res.sendFile(path.join(__dirname + '/dist/index.html'));
    res.status(200).send({success: true, msg: 'Hello Commune fam, this is a message from bot marketplace server.'})
});

const getApplicationInfo = async (token, appId)=>{
    const response = await axios.get(`https://discord.com/api/v9/applications/${appId}`, {
        headers: {
            authorization: `Bot ${token}`
        }
    });

    return response.data;
}

app.get('/bot', async (req, res)=> {
    const info = await getApplicationInfo(req.query.token, req.query.appId);
    res.status(200).send(info);
});

app.post('/bot/upvote', async(req, res)=> {
    const { botId } = req.body;
    botsDB.findOne({clientID: botId}, (err, doc)=> {
        if (err) {
            res.status(500).send({success: false, msg: err})
        } else {
            const vote = doc['vote'];
            doc[vote] = vote + 1;
            botsDB.update({clientID: botId}, {$set: {vote: vote + 1}}, {},  (error, numReplaced)=> {
                if (error) {
                    res.status(500).send({success: false, msg: error})
                } else {
                    res.status(200).send({success: true});
                }
            });
        }
    })
})

app.get('/bots', (req, res)=>{
    console.log(req.query)
    const {search, user} = req.query;
    let filter = {}

    if (search === 'mine')
        filter = {
            "owner.id" : user
        }
    botsDB.find(filter, (err, docs)=> {
        if (err) {
            res.status(500).send({success: false, msg: err});
        } else {
            res.status(200).send({success: true, bots: docs});
        }
    });
});

app.post('/bot/add', async (req, res) => {
    const { botToken, clientID, shortDesc, desc, cmdPrefix, website, inviteLink, serverInvite} = req.body;
    const { name, icon, description: appDesc, type, cover_image: coverImage, bot, summary, tags, owner } = await getApplicationInfo(botToken, clientID);
    
    botsDB.insert({
        botToken, clientID, shortDesc, desc, cmdPrefix, website, inviteLink, serverInvite, 
        name, icon, appDesc, type, coverImage, bot, summary, tags, owner, vote: 0
    }, (err)=> {
        if (err)
            res.status(200).send({success: false, msg: err});
        else
            res.status(200).send({success: true, msg: 'Saved'});
    });
});

app.listen(port, function () { 
    console.log(`App listening! Port: ${port}`);
});