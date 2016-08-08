var colors = require('colors');
var fs = require('fs');
var path = require('path');
var childProcess = require('child_process');
var XLSX = require('xlsx');

function readExcelFile(excelFile) {
    return new Promise(function(resolve, reject) {
        var workbook = XLSX.readFile(excelFile);
        var excelTextObj = {};
        var sheetNames = workbook.SheetNames;

        console.log(workbook.Sheets);return
        sheetNames.forEach(function(sheetName) { /* iterate through sheets */
            var worksheet = workbook.Sheets[sheetName];
            var sheetTextObj = {};

            var aCell;
            var bCell;

            var aCellVal;
            var bCellVal;

            for (z in worksheet) {
                if (z[0] === 'A') {
                    aCell = worksheet[z];
                    bCell = worksheet[z.replace('A', 'B')];

                    aCellVal = (aCell.v ? aCell.v.trim() : '')
                    bCellVal = bCell ? (bCell.v ? bCell.v.trim() : '') : '';
                    if (aCellVal) {
                        sheetTextObj[aCellVal.trim().replace(/\s+/g, ' ')] = bCellVal;
                    }
                }
                excelTextObj[sheetName] = sheetTextObj;
            }
        });
        //console.log(excelTextObj);
        resolve(excelTextObj);
    });
}

function translateFile(phpPath, textObj) {
    var allTagStrRegx = /^(<\s*([\w]+)\s*>([\s\S\n]*?)<\s*\/\s*\2\s*>)+$/;
    var tagStrRegx = /<\s*([\w]+)\s*>([\s\S\n]*?)<\s*\/\s*\1\s*>/g;

    var phpStr = fs.readFileSync(phpPath, { encoding: 'utf8' });
    var sentenceRegx = /(\'(|[\s\S\n]*?[^\\])\'|\"(|[\s\S\n]*?[^\\])\")(\s*\=>)?/gm;

    var replaceFailStrs = [];

    function translateSentence(s, textObj) {
        var s = s.trim().replace(/\s+/g, ' ');
        var t;

        for (var key in textObj) {
            t = key.trim().replace(/\s+/g, ' ');

            // 字符串相似程度 大于0.85
            if (cDistancePercent(s, t) > 0.85) {
                return textObj[key];
            }
        }
        return false;
    }

    phpStr = phpStr.replace(sentenceRegx, function(tStr, sStr, sQoute, dQoute, arrow) {

        // console.log(sQoute, dQoute); //return;
        if (arrow) {
            return tStr; // is => 
        }

        var qoute = sQoute ? "'" : '"';
        var qouteRegx = new RegExp('\\\\?' + qoute, 'g');
        var rawStr = typeof(sQoute) === 'undefined' ? dQoute : sQoute;
        var translatedStr = '';

        if (allTagStrRegx.test(rawStr)) {
            translatedStr = rawStr.replace(tagStrRegx, function(tagStr, tag, sRawStr) {
                subTranslatedStr = translateSentence(sRawStr.replace(qouteRegx, qoute), textObj);
                if (subTranslatedStr) {
                    return '<' + tag + '>' + subTranslatedStr + '</' + tag + '>';
                } else {
                    replaceFailStrs.push(sRawStr);
                    return tagStr;
                }
            });
            translatedStr = translatedStr;
        } else {
            translatedStr = translateSentence(rawStr.replace(qouteRegx, qoute), textObj);
            if (!translatedStr) {
                translatedStr = rawStr;
                replaceFailStrs.push(rawStr);
            }
        }
        return qoute + translatedStr.replace(qouteRegx, '\\' + qoute) + qoute;
    });
    return {
        translatedStr: phpStr,
        fails: replaceFailStrs
    };
    //console.log(phpStr.match(sentenceRegx));
}


function translate(phpPaths, excelFile, target) {
    var translated = {};
    var logFileName = 'translate-log.txt';
    var logStrs = '';


    readExcelFile(excelFile).then(function(textObjs) {
        var filename;
        var filenameNoExt;
        var logStr = '';

        phpPaths.forEach(function(phpPath) {
            filename = path.basename(phpPath);
            filenameNoExt = path.basename(phpPath, '.php');
            if (textObjs[filenameNoExt]) {
                translated[filenameNoExt] = translateFile(phpPath, textObjs[filenameNoExt]);
                fs.writeFileSync(path.join(target, path.basename(phpPath)), translated[filenameNoExt].translatedStr);

                if (translated[filenameNoExt].fails.length) {
                    logStr += '\n\n' + translated[filenameNoExt].fails.join('\n') + '\n\n\n\n';
                    logStrs += logStr;
                    console.log((filename + ' - ' + ' 这些句子没有被正确翻译，请检查日志文件 ' + logFileName + ': ').red);
                    console.log(logStr.red);
                } else {
                    console.log((filename + ': ' + 'Translate successfully!').green);
                }
            }
        });

        if (logStrs)
            fs.writeFileSync(path.join(target, logFileName), logStrs);

    }).catch(function(err) {
        console.log(err.stack);
    });
}

// www.ShareJS.com
// 求两个字符串的相似度,返回相似度百分比
function cDistancePercent(s, t) {
    var l = s.length > t.length ? s.length : t.length;
    var d = cDistance(s, t);
    return (1 - d / l).toFixed(4);
}

function cDistance(s, t) {
    var n = s.length; // length of s
    var m = t.length; // length of t
    var d = []; // matrix
    var i; // iterates through s
    var j; // iterates through t
    var s_i; // ith character of s
    var t_j; // jth character of t
    var cost; // cost
    // Step 1
    if (n == 0) return m;
    if (m == 0) return n;
    // Step 2
    for (i = 0; i <= n; i++) {
        d[i] = [];
        d[i][0] = i;
    }
    for (j = 0; j <= m; j++) {
        d[0][j] = j;
    }
    // Step 3
    for (i = 1; i <= n; i++) {
        s_i = s.charAt(i - 1);
        // Step 4
        for (j = 1; j <= m; j++) {
            t_j = t.charAt(j - 1);
            // Step 5
            if (s_i == t_j) {
                cost = 0;
            } else {
                cost = 1;
            }
            // Step 6
            d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
        }
    }
    // Step 7
    return d[n][m];
}


module.exports = {
    'translate': translate
}
