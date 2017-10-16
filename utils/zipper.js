var zipper = require("zip-local");
var fs = require('fs');
var sysPath = require('path');

/*
 * 压缩文件或目录
 * @param{ String } 被压缩的文件或目录
 * @param{ String } 指定压缩后的文件
 * @param{ Function } 完成回调
 */
//zip("homework/201605171233100/pdf","homework/201605171233100/package2.zip");
function zip(path,targetPath,cb){
	cb = cb || function(){};
	if(!fs.existsSync(path)){
		cb(new Error("Path is not exist!"));
		return;
	}
	if(!fs.existsSync(sysPath.dirname(targetPath))){
		cb(new Error("Target Path is not exist!"));
		return;
	}
	zipper.zip(path, function(error, zipped) {

	    if(!error) {
	        zipped.compress(); // compress before exporting

	        // or save the zipped file to disk
	        zipped.save(targetPath, function(error) {
	            if(!error) {
	    			cb(null);
	            }
	            else
	    			cb(error);
	        });
	    }
	    else{
	    	cb(error);
	    }
	});
}

/*
 * 解压文件或目录
 * @param{ String } 被解压的文件或目录
 * @param{ String } 指定解压后的目录
 * @param{ Function } 完成回调
 */
//unzip("homework/201605171233100/package2.zip","homework/123/",console.log)
function unzip(path,targetPath,cb){
	cb = cb || function(){};
	if(!fs.existsSync(path)){
		cb(new Error("Path is not exist!"));
		return;
	}
	if(!fs.existsSync(sysPath.dirname(targetPath))){
		cb(new Error("Target Path is not exist!"));
		return;
	}
	zipper.unzip(path, function(error, unzipped) {

	    if(!error) {
	        // extract to the current working directory
	        unzipped.save(targetPath, function(err) {
	            if(!error) {
	    			cb(null);
	            }
	            else
	    			cb(error);
	    	});
	    }
	});
}

module.exports = {
	zip : zip,
	unzip : unzip
};

// zip("homework/201605171233100/pdf","homework/201605171233100/package2.zip",console.log)