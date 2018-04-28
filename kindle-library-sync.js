const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const config = require("./config");
const dir = `C:\\Calibre Library`;
const dbDir = `C:\\scripts\\JSONDb.json`;

let attachments = [];

let main = () => {
    walkSync(dir);
    let dataInDb = readJSONdb();
    console.log("DATA IN DB", dataInDb);
    let emailAttachments = removeDuplicates(dataInDb, attachments);
 
    if (emailAttachments.length > 0) {
        sendMail(config.to, 'Book Update', '', emailAttachments, (msg, error) => {
            if (error) console.log(error);
            else {
                console.log(msg);
                writeAttachmentsToJSONDb(emailAttachments);
                console.log('Updated DB', readJSONdb());
            }
        });
    }
    else {
        console.log('No attachments, library up to date.');
    }
    
}

let walkSync = function (dir, filelist) {
    var path = path || require('path');
    var fs = fs || require('fs'),
        files = fs.readdirSync(dir);
    filelist = filelist || [];
    files.forEach(function (file) {
        if (fs.statSync(path.join(dir, file)).isDirectory()) {
            filelist = walkSync(path.join(dir, file), filelist);
        }
        else {
            if (getExtension(file) == 'mobi') {
                let attachment = {};
                let str = path.join(dir, file);
                attachment.filename = file;
                attachment.path = str.replaceAll(`\\`, `/`);
                attachments.push(attachment);
            }
        }
    });
};

let getExtension = (filename) => {
    var ext = path.extname(filename || '').split('.');
    return ext[ext.length - 1];
}

let addToJSONDb = (attachments) => {
    let dataInDb;
    if (fs.existsSync(dbDir)) {
        dataInDb = writeAttachmentsToJSONDb(attachments);
    }
    else {
        fs.writeFileSync(dbDir);
        dataInDb = writeAttachmentsToJSONDb(attachments);
    }
    return dataInDb;
}

let readJSONdb = () => {
    if (!fs.existsSync(dbDir)) return [];
    let rawJSON = fs.readFileSync(dbDir);

    let jsonData;
    let data = [];

    if (rawJSON.length > 0) {
        jsonData = JSON.parse(rawJSON);
        data = jsonData;
    }
    return data;
}

let writeAttachmentsToJSONDb = (attachments) => {
    let dataInDb = readJSONdb();
    let dataToAdd = removeDuplicates(dataInDb, attachments);
    let updatedDb = dataInDb.concat(dataToAdd);
    
    fs.writeFileSync(dbDir, JSON.stringify(updatedDb));
}

let removeDuplicates = (data, attachments) => {
    let emailAttachments = [];

    for (let inx in attachments) {
        let count = 0;
        for (let i in data) {
            if (attachments[inx].filename == data[i].filename) count++;
        }
        if (count === 0) emailAttachments.push(attachments[inx]);
    }
    console.log('Attachments', emailAttachments);
    return emailAttachments;
}

let transporter = nodemailer.createTransport({
    host: config.host,
    secure: false, // true for 465, false for other ports
    requireTLS: true,
    tls: {
        rejectUnauthorized: false
    },
    port: config.port, //Port
    auth: {
        user: config.user, // generated ethereal user
        pass: config.pass // generated ethereal password
    }
});

const sendMail = (to, subject, text, attachments, callback) => {
    let mailOptions = {};

    mailOptions.from = config.sender;
    mailOptions.to = to;
    mailOptions.subject = subject;
    mailOptions.text = text;
    mailOptions.attachments = attachments;

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            callback(null, error);
            return;
        }
        callback(info, null);
    });
}

String.prototype.replaceAll = function (search, replace) {
    if (replace === undefined) {
        return this.toString();
    }
    return this.split(search).join(replace);
}

main();