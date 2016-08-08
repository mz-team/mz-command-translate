# mz-command-translate

## 翻译插件示例

![readme](./translate.png)


## 插件用法（mz translate -h）


```javascript
Usage: mz mz translate <mode> [-p paths] [-e path] [-d dist]

mode:

	get -- 从 php 文件生成 Excel(.xlsx) 文件
	set -- 用翻译好的 excel 文件翻译 php 文件，默认使用当前目录下的 excel 文件

Options:

	-h, --help          output usage information
	-p, --php [value]   PHP 文件路径（多个用逗号隔开），默认是当前目录下的所有 php 文件
	-e, --excel [path]  excel(.xlsx) 文件路径， 默认生成 ./mz-translate-<当前国家>-<当前目录名>.xlsx
	-d, --dist [path]   已翻译文件存放路径， 默认 ./mz-translated

```