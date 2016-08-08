var path = require('path');
var Excel = require('exceljs');
var XLSX = require('xlsx');
var childProcess = require('child_process');

function getTextObjFromPHP(phpPath) {

    return new Promise(function(resolve, reject) {

        childProcess.exec(
            'php -r \'include("' + phpPath + '"); print json_encode($fis_data);\'',

            function(err, stdout, stderr) {
                var textObj = JSON.parse(stdout);

                if (err) {
                    console.log(err);
                    return;
                }
                resolve(textObj);
            }
        );
    });
}

function getTextObjs(phpPaths) {
    var len = phpPaths.length;
    var textObjs = {};

    return new Promise(function(resolve, reject) {

        phpPaths.forEach(function(phpPath, i) {
            getTextObjFromPHP(phpPath).then(function(textObj) { 
                textObjs[path.basename(phpPath, '.php')] = textObj;
                len--;
                if (len === 0) {
                    resolve(textObjs);
                }
            }, function(err) {
                reject(err);
            });
        });
    });
}

function getExcelKeysFromTextObj(textObj, deep) {
	var deep = deep || 0;
	var allTagStrRegx = /^(<\s*([\w]+)\s*>(.*?)<\s*\/\s*\2\s*>)+$/;
	var tagStrRegx = /<\s*([\w]+)\s*>(.*?)<\s*\/\s*\1\s*>/g;
	var tagRegx = /<\s*\/?\s*(br|sup)+\s*\/?\s*>/g;
	var excelKeys = [];

	if (typeof textObj === 'string') {
		var strs = [];

		if (allTagStrRegx.test(textObj)) { 
			textObj.replace(tagStrRegx, function(tagStr, tag, rawStr) {
				//console.log(rawStr);
				strs.push(rawStr);
			});
		} else {
			strs = [textObj];
		}

		strs.forEach(function(str) {
			if (str = str.trim())
			excelKeys.push(str + deep);
		});

	} else if (Object.prototype.toString.call(textObj) === '[object Array]') {
		deep++;
		excelKeys = textObj.reduce(function(prev, cur) {
			return prev.concat(getExcelKeysFromTextObj(cur, deep));
		}, []);
		excelKeys.unshift('');

	} else if (textObj instanceof Object) {
		deep++;
		for (var key in textObj) {
			excelKeys.unshift('');
			excelKeys = excelKeys.concat(getExcelKeysFromTextObj(textObj[key], deep));
		}
	}
	return excelKeys;
}

function createExcel(phpPaths, target) { 
    getTextObjs(phpPaths).then(function(textObjs) {
		var excelKeys = {};
		var workbook = new Excel.Workbook();
		var worksheet;

		var titleSize = 24;
		var baseSize = titleSize - 4;

		for(var filename in textObjs) {
			excelKeys[filename] = getExcelKeysFromTextObj(textObjs[filename]);

			worksheet = workbook.addWorksheet(filename);
			worksheet.columns = [
			    { header: 'Message', key: 'message', width: 80 },
			    { header: 'Translate', key: 'translate', width: 80 },
			];


			var row = 1;
			excelKeys[filename].forEach(function(str, i) {

				// 删除多余空行
				if (i > 0 && str === '' && str === excelKeys[filename][i-1]) {
					return;
				}
				row++;

				worksheet.addRow([str.slice(0, -1), '']);
				// worksheet.addRow(['', str.slice(0, -1)]);
				if (str !== '') {
					// 根据层级设置字体大小
					var fontsize = baseSize - parseInt(str.slice(-1));
					fontsize = fontsize < 14 ? 14 : fontsize;

					worksheet.getRow(row).eachCell(function(cell) {
						cell.font = {size: fontsize};
						cell.alignment = { wrapText: true, vertical: 'middle' }; 
					});				
				}

			});

			// 首行高亮
			worksheet.getRow(1).eachCell(function(cell) {
				cell.alignment = { wrapText: true, vertical: 'middle' }; 
			    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '002ABCED' }, bgColor: { argb: 'FF2ABCED' } };
			    cell.border = {
			        top: { style: 'thin' },
			        left: { style: 'thin' },
			        bottom: { style: 'thin' },
			        right: { style: 'thin' }
			    };
			    cell.font = { size: 20, color: { argb: 'FFFFFFFF' } };
			});
		}

		workbook.xlsx.writeFile(target).then(function() {
			console.log(('Done! Excel file: "' + target + '" has been created!').green);
		});        
    }).catch(function(err) {
        console.log(err.stack);
    });




}


module.exports = {
	export: createExcel
};


