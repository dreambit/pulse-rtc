function log(msg) {
    console.log(msg);
} 

AdapterJS.webRTCReady(function() {

});

$(document).ready(function() {
    $('#myModal').modal();
    $(".close").click(function() {
        $("#myAlert").alert("close");
    });
    $(".close").click(function() {
        $("#myAlert").alert("show");
    });
    $(function() {
        $("#dialog").dialog();
    });
});

function main($scope) {

    AdapterJS.webRTCReady(function() {

        var send = function (object) {
                $scope.socket.send(JSON.stringify(object));
            },

            setup = function() {

                var setupSocketMessageHandler = function() {
    
                    var send = function (object) {
                            $scope.socket.send(JSON.stringify(object));
                        },
    
                        handleUserLogout = function (jsonMessageData) {
                            $scope.users = _.filter($scope.users, u => u.id != message.user.userId);
                        },
    
                        handleUserLogin = function (jsonMessageData) {
                            $scope.users.push(jsonMessageData.user);
                            $scope.$apply();
                        },
    
                        handleICECandidate = function (jsonMessageData) {
                            var iceCandidate = new RTCIceCandidate(jsonMessageData.candidate);
                            $scope.peerConnection.addIceCandidate(iceCandidate);
                            log("Incomming ice candidate was added: " + JSON.stringify(iceCandidate));
                        },
    
                        handleUsersList = function (jsonMessageData) {
                            $scope.users = jsonMessageData.users;
                            $scope.$apply();
                        },
    
                        handleSendMessage = function (jsonMessageData) {
                            $('#incomingMessageContent').html(jsonMessageData.message);
                            $('#incomingMessage').show();
                        },

                        handleSendIdMessage = function (jsonMessageData) {
                            $scope.currentUser.id = jsonMessageData.user.id;
                        },
    
                        handleIncomingCall = function (jsonMessageData) {
                            var offer = new RTCSessionDescription(jsonMessageData.desc),
    
                                /**
                                 *     private User from;
                                 *     private User to;
                                 *     private RTCSessionDescription desc;
                                 */
                                onGetUserMedia = function (stream) {
                                    $scope.peerConnection = new RTCPeerConnection();
    
                                    $scope.peerConnection.onicecandidate = function(event) {
                                      if (event.candidate) {
                                        log("On ICE candidate: " + JSON.stringify(event.candidate));
                                        send({
                                            messageId : "ON_ICE_CANDIDATE",
                                            candidate: event.candidate,
                                            to: jsonMessageData.from
                                        });
                                      }
                                    };
    
                                    $scope.peerConnection.onaddstream = function (event) {
                                        log("Remote peer has added stream: " + JSON.stringify(event));
                                        attachMediaStream(document.getElementById("vid"), event.stream);
                                    };
    
                                    log("Got media stream");
                                    $scope.peerConnection.addStream(stream);
        
                                    $scope.peerConnection.setRemoteDescription(offer).then(function () {
                                        log("Creating answer");
                                        $scope.peerConnection.createAnswer({offerToReceiveAudio: true, offerToReceiveVideo: false}).then(function (answer) {
                                            $scope.peerConnection.setLocalDescription(answer).then(function() {
                                                send({
                                                    messageId : "CALL_ANSWER",
                                                    caller: message.from,
                                                    desc: $scope.peerConnection.localDescription
                                                });
                                            })
                                            .catch(e => log(e));
                                        })
                                        .catch(e => log(e));
                                    })
                                    .catch(e => log(e));
                                };
    
                                window.navigator.getUserMedia({audio: true, video: false}).then(onGetUserMedia).catch(e => log(e));
                        },
    
                        /**
                         * {
                         *   desc: session description
                         * }
                         */
                        handleCallAnswer = function (jsonMessageData) {
                            $scope.peerConnection.setRemoteDescription(new RTCSessionDescription(message.desc));
                        };
    
                    $scope.socket.onmessage = function(message) {
                        var jsonData = JSON.parse(message.data);
    
                        switch (jsonData.messageId) {
                            case "USER_LOGIN":
                                handleUserLogin(jsonData);
                                break;
                            case "USER_LOGOUT":
                                handleUserLogout(jsonData);
                                break;
                            case "ON_ICE_CANDIDATE":
                                handleICECandidate(jsonData);
                                break;
                            case "USERS_LIST":
                                handleUsersList(jsonData);
                                break;
                            case "SEND_MESSAGE":
                                handleSendMessage(jsonData);
                                break;
                            case "INCOMING_CALL":
                                handleIncomingCall(jsonData);
                                break;
                            case "CALL_ANSWER":
                                handleCallAnswer(jsonData);
                                break;
                            case "SET_USER_ID":
                                handleSendIdMessage(jsonData);
                                break;
                            default:
                                break;
                        }
                    };
                }
    
                /**
                 * Array of user objects:
                 * { 
                 *   id: userName: 
                 * }
                 * 
                 */
                $scope.users = [];
                $scope.peerConnection = null;
                $scope.socket = new WebSocket("wss://" + location.host + "/pulse-rtc/users");
    
                $scope.login = function () {

                    send({
                        messageId : "USER_LOGIN",
                        user : $scope.currentUser
                    });
                    $('#myModal').modal('toggle');
                };
    
                $scope.setActiveUser = function (userId) {
                    $scope.activeUserId = userId;
                    $('#sendMessageBlock').show();
                };
    
                $scope.sendMessage = function (userId, message) {
                    send({
                        messageId : "SEND_MESSAGE",
                        from : {
                            id : $scope.currentUser.id
                        },
                        to : {
                            id : userId
                        },
                        message : message
                    });
                    $('#messageAre').val('');
                    $('#sendMessageBlock').hide();
                };

                $scope.makeCall = function(userId) {
                    $scope.peerConnection = new RTCPeerConnection();

                    $scope.peerConnection.onaddstream = function(event) {
                      log("Remote peer has added stream: " + JSON.stringify(event));
                      attachMediaStream(document.getElementById("vid"), event.stream);
                    }

                    $scope.peerConnection.onicecandidate = function(event) {
                      if (event.candidate) {
                          log("On ICE candidate: " + JSON.stringify(event.candidate));
                          send({
                              messageId : "ON_ICE_CANDIDATE",
                              candidate: event.candidate,
                              to: {
                                userId: userId
                              }
                          });
                      }
                    };

                    window.navigator.getUserMedia({audio: true, video: false}).then(function (stream) {
                      $scope.peerConnection.addStream(stream);
                      $scope.peerConnection.createOffer({offerToReceiveAudio: true, offerToReceiveVideo: false}).then(function (offer) {
                        $scope.peerConnection.setLocalDescription(offer).then(function() {
                            send({
                                messageId : "INCOMING_CALL",
                                to: {
                                  userId: userId
                                },
                                from: $scope.currentUser,
                                desc: $scope.peerConnection.localDescription
                            });
                        }).catch(e => log(e));
                      }).catch(e => log(e));
                    }).catch(e => log(e));
                };

                $scope.currentUser = {
                };
    
                setupSocketMessageHandler();
            };

        setup();
    });

};