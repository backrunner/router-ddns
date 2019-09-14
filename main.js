const CronJob = require('cron').CronJob;
const config = require('./config.json');
const request = require('request');
const fs = require('fs');

const log4js = require('log4js');
log4js.configure({
    appenders: {
        out: {
            type: 'console'
        },
        task: {
            type: "dateFile",
            filename: "./logs/runtime",
            pattern: "yyyy-MM-dd.log",
            encoding: 'utf-8',
            alwaysIncludePattern: true,
        }
    },
    categories: {
        default: {
            appenders: ['out', 'task'],
            level: 'info'
        }
    },
    pm2: true
});
const logger = log4js.getLogger('console');

var record_id;
var token;

var cache;
if (fs.existsSync('./cache.json')) {
    cache = require('./cache.json');
}
var cache_ip;
if (cache) {
    cache_ip = cache.wanip;
} else {
    cache = {};
}

var job = new CronJob('*/30 * * * * *', function() {
    if (record_id && token) {
        switch (config.router) {
            case 'tplink':
                request.post({
                    url: 'http://' + config.gateway + '/stok=' + token + '/ds',
                    body: {
                        network: {
                            name: "wan_status"
                        },
                        method: "get"
                    },
                    timeout: 5000,
                    json: true
                }, (err, res, body) => {
                    if (err) {
                        logger.error('Cannot get host info from router.');
                        return;
                    }
                    if (res.statusCode == 401){
                        logger.info('Token is expired, trying to fetch a new token...');
                        token = null;
                        fetchToken();
                        return;
                    }
                    let wanip = body.network.wan_status.ipaddr;
                    if (cache_ip == wanip) {
                        return;
                    } else {
                        // request ddns api of dnspod
                        request.post({
                            url: 'https://dnsapi.cn/Record.Ddns',
                            form: {
                                login_token: config.api_token,
                                format: 'json',
                                domain: config.domain,
                                sub_domain: config.sub_domain,
                                record_id: record_id,
                                record_line: '默认',
                                value: wanip
                            },
                            json: true
                        }, (err, res, body) => {
                            if (err) {
                                logger.error('Request dnspod error.');
                                return;
                            }
                            if (body.status.code == "1") {
                                cache_ip = wanip;
                                cache.wanip = wanip;
                                fs.writeFile('./cache.json', JSON.stringify(cache), function(err) {
                                    if (err) {
                                        logger.error('Write cache file error.');
                                    }
                                });
                                logger.info('Record is updated to the new value: ' + wanip);
                            } else {
                                logger.error('Update record error: ' + body.status.message);
                            }
                        });
                    }
                });
                break;
        }
    }
}, null, false, 'Asia/Shanghai');

function fetchToken() {
    switch (config.router) {
        case 'tplink':
            request.post({
                url: 'http://' + config.gateway + '/',
                body: {
                    method: "do",
                    login: {
                        password: config.router_password
                    }
                },
                timeout: 5000,
                json: true
            }, (err, res, body) => {
                if (err) {
                    logger.error('Cannot login to the router.');
                    return;
                }
                token = body.stok;
                logger.info('Token id received: '+token);
            });
            break;
    }
}

// fetch record info from dnspod
function fetchRecordId() {
    request.post({
        url: 'https://dnsapi.cn/Record.List',
        form: {
            domain: config.domain,
            sub_domain: config.sub_domain,
            login_token: config.api_token,
            format: 'json'
        },
        json: true
    }, (err, res, body) => {
        if (err) {
            logger.fatal('Cannot fetch record info from dnspod.');
            return;
        }
        if (body.records.length > 0) {
            record_id = body.records[0].id;
            // start cron job
            job.start();
            logger.info('Cron job started...');
        } else {
            logger.fatal('Domain in config is not set up.');
        }
    });
}


// main execute
fetchToken();
fetchRecordId();