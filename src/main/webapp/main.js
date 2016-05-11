function log(msg) {
    console.log(msg);
} 

function forceChosenAudioCodec(sdp) {
    return maybePreferCodec(sdp, 'audio', 'send', "Opus");
  }

  // Copied from AppRTC's sdputils.js:

  // Sets |codec| as the default |type| codec if it's present.
  // The format of |codec| is 'NAME/RATE', e.g. 'opus/48000'.
  function maybePreferCodec(sdp, type, dir, codec) {
    var str = type + ' ' + dir + ' codec';
    if (codec === '') {
      trace('No preference on ' + str + '.');
      return sdp;
    }

    trace('Prefer ' + str + ': ' + codec);

    var sdpLines = sdp.split('\r\n');

    // Search for m line.
    var mLineIndex = findLine(sdpLines, 'm=', type);
    if (mLineIndex === null) {
      return sdp;
    }

    // If the codec is available, set it as the default in m line.
    var codecIndex = findLine(sdpLines, 'a=rtpmap', codec);
    console.log('codecIndex', codecIndex);
    if (codecIndex) {
      var payload = getCodecPayloadType(sdpLines[codecIndex]);
      if (payload) {
        sdpLines[mLineIndex] = setDefaultCodec(sdpLines[mLineIndex], payload);
      }
    }

    sdp = sdpLines.join('\r\n');
    return sdp;
  }

  // Find the line in sdpLines that starts with |prefix|, and, if specified,
  // contains |substr| (case-insensitive search).
  function findLine(sdpLines, prefix, substr) {
    return findLineInRange(sdpLines, 0, -1, prefix, substr);
  }

  // Find the line in sdpLines[startLine...endLine - 1] that starts with |prefix|
  // and, if specified, contains |substr| (case-insensitive search).
  function findLineInRange(sdpLines, startLine, endLine, prefix, substr) {
    var realEndLine = endLine !== -1 ? endLine : sdpLines.length;
    for (var i = startLine; i < realEndLine; ++i) {
      if (sdpLines[i].indexOf(prefix) === 0) {
        if (!substr ||
            sdpLines[i].toLowerCase().indexOf(substr.toLowerCase()) !== -1) {
          return i;
        }
      }
    }
    return null;
  }

  // Gets the codec payload type from an a=rtpmap:X line.
  function getCodecPayloadType(sdpLine) {
    var pattern = new RegExp('a=rtpmap:(\\d+) \\w+\\/\\d+');
    var result = sdpLine.match(pattern);
    return (result && result.length === 2) ? result[1] : null;
  }

  // Returns a new m= line with the specified codec as the first one.
  function setDefaultCodec(mLine, payload) {
    var elements = mLine.split(' ');

    // Just copy the first three parameters; codec order starts on fourth.
    var newLine = elements.slice(0, 3);

    // Put target payload first and copy in the rest.
    newLine.push(payload);
    for (var i = 3; i < elements.length; i++) {
      if (elements[i] !== payload) {
        newLine.push(elements[i]);
      }
    }
    return newLine.join(' ');
  }

$(document).ready(function() {
    $('#myModal').modal();
    $(".close").click(function() {
        $("#myAlert").alert("close");
    });
    $(".close").click(function() {
        $("#myAlert").alert("show");
    });
});

