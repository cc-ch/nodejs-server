
var $node = {};

$node.fs = require('fs');
var cp = require('child_process');
$node.exec = cp.execFile;
$node.path = require('path');

/*
 * 复制目录中的所有文件包括子目录
 * @param{ String } 需要复制的路径
 * @param{ String } filename
 * @param{ String } 复制到指定的目录
 * @param{ Function } 复制完成回调
 */
$node.copyFile = function( src, filename, dst ,cb){
    var _dst = dst + $node.path.sep + filename;
    var fs = $node.fs;  
    // 创建读取流
    var readable = fs.createReadStream( src );
    // 创建写入流
    var writable = fs.createWriteStream( _dst );   
    // 通过管道来传输流
    readable.pipe( writable );
    writable.on("finish",function(){
    	if(cb)
    		cb(null);
    });
    writable.on("error",function(error){
        if(cb)
            cb(error);
    });
};

/*
 * 移动文件
 * @param{ String } 需要移动的路径
 * @param{ String } 移动到指定的路径
 * @param{ Function } 移动完成回调
 */
$node.moveFile = function(src,dst,cb){
    var dstbase = $node.path.dirname(dst);
    var dstfile = $node.path.basename(dst);
    $node.mkDirs(dstbase);
    $node.copyFile(src,dstfile,dstbase,function(er){
        if(!er)
            try{
                $node.fs.unlinkSync(src);
            }catch(xx){}
        cb && cb();
    });
}

/*
 * 清空文件夹
 * @param{ String } 需要移动的路径
 * @param{ String } 移动到指定的路径
 * @param{ Function } 移动完成回调
 */
$node.clearDir = function(dir){
    $node.delDir(dir);
    $node.mkDirs(dir);
}

/*
 * 建目录（递归）
 * @param{ String } 文件夹路径
 * @param{ String } mode
 */
$node.mkDirs = function (dirname, mode){
	var path = $node.path;
	var fs = $node.fs;
    if(fs.existsSync(dirname)){
        return true;
    }else{
        if($node.mkDirs(path.dirname(dirname), mode)){
            fs.mkdirSync(dirname, mode);
            return true;
        }
    }
}

/*
 * 删除目录
 * @param{ String } 文件夹路径
 */
$node.delDir = function (path){
	path = $node.path.normalize(path);
	var fs = $node.fs;
	var dfs = [];
	if(!fs.existsSync(path))
		return;
    dfs = fs.readdirSync(path);
    dfs.forEach(function(f,index){
        var curPath = path + $node.path.sep + f;
        if(fs.statSync(curPath).isDirectory()) { // recurse
            $node.delDir(curPath);
        } else {
            fs.unlinkSync(curPath);
        }
    });
    fs.rmdirSync(path);
}

module.exports = $node;