# router-ddns

通过路由器的Web管理界面每30秒获取一次wan口地址，发送给DNSPod，在内网中实现域名和wan口内网IP的绑定。

## 用法

### 1 设置记录

在DNSPod中设置一条记录用于DDNS。

### 2 生成API Token

在DNSPod控制台的“用户中心 - 安全设置 - API Token”生成API Token，请及时保存这个API Token

### 3 安装依赖

将命令行的当前目录定位到项目根目录，即package.json所在目录，执行

```bash
npm install
```

### 4 填写配置文件

复制config.tmpl.json为config.json，将设置的域名、子域名以及API Token填入对应位置。

将浏览器访问路由器管理界面用的地址填入gateway

### 5 获取登录密码

由于管理界面的登录密码可能不是明文传输（例如TP Link的管理界面），你需要通过Chrome等浏览器的开发者工具（F12），在Network选项卡内利用Preserve Log捕捉实际提交的登录密码，填入config.json的router_password内。

### 6 运行

你可以选择直接用node运行：

```bash
node main.js
```

但是更建议使用pm2：

```bash
pm2 start main.js --name=router-ddns
```

## 支持设备

目前仅支持TP-Link WDR5600与和TP-Link WDR5600管理界面一致的路由器