function main($scope) {

    AdapterJS.webRTCReady(function() {

        /**
         * Current caller
         */
        $scope.caller = null;

        /**
         * 
         */
        $scope.callStatus = "";

        /**
         * Connection
         */
        $scope.peerConnection = null;

        /**
         * Socket connection
         */
        $scope.socket = new WebSocket("ws://" + location.host + "/pulse-rtc/users");

        /**
         * Current connected user
         */
        $scope.currentUser = {};

        /**
         * Selected user (to call, to write a message)
         */
        $scope.activeUser = null;

        /**
         * ICE servers config
         */
        $scope.servers = {"iceServers":[{"urls":["turn:173.194.71.127:19305?transport=udp"],"username":"1463036085:B1DBrk++","credential":"NmCPAObP2IxJi2MwmcFbhxNUoNI="}],"iceTransportPolicy":"all","rtcpMuxPolicy":"negotiate"};

        /**
         * Local stream got by the getUserMedia func.
         */
        $scope.localStream =  null;

        /**
         * PeerConnection constraints
         */
        $scope.pcConstraints = {
            optional: []
        };

        /**
         * Incoming remote ICE candidates queue. Needed to save an order of setRemoteDescription function and addICECandidate.
         */
        $scope.iceQueue = [];

        /**
         * Offer options
         */
        $scope.offerOptions = {
            offerToReceiveAudio: 1,
            offerToReceiveVideo: 0,
            voiceActivityDetection: false
        };

        $scope.send = function (object) {
            $scope.socket.send(JSON.stringify(object));
        };

        $scope.login = function () {
            $scope.send({
                messageId : "USER_LOGIN",
                user : $scope.currentUser
            });
            $('#myModal').modal('toggle');
        };

        $scope.setActiveUser = function (user) {
            $scope.activeUser = user;
            $('#sendMessageBlock').show();
        };

        $scope.sendMessage = function (user, message) {
            $scope.send({
                messageId : "SEND_MESSAGE",
                from: $scope.currentUser,
                to: user,
                message : message
            });
            $('#messageAre').val('');
            $('#sendMessageBlock').hide();
        };

        $scope.endCall = function () {
            $scope.localStream.getTracks().forEach(function(track) {
                log("Track stoped: " + track);
                track.stop();
            });
            $scope.peerConnection.close();
            $scope.peerConnection = null;
            $scope.caller = null;
            $scope.localStream = null;
            $scope.activeUser = null;
            $scope.iceQueue = [];

            $("#callDialog").dialog("close");
        };

        $scope.endCallOnError = function () {
            $scope.endCall();
        };

        $scope.makeCall = function (user) {
            $scope.activeUser = user;

            $("#callDialog").dialog({
                closeOnEscape: false,
                resizable: false
            });
            $scope.send({
                messageId : "MAKE_CALL",
                to: user,
                from: $scope.currentUser
            });
            $scope.callStatus = "Waiting for answer...";
        };

        $scope.declineCall = function () {
            $scope.send({
                messageId : "CALL_ANSWER",
                caller: $scope.caller,
                answer: false
            });
            $scope.caller = null;
            $("#incommingCall").dialog("close");
        };

        $scope.answerCall = function () {
            $scope.send({
                messageId : "CALL_ANSWER",
                caller: $scope.caller,
                answer: true
            });
            $("#incommingCall").dialog("close");

            log('Creating peer connection');
            $scope.peerConnection = new RTCPeerConnection($scope.servers, $scope.pcConstraints);

            log("Addaching ice listener");
            $scope.peerConnection.onicecandidate = function (event) {
                if (event.candidate) {
                    log("Local ice candidate: " + JSON.stringify(event.candidate));
                    log("Local ice candidate: Sending to remote");
                    $scope.send({
                        messageId : "ICE_CANDIDATE",
                        to: $scope.caller,
                        candidate: event.candidate
                    });
                }
            };
            
            $scope.peerConnection.oniceconnectionstatechange = function (event) {
                log("Connection changed: " + JSON.stringify($scope.peerConnection.iceConnectionState));
                if ($scope.peerConnection && $scope.peerConnection.iceConnectionState == "disconnected") {
                    $scope.endCallOnError();
                }
            }

            log("Addaching stream listener");
            $scope.peerConnection.onaddstream = function (event) {
                attachMediaStream(document.getElementById("inCallAudio"), event.stream);
                log('Received remote stream');
            };
        };

        // Message handlers
        $scope.handleUserLogin = function (jsonMessageData) {
            log("handleUserLogin: " + JSON.stringify(jsonMessageData));
            $scope.users.push(jsonMessageData.user);
            $scope.$apply();
        };

        $scope.handleUserLogout = function (jsonMessageData) {
            log("handleUserLogout: " + JSON.stringify(jsonMessageData));
            $scope.users = _.filter($scope.users, u => (u.id != jsonMessageData.user.id));
            $scope.$apply();
        };

        $scope.handleUsersList = function (jsonMessageData) {
            log("handleUsersList: " + JSON.stringify(jsonMessageData));
            $scope.users = jsonMessageData.users;
            $scope.$apply();
        };

        $scope.handleIncomingMessage = function (jsonMessageData) {
            log("handleIncomingMessage: " + JSON.stringify(jsonMessageData));
            $('#incomingMessageContent').html(jsonMessageData.message);
            $('#incomingMessage').show();
        };

        $scope.handleSendIdMessage = function (jsonMessageData) {
            log("handleSendIdMessage: " + JSON.stringify(jsonMessageData));
            $scope.currentUser.id = jsonMessageData.user.id;
        };

        $scope.handleCallAnswer = function (jsonMessageData) {

            var gotDescription = function (desc) {
                    desc.sdp = forceChosenAudioCodec(desc.sdp);
                    $scope.peerConnection.setLocalDescription(desc, function() {
                        log("Sending local sdp to remote peer");
                        $scope.send({
                            messageId : "SDP_OFFER",
                            to: $scope.activeUser,
                            sdp: desc
                        });
                    }, e => log("Set local description error: " + e));
                },
                gotStream = function (stream) {
                    $scope.$apply(function () {
                        $scope.callStatus = "Connecting to peer...";
                    });
                    log('Creating peer connection');
                    $scope.peerConnection = new RTCPeerConnection($scope.servers, $scope.pcConstraints);
                    $scope.localStream = stream;
                    log("Addaching ice listener");
                    $scope.peerConnection.onicecandidate = function (event) {
                        if (event.candidate) {
                            log("Local ice candidate: " + JSON.stringify(event.candidate));
                            log("Local ice candidate: Sending to remote");
                            $scope.send({
                                messageId : "ICE_CANDIDATE",
                                to: $scope.activeUser,
                                candidate: event.candidate
                            });
                        }
                    };

                    $scope.peerConnection.oniceconnectionstatechange = function (event) {
                        log("Connection changed: " + JSON.stringify(($scope.peerConnection || {}).iceConnectionState));
                        if ($scope.peerConnection && $scope.peerConnection.iceConnectionState == "disconnected") {
                            $scope.endCallOnError();
                        }
                    }

                    log("Addaching stream listener");
                    $scope.peerConnection.onaddstream = function (event) {
                        attachMediaStream(document.getElementById("inCallAudio"), event.stream);
                        log('Received remote stream');
                    };
                    log("Stream added: " + stream);
                    $scope.peerConnection.addStream(stream);

                    log("Creating offer");
                    $scope.peerConnection.createOffer($scope.offerOptions).then(gotDescription, e => log("Creating offer error: " + e));
                };
            

            log("handleCallAnswer: " + JSON.stringify(jsonMessageData));
            if (jsonMessageData.answer) {
                navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: false
                })
                .then(gotStream);
            } else {
                $("#callDialog").dialog("close");
            }
        };

        $scope.handleICECandidate = function (jsonMessageData) {
            var iceCandidate = new RTCIceCandidate(jsonMessageData.candidate);
            $scope.peerConnection.addIceCandidate(iceCandidate);
            log("Incomming ice candidate was added: " + JSON.stringify(iceCandidate));
        };

        $scope.handleIncomingCall = function (jsonMessageData) {
            log("handleIncomingCall: " + JSON.stringify(jsonMessageData));
            $("#incommingCall").dialog({
                closeOnEscape: false,
                resizable: false,
                minHeight: 0
            });
            $scope.caller = jsonMessageData.from;
        };

        $scope.sdpExchangeComplete = function () {
            $scope.iceQueue.forEach(function (elm) {
                $scope.handleICECandidate(elm);
            });
            $scope.$apply(function () {
                $scope.callStatus = "Connected";
            });
        };

        $scope.handleSDPOffer = function (jsonMessageData) {
            var gotDescription = function (desc) {
                    $scope.sdpExchangeComplete();
                    desc.sdp = forceChosenAudioCodec(desc.sdp);
                    $scope.peerConnection.setLocalDescription(desc, function() {
                        log("Sending local sdp to remote peer");
                        $scope.send({
                            messageId : "SDP_ANSWER",
                            to: $scope.caller,
                            sdp: desc
                        });
                    }, e => log("Set local description error: " + e));
                };
            
            
            log("handleSDPOffer: " + JSON.stringify(jsonMessageData));
            navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false
            })
            .then(stream => {
                log("Stream added: " + stream);
                $scope.peerConnection.addStream(stream);
                $scope.localStream = stream;
                $scope.peerConnection.setRemoteDescription(new RTCSessionDescription(jsonMessageData.sdp)).then(function () {
                    log("setRemoteDescription: nice: handleSDPOffer");
                })
                .catch(function (e) {
                    log("setRemoteDescription: bad: handleSDPOffer: " + e);
                });
                $scope.peerConnection.createAnswer(gotDescription, e => log("Error creating answer:" + e));
            });
        };
 
        $scope.handleSDPAnswer = function (jsonMessageData) {
            log("handleSDPAnswer: " + JSON.stringify(jsonMessageData));
            $scope.peerConnection.setRemoteDescription(new RTCSessionDescription(jsonMessageData.sdp))
            .then(function () {
                log("setRemoteDescription: nice: handleSDPAnswer");
                $scope.sdpExchangeComplete();
            })
            .catch(function (e) {
                alert("Unable to set remote description. Ending call...");
                $scope.endCallOnError();
            });
        };

        $scope.socket.onmessage = function(message) {
            var jsonData = JSON.parse(message.data);

            switch (jsonData.messageId) {
                case "USER_LOGIN":
                    $scope.handleUserLogin(jsonData);
                    break;
                case "USER_LOGOUT":
                    $scope.handleUserLogout(jsonData);
                    break;
                case "ICE_CANDIDATE":
                    $scope.iceQueue.push(jsonData);
                    break;
                case "USERS_LIST":
                    $scope.handleUsersList(jsonData);
                    break;
                case "INCOMING_MESSAGE":
                    $scope.handleIncomingMessage(jsonData);
                    break;
                case "INCOMING_CALL":
                    $scope.handleIncomingCall(jsonData);
                    break;
                case "CALL_ANSWER":
                    $scope.handleCallAnswer(jsonData);
                    break;
                case "SET_USER_ID":
                    $scope.handleSendIdMessage(jsonData);
                    break;
                case "SDP_ANSWER":
                    $scope.handleSDPAnswer(jsonData);
                    break;
                case "SDP_OFFER":
                    $scope.handleSDPOffer(jsonData);
                    break;
                default:
                    break;
            }
        };
    });
};