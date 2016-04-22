package com.dreambitc.rtc.dto;

import com.dreambitc.rtc.MessageConstants;

public class UserLogin extends Message {
    private String userName;

    public UserLogin(String userName) {
        super(MessageConstants.IN_OUT_MESSAGE_ID_USER_LOGIN);
        this.userName = userName;
    }

    public void setUserName(String userName) {
        this.userName = userName;
    }

    public String getUserName() {
        return userName;
    }
}
