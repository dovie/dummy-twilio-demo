//////////////////////////////////////////////////////
/// Twilio Credentials
var accountSid = "ACCOUNT_SID_GOES_HERE";
var authToken = "AUTH_TOKEN_GOES_HERE";
var myNumber="+3311221122";
var facebookPage="messenger:137529356977701"
///
//////////////////////////////////////////////////////
var twilio = require('twilio');
var client = twilio(accountSid, authToken);


var http = require('http');
var express = require('express');
const urlencoded = require('body-parser').urlencoded;
var app = express();
app.use(urlencoded({ extended: false }));
// wire socketio server into http server
var server = http.createServer(app);
var io = require("socket.io")(server);

// Root GUI
app.use("/gui",express.static("gui"));
app.get('/', function (req, res) {
    res.redirect("/gui/index.html");
});
app.get("/mynumber",function(req,res){
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({number:myNumber}));
});

var mySocket;
io.on('connection', function (socket) {
    console.log('a user connected');
    mySocket = socket;
    socket.emit("sms", { From: "System", Body: "You're now connected" });
    socket.on("send", function (msg) {
        console.log("Send :"+JSON.stringify(msg));
        var fromAddress=myNumber;
        if(msg.to.indexOf("messenger:")>-1) { fromAddress=facebookPage; }
        client.messages.create({ to: msg.to, body: msg.body, from: fromAddress }).then(function(message,err){
            if(message)console.log("Success Message:"+JSON.stringify(message));
            if(error)console.log("ERROR:"+json.stringify(err));
        });
        socket.emit("sms", { From: "System", Body: "Sent SMS to " + msg.to + "(" + msg.body + ")" });
    });
});

app.post("/terminate", function(req,res){
    client.calls(req.body.id).update({status:"completed"});
});
// Incoming SMS
app.post('/sms', function (req, res) {
    var twiml = new twilio.twiml.MessagingResponse();
    console.log("INCOMING: " + JSON.stringify(req.body));
    if (mySocket) mySocket.emit("sms", req.body);
    twiml.message('I Got your message. Thanks ! ' + new Date());
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(twiml.toString());
});


// Incoming Call
app.post('/call', function (req, res) {
    var twiml = new twilio.twiml.VoiceResponse();
    if (mySocket) mySocket.emit("voice", req.body);
    twiml.say({ voice: 'alice' }, "Hi there. I noticed you're from " + req.body.FromCity +"," +req.body.FromCountry);
    twiml.play({}, "http://www.noiseaddicts.com/samples_1w72b820/3705.mp3");
    twiml.hangup();
    res.type('text/xml');
    res.send(twiml.toString());
});

// Incoming Call Status Update
app.post('/call-status', function (req, res) {
    if (mySocket) mySocket.emit("status", req.body);
    res.end();
});

server.listen(4444, function () {
    console.log("Server started on port 4444");
});