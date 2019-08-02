const fs = require('fs');
const AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' });
const dirname = __dirname + '/tickets/';
const textract = new AWS.Textract({ apiVersion: '2018-06-27' });
//Date pattern (dd/mm/yyyy,dd-mm-yyyy or dd.mm.yyyy);
const date_pattern = new RegExp(/^(?:(?:31(\/|-|\.)(?:0?[13578]|1[02]))\1|(?:(?:29|30)(\/|-|\.)(?:0?[1,3-9]|1[0-2])\2))(?:(?:1[6-9]|[2-9]\d)?\d{2})$|^(?:29(\/|-|\.)0?2\3(?:(?:(?:1[6-9]|[2-9]\d)?(?:0[48]|[2468][048]|[13579][26])|(?:(?:16|[2468][048]|[3579][26])00))))$|^(?:0?[1-9]|1\d|2[0-8])(\/|-|\.)(?:(?:0?[1-9])|(?:1[0-2]))\4(?:(?:1[6-9]|[2-9]\d)?\d{2})$/);
const image_extension_pattern = new RegExp(/([^\s]+(\.(jpg|png|gif|bmp|jpeg))$)/)
const getParams = bytes => {
    return {
        Document: {
            Bytes: bytes
        },
        FeatureTypes: ["TABLES", "FORMS"]
    };
}
const blockDateFilterFunction = (i, n, a) => {
    return (i.BlockType == 'LINE' || i.BlockType == 'WORD') && i.Text && i.Text.length > 2 && i.Text.match(date_pattern)
};
const fileImageFilterFunction = (i, n, a) => {
    return i.match(image_extension_pattern);
}
const blockDateMapperFunction = (i, n, a) => {
    var arr = i.Text.split("/");
    var d = arr[0];
    var m = arr[1];
    var y = arr[2];
    return {
        day: arr[1],
        month: arr[0],
        year: arr[2],
        raw: i.Text
    };
};
const blockDateAnalyzer = (err, data) => {
    if (err) return console.error(err, err.stack);
    var blocks = data.Blocks;
    blocks = blocks.filter(blockDateFilterFunction);
    blocks = blocks.map(blockDateMapperFunction);
    console.log(blocks);

};

var index = 0;
var arrlen = 0;
var interval;
const fileExtraction = files => {
    var f = getNextFile(files);
    console.log("fileExtraction(", f, ")");

    var params = getParams(Buffer.from(fs.readFileSync(dirname + f)));
    textract.analyzeDocument(params, (err, data) => {
        if (err) return console.error(err, err.stack);
        var blocks = data.Blocks;
        blocks = blocks.filter(blockDateFilterFunction);
        blocks = blocks.map(blockDateMapperFunction);
        console.log(blocks);
        if (index == arrlen - 1) {
            clearInterval(interval);
        }

    });
};

function getNextFile(farr) {
    return farr[index++];
}
fs.readdir(__dirname + '/tickets/', (err, files) => {
    files = files.filter(fileImageFilterFunction);
    arrlen = files.length;

    interval = setInterval(fileExtraction, 5000, files);

    //fileExtraction(files[index]);
    //files.forEach(fileExtraction);

});