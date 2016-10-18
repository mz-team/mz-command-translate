#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var childProcess = require('child_process');
var commander = require('commander');
var colors = require('colors');

exports.name = 'translate';
exports.register = function(c) {

    var mode;
    var phpPaths = [];
    var country = process.cwd().match(/source[\/\\](.*?)[\/\\]/);
    country = country ? country[1] + '-' : ''; 
    

    var getExcelPath = './mz-translate-' + country + path.basename(process.cwd()) + '.xlsx'; // 生成的未翻译的excel
    var setExcelPath; // 已翻译的excel
    var distDir = './mz-translated'; 


    commander
        .usage('mz translate <mode> [-p paths] [-e path] [-d dist]')
        .action(function(cmd, _mode) {
            mode = _mode;
        })
        .option('-p, --php [value]', 'PHP 文件路径（多个用逗号隔开），默认是当前目录下的所有 php 文件')
        .option('-e, --excel [path]', 'excel(.xlsx) 文件路径， 默认生成 ./mz-translate-<当前国家>-<当前目录名>.xlsx')
        .option('-d, --dist [path]', '已翻译文件存放路径， 默认 ./mz-translated')
        .on('--help', function() {
            console.log('  mode: ');
            console.log('');
            console.log('    get -- 从 php 文件生成 Excel(.xlsx) 文件');
            console.log('    set -- 用翻译好的 excel 文件翻译 php 文件，默认使用当前目录下的 excel 文件');
            console.log('');
        })
        .parse(process.argv);



    // php paths
    if (typeof commander.php === 'string') { 
        phpPaths = commander.php.split(/\s*\,\s*/);

        if (phpPaths.length === 1 &&
            fs.existsSync(phpPaths[0]) &&
            fs.statSync(phpPaths[0]).isDirectory(phpPaths[0])) {

            phpPaths = fs.readdirSync(phpPaths[0]).filter(function(filename) {
                return /\.php$/.test(filename);
            });
        }

        phpPaths = phpPaths.filter(function(phpPath) {
            // extname
            return fs.existsSync(phpPath) && path.extname(phpPath) === '.php';
        });

    } else {
        phpPaths = fs.readdirSync('./').filter(function(filename) {
            return /\.php$/.test(filename);
        });
    }

    // excel path
    if (typeof commander.excel === 'string' &&
        path.extname(commander.excel).toLowerCase() === '.xlsx') {
        getExcelPath = commander.excel;
        setExcelPath = commander.excel;
    } else {
        // find excel file in current path
        setExcelPath = fs.readdirSync('./').filter(function(filename) {
            return /.xlsx$/.test(filename.toLowerCase());
        });
        setExcelPath = setExcelPath.length ? setExcelPath[0] : null;
    }

    // dist path
    if (typeof commander.dist === 'string') {
        distDir = commander.dist;
    }

    // console.log(phpPaths);
    // console.log('\n\n');
    // console.log('g', getExcelPath);
    // console.log('s', setExcelPath);
    // console.log('\n\n');
    // console.log(distDir);
    // return;

    // action
    if (mode === 'get') {
        if (!phpPaths.length) {
            console.log('未指定或未找到有效的 php 文件'.red);
        }

        var textObjs;
        var excelExporter = require('./excel-exporter');
        excelExporter.export(phpPaths, getExcelPath);

    } else if (mode === 'set') {
        var translator = require('./translator.js');
        if (!fs.existsSync(distDir) || !fs.statSync(distDir).isDirectory()) {
            fs.mkdirSync(path.resolve(distDir));
        }
        if (!fs.existsSync(setExcelPath)) {
            console.log('未指定或未找到用于翻译的 excel 文件'.red);
        }
        translator.translate(phpPaths, setExcelPath, distDir);
    } else {
        commander.outputHelp();
    }
}