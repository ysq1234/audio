var express = require('express');
var path = require('path');
var https = require('https');
var app = express();
var fs  = require('fs');
var bodyParser = require("body-parser");
var AgoraSignGenerator = require('./lib/AgoraSignGenerator');
app.use(express.static(path.join(__dirname, 'public')));
app.disable('x-powered-by');
app.use(bodyParser.json());
app.use(app.router);
app.use(express.favicon());

var VENDOR_KEY = "f410477b4d7a4bc3bcdbd2fdc97e7c7f";
var SIGN_KEY = "055d9d05c93442a09f3dd1cbd2d040dd";
var generateMediaChannelKey = function (req, resp) { //生成channelkey
    var channelName = req.query.channelName;
    if (!channelName) {
        return resp.status(400).json({'error': 'channel name is required'}).send();
    }
    var ts = Math.floor(new Date() / 1000);
    var r = Math.floor(Math.random() * 0xFFFFFFFF);
    var uid = 0;
    var expiredTs = 0;
    var key = AgoraSignGenerator.generateMediaChannelKey(VENDOR_KEY, SIGN_KEY, channelName, ts, r, uid, expiredTs);
    resp.header("Access-Control-Allow-Origin", "*");
    return resp.json({'key': key, "App_Id": VENDOR_KEY}).send();
};
app.get('/channel_key', generateMediaChannelKey);

var options = { //证书
    key: fs.readFileSync('./ssl/privatekey.pem'),
    cert: fs.readFileSync('./ssl/certificate.pem')
};
https.createServer(options, app).listen(8081,function () { //https服务器
    console.log('Https server listening on port ' + 8081);
    console.log('qqqqqq');
});