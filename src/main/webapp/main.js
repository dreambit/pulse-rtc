function log(msg) {
    console.log(msg);
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
         * 
         */
        $scope.caller = null;
        $scope.peerConnection = null;
        $scope.socket = new WebSocket("wss://" + location.host + "/pulse-rtc/users");
        $scope.currentUser = {};
        $scope.activeUser = {};

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

        $scope.makeCall = function (user) {
            $scope.send({
                messageId : "MAKE_CALL",
                to: user,
                from: $scope.currentUser
            });
        };

        $scope.declineCall = function () {
            $scope.send({
                messageId : "DECLINE_CALL",
                to: caller
            });
            $scope.caller = null;
        };

        $scope.answerCall = function () {
            $scope.send({
                messageId : "ANSWER_CALL",
                to: caller
            });
            $("#incommingCall").dialog("close");
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
            log("handleCallAnswer: " + JSON.stringify(jsonMessageData));
        };

        $scope.handleICECandidate = function (jsonMessageData) {
            var iceCandidate = new RTCIceCandidate(jsonMessageData.candidate);
            $scope.peerConnection.addIceCandidate(iceCandidate);
            log("Incomming ice candidate was added: " + JSON.stringify(iceCandidate));
        };

        $scope.handleIncomingCall = function (jsonMessageData) {
            log("handleIncomingCall: " + JSON.stringify(jsonMessageData));
        };

        $scope.handleSDPOffer = function () {
            log("handleSDPOffer: " + JSON.stringify(jsonMessageData));
        };
 
        $scope.handleSDPAnswer = function () {
            log("handleSDPAnswer: " + JSON.stringify(jsonMessageData));
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
                case "ON_ICE_CANDIDATE":
                    $scope.handleICECandidate(jsonData);
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