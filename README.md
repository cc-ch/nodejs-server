# nodejs-server
nodejs-server 是一个使用 express 开发的通用后台框架，对于普通的增删改查，登录退出，文件上传下载等功能都具备了，并且只需要修改配置，不需要再修改代码了，符合大部分前端同学对于后端不熟悉但是需要接口的，只需要简单设置即可

### 通用查询接口
```get: /api/student/```

    student 是 mysql 数据库表，所有表查询都可以通过 api/table

```get: /api/student/?a=1&b=2```

    这里 ? 后面拼接的字段都是数据库表中有的字段，可以添加条件查询到

```/api/t_comment?nService=1&ORDERBY=nId&DESC=DESC```

   这里可以定向指定条件查询 ORDERYBY 相当于 mysql order by 可以 DESC 也可以 ASC  

### 通用分页查询
```get: /api/student/?LIMIT=0,5```

    LIMIT=开始索引,结束索引#例如0,5表示查询索引为从0到5的记录  即第一页

    =========================== response =========================

    当从第0条开始查询时，response headers中有返回参数：

    X-Total-Count:100

    该字段表示一共有多少条数据  由此，根据该信息可组织分页信息。


### 通用发送接口
```post: /api/t_serviceapply```

    参数通过 params 发送给后台接口，params对象内字段对应数据库表字段名称

### 通用更新接口
```put: /api/t_serviceapply```

    将要更改的参数通过 params 发送给后台

### 通用删除接口
```delete: /api/t_serviceapply```

### 通用导出数据表接口
```get: /export/table```

### 文件上传接口

```post: /api/upload/default```

    文件上传地址是在后台当前目录下的 /store/temp/ 可以再代码中自己设置路径