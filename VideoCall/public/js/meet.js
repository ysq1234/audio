
var client, localStream, camera, microphone;
var audioSelect = document.querySelector('select#audioSource');
var videoSelect = document.querySelector('select#videoSource');
function join() {
    document.getElementById("join").disabled = true;
    document.getElementById("leave").disabled = false;
    var url_str = (location.href + 'channel_key?channelName=' + channel.value);
    $.ajax({//获取后台数据
        type: 'get',
        url: url_str,
        error: function () {
            console.log('error');
        },
        success: function (data) {
            channel_key = data.key; //服务端后台秘钥
            App_Id = data.App_Id;
            console.log(channel_key);
            client = AgoraRTC.createClient({mode: 'interop'}); //使用api创建 音视频客户端 对象,选择互通模式
            client.init(App_Id, function () {                     //初始化客户端对象
                console.log("AgoraRTC client initialized");
                client.join(channel_key, channel.value,0, function (uid) {//加入频道,uid没有指定,系统自动生成一个uid来表明加入频道的唯一标识
                    console.log("User " + uid + " join channel successfully");

                    camera = videoSource.value;
                    microphone = audioSource.value;
                    localStream = AgoraRTC.createStream({ //创建本地音视频流对象
                        streamID: uid,
                        audio: true, //开启音频
                        cameraId: camera,
                        microphoneId: microphone,
                        video: false, //关闭视频对象
                        screen: false
                    });
                    // localStream.setVideoProfile('720p_3'); //如果开启视频,设置本地摄像头分辨率.
                    localStream.init(function () {
                        console.log("getUserMedia successfully");
                        localStream.play('agora_local');  //播放本地视频流

                        client.publish(localStream, function (err) { //上传本地音视频流至agora服务器
                            console.log("Publish local stream error: " + err);
                        });

                        client.on('stream-published', function (evt) { //本地音视频上传回调事件,查看是否已经上传agora服务器
                            console.log("Publish local stream successfully");
                        });
                    }, function (err) {
                        console.log("getUserMedia failed", err);
                    });
                }, function (err) {
                    console.log("Join channel failed", err);
                });
            }, function (err) {
                console.log("AgoraRTC client init failed", err);
            });

            channelKey = "";
            client.on('error', function (err) {
                console.log("Got error msg:", err.reason);
                if (err.reason === 'DYNAMIC_KEY_TIMEOUT') {
                    client.renewChannelKey(channelKey, function () {  //用来更新channelKey,如果启用了 Channel Key 机制，过一段时间后密钥会失效。当 onError 回调报告 ERR_CHANNEL_KEY_EXPIRED(109) 时，应用程序应重新获取该密钥，然后调用该 API 更新 Channel Key，否则 SDK 无法和服务器建立连接。
                        console.log("Renew channel key successfully");
                    }, function (err) {
                        console.log("Renew channel key failed: ", err);
                    });
                }
            });

            client.on('stream-added', function (evt) {  //远端视频流添加事件
                var stream = evt.stream;
                console.log("New stream added: " + stream.getId());
                console.log("Subscribe ", stream);
                client.subscribe(stream, function (err) { //订阅远端视频流
                    console.log("Subscribe stream failed", err);
                });
            });

            client.on('stream-subscribed', function (evt) {  //远端视频流已订阅事件
                var stream = evt.stream;
                console.log("Subscribe remote stream successfully: " + stream.getId());
                if ($('div#video #agora_remote' + stream.getId()).length === 0) {
                    $('div#video').append('<div id="agora_remote' + stream.getId() + '" style="float:left; width:810px;height:607px;display:inline-block;"></div>');
                }
                stream.play('agora_remote' + stream.getId());  //播放远2端视频流
            });

            client.on('stream-removed', function (evt) {//远程音视频流已删除回调事件,该回调通知应用程序已删除远程音视频流，意即对方调用了unpublish stream
                var stream = evt.stream;
                stream.stop();
                $('#agora_remote' + stream.getId()).remove();
                console.log("Remote stream is removed " + stream.getId());
            });

            client.on('peer-leave', function (evt) {//对方用户已离开会议室回调事件,该回调通知应用程序对方用户已离开会议室，意即对方调用了client.leave()。
                var stream = evt.stream;
                if (stream) {
                    stream.stop();
                    $('#agora_remote' + stream.getId()).remove();
                    console.log(evt.uid + " leaved from this channel");
                }
            });
        }
    });
}

function leave() { //离开频道
    document.getElementById("join").disabled = false;
    document.getElementById("leave").disabled = true;
    client.leave(function () {
        console.log("Leavel channel successfully");
    }, function (err) {
        console.log("Leave channel failed");
    });
    location.reload();
}

function publish() { //上传本地音视频流至agora服务器
    document.getElementById("publish").disabled = true;
    document.getElementById("unpublish").disabled = false;
    client.publish(localStream, function (err) {
        console.log("Publish local stream error: " + err);
    });
}

function unpublish() { //取消上传本地音视频流至agora服务器
    document.getElementById("publish").disabled = false;
    document.getElementById("unpublish").disabled = true;
    client.unpublish(localStream, function (err) {
        console.log("Unpublish local stream failed" + err);
    });
}

function getDevices() { //枚举系统设备信息
    AgoraRTC.getDevices(function (devices) {
        for (var i = 0; i !== devices.length; ++i) {
            var device = devices[i];
            var option = document.createElement('option');
            option.value = device.deviceId;
            if (device.kind === 'audioinput') {
                option.text = device.label || 'microphone ' + (audioSelect.length + 1);
                audioSelect.appendChild(option);
            } else if (device.kind === 'videoinput') {
                option.text = device.label || 'camera ' + (videoSelect.length + 1);
                videoSelect.appendChild(option);
            } else {
                console.log('Some other kind of source/device: ', device);
            }
        }
    });
}

//audioSelect.onchange = getDevices;
//videoSelect.onchange = getDevices;
//getDevices();