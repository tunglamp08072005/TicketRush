package com.ticketrush.features.user.dto;

import java.util.List;

public class AdminUsersOverviewResponse {
    private int totalUsers;
    private int totalAdmins;
    private int totalStandardUsers;
    private int completedProfileUsers;
    private int usersWithPhoneNumber;
    private List<AdminUserItemDto> users;

    public AdminUsersOverviewResponse() {
    }

    public AdminUsersOverviewResponse(int totalUsers,
                                      int totalAdmins,
                                      int totalStandardUsers,
                                      int completedProfileUsers,
                                      int usersWithPhoneNumber,
                                      List<AdminUserItemDto> users) {
        this.totalUsers = totalUsers;
        this.totalAdmins = totalAdmins;
        this.totalStandardUsers = totalStandardUsers;
        this.completedProfileUsers = completedProfileUsers;
        this.usersWithPhoneNumber = usersWithPhoneNumber;
        this.users = users;
    }

    public int getTotalUsers() {
        return totalUsers;
    }

    public void setTotalUsers(int totalUsers) {
        this.totalUsers = totalUsers;
    }

    public int getTotalAdmins() {
        return totalAdmins;
    }

    public void setTotalAdmins(int totalAdmins) {
        this.totalAdmins = totalAdmins;
    }

    public int getTotalStandardUsers() {
        return totalStandardUsers;
    }

    public void setTotalStandardUsers(int totalStandardUsers) {
        this.totalStandardUsers = totalStandardUsers;
    }

    public int getCompletedProfileUsers() {
        return completedProfileUsers;
    }

    public void setCompletedProfileUsers(int completedProfileUsers) {
        this.completedProfileUsers = completedProfileUsers;
    }

    public int getUsersWithPhoneNumber() {
        return usersWithPhoneNumber;
    }

    public void setUsersWithPhoneNumber(int usersWithPhoneNumber) {
        this.usersWithPhoneNumber = usersWithPhoneNumber;
    }

    public List<AdminUserItemDto> getUsers() {
        return users;
    }

    public void setUsers(List<AdminUserItemDto> users) {
        this.users = users;
    }
}
